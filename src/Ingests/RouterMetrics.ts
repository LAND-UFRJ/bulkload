import * as ingestUtils from "../Ingests/utils";

type routerMetricColumns = "cpu_usage" | "memory" | "uptime";
// TPLink router metric mapping
export const ROUTERMETRICS_MAP: Record<routerMetricColumns, string> = {
  uptime:       "Device.DeviceInfo.UpTime",
  cpu_usage:    "Device.DeviceInfo.ProcessStatus.CPUUsage",
  memory:       "Device.DeviceInfo.MemoryStatus.Free",
};

export async function getRouterMetrics(report: any, mac: string, ts: Date): Promise<any | null> {
  const row: Partial<Record<routerMetricColumns, number | null>> = {};
  (Object.keys(ROUTERMETRICS_MAP) as routerMetricColumns[]).forEach((col) => {
    const value = ingestUtils.getByPath(report, ROUTERMETRICS_MAP[col]);
    row[col] = ingestUtils.toNum(value);
  });
  const hasMetric = (Object.keys(row) as routerMetricColumns[]).some((c) => row[c] != null);
  if (!hasMetric) {
    console.warn(`No router metrics for MAC ${mac}`);
    return;
  }
  const payload: any = { router_mac: mac, timestamp: ts };
  (Object.keys(row) as routerMetricColumns[]).forEach((col) => {
    if (row[col] !== undefined) payload[col] = row[col];
  });
  return payload;
}
