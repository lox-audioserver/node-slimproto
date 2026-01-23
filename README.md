# lox-slimproto

SlimProto server/client utilities for controlling Squeezebox-compatible players from Node.js. This is a TypeScript port of aioslimproto with the full server + player-control implementation used by lox-audioserver.

## Quick start (server)

```ts
import { SlimServer, EventType } from "lox-slimproto";

const server = new SlimServer();
await server.start();

server.subscribe((event) => {
  console.log(`[${event.type}]`, event.playerId, event.data);
});

process.on("SIGINT", async () => {
  await server.stop();
  process.exit(0);
});
```

## Quick start (playback control)

```ts
import { SlimServer } from "lox-slimproto";

const server = new SlimServer();
await server.start();

const player = server.getPlayer("aa:bb:cc:dd:ee:ff");
if (player) {
  await player.playUrl("http://host:7090/streams/1/current.mp3", "audio/mpeg", {
    title: "Now Playing",
    artist: "Artist",
  });
}
```

## What is implemented

- SlimProto TCP server with player tracking and event subscriptions.
- UDP discovery responses (legacy + TLV).
- SlimClient playback control: play/pause/stop, volume, metadata, and power.
- HTTP stream control and codec negotiation.
- Sync helpers (`pauseFor`, `skipOver`, `unpauseAt`) and heartbeat/jiffies tracking.
- Typed enums and helpers mirroring the reference implementation.

## Notes

- This package focuses on server-side SlimProto and player control; it does not implement LMS CLI or display rendering.
