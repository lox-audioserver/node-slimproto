# lox-slimproto

SlimProto server/client utilities for controlling Squeezebox-compatible players from Node.js. This is a TypeScript port of aioslimproto.

## Quick start

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

## What is implemented

- SlimProto TCP server that accepts player connections and tracks sockets.
- UDP discovery responses (legacy + TLV) so players can find the server.
- Typed enums and helpers mirroring the reference implementation (models, constants, volume math).

## Gaps and next steps

- Player-side protocol handling is not included; the client implementation was removed per requirements.
- Display rendering and CLI RPC are not yet ported.
- Add automated tests with mocked sockets around discovery/server lifecycle.
