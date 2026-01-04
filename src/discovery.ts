import dgram from "dgram";
import { Buffer } from "node:buffer";

type OrderedMap = [string, string | null][];

function parseTlvDiscoveryRequest(payload: Buffer): OrderedMap {
  const data = payload.toString("utf-8", 1); // drop leading 'e'
  const result: OrderedMap = [];
  let idx = 0;
  while (idx <= data.length - 5) {
    const key = data.slice(idx, idx + 4);
    const len = data.charCodeAt(idx + 4);
    idx += 5;
    const value = len > 0 ? data.slice(idx, idx + len) : null;
    idx += len;
    result.push([key, value]);
  }
  return result;
}

function buildTlvResponse(
  requestData: OrderedMap,
  opts: { name: string; ipAddress: string; cliPort?: number | null; cliPortJson?: number | null; uuid: string }
): OrderedMap {
  const response: OrderedMap = [];
  for (const [key, val] of requestData) {
    switch (key) {
      case "NAME":
        response.push([key, opts.name]);
        break;
      case "IPAD":
        response.push([key, opts.ipAddress]);
        break;
      case "JSON":
        if (opts.cliPortJson != null) response.push([key, String(opts.cliPortJson)]);
        break;
      case "CLIP":
        if (opts.cliPort != null) response.push([key, String(opts.cliPort)]);
        break;
      case "VERS":
        response.push([key, "7.999.999"]);
        break;
      case "UUID":
        response.push([key, opts.uuid]);
        break;
      default:
        response.push([key, val]);
    }
  }
  return response;
}

function encodeTlvResponse(responseData: OrderedMap): Buffer {
  const parts: string[] = ["E"]; // response prefix
  for (const [key, value] of responseData) {
    const val = value ?? "";
    const truncated = val.length > 255 ? val.slice(0, 255) : val;
    parts.push(key, String.fromCharCode(truncated.length), truncated);
  }
  return Buffer.from(parts.join(""), "utf-8");
}

function encodeLegacyDiscovery(ipAddress: string): Buffer {
  const hostname = ipAddress.slice(0, 16).padEnd(16, "\u0000");
  const buf = Buffer.alloc(17);
  buf.write("D", 0, "ascii");
  buf.write(hostname, 1, "binary");
  return buf;
}

export interface DiscoveryOptions {
  ipAddress: string;
  controlPort: number;
  cliPort?: number | null;
  cliPortJson?: number | null;
  name?: string;
  uuid?: string;
}

export function startDiscovery(opts: DiscoveryOptions): dgram.Socket {
  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const name = opts.name ?? "Slimproto";
  const uuid = opts.uuid ?? "slimproto";

  socket.on("listening", () => {
    try {
      socket.addMembership("239.255.255.250");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Failed to join discovery multicast group", err);
    }
  });

  socket.on("message", (msg, rinfo) => {
    try {
      if (msg.length === 0) return;
      if (msg[0] === 0x65) {
        const requestData = parseTlvDiscoveryRequest(msg);
        const responseData = buildTlvResponse(requestData, {
          name,
          ipAddress: opts.ipAddress,
          cliPort: opts.cliPort,
          cliPortJson: opts.cliPortJson,
          uuid
        });
        const payload = encodeTlvResponse(responseData);
        socket.send(payload, rinfo.port, rinfo.address);
        return;
      }
      if (msg[0] === 0x64) {
        const payload = encodeLegacyDiscovery(opts.ipAddress);
        socket.send(payload, rinfo.port, rinfo.address);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error handling discovery message from", rinfo.address, err);
    }
  });

  socket.bind(opts.controlPort, "0.0.0.0");
  return socket;
}
