import * as ingestUtils from "./utils.js";

type ifaceMetricColumns = "bytes_up" | "bytes_down" | "packets_up" | "packets_down" | 
  "errors_up" | "errors_down" | "uptime";
// TPLink iface metric mapping
export const IFACEMETRICS_MAP: Record<ifaceMetricColumns, string> = {
  uptime:       "Device.IP.Interface.*.X_TP_Uptime",
  bytes_up:     "Device.IP.Interface.*.Stats.BytesSent",
  bytes_down:   "Device.IP.Interface.*.Stats.BytesReceived",
  packets_up:   "Device.IP.Interface.*.Stats.PacketsSent",
  packets_down: "Device.IP.Interface.*.Stats.PacketsReceived",
  errors_up:    "Device.IP.Interface.*.Stats.ErrorsSent",
  errors_down:  "Device.IP.Interface.*.Stats.ErrorsReceived",
};

export async function getIfaceMetrics(report: any, iface: number, uptime: boolean, mac: string, ts: Date): Promise<any | null> {
  const row: Partial<Record<ifaceMetricColumns, number | null>> = {};
  (Object.keys(IFACEMETRICS_MAP) as ifaceMetricColumns[]).forEach((col) => {
    if (col === "uptime" && !uptime) return;
    const ifaceMetrics = ingestUtils.readForPath(report, IFACEMETRICS_MAP[col], iface);
    row[col] = ingestUtils.toNum(ifaceMetrics);
  });
  const hasMetric = (Object.keys(row) as ifaceMetricColumns[]).some((c) => row[c] != null);
  if (!hasMetric) {
    console.warn(`No metrics for MAC ${mac}`);
    return null;
  }

  const payload: any = { router_mac: mac, timestamp: ts };
  (Object.keys(row) as ifaceMetricColumns[]).forEach((col) => {
      if (row[col] !== undefined) payload[col] = row[col];
  });
  return payload;
}

