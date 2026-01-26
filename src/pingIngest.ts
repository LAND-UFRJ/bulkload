import { sequelize } from "./db";
import { PingMetric } from "./models/PingMetrics";
import { Router } from "./models/Router";

function epochSecondsToDate(s: any): Date {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid timestamp: ${s}`);
  return new Date(n * 1000);
}

export async function ingestPing(input: any) {
  if (!input || typeof input !== 'object') {
    throw new Error("IngestPing: Need valid JSON object");
  }

  const pings = Object.values(input);
  
  await sequelize.transaction(async (t) => {
    for (const data of pings as any[]) {
      if (!data.mac || !data.timestamp || !data.dest) continue;

      const ts = epochSecondsToDate(data.timestamp);
      
      await Router.upsert(
        { 
          mac_address: data.mac, 
          extractor_type: 2 
        }, 
        { transaction: t }
      );

      await PingMetric.upsert({
        router_mac: data.mac,
        timestamp: ts,
        destination: data.dest,
        rtt1_ms: data.lat1 ? parseFloat(data.lat1) : null,
        rtt2_ms: data.lat2 ? parseFloat(data.lat2) : null,
        rtt3_ms: data.lat3 ? parseFloat(data.lat3) : null,
        rtt4_ms: data.lat4 ? parseFloat(data.lat4) : null,
        rtt5_ms: data.lat5 ? parseFloat(data.lat5) : null,
        loss: data.perda !== undefined ? parseInt(data.perda, 10) : 0,
      }, { transaction: t });
    }
  });
}
