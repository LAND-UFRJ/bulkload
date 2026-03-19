// src/Ingests/DeviceMetrics.ts
import * as ingestUtils from "./utils";

type deviceMetricColumns =
  | "bytes_up"
  | "bytes_down"
  | "packets_up"
  | "packets_down"
  | "signal";

// TPLink device metric mapping
export const DEVICEMETRICS_MAP: Record<deviceMetricColumns, string> = {
  bytes_up: "Stats.BytesSent",
  bytes_down: "Stats.BytesReceived",
  packets_up: "Stats.PacketsSent",
  packets_down: "Stats.PacketsReceived",
  signal: "SignalStrength",
};

function normalizeMac(mac: unknown): string {
  if (typeof mac !== "string") return "";
  return mac.trim().toLowerCase().replace(/-/g, ":");
}

function findDeviceByMac(report: any, targetMac: string): any | null {
  const target = normalizeMac(targetMac);
  if (!target) return null;

  // New tree only
  const roots = [
    report?.Device?.AccessPoint || {},
    report?.Device?.WiFi?.AccessPoint || {},
  ];

  for (const root of roots) {
    for (const ap of Object.values(root)) {
      const apObj = ap as any;
      for (const device of Object.values(apObj?.AssociatedDevice || {})) {
        const d = device as any;
        const mac = normalizeMac(d?.MACAddress);

        // Case-insensitive MAC comparison
        if (mac !== target) continue;

        // Keep only active clients
        if (String(d?.Active) !== "1") continue;

        return d;
      }
    }
  }

  return null;
}

export async function getDeviceMetrics(
  report: any,
  hostDeviceMac: string,
  routerMac: string,
  ts: Date
): Promise<any | null> {
  const device = findDeviceByMac(report, hostDeviceMac);
  if (!device) return null;

  const row: Partial<Record<deviceMetricColumns, number | null>> = {};
  (Object.keys(DEVICEMETRICS_MAP) as deviceMetricColumns[]).forEach((col) => {
    const value = ingestUtils.getByPath(device, DEVICEMETRICS_MAP[col]);
    row[col] = ingestUtils.toNum(value);
  });

  const hasMetric = (Object.keys(row) as deviceMetricColumns[]).some(
    (c) => row[c] != null
  );
  if (!hasMetric) {
    console.warn(`No metrics for device ${hostDeviceMac}`);
    return null;
  }

  const payload: any = {
    // Keep the exact MAC format from Hosts as source of truth.
    device_mac: hostDeviceMac,
    router_mac: routerMac,
    timestamp: ts,
  };

  (Object.keys(row) as deviceMetricColumns[]).forEach((col) => {
    if (row[col] !== undefined) payload[col] = row[col];
  });

  return payload;
}