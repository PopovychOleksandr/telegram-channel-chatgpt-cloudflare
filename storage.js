import { createMcpHandler } from "agents/mcp";

import { createTelegramMcpServer } from "./server.js";
import { archiveUpdate } from "./storage.js";
import { requiredEnv } from "./telegram.js";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function mcpPath(env) {
  return `/mcp/${encodeURIComponent(requiredEnv(env, "MCP_ACCESS_KEY"))}`;
}

function corsHeaders(headers = new Headers()) {
  headers.set("access-control-allow-origin", "*");
  headers.set(
    "access-control-allow-methods",
    "POST, GET, DELETE, OPTIONS",
  );
  headers.set(
    "access-control-allow-headers",
    "content-type, accept, mcp-session-id, last-event-id",
  );
  headers.set("access-control-expose-headers", "mcp-session-id");
  return headers;
}

function withCors(response) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders(new Headers(response.headers)),
  });
}

async function readJsonBody(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }
  return JSON.parse(text);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        service: "telegram-channel-chatgpt",
        storage: "cloudflare-d1",
      });
    }

    if (url.pathname === "/telegram/webhook" && request.method === "POST") {
      const suppliedSecret = request.headers.get(
        "x-telegram-bot-api-secret-token",
      );
      if (
        suppliedSecret !== requiredEnv(env, "TELEGRAM_WEBHOOK_SECRET")
      ) {
        return new Response("Unauthorized", { status: 401 });
      }
      try {
        const update = await readJsonBody(request);
        await archiveUpdate(env, update);
        return new Response("OK");
      } catch (error) {
        console.error(
          "Webhook error:",
          error instanceof Error ? error.message : error,
        );
        return new Response("Bad Request", { status: 400 });
      }
    }

    const resolvedMcpPath = mcpPath(env);
    if (url.pathname === resolvedMcpPath && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (
      url.pathname === resolvedMcpPath &&
      MCP_METHODS.has(request.method)
    ) {
      const server = createTelegramMcpServer(env, url.origin);
      const response = await createMcpHandler(server, {
        route: resolvedMcpPath,
      })(request, env, ctx);
      return withCors(response);
    }

    return new Response("Not Found", { status: 404 });
  },
};
