import { Sender } from "@questdb/nodejs-client";

export interface IPingMetric {
  router_mac: string;
  timestamp?: Date;
  destination: string;
  rtt1_us?: number | null;
  rtt2_us?: number | null;
  rtt3_us?: number | null;
  rtt4_us?: number | null;
  rtt5_us?: number | null;
  loss?: number | null;
}

export function appendPingToBuffer(sender: Sender, router: IPingMetric) {
  sender.table("ping_metrics")
    .symbol("router_mac", router.router_mac)
    .symbol("destination", router.destination);

  if(router.rtt1_us !== undefined && router.rtt1_us !== null)
    sender.intColumn("rtt1_us", router.rtt1_us)
  if(router.rtt2_us !== undefined && router.rtt2_us !== null)
    sender.intColumn("rtt2_us", router.rtt2_us)
  if(router.rtt3_us !== undefined && router.rtt3_us !== null)
    sender.intColumn("rtt3_us", router.rtt3_us)
  if(router.rtt4_us !== undefined && router.rtt4_us !== null)
    sender.intColumn("rtt4_us", router.rtt4_us)
  if(router.rtt5_us !== undefined && router.rtt5_us !== null)
    sender.intColumn("rtt5_us", router.rtt5_us)
  if(router.loss !== undefined && router.loss !== null)
    sender.intColumn("loss", router.loss)

  const targetTime = router.timestamp ? router.timestamp.getTime() : Date.now();
  sender.at(targetTime, "ms");
}
