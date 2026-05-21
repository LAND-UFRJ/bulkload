import { Sender } from "@questdb/nodejs-client";
import { redis, QDB_INGESTION_URL } from "../db";

export interface IRouter {
  router_mac: string;
  timestamp?: Date;
  manufacturer?: string | null;
  serialnumber?: string | null;
  extractor_type: number;
  isp?: string | null;
  model?: string | null;
  user_ppp?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function appendRouterToBuffer(sender: Sender, router: IRouter) {
  if (![0, 1, 2].includes(router.extractor_type)) {
    throw new Error(`Invalid extractor_type (${router.extractor_type}).`);
  }

  const currentHash = `${router.user_ppp || ""}-${router.extractor_type}`;
  let cachedHash = await redis.get(`router:${router.router_mac}`);

  if (cachedHash === null) {
    try {
      const query = encodeURIComponent(
        `SELECT user_ppp, extractor_type 
         FROM routers 
         LATEST ON timestamp PARTITION BY router_mac 
         WHERE router_mac = '${router.router_mac}';`
      );

      // Usando o fetch nativo do Node.js (Disponível a partir do Node v18+)
      const response = await fetch(`http://${QDB_INGESTION_URL}/exec?query=${query}`);
      
      if (response.ok) {
        const result = await response.json() as any;
        
        // O QuestDB retorna os dados em uma estrutura de arrays (dataset.dataset)
        if (result.dataset && result.dataset.length > 0) {
          const [user_ppp, extType] = result.dataset[0];
          
          // Reconstruímos a hash do banco de dados e salvamos no Redis para os próximos ciclos
          cachedHash = `${user_ppp || ""}-${extType}`;
          await redis.set(`router:${router.router_mac}`, cachedHash);
          console.log(`[Carga Fria] Estado do MAC ${router.router_mac} recuperado do QuestDB.`);
        }
      }
    } catch (err) {
      // Se o QuestDB estiver inacessível para leitura, logamos o erro mas não travamos a ingestão.
      console.error(`[Carga Fria Erro] Falha ao consultar o QuestDB para o MAC ${router.router_mac}:`, err);
    }
  }

  if (cachedHash !== currentHash) {
    sender.table("routers")
      .symbol("router_mac", router.router_mac)
      .intColumn("extractor_type", router.extractor_type)

    if(router.manufacturer !== undefined && router.manufacturer !== null)
      sender.symbol("manufacturer", router.manufacturer)
    if(router.serialnumber !== undefined && router.serialnumber !== null)
      sender.stringColumn("serialnumber", router.serialnumber)
    if(router.isp !== undefined && router.isp !== null)
      sender.symbol("isp", router.isp)
    if(router.model !== undefined && router.model !== null)
      sender.symbol("model", router.model)
    if(router.user_ppp !== undefined && router.user_ppp !== null)
      sender.symbol("user_ppp", router.user_ppp)
    if(router.location !== undefined && router.location !== null)
      sender.stringColumn("location", router.location)
    if(router.city !== undefined && router.city !== null)
      sender.symbol("city", router.city)
    if(router.state !== undefined && router.state !== null)
      sender.symbol("state", router.state)
    if(router.latitude !== undefined && router.latitude !== null)
      sender.floatColumn("latitude", router.latitude)
    if(router.longitude !== undefined && router.longitude !== null)
      sender.floatColumn("longitude", router.longitude)

    const targetTime = router.timestamp ? router.timestamp.getTime() : Date.now();
    sender.at(targetTime, "ms");

    await redis.set(`router:${router.router_mac}`, currentHash);
  }
}
