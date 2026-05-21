import { Sender } from "@questdb/nodejs-client";

export interface ILanMetric {
  router_mac: string;
  timestamp?: Date;
  bytes_up?: number | null;
  bytes_down?: number | null;
  packets_up?: number | null;
  packets_down?: number | null;
  errors_up?: number | null;
  errors_down?: number | null;
}

export function appendLanMetricToBuffer(sender: Sender, metric: ILanMetric) {
  sender.table("lan_metrics")
    .symbol("router_mac", metric.router_mac);

  if(metric.bytes_up !== undefined && metric.bytes_up !== null)
    sender.intColumn("bytes_up", metric.bytes_up)
  if(metric.bytes_down !== undefined && metric.bytes_down !== null)
    sender.intColumn("bytes_down", metric.bytes_down)
  if(metric.packets_up !== undefined && metric.packets_up !== null)
    sender.intColumn("packets_up", metric.packets_up)
  if(metric.packets_down !== undefined && metric.packets_down !== null)
    sender.intColumn("packets_down", metric.packets_down)
  if(metric.errors_up !== undefined && metric.errors_up !== null)
    sender.intColumn("errors_up", metric.errors_up)
  if(metric.errors_down !== undefined && metric.errors_down !== null)
    sender.intColumn("errors_down", metric.errors_down)

  const targetTime = metric.timestamp ? metric.timestamp.getTime() : Date.now();
  sender.at(targetTime, "ms");
}

