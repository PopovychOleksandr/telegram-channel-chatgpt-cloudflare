# Telegram Channel for ChatGPT — Cloudflare

Бесплатная версия приватного MCP-сервера для ChatGPT Developer Mode.
Она подключает ChatGPT к **одному** Telegram-каналу или чату через бота:

- Cloudflare Worker постоянно принимает запросы и не «засыпает»;
- Cloudflare D1 сохраняет новые Telegram-сообщения;
- токен бота и ключи хранятся только в Cloudflare Secrets;
- Railway, Docker и OpenAI API key не нужны.

## Возможности

- проверить подключение бота;
- сохранять новые посты и сообщения после подключения webhook;
- показывать последние сообщения и искать по архиву D1;
- публиковать текст и фото по HTTPS-ссылке;
- редактировать сообщения, созданные ботом;
- удалять сообщение только после явного подтверждения `DELETE`.

Сервер жёстко ограничен одним `TELEGRAM_CHAT_ID`.

## Ограничение Telegram

Telegram Bot API не выдаёт старую историю. Архив начнёт пополняться только
после добавления бота и подключения webhook.

## Быстрое развёртывание через Cloudflare и GitHub

### 1. Создайте D1

1. В Cloudflare откройте **Storage & databases → D1 SQL database**.
2. Нажмите **Create database**.
3. Назовите базу `telegram-channel-chatgpt`.
4. Для Location выберите `Western Europe`, если такой вариант доступен.
5. После создания скопируйте **Database ID**.

### 2. Укажите Database ID в GitHub

Откройте `wrangler.jsonc` и замените:

```text
REPLACE_WITH_YOUR_D1_DATABASE_ID
```

на настоящий Database ID. Токен Telegram сюда не вставляйте.

### 3. Создайте таблицу

В созданной D1 откройте **Console**, скопируйте весь файл
`migrations/0001_init.sql`, вставьте его в консоль и нажмите **Execute**.

### 4. Разверните Worker

1. Откройте **Workers & Pages → Create application**.
2. Выберите импорт существующего GitHub-репозитория.
3. Выберите репозиторий с этим проектом.
4. Нажмите **Deploy**. Cloudflare использует `wrangler.jsonc`.
5. После успешного запуска появится адрес:

```text
https://telegram-channel-chatgpt.ВАШ-SUBDOMAIN.workers.dev
```

### 5. Добавьте четыре Secrets

Откройте Worker → **Settings → Variables and Secrets → Add**.
Каждую переменную создайте как **Secret**:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
MCP_ACCESS_KEY
TELEGRAM_WEBHOOK_SECRET
```

Значения:

- `TELEGRAM_BOT_TOKEN` — новый токен из `@BotFather`;
- `TELEGRAM_CHAT_ID` — ID канала, обычно начинается с `-100`;
- `MCP_ACCESS_KEY` — случайная строка длиной 40–60 символов;
- `TELEGRAM_WEBHOOK_SECRET` — другая случайная строка длиной 40–60 символов.

Сохраните Secrets и выполните новый deployment, если Cloudflare не сделал это
автоматически.

### 6. Проверьте Worker

Откройте основной `workers.dev`-адрес. Должен появиться ответ:

```json
{"ok":true,"service":"telegram-channel-chatgpt","storage":"cloudflare-d1"}
```

### 7. Подключите к ChatGPT

В Developer Mode создайте приложение с `No Authentication` и MCP URL:

```text
https://telegram-channel-chatgpt.ВАШ-SUBDOMAIN.workers.dev/mcp/ВАШ_MCP_ACCESS_KEY
```

Ключ в URL должен точно совпасть со значением Secret `MCP_ACCESS_KEY`.

### 8. Подключите webhook

В чате с подключённым приложением напишите:

```text
Проверь подключение Telegram и покажи название канала.
```

Затем:

```text
Настрой Telegram webhook. Подтверждаю: CONNECT.
```

После этого опубликуйте новый тестовый пост в Telegram и спросите:

```text
Покажи последние 5 сообщений из Telegram.
```

## Локальная проверка для разработчика

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:local
npm test
npm run check
npm start
```

Для применения миграций к реальной базе:

```bash
npm run db:remote
```

## Безопасность

- Не публикуйте токен BotFather и секретные ключи в GitHub.
- Не коммитьте `.dev.vars`.
- Используйте отдельного Telegram-бота только для этого канала.
- В разрешениях приложения ChatGPT включите подтверждение изменений.
- При утечке токена отзовите его через `@BotFather`.
- Эта версия предназначена для одного владельца. Для нескольких пользователей
  нужна OAuth-авторизация.
