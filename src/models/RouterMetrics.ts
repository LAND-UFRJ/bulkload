import { Sender } from "@questdb/nodejs-client";

export interface IRouterMetrics {
  router_mac: string;
  timestamp?: Date;
  cpu_usage?: number | null;
  memory?: number | null;
  temperature?: number | null;
  uptime?: number | null;
}

export function appendRouterMetricsToBuffer(sender: Sender, router: IRouterMetrics) {
  sender.table("router_metrics")
    .symbol("router_mac", router.router_mac)

  if(router.cpu_usage !== undefined && router.cpu_usage !== null)
    sender.intColumn("cpu_usage", router.cpu_usage)
  if(router.memory !== undefined && router.memory !== null)
    sender.intColumn("memory", router.memory)
  if(router.temperature !== undefined && router.temperature !== null)
    sender.intColumn("temperature", router.temperature)
  if(router.uptime !== undefined && router.uptime !== null)
    sender.intColumn("uptime", router.uptime)

  const targetTime = router.timestamp ? router.timestamp.getTime() : Date.now();
  sender.at(targetTime, "ms");
}

