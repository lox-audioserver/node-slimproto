import { EventEmitter } from "events";
import net from "net";
import { randomUUID } from "crypto";
import { SLIMPROTO_PORT } from "./constants.js";
import { startDiscovery } from "./discovery.js";
import { EventType, SlimEvent } from "./models.js";
import { getHostname, getIp } from "./util.js";

export interface SlimServerOptions {
  cliPort?: number | null;
  cliPortJson?: number | null;
  ipAddress?: string | null;
  name?: string | null;
  controlPort?: number;
}

type Subscription = {
  callback: (event: SlimEvent) => void | Promise<void>;
  eventFilter: EventType[] | null;
  playerFilter: string[] | null;
};

type PlayerConnection = {
  id: string;
  socket: net.Socket;
};

export class SlimServer extends EventEmitter {
  readonly options: SlimServerOptions;

  private server?: net.Server;

  private discovery?: import("dgram").Socket;

  private playersMap = new Map<string, PlayerConnection>();

  private subscriptions: Subscription[] = [];

  constructor(options: SlimServerOptions = {}) {
    super();
    this.options = options;
  }

  get players(): PlayerConnection[] {
    return Array.from(this.playersMap.values());
  }

  getPlayer(playerId: string): PlayerConnection | undefined {
    return this.playersMap.get(playerId);
  }

  async start(): Promise<void> {
    const ipAddress = this.options.ipAddress ?? (await getIp());
    const name = this.options.name ?? getHostname();
    const controlPort = this.options.controlPort ?? SLIMPROTO_PORT;
    this.server = net.createServer((socket) => this.registerPlayer(socket));
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(controlPort, "0.0.0.0", () => resolve());
    });
    this.discovery = startDiscovery({
      ipAddress,
      controlPort,
      cliPort: this.options.cliPort ?? null,
      cliPortJson: this.options.cliPortJson ?? null,
      name
    });
  }

  async stop(): Promise<void> {
    for (const client of this.playersMap.values()) {
      client.socket.destroy();
    }
    this.playersMap.clear();
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    this.discovery?.close();
    this.discovery = undefined;
  }

  subscribe(
    cb: (event: SlimEvent) => void | Promise<void>,
    eventFilter?: EventType | EventType[] | null,
    playerFilter?: string | string[] | null
  ): () => void {
    const eventList =
      eventFilter == null
        ? null
        : Array.isArray(eventFilter)
          ? eventFilter
          : [eventFilter];
    const playerList =
      playerFilter == null
        ? null
        : Array.isArray(playerFilter)
          ? playerFilter
          : [playerFilter];
    const subscription: Subscription = { callback: cb, eventFilter: eventList, playerFilter: playerList };
    this.subscriptions.push(subscription);
    return () => {
      const idx = this.subscriptions.indexOf(subscription);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  private async registerPlayer(socket: net.Socket): Promise<void> {
    const playerId = `${socket.remoteAddress ?? "unknown"}:${socket.remotePort ?? randomUUID()}`;
    const player: PlayerConnection = { id: playerId, socket };
    this.playersMap.set(playerId, player);

    socket.on("close", () => this.handleDisconnect(playerId));
    socket.on("error", () => this.handleDisconnect(playerId));

    this.forwardEvent(playerId, EventType.PLAYER_CONNECTED, { remote: socket.remoteAddress });
  }

  private handleDisconnect(playerId: string): void {
    if (!this.playersMap.has(playerId)) return;
    this.playersMap.delete(playerId);
    this.forwardEvent(playerId, EventType.PLAYER_DISCONNECTED);
  }

  private forwardEvent(playerId: string, eventType: EventType, data?: unknown): void {
    const event: SlimEvent = { type: eventType, playerId, data };
    this.emit(eventType, event);
    for (const sub of this.subscriptions) {
      if (sub.playerFilter && playerId && !sub.playerFilter.includes(playerId)) continue;
      if (sub.eventFilter && !sub.eventFilter.includes(eventType)) continue;
      const { callback } = sub;
      if (callback) {
        Promise.resolve(callback(event)).catch((err) =>
          // eslint-disable-next-line no-console
          console.error("Error in subscriber", err)
        );
      }
    }
  }
}
