import type { ServerType } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { Hono } from "hono";
import * as Y from "yjs";

export function setupYjsWebSocket(server: ServerType, app: Hono) {
  const wss = new WebSocketServer({ noServer: true });

  const docs = new Map<string, Y.Doc>();

  wss.on("connection", (ws, req) => {
    const docName = req.url?.split("notes/")[1];
    if (!docName) {
      ws.close();
      return;
    }

    let doc = docs.get(docName);
    if (!doc) {
      doc = new Y.Doc();
      docs.set(docName, doc);
    }

    setupWSConnection(ws, req, {
      docName: `notes/${docName}`,
      gc: true,
    });
    setupWSConnection(ws, req, { gc: true });
  });

  server.on("upgrade", async (request: any, socket: any, head: any) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  return wss;
}
