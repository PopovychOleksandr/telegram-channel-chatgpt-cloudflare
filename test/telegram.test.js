import assert from "node:assert/strict";
import test from "node:test";

import {
  extractArchivedMessage,
  parseModePayload,
  publicMessageUrl,
} from "../src/telegram.js";
import { normalizeMessageRow } from "../src/storage.js";

test("extracts a Telegram channel post", () => {
  const archived = extractArchivedMessage({
    update_id: 42,
    channel_post: {
      message_id: 7,
      date: 1_700_000_000,
      chat: {
        id: -100123,
        title: "Orders",
        username: "orders_example",
      },
      author_signature: "Manager",
      text: "New order",
    },
  });

  assert.equal(archived.id, "-100123:7");
  assert.equal(archived.author, "Manager");
  assert.equal(archived.text, "New order");
  assert.equal(archived.update_type, "channel_post");
  assert.equal(publicMessageUrl(archived), "https://t.me/orders_example/7");
});

test("extracts edited media captions", () => {
  const archived = extractArchivedMessage({
    update_id: 43,
    edited_channel_post: {
      message_id: 8,
      date: 1_700_000_000,
      edit_date: 1_700_000_100,
      chat: { id: -100123, title: "Orders" },
      caption: "Updated photo",
      photo: [{ file_id: "small" }],
    },
  });

  assert.equal(archived.edited, true);
  assert.equal(archived.text, "Updated photo");
  assert.deepEqual(archived.media_types, ["photo"]);
});

test("normalizes D1 rows and parse modes", () => {
  const normalized = normalizeMessageRow({
    id: "-100123:7",
    update_id: 42,
    update_type: "channel_post",
    edited: 0,
    chat_id: "-100123",
    chat_title: "Orders",
    chat_username: "orders_example",
    message_id: 7,
    message_date: "2026-07-23T10:00:00.000Z",
    author: "Manager",
    text: "New order",
    media_types: "[\"photo\"]",
  });

  assert.equal(normalized.edited, false);
  assert.deepEqual(normalized.media_types, ["photo"]);
  assert.deepEqual(parseModePayload("Plain text"), {});
  assert.deepEqual(parseModePayload("HTML"), { parse_mode: "HTML" });
});
