/**
 * geolocationIngest.ts
 *
 * Reads CSV files from the csv-import/ folder and imports them into geolocation.
 * Deletes each CSV after successful processing.
 *
 * Expected CSV columns (same order as geolocation table):
 *   router_mac, timestamp, location, city, state, latitude, longitude, user_ppp
 *
 * - router_mac : if empty, looked up from routers table via user_ppp
 * - timestamp  : if empty, uses the most recent timestamp in router_metrics for that mac
 * - location   : neighbourhood / address (optional)
 * - city       : optional
 * - state      : optional
 * - latitude   : optional
 * - longitude  : optional
 * - user_ppp   : contract number (required)
 *
 * Usage:
 *   npm run geolocation
 *   npm run geolocation -- <file.csv>   (manual override)
 */

import * as dotenv from "dotenv";
dotenv.config(); // Must be called before any import that uses process.env

import * as fs from "fs";
import * as path from "path";
import { Op, fn, col } from "sequelize";
import { shutdownDB } from "./db";
import { Router } from "./models/Router";
import { RouterMetric } from "./models/RouterMetrics";
import { Geolocation } from "./models/Geolocation";

const CSV_IMPORT_DIR = path.resolve(process.cwd(), "csv-import");

// ---------------------------------------------------------------------------
// CSV parser — supports comma and semicolon separators, quoted fields, UTF-8
// ---------------------------------------------------------------------------
interface GeoRow {
  router_mac : string;
  timestamp  : string;
  location   : string;
  city       : string;
  state      : string;
  latitude   : string;
  longitude  : string;
  user_ppp   : string;
}

const EXPECTED_HEADERS: (keyof GeoRow)[] = [
  "router_mac", "timestamp", "location", "city",
  "state", "latitude", "longitude", "user_ppp",
];

function parseCsv(filePath: string): GeoRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines   = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  // Detect separator from header line
  const headerLine = lines[0];
  const sep = headerLine.includes(";") ? ";" : ",";

  const parseFields = (line: string): string[] => {
    const fields: string[] = [];
    let current  = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields;
  };

  const headers = parseFields(headerLine).map((h) => h.trim());

  // Validate headers
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length)
    throw new Error(
      `IngestGeolocation: Missing columns in ${path.basename(filePath)}: ${missing.join(", ")}\n` +
      `Expected: ${EXPECTED_HEADERS.join(", ")}`
    );

  return lines.slice(1).map((line) => {
    const values = parseFields(line);
    const row: Partial<GeoRow> = {};
    headers.forEach((h, i) => {
      if (EXPECTED_HEADERS.includes(h as keyof GeoRow))
        (row as any)[h] = (values[i] ?? "").trim();
    });
    return row as GeoRow;
  });
}

// ---------------------------------------------------------------------------
// Coordinate parser — handles normal floats AND Brazilian multi-dot format
//
// Brazilian spreadsheets export coordinates with dots as thousand-separators
// inside the decimal part, e.g.:
//   "-224.976.947" → -22.4976947   (remove extra dots, integer part = 2 digits)
//   "-22.210.591"  → -22.210591
//   "-412.931.664" → -41.2931664
// ---------------------------------------------------------------------------
function parseCoordinate(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const s = raw.trim();

  const dotCount = (s.match(/\./g) ?? []).length;

  if (dotCount <= 1) {
    const val = parseFloat(s);
    return isNaN(val) ? null : val;
  }

  // Multiple dots → Brazilian thousand-separator format
  const sign   = s.startsWith("-") ? -1 : 1;
  const digits = s.replace(/[^0-9]/g, ""); // keep only digits
  if (!digits) return null;

  // First 2 digits = integer part (coords are always like -22, -42, -21, -41…)
  const intPart = digits.slice(0, 2);
  const decPart = digits.slice(2);
  const val = parseFloat(`${intPart}.${decPart}`);
  return isNaN(val) ? null : sign * val;
}

// ---------------------------------------------------------------------------
// Main ingest logic — batched (4 queries total regardless of row count)
// ---------------------------------------------------------------------------
async function ingestGeolocation(csvPath: string) {
  const rows = parseCsv(csvPath);
  if (!rows.length)
    throw new Error(`IngestGeolocation: No data found in ${path.basename(csvPath)}`);

  // Filter rows that have no user_ppp
  const validRows = rows.filter((r) => {
    if (!r.user_ppp) {
      console.warn(`IngestGeolocation: Skipping row with empty user_ppp`);
      return false;
    }
    return true;
  });

  // -------------------------------------------------------------------------
  // 1. Batch-resolve router_mac for rows that don't have one in the CSV
  // -------------------------------------------------------------------------
  const needsMacLookup = [...new Set(
    validRows.filter((r) => !r.router_mac).map((r) => r.user_ppp)
  )];

  console.log(`[DEBUG] rows=${validRows.length} needsMacLookup=${needsMacLookup.length}`);
  const macByUserPpp = new Map<string, string>();
  if (needsMacLookup.length) {
    console.log(`[DEBUG] querying routers...`);
    const routers = await Router.findAll({ where: { user_ppp: { [Op.in]: needsMacLookup } } });
    console.log(`[DEBUG] routers found=${routers.length}`);
    for (const router of routers) if (router.user_ppp) macByUserPpp.set(router.user_ppp, router.mac_address);
  }

  // Resolve MAC for every row, discard rows where MAC cannot be found
  let noMac = 0;
  const resolvedRows: Array<GeoRow & { mac: string }> = [];
  for (const row of validRows) {
    const mac = row.router_mac || macByUserPpp.get(row.user_ppp) || null;
    if (!mac) {
      console.warn(`No MAC found for user_ppp ${row.user_ppp}`);
      noMac++;
      continue;
    }
    resolvedRows.push({ ...row, mac });
  }

  if (!resolvedRows.length) {
    console.log(`IngestGeolocation: inserted=0 skipped=0 noMac=${noMac} noMetrics=0`);
    return;
  }

  // -------------------------------------------------------------------------
  // 2. Batch-resolve latest timestamp for rows that don't have one in the CSV
  // -------------------------------------------------------------------------
  const needsTsLookup = [...new Set(
    resolvedRows.filter((r) => !r.timestamp).map((r) => r.mac)
  )];

  const tsByMac = new Map<string, Date>();
  if (needsTsLookup.length) {
    console.log(`[DEBUG] querying router_metrics for ${needsTsLookup.length} macs...`);
    const metrics = await RouterMetric.findAll({
      attributes: ["router_mac", [fn("MAX", col("timestamp")), "timestamp"]],
      where: { router_mac: { [Op.in]: needsTsLookup } },
      group: ["router_mac"],
    });
    console.log(`[DEBUG] metrics found=${metrics.length}`);
    for (const m of metrics) tsByMac.set(m.router_mac, (m as any).dataValues.timestamp as Date);
  }

  let noTs = 0;
  const stampedRows: Array<{ row: GeoRow & { mac: string }; ts: Date; lat: number | null; lng: number | null }> = [];
  for (const row of resolvedRows) {
    let ts: Date;
    if (row.timestamp) {
      ts = new Date(row.timestamp);
      if (isNaN(ts.getTime()))
        throw new Error(`IngestGeolocation: Invalid timestamp "${row.timestamp}" for user_ppp ${row.user_ppp}`);
    } else {
      const found = tsByMac.get(row.mac);
      if (!found) {
        console.warn(`No router metrics for MAC ${row.mac} (user_ppp ${row.user_ppp})`);
        noTs++;
        continue;
      }
      ts = found;
    }
    stampedRows.push({ row, ts, lat: parseCoordinate(row.latitude), lng: parseCoordinate(row.longitude) });
  }

  // -------------------------------------------------------------------------
  // 3. Batch dedup — fetch existing records by PK (router_mac, timestamp)
  // -------------------------------------------------------------------------
  const allMacs = [...new Set(stampedRows.map((r) => r.row.mac))];
  console.log(`[DEBUG] dedup check for ${allMacs.length} macs...`);
  const existing = await Geolocation.findAll({
    attributes: ["router_mac", "timestamp"],
    where: { router_mac: { [Op.in]: allMacs } },
  });

  const dedupKey = (mac: string, ts: Date) =>
    `${mac}|${ts.toISOString()}`;

  const existingKeys = new Set(
    existing.map((e) => dedupKey(e.router_mac, e.timestamp))
  );

  // -------------------------------------------------------------------------
  // 4. Filter new rows and bulk insert
  // -------------------------------------------------------------------------
  let skipped = 0;
  const toInsert = stampedRows.filter(({ row, ts }) => {
    const key = dedupKey(row.mac, ts);
    if (existingKeys.has(key)) { skipped++; return false; }
    return true;
  });

  console.log(`[DEBUG] bulkCreate ${toInsert.length} rows...`);
  if (toInsert.length) {
    const BATCH_SIZE = 500;
    const records = toInsert.map(({ row, ts, lat, lng }) => ({
      router_mac: row.mac,
      timestamp:  ts,
      location:   row.location || null,
      city:       row.city     || null,
      state:      row.state    || null,
      latitude:   lat,
      longitude:  lng,
      user_ppp:   row.user_ppp,
    }));

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);
      console.log(`[BATCH ${batchNum}/${totalBatches}] Inserting ${batch.length} rows...`);
      await Geolocation.bulkCreate(batch, { ignoreDuplicates: true });
      console.log(`[BATCH ${batchNum}/${totalBatches}] Done.`);
    }

    for (const { row, ts } of toInsert)
      console.log(`Success ${row.user_ppp} → ${row.mac} at ${ts.toISOString()}`);
  }

  const inserted = toInsert.length;
  console.log(`IngestGeolocation: inserted=${inserted} skipped=${skipped} noMac=${noMac} noMetrics=${noTs}`);
}

// ---------------------------------------------------------------------------
// Entrypoint CLI
// ---------------------------------------------------------------------------
(async () => {
  const [, , csvArg] = process.argv;

  let filesToProcess: string[];

  if (csvArg) {
    // Manual override
    const resolved = path.resolve(csvArg);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    filesToProcess = [resolved];
  } else {
    // Auto mode — scan csv-import/
    if (!fs.existsSync(CSV_IMPORT_DIR)) {
      console.error(`IngestGeolocation: Import folder not found: ${CSV_IMPORT_DIR}`);
      process.exit(1);
    }
    filesToProcess = fs
      .readdirSync(CSV_IMPORT_DIR)
      .filter((f) => f.endsWith(".csv"))
      .map((f) => path.join(CSV_IMPORT_DIR, f));

    if (!filesToProcess.length) {
      console.error(`IngestGeolocation: No CSV files found in ${CSV_IMPORT_DIR}`);
      process.exit(1);
    }
  }

  const isAutoMode = !csvArg;
  let hasError = false;

  for (const csvPath of filesToProcess) {
    console.log(`\nProcessing: ${path.basename(csvPath)}`);
    try {
      await ingestGeolocation(csvPath);
      if (isAutoMode) {
        fs.unlinkSync(csvPath);
        console.log(`Deleted: ${path.basename(csvPath)}`);
      }
    } catch (err: any) {
      console.error(err);
      hasError = true;
    }
  }

  await shutdownDB();
  if (hasError) process.exit(1);
})();
