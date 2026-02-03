export interface DeviceInfo {
  vendor: string | null;
  device_type: string | null;
  os: string | null;
}

export function enrichDeviceData(mac: string, hostnameInput: string | null, vendorClassInput: string | null): DeviceInfo {
  let vendor: string | null = null;
  let device_type: string | null = null;
  let os: string | null = null;

  const hostname = (hostnameInput || "").toLowerCase();
  const vendorClass = (vendorClassInput || "").toLowerCase();

  // --- 1. Análise por Vendor Class (DHCP Fingerprint) ---
  if (vendorClass.includes("android-dhcp")) {
    os = "Android";
    device_type = "Smartphone"; 
  } else if (vendorClass.includes("msft 5.0")) {
    os = "Windows";
    device_type = "Computer";
    vendor = "Microsoft"; 
  } else if (vendorClass.includes("ps4") || vendorClass.includes("playstation")) {
    vendor = "Sony";
    device_type = "Console";
    os = "PlayStation OS";
  } else if (vendorClass.includes("nintendo")) {
    vendor = "Nintendo";
    device_type = "Console";
  } else if (vendorClass.includes("hp") && vendorClass.includes("jet")) {
    vendor = "HP";
    device_type = "Printer";
  }

  // --- 2. Análise por Hostname (Refina ou descobre novos dados) ---

  // Apple
  if (hostname.includes("iphone")) {
    vendor = "Apple";
    device_type = "Smartphone";
    os = "iOS";
  } else if (hostname.includes("ipad")) {
    vendor = "Apple";
    device_type = "Tablet";
    os = "iPadOS";
  } else if (hostname.includes("macbook") || hostname.includes("mac-mini") || hostname.includes("imac") || hostname.startsWith("mbp") || hostname.includes("air-de-")) {
    vendor = "Apple";
    device_type = "Computer";
    os = "macOS";
  }

  // Samsung
  else if (hostname.includes("galaxy") || hostname.includes("samsung")) {
    vendor = "Samsung";
    if (os === "Android") { 
       if (hostname.includes("tab")) device_type = "Tablet";
       else device_type = "Smartphone";
    } else {
        device_type = "Smartphone";
        os = "Android";
    }
  }

  // Xiaomi / Redmi / POCO
  else if (hostname.includes("redmi") || hostname.includes("poco") || hostname.includes("xiaomi") || hostname.includes("mi-")) {
    vendor = "Xiaomi";
    device_type = "Smartphone";
    os = "Android";
  }

  // Motorola
  else if (hostname.includes("moto")) {
    vendor = "Motorola";
    device_type = "Smartphone";
    os = "Android";
  }

  // Realme
  else if (hostname.includes("realme")) {
    vendor = "Realme";
    device_type = "Smartphone";
    os = "Android";
  }
  
  // Infinix
  else if (hostname.includes("infinix")) {
    vendor = "Infinix";
    device_type = "Smartphone";
    os = "Android";
  }

  // Windows / PCs Genéricos
  else if (hostname.includes("desktop-") || hostname.includes("laptop") || hostname.includes("latitude") || hostname.includes("inspiron")) {
    device_type = "Computer";
    os = "Windows";
    if (hostname.includes("dell") || hostname.includes("inspiron") || hostname.includes("latitude")) vendor = "Dell";
    if (hostname.includes("hp")) vendor = "HP";
  }

  // Linux Genérico
  else if (hostname.includes("linux") || hostname.includes("debian") || hostname.includes("ubuntu")) {
    os = "Linux";
    device_type = "Computer";
  }

  // TVs / Chromecast / Roku
  else if (hostname.includes("tv") || hostname.includes("bravia") || hostname.includes("webos") || hostname.includes("roku") || hostname.includes("chromecast")) {
    device_type = "TV/Streaming";
    if (hostname.includes("lg")) vendor = "LG";
    if (hostname.includes("samsung")) vendor = "Samsung";
    if (hostname.includes("roku")) vendor = "Roku";
    if (hostname.includes("chromecast")) vendor = "Google";
  }
  
  // Games (Consoles) via Hostname
  else if (hostname.includes("playstation") || hostname.includes("ps4") || hostname.includes("ps5")) {
    vendor = "Sony";
    device_type = "Console";
    os = "PlayStation OS";
  } else if (hostname.includes("xbox")) {
    vendor = "Microsoft";
    device_type = "Console";
    os = "Xbox OS";
  } else if (hostname.includes("nintendo") || hostname.includes("switch")) {
    vendor = "Nintendo";
    device_type = "Console";
  }
  
  // Câmeras / DVRs
  else if (hostname.includes("gwipc") || hostname.includes("im5") || hostname.includes("mhdx") || hostname.includes("camera")) {
    device_type = "Camera/DVR";
    if (hostname.includes("gwipc") || hostname.includes("im5") || hostname.includes("mhdx")) vendor = "Intelbras"; 
  }
  
  // Impressoras
  else if (hostname.includes("epson") || hostname.includes("hp") || hostname.includes("printer")) {
      device_type = "Printer";
      if (hostname.includes("epson")) vendor = "Epson";
      if (hostname.includes("hp")) vendor = "HP";
  }

  // Ajuste fino para Tablets Android detectados via hostname
  if (hostname.includes("tab") && os === "Android") {
      device_type = "Tablet";
  }

  return { vendor, device_type, os };
}