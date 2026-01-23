import { EventEmitter } from 'events';
import net from 'net';
import { startDiscovery } from './discovery.js';
import { SLIMPROTO_PORT } from './constants.js';
import { EventType, SlimEvent } from './models.js';
import { getHostname, getIp } from './util.js';
import { SlimClient } from './client.js';

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

export class SlimServer extends EventEmitter {
  readonly options: SlimServerOptions;

  private server?: net.Server;
  private discovery?: import('dgram').Socket;
  private playersMap = new Map<string, SlimClient>();
  private subscriptions: Subscription[] = [];

  constructor(options: SlimServerOptions = {}) {
    super();
    this.options = options;
  }

  get players(): SlimClient[] {
    return Array.from(this.playersMap.values());
  }

  getPlayer(playerId: string): SlimClient | undefined {
    return this.playersMap.get(playerId);
  }

  async start(): Promise<void> {
    const ipAddress = this.options.ipAddress ?? (await getIp());
    const name = this.options.name ?? getHostname();
    const controlPort = this.options.controlPort ?? SLIMPROTO_PORT;
    this.server = net.createServer((socket) => this.registerPlayer(socket));
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(controlPort, '0.0.0.0', () => resolve());
    });
    this.discovery = startDiscovery({
      ipAddress,
      controlPort,
      cliPort: this.options.cliPort ?? null,
      cliPortJson: this.options.cliPortJson ?? null,
      name,
    });
  }

  async stop(): Promise<void> {
    for (const client of this.playersMap.values()) {
      client.disconnect();
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
    playerFilter?: string | string[] | null,
  ): () => void {
    const eventList =
      eventFilter == null ? null : Array.isArray(eventFilter) ? eventFilter : [eventFilter];
    const playerList =
      playerFilter == null ? null : Array.isArray(playerFilter) ? playerFilter : [playerFilter];
    const subscription: Subscription = { callback: cb, eventFilter: eventList, playerFilter: playerList };
    this.subscriptions.push(subscription);
    return () => {
      const idx = this.subscriptions.indexOf(subscription);
      if (idx >= 0) this.subscriptions.splice(idx, 1);
    };
  }

  private registerPlayer(socket: net.Socket): void {
    const client = new SlimClient(socket, (player, eventType, data) => {
      this.handleClientEvent(player, eventType, data);
    });
    socket.on('close', () => this.handleDisconnect(client));
    socket.on('error', () => this.handleDisconnect(client));
  }

  private handleDisconnect(client: SlimClient): void {
    if (client.playerId) {
      this.playersMap.delete(client.playerId);
    }
  }

  private handleClientEvent(player: SlimClient, eventType: EventType, data?: unknown): void {
    const playerId = player.playerId;

    if (eventType === EventType.PLAYER_CONNECTED) {
      const existing = this.playersMap.get(playerId);
      if (existing && existing.connected) {
        player.disconnect();
        return;
      }
      if (existing) {
        existing.disconnect();
      }
      this.playersMap.set(playerId, player);
    }

    if (eventType === EventType.PLAYER_DISCONNECTED) {
      if (playerId) {
        this.playersMap.delete(playerId);
      }
    }

    this.forwardEvent(playerId, eventType, data);
  }

  private forwardEvent(playerId: string, eventType: EventType, data?: unknown): void {
    const event: SlimEvent = { type: eventType, playerId, data };
    this.emit(eventType, event);
    for (const sub of this.subscriptions) {
      if (sub.playerFilter && playerId && !sub.playerFilter.includes(playerId)) continue;
      if (sub.eventFilter && !sub.eventFilter.includes(eventType)) continue;
      Promise.resolve(sub.callback(event)).catch((err) =>
        // eslint-disable-next-line no-console
        console.error('Error in subscriber', err),
      );
    }
  }
}
