import { Sender } from "@questdb/nodejs-client";

export interface IDeviceMetric {
  device_mac: string;
  router_mac: string;
  timestamp?: Date;
  bytes_up?: number | null;
  bytes_down?: number | null;
  packets_up?: number | null;
  packets_down?: number | null;
  errors_up?: number | null;
  errors_down?: number | null;
  channel?: number | null;
  active?: number | null;
  signal?: number | null;
  noise?: number | null;
  retransmission?: number | null;
  last_connected?: number | null;
}

export function appendDeviceMetricToBuffer(sender: Sender, metric: IDeviceMetric) {
  sender.table("device_metrics")
    .symbol("device_mac", metric.device_mac)
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
  if(metric.channel !== undefined && metric.channel !== null)
    sender.intColumn("channel", metric.channel)
  if(metric.active !== undefined && metric.active !== null)
    sender.intColumn("active", metric.active)
  if(metric.signal !== undefined && metric.signal !== null)
    sender.intColumn("signal", metric.signal)
  if(metric.noise !== undefined && metric.noise !== null)
    sender.intColumn("noise", metric.noise)
  if(metric.retransmission !== undefined && metric.retransmission !== null)
    sender.intColumn("retransmission", metric.retransmission)
  if(metric.last_connected !== undefined && metric.last_connected !== null)
    sender.intColumn("last_connected", metric.last_connected)

  const targetTime = metric.timestamp ? metric.timestamp.getTime() : Date.now();
  sender.at(targetTime, "ms");
}
