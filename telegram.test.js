const MEDIA_FIELDS = [
  "photo",
  "video",
  "document",
  "audio",
  "voice",
  "animation",
  "sticker",
  "location",
  "contact",
  "poll",
];

export function requiredEnv(env, name) {
  const value = env?.[name]?.trim?.();
  if (!value) {
    throw new Error(`Missing required Cloudflare secret: ${name}`);
  }
  return value;
}

export function allowedChatId(env) {
  return requiredEnv(env, "TELEGRAM_CHAT_ID");
}

export function extractArchivedMessage(update) {
  const candidates = [
    ["message", update?.message],
    ["edited_message", update?.edited_message],
    ["channel_post", update?.channel_post],
    ["edited_channel_post", update?.edited_channel_post],
    ["business_message", update?.business_message],
    ["edited_business_message", update?.edited_business_message],
  ];
  const [updateType, message] =
    candidates.find(([, candidate]) => candidate?.chat?.id != null) ?? [];
  if (!message) return null;

  const chatId = String(message.chat.id);
  const author =
    [message.from?.first_name, message.from?.last_name]
      .filter(Boolean)
      .join(" ") ||
    message.sender_chat?.title ||
    message.author_signature ||
    "Unknown";

  return {
    id: `${chatId}:${message.message_id}`,
    update_id: Number(update.update_id),
    update_type: updateType,
    edited: updateType.startsWith("edited_"),
    chat_id: chatId,
    chat_title: message.chat.title ?? message.chat.username ?? "Private chat",
    chat_username: message.chat.username ?? "",
    message_id: Number(message.message_id),
    date: new Date((message.edit_date ?? message.date) * 1000).toISOString(),
    author,
    text: message.text ?? message.caption ?? "",
    media_types: MEDIA_FIELDS.filter((field) => message[field] != null),
  };
}

export function publicMessageUrl(message) {
  return message.chat_username
    ? `https://t.me/${message.chat_username}/${message.message_id}`
    : "";
}

export function parseModePayload(parseMode) {
  return parseMode === "Plain text" ? {} : { parse_mode: parseMode };
}

export async function telegramCall(env, method, payload = {}) {
  const token = requiredEnv(env, "TELEGRAM_BOT_TOKEN");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const description = data?.description ?? `HTTP ${response.status}`;
    throw new Error(`Telegram ${method} failed: ${description}`);
  }
  return data.result;
}
