// USB Printer — WebUSB API (Chrome/Edge only, HTTPS required)

const KEYS = {
  name:     "vellox-usb-printer-name",
  vendor:   "vellox-usb-vendor-id",
  product:  "vellox-usb-product-id",
  iface:    "vellox-usb-interface-num",
  endpoint: "vellox-usb-endpoint-num",
};

type USB = {
  requestDevice(opts: { filters: object[] }): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
};
type USBDevice = {
  productName?: string;
  manufacturerName?: string;
  vendorId: number;
  productId: number;
  configuration: { interfaces: USBInterface[] } | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(n: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: BufferSource): Promise<{ status: string }>;
};
type USBInterface = {
  interfaceNumber: number;
  alternate: { endpoints: USBEndpoint[] };
};
type USBEndpoint = {
  endpointNumber: number;
  direction: string;
  type: string;
};

export function isUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function getSavedPrinterName(): string | null {
  try { return localStorage.getItem(KEYS.name); } catch { return null; }
}

// Retorna todos os endpoints bulk OUT em todas as interfaces
function allBulkOuts(device: USBDevice): { iface: number; ep: number }[] {
  if (!device.configuration) return [];
  const result: { iface: number; ep: number }[] = [];
  for (const iface of device.configuration.interfaces) {
    for (const ep of iface.alternate.endpoints) {
      if (ep.direction === "out" && ep.type === "bulk") {
        result.push({ iface: iface.interfaceNumber, ep: ep.endpointNumber });
      }
    }
  }
  return result;
}

export async function requestUsbPrinter(): Promise<string> {
  if (!isUsbSupported()) throw new Error("WebUSB não suportado. Use Chrome ou Edge.");

  const usb = (navigator as unknown as { usb: USB }).usb;

  // Filtros vazios = mostra TODOS os dispositivos USB.
  // Isso é necessário porque em filtros com classCode:7 o Windows já reclama
  // a interface antes do Chrome conseguir mostrar o dispositivo.
  const device = await usb.requestDevice({ filters: [] });

  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);

  // Tenta CADA interface com bulk OUT.
  // No Windows, a interface class 7 (impressora) fica travada pelo usbprint.sys,
  // mas a interface vendor-specific (class 0xFF) geralmente está livre.
  const candidates = allBulkOuts(device);
  if (candidates.length === 0) {
    await device.close();
    throw new Error(
      "Dispositivo selecionado não tem interface de impressão (bulk OUT).\n" +
      "Selecione a impressora térmica ESC/POS correta.",
    );
  }

  let found: { iface: number; ep: number } | null = null;
  for (const c of candidates) {
    try {
      await device.claimInterface(c.iface);
      await device.releaseInterface(c.iface);
      found = c;
      break;
    } catch { /* interface ocupada pelo driver do Windows, tenta a próxima */ }
  }

  if (!found) {
    await device.close();
    throw new Error(
      "Todas as interfaces da impressora estão bloqueadas pelo driver do Windows.\n\n" +
      "Solução: instale o Zadig (zadig.akeo.ie) e troque o driver da impressora para WinUSB.",
    );
  }

  await device.close();

  const name =
    [device.manufacturerName, device.productName].filter(Boolean).join(" ") ||
    `USB ${device.vendorId.toString(16).padStart(4, "0")}:${device.productId.toString(16).padStart(4, "0")}`;

  try {
    localStorage.setItem(KEYS.name,     name);
    localStorage.setItem(KEYS.vendor,   device.vendorId.toString());
    localStorage.setItem(KEYS.product,  device.productId.toString());
    localStorage.setItem(KEYS.iface,    found.iface.toString());
    localStorage.setItem(KEYS.endpoint, found.ep.toString());
  } catch {}

  return name;
}

export async function printViaUsb(data: Uint8Array): Promise<void> {
  if (!isUsbSupported()) throw new Error("WebUSB não suportado");

  const savedVendor  = localStorage.getItem(KEYS.vendor);
  const savedProduct = localStorage.getItem(KEYS.product);
  const ifaceNum     = parseInt(localStorage.getItem(KEYS.iface)    ?? "0");
  const epNum        = parseInt(localStorage.getItem(KEYS.endpoint) ?? "1");

  if (!savedVendor || !savedProduct) {
    throw new Error("Nenhuma impressora configurada. Selecione em Configurações.");
  }

  const usb     = (navigator as unknown as { usb: USB }).usb;
  const devices = await usb.getDevices();
  const device  = devices.find(
    d => d.vendorId.toString()  === savedVendor &&
         d.productId.toString() === savedProduct,
  );

  if (!device) {
    throw new Error("Impressora não encontrada. Reconecte o cabo USB e configure novamente em Configurações.");
  }

  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  await device.claimInterface(ifaceNum);

  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    await device.transferOut(epNum, data.slice(i, i + CHUNK));
  }

  await device.releaseInterface(ifaceNum);
  await device.close();
}

export function removeSavedPrinter(): void {
  try { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); } catch {}
}
