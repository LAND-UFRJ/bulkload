import { Sender } from "@questdb/nodejs-client";
import { redis, QDB_INGESTION_URL } from "../db";

export interface IDevice {
  device_mac: string;
  router_mac: string;
  timestamp?: Date;
  host_name?: string | null;
  ip_addr?: string | null;
  vendor?: string | null;
  vendor_class?: string | null;
  connection_type?: string | null;
  model?: string | null;
  type?: string | null;
  os?: string | null;
}

export async function appendDeviceToBuffer(sender: Sender, device: IDevice) {

  const currentHash = `${device.host_name || "-"}`;
  let cachedHash = await redis.get(`device:${device.device_mac}-${device.router_mac}`);

  if (cachedHash === null) {
    try {
      const query = encodeURIComponent(
        `SELECT host_name 
         FROM devices
         WHERE device_mac = '${device.device_mac}' and router_mac = '${device.router_mac}'
         LATEST ON timestamp PARTITION BY device_mac;`
      );

      // Usando o fetch nativo do Node.js (Disponível a partir do Node v18+)
      const response = await fetch(`http://${QDB_INGESTION_URL}/exec?query=${query}`);
      
      if (response.ok) {
        const result = await response.json() as any;
        
        // O QuestDB retorna os dados em uma estrutura de arrays (dataset.dataset)
        if (result.dataset && result.dataset.length > 0) {
          const [host_name] = result.dataset[0];
          
          // Reconstruímos a hash do banco de dados e salvamos no Redis para os próximos ciclos
          cachedHash = `${host_name || "-"}`;
          await redis.set(`device:${device.device_mac}-${device.router_mac}`, cachedHash);
          console.log(`[Carga Fria] Estado do Device ${device.device_mac} recuperado do QuestDB.`);
        }
      }
    } catch (err) {
      // Se o QuestDB estiver inacessível para leitura, logamos o erro mas não travamos a ingestão.
      console.error(`[Carga Fria Erro] Falha ao consultar o QuestDB para o Device ${device.device_mac}:`, err);
    }
  }

  if (cachedHash !== currentHash) {
    sender.table("devices")
      .symbol("device_mac", device.device_mac)
      .symbol("router_mac", device.router_mac);

    if(device.vendor !== undefined && device.vendor !== null)
      sender.symbol("vendor", device.vendor)
    if(device.vendor_class !== undefined && device.vendor_class !== null)
      sender.symbol("vendor_class", device.vendor_class)
    if(device.connection_type !== undefined && device.connection_type !== null)
      sender.symbol("connection_type", device.connection_type)
    if(device.model !== undefined && device.model !== null)
      sender.symbol("model", device.model)
    if(device.type !== undefined && device.type !== null)
      sender.symbol("type", device.type)
    if(device.os !== undefined && device.os !== null)
      sender.symbol("os", device.os)
    if(device.host_name !== undefined && device.host_name !== null)
      sender.stringColumn("host_name", device.host_name)
    if(device.ip_addr !== undefined && device.ip_addr !== null)
      sender.stringColumn("ip_addr", device.ip_addr)

    const targetTime = device.timestamp ? device.timestamp.getTime() : Date.now();
    sender.at(targetTime, "ms");

    await redis.set(`device:${device.device_mac}-${device.router_mac}`, currentHash);
  }
}
