import { Sender } from "@questdb/nodejs-client";

// Interface pura TypeScript sem amarras de ORM
export interface IOpticMetric {
  router_mac: string;
  timestamp?: Date; // Opcional (se não vier, usa a hora de chegada no banco)
  bias?: number | null;
  rxpower?: number | null;
  voltage?: number | null;
  txpower?: number | null;
  temperature?: number | null;
}

export function appendOpticMetricToBuffer(sender: Sender, metric: IOpticMetric) {
  sender.table("optic_metrics")
    .symbol("router_mac", metric.router_mac);

  if(metric.bias !== undefined && metric.bias !== null)
    sender.intColumn("bias", metric.bias)
  if(metric.rxpower !== undefined && metric.rxpower !== null)
    sender.intColumn("rxpower", metric.rxpower)
  if(metric.voltage !== undefined && metric.voltage !== null)
    sender.intColumn("voltage", metric.voltage)
  if(metric.txpower !== undefined && metric.txpower !== null)
    sender.intColumn("txpower", metric.txpower)
  if(metric.temperature !== undefined && metric.temperature !== null)
    sender.intColumn("temperature", metric.temperature)

  const targetTime = metric.timestamp ? metric.timestamp.getTime() : Date.now();
  sender.at(targetTime, "ms");
}

