// src/Ingests/DeviceMetrics.ts
import * as ingestUtils from "./utils";

type deviceMetricColumns =
  | "bytes_up"
  | "bytes_down"
  | "packets_up"
  | "packets_down"
  | "signal";

// Source tree from which a device was found
type DeviceSource = "access_point" | "ap_device";

// Lookup result: the device object + which tree it came from
interface DeviceLookupResult {
  device: any;
  source: DeviceSource;
}

// TPLink device metric mapping (relative to the AssociatedDevice object)
export const DEVICEMETRICS_MAP: Record<deviceMetricColumns, string> = {
  bytes_up: "Stats.BytesSent",
  bytes_down: "Stats.BytesReceived",
  packets_up: "Stats.PacketsSent",
  packets_down: "Stats.PacketsReceived",
  signal: "SignalStrength",
};

/**
 * Convert raw SignalStrength (steps of 0.1μW) to dBm.
 * The APDevice tree reports signal as raw microwatt steps,
 * while the AccessPoint tree already reports dBm.
 * We standardize on dBm in the database.
 * Formula: dBm = 10 * log10(raw * 0.0001)
 */
function rawSignalToDbm(raw: number): number | null {
  const mw = raw * 0.0001;
  if (mw <= 0) return null;
  return Math.round(10 * Math.log10(mw));
}

function normalizeMac(mac: unknown): string {
  if (typeof mac !== "string") return "";
  return mac.trim().toLowerCase().replace(/-/g, ":");
}

/**
 * Search Device.WiFi.MultiAP.APDevice tree (4 levels of nesting).
 * Used by non-XX530 models and as fallback for XX530.
 */
function findDeviceByMacGeneric(report: any, targetMac: string): any | null {
  const target = normalizeMac(targetMac);
  if (!target) return null;

  const wifi = report?.Device?.WiFi?.MultiAP?.APDevice || {};

  for (const radio of Object.values(wifi)) {
    const radioObj = radio as any;
    for (const ap of Object.values(radioObj?.Radio || {})) {
      const apObj = ap as any;
      for (const apDevice of Object.values(apObj?.AP || {})) {
        const apDeviceObj = apDevice as any;
        for (const device of Object.values(apDeviceObj?.AssociatedDevice || {})) {
          const d = device as any;
          const mac = normalizeMac(d?.MACAddress);
          if (mac !== target) continue;
          if (String(d?.Active) !== "1") continue;
          return d;
        }
      }
    }
  }

  return null;
}

/**
 * Search Device.WiFi.AccessPoint tree (2 levels of nesting).
 * Used by XX530v/XX530vV2 models as primary lookup.
 */
function findDeviceByMacXX530(report: any, targetMac: string): any | null {
  const target = normalizeMac(targetMac);
  if (!target) return null;

  const root = report?.Device?.WiFi?.AccessPoint || {};

  for (const ap of Object.values(root)) {
    const apObj = ap as any;
    for (const device of Object.values(apObj?.AssociatedDevice || {})) {
      const d = device as any;
      const mac = normalizeMac(d?.MACAddress);
      if (mac !== target) continue;
      if (String(d?.Active) !== "1") continue;
      return d;
    }
  }

  return null;
}

/**
 * Find a device by MAC in the report's WiFi trees.
 *
 * - Non-XX530 models: search APDevice only.
 * - XX530 models: search AccessPoint first (has full metrics including
 *   bytes), then fall back to APDevice for devices not listed in
 *   AccessPoint (APDevice lacks bytes but has packets and raw signal).
 */
function findDevice(report: any, targetMac: string, isXX530: boolean): DeviceLookupResult | null {
  if (!isXX530) {
    const device = findDeviceByMacGeneric(report, targetMac);
    return device ? { device, source: "ap_device" } : null;
  }

  // XX530: try AccessPoint first (full metrics)
  const accessPointDevice = findDeviceByMacXX530(report, targetMac);
  if (accessPointDevice) return { device: accessPointDevice, source: "access_point" };

  // Fallback: APDevice tree (packets + raw signal, no bytes)
  const fallback = findDeviceByMacGeneric(report, targetMac);
  return fallback ? { device: fallback, source: "ap_device" } : null;
}

export async function getDeviceMetrics(
  report: any,
  hostDeviceMac: string,
  routerMac: string,
  ts: Date,
  isXX530: boolean = false
): Promise<any | null> {
  const result = findDevice(report, hostDeviceMac, isXX530);
  if (!result) return null;

  const { device, source } = result;

  const row: Partial<Record<deviceMetricColumns, number | null>> = {};
  (Object.keys(DEVICEMETRICS_MAP) as deviceMetricColumns[]).forEach((col) => {
    const value = ingestUtils.getByPath(device, DEVICEMETRICS_MAP[col]);
    row[col] = ingestUtils.toNum(value);
  });

  // APDevice signal is raw (steps of 0.1μW) — convert to dBm
  // so all signal values in the DB use the same dBm unit as AccessPoint.
  if (source === "ap_device" && row.signal != null) {
    row.signal = rawSignalToDbm(row.signal);
  }

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
