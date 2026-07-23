import {
  allowedChatId,
  extractArchivedMessage,
  publicMessageUrl,
} from "./telegram.js";

function database(env) {
  if (!env?.DB) {
    throw new Error("Cloudflare D1 binding DB is missing.");
  }
  return env.DB;
}

function parseMediaTypes(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeMessageRow(row) {
  return {
    id: row.id,
    update_id: Number(row.update_id),
    update_type: row.update_type,
    edited: Boolean(row.edited),
    chat_id: row.chat_id,
    chat_title: row.chat_title,
    chat_username: row.chat_username ?? "",
    message_id: Number(row.message_id),
    date: row.message_date,
    author: row.author,
    text: row.text ?? "",
    media_types: parseMediaTypes(row.media_types),
  };
}

export async function archiveUpdate(env, update) {
  const message = extractArchivedMessage(update);
  if (!message || message.chat_id !== allowedChatId(env)) return false;

  await database(env)
    .prepare(
      `INSERT INTO telegram_messages (
        id, update_id, update_type, edited, chat_id, chat_title,
        chat_username, message_id, message_date, author, text, media_types
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        update_id = excluded.update_id,
        update_type = excluded.update_type,
        edited = excluded.edited,
        chat_title = excluded.chat_title,
        chat_username = excluded.chat_username,
        message_date = excluded.message_date,
        author = excluded.author,
        text = excluded.text,
        media_types = excluded.media_types,
        updated_at = CURRENT_TIMESTAMP
      WHERE excluded.update_id >= telegram_messages.update_id`,
    )
    .bind(
      message.id,
      message.update_id,
      message.update_type,
      message.edited ? 1 : 0,
      message.chat_id,
      message.chat_title,
      message.chat_username,
      message.message_id,
      message.date,
      message.author,
      message.text,
      JSON.stringify(message.media_types),
    )
    .run();
  return true;
}

export async function listRecentMessages(env, limit) {
  const result = await database(env)
    .prepare(
      `SELECT * FROM telegram_messages
       WHERE chat_id = ?
       ORDER BY message_date DESC
       LIMIT ?`,
    )
    .bind(allowedChatId(env), limit)
    .all();
  return (result.results ?? []).map(normalizeMessageRow);
}

function escapeLike(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export async function searchMessages(env, query, limit = 50) {
  const result = await database(env)
    .prepare(
      `SELECT * FROM telegram_messages
       WHERE chat_id = ?
         AND LOWER(text || ' ' || author) LIKE ? ESCAPE '\\'
       ORDER BY message_date DESC
       LIMIT ?`,
    )
    .bind(
      allowedChatId(env),
      `%${escapeLike(query.toLocaleLowerCase())}%`,
      limit,
    )
    .all();
  return (result.results ?? []).map(normalizeMessageRow);
}

export async function fetchMessage(env, id) {
  const row = await database(env)
    .prepare(
      `SELECT * FROM telegram_messages
       WHERE chat_id = ? AND id = ?
       LIMIT 1`,
    )
    .bind(allowedChatId(env), id)
    .first();
  return row ? normalizeMessageRow(row) : null;
}

export function messageSummary(message) {
  return {
    id: message.id,
    message_id: message.message_id,
    date: message.date,
    author: message.author,
    text: message.text,
    media_types: message.media_types,
    edited: message.edited,
    url: publicMessageUrl(message),
  };
}
