import dgram from "dgram";
import dns from "dns/promises";
import net from "net";
import os from "os";
import { FALLBACK_CODECS } from "./constants.js";

export async function getIp(): Promise<string> {
  // Mirrors the Python approach: open a UDP socket to a non-routable address
  // to discover the primary interface IP.
  const socket = dgram.createSocket("udp4");
  return new Promise((resolve) => {
    socket.connect(1, "10.255.255.255", () => {
      const address = socket.address();
      socket.close();
      if (typeof address === "object") {
        resolve(address.address);
      } else {
        resolve("127.0.0.1");
      }
    });
    socket.on("error", () => {
      socket.close();
      resolve("127.0.0.1");
    });
  });
}

export function getHostname(): string {
  return os.hostname();
}

export async function selectFreePort(rangeStart: number, rangeEnd: number): Promise<number> {
  const isPortInUse = (port: number): Promise<boolean> =>
    new Promise((resolve) => {
      const tester = net.createServer();
      tester.once("error", () => resolve(true));
      tester.once("listening", () => tester.close(() => resolve(false)));
      tester.listen(port, "0.0.0.0");
    });

  for (let port = rangeStart; port < rangeEnd; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
  }
  throw new Error("No free port available");
}

export function parseCapabilities(heloData: Buffer): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  try {
    const info = heloData.subarray(36).toString();
    const pairs = info.replace(/,/g, "&").split("&");
    for (const pair of pairs) {
      if (!pair) continue;
      const [key, value] = pair.split("=");
      if (key) {
        params[key] = value ?? "";
      }
    }
    params.SupportedCodecs = ["alc", "aac", "ogg", "ogf", "flc", "aif", "pcm", "mp3"]
      .filter((codec) => info.includes(codec)) || FALLBACK_CODECS;
  } catch (err) {
    // keep params empty on parse errors
    // eslint-disable-next-line no-console
    console.error("Failed to parse capabilities", err);
  }
  return params;
}

export function parseHeaders(respData: Buffer): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = respData.toString().split("\r\n").slice(1);
  for (const line of lines) {
    const [key, ...rest] = line.split(": ");
    if (!key || rest.length === 0) continue;
    result[key.toLowerCase()] = rest.join(": ");
  }
  return result;
}

export function parseStatus(respData: Buffer): { version: string; statusCode: number; statusText: string } {
  const [statusLine] = respData.toString().split("\r\n");
  if (!statusLine) {
    return { version: "HTTP/1.0", statusCode: 200, statusText: "" };
  }
  const [version, code, ...rest] = statusLine.split(" ");
  return {
    version,
    statusCode: Number(code ?? 200),
    statusText: rest.join(" ")
  };
}

export async function lookupHost(host: string): Promise<string> {
  const result = await dns.lookup(host);
  return result.address;
}

export function ipToInt(ipAddress: string): number {
  return ipAddress.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}
