import { sequelize } from "./db";
import { Router } from "./models/Router";
import { Device } from "./models/Device";
import { DeviceMetric } from "./models/DeviceMetrics";
import { WanMetric } from "./models/WanMetrics";
import { LanMetric } from "./models/LanMetrics";
import { RouterMetric } from "./models/RouterMetrics";
import { OpticMetric } from "./models/OpticMetrics";
import { getIfaceMetrics } from "./Ingests/IfaceMetrics";
import { getRouterMetrics } from "./Ingests/RouterMetrics";
import { getDeviceMetrics } from "./Ingests/DeviceMetrics";
import { getOpticMetrics } from "./Ingests/OpticMetrics";

function epochSecondsToDate(s: string): Date {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid CollectionTime: ${s}`);
  return new Date(n * 1000);
}

async function upsertMetricsFromReport(report: any) {
  const startTime = performance.now();

  // TPLink Only for now
  const mac = report?.Device?.DeviceInfo?.X_TP_MACAddress;
  if (!mac) throw new Error("No MAC in Device.DeviceInfo.X_TP_MACAddress");
  const manufacturer = report?.Device?.DeviceInfo?.Manufacturer || null;
  const serialnumber = report?.Device?.DeviceInfo?.SerialNumber || null;
  const ModelName = report?.Device?.DeviceInfo?.ModelName || null;
  
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

  await sequelize.transaction(async (t) => {
    await Router.upsert(
      {
        mac_address: mac,
        manufacturer: manufacturer,
        serialnumber: serialnumber,
        extractor_type: 0, // bulkdata  
      },
      { transaction: t }
    );

    // Upsert all devices and their metrics
    for (const device of devices) {
      await Device.upsert(device, { transaction: t });
      const deviceMetrics = await getDeviceMetrics(report, device.device_mac, mac, ts);
      if (deviceMetrics) {
        await DeviceMetric.upsert(deviceMetrics, { transaction: t });
      }
    }

    if (wanmetrics)
      await WanMetric.upsert(wanmetrics, { transaction: t });
    if (lanmetrics)
      await LanMetric.upsert(lanmetrics, { transaction: t });
    if (routermetrics)
      await RouterMetric.upsert(routermetrics, { transaction: t });
    if (opticmetrics)
      await OpticMetric.upsert(opticmetrics, { transaction: t });
  });
  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);
  console.log(`Success ${mac} (${serialnumber}) at ${ts.toISOString()} (${duration} ms)`);
  if (showDebug) {
    console.warn("Report data:", JSON.stringify(report, null, 2));
  }
}

export async function ingest(input: any) {
  if (!input?.Report || !Array.isArray(input.Report)) {
    throw new Error("Ingest: Need Report[] data");
  }
  for (const rep of input.Report) {
    await upsertMetricsFromReport(rep);
  }
}

