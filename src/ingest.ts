import { qdbSender } from "./db";
import { appendRouterToBuffer } from "./models/Router";
import { appendDeviceToBuffer } from "./models/Device"; 
import { appendDeviceMetricToBuffer } from "./models/DeviceMetrics";
import { appendWanMetricToBuffer } from "./models/WanMetrics";
import { appendLanMetricToBuffer } from "./models/LanMetrics";
import { appendRouterMetricsToBuffer } from "./models/RouterMetrics";
import { appendOpticMetricToBuffer } from "./models/OpticMetrics";

// Import das suas funções de extração limpas (assumindo que retornam os objetos mapeados)
import { getIfaceMetrics } from "./Ingests/IfaceMetrics";
import { getRouterMetrics } from "./Ingests/RouterMetrics";
import { getDeviceMetrics } from "./Ingests/DeviceMetrics";
import { getOpticMetrics } from "./Ingests/OpticMetrics";

function epochSecondsToDate(s: string): Date {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid CollectionTime: ${s}`);
  return new Date(n * 1000);
}

async function buildMetricsBufferFromReport(report: any) {
  const startTime = performance.now();

  // TPLink Only for now
  const mac = report?.Device?.DeviceInfo?.X_TP_MACAddress;
  if (!mac) throw new Error("No MAC in Device.DeviceInfo.X_TP_MACAddress");
  const manufacturer = report?.Device?.DeviceInfo?.Manufacturer || null;
  const serialnumber = report?.Device?.DeviceInfo?.SerialNumber || null;
  const ModelName = report?.Device?.DeviceInfo?.ModelName || null;
  const user_ppp = report?.Device?.PPP?.Interface?.[2]?.Username || null;
  
  const ts = epochSecondsToDate(report?.CollectionTime);

  // Extract devices from Hosts
  const hosts = report?.Device?.Hosts?.Host || {};
  const devices: any[] = [];
  Object.values(hosts).forEach((host: any) => {
    if (host?.PhysAddress) {
      let dev_ipaddr = null;
      if (host.IPAddress && host.IPAddress != "0")
        dev_ipaddr = host.IPAddress;

      devices.push({
        device_mac: host.PhysAddress,
        router_mac: mac,
        host_name: host.HostName || null,
        ip_addr: dev_ipaddr,
        vendor: null, // Not available in this report structure
        vendor_class: host.VendorClassID || null,
        connection_type: host.InterfaceType || null,
      });
    }
  });

  let showDebug = false;
  // Extract Metrics
  const isXX530 = (ModelName === "XX530vV2" || ModelName === "XX530v") ?  true : false;
  const ifwan = (isXX530)? 5 : 4;
  const wanmetrics = await getIfaceMetrics(report, ifwan, true, mac, ts);
  if (!wanmetrics) {
    console.warn(`No WAN metrics for MAC ${mac}: ${serialnumber}`);
    showDebug = true;
  }

  const lanmetrics = await getIfaceMetrics(report, 1, false, mac, ts);
  if (!wanmetrics) {
    console.warn(`No LAN metrics for MAC ${mac}: ${serialnumber}`);
    showDebug = true;
  }
  
  const routermetrics = await getRouterMetrics(report, mac, ts);
  if (!routermetrics) {
    console.warn(`No Router metrics for MAC ${mac}: ${serialnumber}`);
    showDebug = true;
  }

  let opticmetrics = null;
  if(isXX530) {
    opticmetrics = await getOpticMetrics(report, mac, ts);
    if(!opticmetrics)
      showDebug = true;
  }

  if (!wanmetrics && !routermetrics && !lanmetrics) {
    console.warn(`No metrics to ingest for MAC ${mac}: ${serialnumber}`);
    if (showDebug) {
      console.warn("Report data:", JSON.stringify(report, null, 2));
    }
    return;
  }

  await appendRouterToBuffer(qdbSender, {
    router_mac: mac,
    manufacturer: manufacturer,
    serialnumber: serialnumber,  
    model: ModelName,
    user_ppp: user_ppp,
    extractor_type: 0, // bulkdata  
  });

  for (const device of devices) {
    // Processa o cadastro estático do aparelho avaliando pelo Redis
    await appendDeviceToBuffer(qdbSender, device);
    
    // As métricas do aparelho (Time Series) vão direto pro buffer
    const deviceMetrics = await getDeviceMetrics(report, device.device_mac, mac, ts, isXX530);
    if (deviceMetrics) {
      appendDeviceMetricToBuffer(qdbSender, deviceMetrics);
    }
  }

  if (wanmetrics)    appendWanMetricToBuffer(qdbSender, wanmetrics);
  if (lanmetrics)    appendLanMetricToBuffer(qdbSender, lanmetrics);
  if (routermetrics) appendRouterMetricsToBuffer(qdbSender, routermetrics);
  if (opticmetrics)  appendOpticMetricToBuffer(qdbSender, opticmetrics);

  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);
  //console.log(`Success ${mac} (${serialnumber}) at ${ts.toISOString()} (${duration} ms)`);
  if (showDebug) {
    console.warn("Report data:", JSON.stringify(report, null, 2));
  }
}

export async function ingest(input: any) {
  if (!input?.Report || !Array.isArray(input.Report)) {
    throw new Error("Ingest: Need Report[] data");
  }

  let relatoriosBufados = 0;
  for (const rep of input.Report) {
    await buildMetricsBufferFromReport(rep);
    relatoriosBufados++;
  }

  if (relatoriosBufados > 0) {
    try {
      await qdbSender.flush();
      console.log(`[QuestDB Bulk] Ingestão finalizada! ${relatoriosBufados} relatórios BulkData gravados com sucesso.`);
    } catch (err) {
      console.error("[QuestDB Error] Falha ao efetuar flush no lote do BulkData:", err);
      throw err;
    }
  }
}

