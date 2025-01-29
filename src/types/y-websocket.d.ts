declare module "y-websocket/bin/utils" {
  import { WebSocket } from "ws";
  export function setupWSConnection(
    ws: WebSocket,
    req: any,
    options: any
  ): void;
}
