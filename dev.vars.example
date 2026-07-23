import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  fetchMessage,
  listRecentMessages,
  messageSummary,
  searchMessages,
} from "./storage.js";
import {
  allowedChatId,
  parseModePayload,
  publicMessageUrl,
  requiredEnv,
  telegramCall,
} from "./telegram.js";

function result(payload, message) {
  return {
    structuredContent: payload,
    content: [{ type: "text", text: message ?? JSON.stringify(payload) }],
  };
}

function errorResult(error) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}

export function createTelegramMcpServer(env, publicBaseUrl) {
  const server = new McpServer(
    { name: "telegram-channel-chatgpt", version: "1.1.0" },
    {
      instructions:
        "This server is restricted to one configured Telegram chat. Read tools are safe. Before posting, editing, configuring a webhook, or deleting, restate the target and content to the user. Never delete unless the current user explicitly requests it; delete_message also requires the literal confirmation value DELETE.",
    },
  );

  server.registerTool(
    "connection_status",
    {
      title: "Check Telegram connection",
      description:
        "Checks the configured bot identity and the single allow-listed Telegram channel or chat.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async () => {
      try {
        const [bot, chat] = await Promise.all([
          telegramCall(env, "getMe"),
          telegramCall(env, "getChat", { chat_id: allowedChatId(env) }),
        ]);
        return result(
          {
            connected: true,
            bot: { id: bot.id, username: bot.username, name: bot.first_name },
            chat: {
              id: String(chat.id),
              title: chat.title ?? chat.username ?? "Private chat",
              username: chat.username ?? "",
              type: chat.type,
            },
          },
          `Connected as @${bot.username} to ${chat.title ?? chat.username ?? chat.id}.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "list_recent_messages",
    {
      title: "List recent Telegram messages",
      description:
        "Returns recent messages archived in Cloudflare D1 after this bot webhook was connected. It cannot retrieve Telegram history from before the bot was connected.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async ({ limit }) => {
      try {
        const messages = (await listRecentMessages(env, limit)).map(
          messageSummary,
        );
        return result(
          { messages, count: messages.length },
          JSON.stringify({ messages, count: messages.length }),
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "search",
    {
      title: "Search Telegram messages",
      description:
        "Searches messages archived in Cloudflare D1 from the configured Telegram channel or chat.",
      inputSchema: {
        query: z.string().min(1).max(200),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async ({ query }) => {
      try {
        const matches = (await searchMessages(env, query)).map((message) => ({
          id: message.id,
          title: `${message.author}: ${message.text.slice(0, 80) || "[media]"}`,
          url: publicMessageUrl(message),
        }));
        const payload = { results: matches };
        return result(payload, JSON.stringify(payload));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch Telegram message",
      description:
        "Fetches one archived Telegram message using the id returned by search.",
      inputSchema: {
        id: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async ({ id }) => {
      try {
        const message = await fetchMessage(env, id);
        if (!message) {
          return errorResult(new Error(`Message ${id} was not found.`));
        }
        const payload = {
          id: message.id,
          title: `${message.author} — ${message.date}`,
          text: message.text || `[Media: ${message.media_types.join(", ")}]`,
          url: publicMessageUrl(message),
          metadata: {
            message_id: message.message_id,
            author: message.author,
            date: message.date,
            edited: message.edited,
            media_types: message.media_types,
          },
        };
        return result(payload, JSON.stringify(payload));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "send_message",
    {
      title: "Publish Telegram message",
      description:
        "Publishes a text message to the one configured Telegram channel or chat. This sends data outside ChatGPT.",
      inputSchema: {
        text: z.string().min(1).max(4096),
        parse_mode: z
          .enum(["Plain text", "HTML", "MarkdownV2"])
          .default("Plain text"),
        disable_notification: z.boolean().default(false),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        destructiveHint: false,
      },
    },
    async ({ text, parse_mode, disable_notification }) => {
      try {
        const message = await telegramCall(env, "sendMessage", {
          chat_id: allowedChatId(env),
          text,
          disable_notification,
          ...parseModePayload(parse_mode),
        });
        return result(
          {
            sent: true,
            message_id: message.message_id,
            chat_id: String(message.chat.id),
          },
          `Telegram message ${message.message_id} was published.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "send_photo_from_url",
    {
      title: "Publish Telegram photo",
      description:
        "Publishes a photo from a public HTTPS URL to the configured Telegram channel or chat.",
      inputSchema: {
        photo_url: z.string().url().refine((url) => url.startsWith("https://"), {
          message: "Only HTTPS image URLs are allowed.",
        }),
        caption: z.string().max(1024).default(""),
        parse_mode: z
          .enum(["Plain text", "HTML", "MarkdownV2"])
          .default("Plain text"),
        disable_notification: z.boolean().default(false),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        destructiveHint: false,
      },
    },
    async ({ photo_url, caption, parse_mode, disable_notification }) => {
      try {
        const message = await telegramCall(env, "sendPhoto", {
          chat_id: allowedChatId(env),
          photo: photo_url,
          caption,
          disable_notification,
          ...parseModePayload(parse_mode),
        });
        return result(
          { sent: true, message_id: message.message_id },
          `Telegram photo ${message.message_id} was published.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "edit_message",
    {
      title: "Edit Telegram message",
      description:
        "Edits a text post created by this bot in the configured Telegram channel or chat.",
      inputSchema: {
        message_id: z.number().int().positive(),
        text: z.string().min(1).max(4096),
        parse_mode: z
          .enum(["Plain text", "HTML", "MarkdownV2"])
          .default("Plain text"),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: true,
      },
    },
    async ({ message_id, text, parse_mode }) => {
      try {
        await telegramCall(env, "editMessageText", {
          chat_id: allowedChatId(env),
          message_id,
          text,
          ...parseModePayload(parse_mode),
        });
        return result(
          { edited: true, message_id },
          `Telegram message ${message_id} was edited.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "delete_message",
    {
      title: "Delete Telegram message",
      description:
        "Permanently deletes one message from the configured Telegram channel or chat. Use only after the user explicitly asks to delete that exact message.",
      inputSchema: {
        message_id: z.number().int().positive(),
        confirm: z.literal("DELETE"),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: true,
      },
    },
    async ({ message_id, confirm }) => {
      if (confirm !== "DELETE") {
        return errorResult(new Error("Deletion was not explicitly confirmed."));
      }
      try {
        await telegramCall(env, "deleteMessage", {
          chat_id: allowedChatId(env),
          message_id,
        });
        return result(
          { deleted: true, message_id },
          `Telegram message ${message_id} was deleted.`,
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "configure_webhook",
    {
      title: "Connect Telegram webhook",
      description:
        "Configures this bot to send future Telegram messages to this Cloudflare deployment. This changes the bot's existing webhook configuration.",
      inputSchema: {
        confirm: z.literal("CONNECT"),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
        destructiveHint: true,
      },
    },
    async ({ confirm }) => {
      if (confirm !== "CONNECT") {
        return errorResult(new Error("Webhook setup was not confirmed."));
      }
      try {
        const webhookSecret = requiredEnv(env, "TELEGRAM_WEBHOOK_SECRET");
        const configured = await telegramCall(env, "setWebhook", {
          url: `${publicBaseUrl}/telegram/webhook`,
          secret_token: webhookSecret,
          allowed_updates: [
            "message",
            "edited_message",
            "channel_post",
            "edited_channel_post",
            "business_message",
            "edited_business_message",
          ],
          drop_pending_updates: false,
        });
        return result(
          { configured: Boolean(configured) },
          "Telegram webhook is connected. New messages will now be archived in Cloudflare D1.",
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}
