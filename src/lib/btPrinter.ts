// Bluetooth printer service — Web Bluetooth API (Chrome/Edge only)

const KEYS = {
  id:      "vellox-bt-printer-id",
  name:    "vellox-bt-printer-name",
  service: "vellox-bt-service-uuid",
  char:    "vellox-bt-char-uuid",
};

// Ordered by prevalence for BLE thermal printers
const PROFILES = [
  { service: "000018f0-0000-1000-8000-00805f9b34fb", char: "00002af1-0000-1000-8000-00805f9b34fb" },
  { service: "e7810a71-73ae-499d-8c15-faa9aef0c3f2", char: "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f" },
  { service: "49535343-fe7d-4ae5-8fa9-9fafd205e455", char: "49535343-8841-43f4-a8d4-ecbe34729bb3" },
  { service: "0000ff00-0000-1000-8000-00805f9b34fb", char: "0000ff02-0000-1000-8000-00805f9b34fb" },
  { service: "00001101-0000-1000-8000-00805f9b34fb", char: "00001101-0000-1000-8000-00805f9b34fb" },
];

type BT = typeof navigator & {
  bluetooth: {
    requestDevice(opts: object): Promise<BluetoothDevice>;
    getDevices(): Promise<BluetoothDevice[]>;
  };
};

type BluetoothDevice = {
  id: string;
  name?: string;
  gatt?: {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    connected: boolean;
  };
};

type BluetoothRemoteGATTServer = {
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
  disconnect(): void;
};

type BluetoothRemoteGATTService = {
  uuid: string;
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
};

type BluetoothRemoteGATTCharacteristic = {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
  writeValue(value: BufferSource): Promise<void>;
};

export function isBtSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function getPairedPrinterName(): string | null {
  try { return localStorage.getItem(KEYS.name); } catch { return null; }
}

export async function pairPrinter(): Promise<string> {
  if (!isBtSupported()) throw new Error("Bluetooth não suportado neste navegador. Use Chrome ou Edge.");

  const bt = (navigator as unknown as BT).bluetooth;
  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: PROFILES.map(p => p.service),
  });

  if (!device.gatt) throw new Error("Dispositivo sem GATT. Não é uma impressora compatível.");

  const server = await device.gatt.connect();
  let foundService: string | null = null;
  let foundChar:    string | null = null;

  // 1. Try known profiles first
  for (const p of PROFILES) {
    try {
      const svc  = await server.getPrimaryService(p.service);
      await svc.getCharacteristic(p.char);
      foundService = p.service;
      foundChar    = p.char;
      break;
    } catch { /* try next */ }
  }

  // 2. If none matched, scan all services for any writable characteristic
  if (!foundService) {
    try {
      const services = await server.getPrimaryServices();
      outer: for (const svc of services) {
        const chars = await svc.getCharacteristics();
        for (const ch of chars) {
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            foundService = svc.uuid;
            foundChar    = ch.uuid;
            break outer;
          }
        }
      }
    } catch { /* ignore */ }
  }

  server.disconnect();

  if (!foundService || !foundChar) {
    throw new Error(
      "Nenhuma característica de escrita encontrada. " +
      "Certifique-se que a impressora é ESC/POS BLE compatível.",
    );
  }

  try {
    localStorage.setItem(KEYS.id,      device.id);
    localStorage.setItem(KEYS.name,    device.name ?? "Impressora BT");
    localStorage.setItem(KEYS.service, foundService);
    localStorage.setItem(KEYS.char,    foundChar);
  } catch { /* ignore */ }

  return device.name ?? "Impressora BT";
}

export async function printViaBluetooth(data: Uint8Array): Promise<void> {
  if (!isBtSupported()) throw new Error("Bluetooth não suportado");

  const storedId  = localStorage.getItem(KEYS.id);
  const serviceId = localStorage.getItem(KEYS.service);
  const charId    = localStorage.getItem(KEYS.char);

  if (!storedId || !serviceId || !charId) {
    throw new Error("Nenhuma impressora pareada. Configure em Configurações.");
  }

  const bt = (navigator as unknown as BT).bluetooth;

  // getDevices() returns previously paired devices without requiring user gesture
  let devices: BluetoothDevice[] = [];
  try { devices = await bt.getDevices(); } catch { /* API indisponível */ }

  const device = devices.find(d => d.id === storedId);
  if (!device) throw new Error("Impressora não encontrada. Pareie novamente em Configurações.");

  if (!device.gatt) throw new Error("GATT não disponível no dispositivo.");

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(serviceId);
  const char    = await service.getCharacteristic(charId);

  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    try {
      await char.writeValueWithoutResponse(chunk);
    } catch {
      await char.writeValue(chunk);
    }
    if (i + CHUNK < data.length) await new Promise(r => setTimeout(r, 40));
  }

  server.disconnect();
}

export function unpairPrinter(): void {
  try {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
