import { Sender } from "@questdb/nodejs-client";
import { appendRouterToBuffer } from "./models/Router"
import { appendPingToBuffer } from "./models/PingMetrics";

function epochSecondsToDate(s: any): Date {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid timestamp: ${s}`);
  return new Date(n * 1000);
}

export async function ingestPing(input: any, qdbSender: Sender) {
  if (!input || typeof input !== 'object') {
    throw new Error("IngestPing: Need valid JSON object");
  }

  const pings = Object.values(input);
  let itemsInBatch = 0;

  for (const data of pings as any[]) {
    if (!data.mac || !data.timestamp || !data.dest) continue;

    const ts = epochSecondsToDate(data.timestamp);

    await appendRouterToBuffer(qdbSender, {
      router_mac: data.mac,
      extractor_type: 2,
    });

    const rtt1 = data.lat1 ? Math.round(parseFloat(data.lat1) * 1000) : null;
    const rtt2 = data.lat2 ? Math.round(parseFloat(data.lat2) * 1000) : null;
    const rtt3 = data.lat3 ? Math.round(parseFloat(data.lat3) * 1000) : null;
    const rtt4 = data.lat4 ? Math.round(parseFloat(data.lat4) * 1000) : null;
    const rtt5 = data.lat5 ? Math.round(parseFloat(data.lat5) * 1000) : null;
    const lossValue = data.perda !== undefined ? parseInt(data.perda, 10) : 0;

    appendPingToBuffer(qdbSender, {
      router_mac: data.mac,
      timestamp: ts,
      destination: data.dest,
      rtt1_us: rtt1,
      rtt2_us: rtt2,
      rtt3_us: rtt3,
      rtt4_us: rtt4,
      rtt5_us: rtt5,
      loss: lossValue,
    });

    itemsInBatch++;
  }

  if (itemsInBatch > 0) {
      await qdbSender.flush();
      console.log(`[QuestDB ILP] Flush executado. ${itemsInBatch} telemetrias de ping processadas.`);
  }
}
