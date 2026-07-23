CREATE TABLE IF NOT EXISTS telegram_messages (
  id TEXT PRIMARY KEY,
  update_id INTEGER NOT NULL UNIQUE,
  update_type TEXT NOT NULL,
  edited INTEGER NOT NULL DEFAULT 0,
  chat_id TEXT NOT NULL,
  chat_title TEXT NOT NULL,
  chat_username TEXT NOT NULL DEFAULT '',
  message_id INTEGER NOT NULL,
  message_date TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  media_types TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_date
  ON telegram_messages (chat_id, message_date DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_message
  ON telegram_messages (chat_id, message_id);
