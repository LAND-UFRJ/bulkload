import * as ingestUtils from "../Ingests/utils";

type opticMetricColumns = "bias" | "rxpower" | "voltage" | "txpower" | "temperature";
// TPLink optic metric mapping
export const OPTICMETRICS_MAP: Record<opticMetricColumns, string> = {
  bias:        "Device.Optical.Interface.1.X_TP_GPON_Config.BiasCurrent",
  rxpower:     "Device.Optical.Interface.1.X_TP_GPON_Config.RXPower",
  voltage:     "Device.Optical.Interface.1.X_TP_GPON_Config.SupplyVottage",
  txpower:     "Device.Optical.Interface.1.X_TP_GPON_Config.TXPower",
  temperature: "Device.Optical.Interface.1.X_TP_GPON_Config.TransceiverTemperature",
};

export async function getOpticMetrics(report: any, mac: string, ts: Date): Promise<any | null> {
  const row: Partial<Record<opticMetricColumns, number | null>> = {};
  (Object.keys(OPTICMETRICS_MAP) as opticMetricColumns[]).forEach((col) => {
    const value = ingestUtils.getByPath(report, OPTICMETRICS_MAP[col]);
    row[col] = ingestUtils.toNum(value);
  });
  const hasMetric = (Object.keys(row) as opticMetricColumns[]).some((c) => row[c] != null);
  if (!hasMetric) {
    console.warn(`No optic metrics for MAC ${mac}`);
    return;
  }
  const payload: any = { router_mac: mac, timestamp: ts };
  (Object.keys(row) as opticMetricColumns[]).forEach((col) => {
    if (row[col] !== undefined) payload[col] = row[col];
  });
  return payload;
}
