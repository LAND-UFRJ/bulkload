import * as ingestUtils from "./utils.js";

type deviceMetricColumns = "bytes_up" | "bytes_down" | "packets_up" | "packets_down" | 
  "signal";
// TPLink device metric mapping
export const DEVICEMETRICS_MAP: Record<deviceMetricColumns, string> = {
  bytes_up:     "Stats.BytesSent",
  bytes_down:   "Stats.BytesReceived",
  packets_up:   "Stats.PacketsSent",
  packets_down: "Stats.PacketsReceived",
  signal:       "SignalStrength",
};

function findDeviceByMac(report: any, targetMac: string): any | null {
  const wifi = report?.Device?.WiFi?.MultiAP?.APDevice || {};
  
  for (const radio of Object.values(wifi)) {
    const radioObj = radio as any;
    for (const ap of Object.values(radioObj?.Radio || {})) {
      const apObj = ap as any;
      for (const apDevice of Object.values(apObj?.AP || {})) {
        const apDeviceObj = apDevice as any;
        for (const device of Object.values(apDeviceObj?.AssociatedDevice || {})) {
          const deviceObj = device as any;
          if (deviceObj?.MACAddress === targetMac) {
            if (deviceObj?.Active === "1")
              return deviceObj;
            else
              return null;
          }
        }
      }
    }
  }
  return null;
}

export async function getDeviceMetrics(report: any, deviceMac: string, routerMac: string, ts: Date): Promise<any | null> {
  const device = findDeviceByMac(report, deviceMac);
  if (!device) 
    return null;

  const row: Partial<Record<deviceMetricColumns, number | null>> = {};
  (Object.keys(DEVICEMETRICS_MAP) as deviceMetricColumns[]).forEach((col) => {
    const value = ingestUtils.getByPath(device, DEVICEMETRICS_MAP[col]);
    row[col] = ingestUtils.toNum(value);
  });

  const hasMetric = (Object.keys(row) as deviceMetricColumns[]).some((c) => row[c] != null);
  if (!hasMetric) {
    console.warn(`No metrics for device ${deviceMac}`);
    return null;
  }

  const payload: any = { device_mac: deviceMac, router_mac: routerMac, timestamp: ts };
  (Object.keys(row) as deviceMetricColumns[]).forEach((col) => {
    if (row[col] !== undefined) payload[col] = row[col];
  });
  return payload;
}
