#!/bin/bash

# require device id as first argument
if [ -z "$1" ]; then
  echo "Usage: $0 DEVICE_ID"
  echo "Example: $0 30DE4B-Device2-222B5X5002097"
  exit 1
fi
DEVICE="$1"
BASE_URL="http://nbi:7557/devices/${DEVICE}/tasks"

# Define Server
curl -i "$BASE_URL" -X POST --data '{"name":"setParameterValues", "parameterValues": [["Device.BulkData.Profile.1.HTTP.URL", "http://bulkdata.land.ufrj.br/bulkdata/tplink","xsd:string"], ["Device.BulkData.Profile.1.ReportingInterval", 60,"xsd:unsignedInt"], ["Device.BulkData.Profile.1.X_TP_CollectInterval", 60,"xsd:unsignedInt"]]}'

# Set data as a list and send in batches of 10 entries per curl call
values=(
    "Device.DeviceInfo.X_TP_MACAddress"
    "Device.DeviceInfo.SerialNumber"
    "Device.DeviceInfo.Manufacturer"
    "Device.DeviceInfo.ModelName"
    "Device.DeviceInfo.ProcessStatus.CPUUsage"
    "Device.DeviceInfo.MemoryStatus.Free"
    "Device.DeviceInfo.UpTime"
    "Device.IP.Interface.*.X_TP_Uptime"
    "Device.IP.Interface.*.Stats.BytesReceived"
    "Device.IP.Interface.*.Stats.BytesSent"
    "Device.IP.Interface.*.Stats.PacketsReceived"
    "Device.IP.Interface.*.Stats.PacketsSent"
    "Device.IP.Interface.*.Stats.ErrorsReceived"
    "Device.IP.Interface.*.Stats.ErrorsSent"
    "Device.Hosts.Host.*.IPAddress"
    "Device.Hosts.Host.*.PhysAddress"
    "Device.Hosts.Host.*.HostName"
    "Device.Hosts.Host.*.VendorClassID"
    "Device.Hosts.Host.*.X_TP_ClientType"
    "Device.Hosts.Host.*.InterfaceType"
    "Device.Hosts.Host.*.Active"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.MACAddress"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.Active"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.X_TP_HostName"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.SignalStrength"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.Stats.BytesReceived"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.Stats.BytesSent"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.Stats.PacketsReceived"
    "Device.WiFi.MultiAP.APDevice.*.Radio.*.AP.*.AssociatedDevice.*.Stats.PacketsSent"
    "Device.Optical.Interface.1.X_TP_GPON_Config.BiasCurrent"
    "Device.Optical.Interface.1.X_TP_GPON_Config.RXPower"
    "Device.Optical.Interface.1.X_TP_GPON_Config.SupplyVottage"
    "Device.Optical.Interface.1.X_TP_GPON_Config.TXPower"
    "Device.Optical.Interface.1.X_TP_GPON_Config.TransceiverTemperature"
)

# Disable globbing so values with * are not expanded
set -f

json_prefix='{"name":"setParameterValues", "parameterValues": ['

json="$json_prefix"
for i in "${!values[@]}"; do
    idx=$((i+1))
    entry=$(printf '["Device.BulkData.Profile.1.Parameter.%d.Reference", "%s", "xsd:string"]' "$idx" "${values[i]}")

    # Append entry and either send batch every 10 items or when it's the last item
    if (( idx % 10 == 0 )) || (( idx == ${#values[@]} )); then
        json+="$entry"
        json+=']}'
        curl -i "$BASE_URL" -X POST --data "$json"
        # reset for next batch
        json="$json_prefix"
    else
        json+="$entry, "
    fi
done

# Re-enable globbing
set +f

# Enable
curl -i "$BASE_URL" -X POST --data '{"name":"setParameterValues", "parameterValues": [["Device.BulkData.Enable",true,"xsd:boolean"], ["Device.BulkData.Profile.1.Enable",true,"xsd:boolean"], ["Device.BulkData.Profile.2.Enable",false,"xsd:boolean"], ["Device.BulkData.Profile.3.Enable",false,"xsd:boolean"]]}'

