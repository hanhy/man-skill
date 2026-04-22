import { BaseChannel } from './base-channel.js';

export const telegramChannelScaffold = {
  id: 'telegram',
  name: 'Telegram',
  transport: 'chat',
  direction: ['inbound', 'outbound'],
  status: 'candidate',
  capabilities: ['bot-token', 'webhook', 'polling'],
  auth: {
    type: 'bot-token',
    envVars: ['TELEGRAM_BOT_TOKEN'],
  },
  deliveryModes: ['polling', 'webhook'],
  inboundPath: '/hooks/telegram',
  outboundMode: 'chat-send',
  implementationPath: 'src/channels/telegram.js',
  nextStep: null,
};

function pickTelegramEventRecord(payload = {}) {
  const eventKeys = ['message', 'edited_message', 'channel_post', 'edited_channel_post'];
  for (const key of eventKeys) {
    if (payload?.[key] && typeof payload[key] === 'object') {
      return {
        eventType: key,
        callbackQueryId: null,
        event: payload[key],
      };
    }
  }

  if (payload?.callback_query && typeof payload.callback_query === 'object') {
    return {
      eventType: 'callback_query',
      callbackQueryId: typeof payload.callback_query.id === 'string' && payload.callback_query.id.length > 0
        ? payload.callback_query.id
        : null,
      event: payload.callback_query.message && typeof payload.callback_query.message === 'object'
        ? {
            ...payload.callback_query.message,
            from: payload.callback_query.from,
            text: payload.callback_query.data ?? payload.callback_query.message.text ?? null,
          }
        : payload.callback_query,
    };
  }

  return {
    eventType: 'unknown',
    callbackQueryId: null,
    event: {},
  };
}

export function normalizeTelegramInboundEvent(payload = {}) {
  const { eventType, callbackQueryId, event } = pickTelegramEventRecord(payload);
  const chat = event?.chat && typeof event.chat === 'object' ? event.chat : {};
  const sender = event?.from && typeof event.from === 'object' ? event.from : {};
  const senderChat = event?.sender_chat && typeof event.sender_chat === 'object' ? event.sender_chat : {};
  const prefersSenderChat = eventType !== 'callback_query';
  const senderId = prefersSenderChat
    ? (Number.isFinite(senderChat?.id) ? senderChat.id : (Number.isFinite(sender?.id) ? sender.id : null))
    : (Number.isFinite(sender?.id) ? sender.id : (Number.isFinite(senderChat?.id) ? senderChat.id : null));

  return {
    platform: 'telegram',
    eventType,
    updateId: Number.isFinite(payload?.update_id) ? payload.update_id : null,
    callbackQueryId,
    chatId: Number.isFinite(chat?.id) ? chat.id : null,
    senderId,
    text: typeof event?.text === 'string' && event.text.length > 0
      ? event.text
      : (typeof event?.caption === 'string' && event.caption.length > 0
          ? event.caption
          : (typeof event?.data === 'string' && event.data.length > 0 ? event.data : null)),
    messageId: Number.isFinite(event?.message_id) ? event.message_id : null,
    threadId: Number.isFinite(event?.message_thread_id) ? event.message_thread_id : null,
    chatType: typeof chat?.type === 'string' && chat.type.length > 0 ? chat.type : null,
    timestamp: Number.isFinite(event?.date) ? event.date : null,
  };
}

export function buildTelegramCallbackAnswer({
  callbackQueryId,
  text,
  showAlert,
  url,
  cacheTime,
} = {}) {
  const payload = {
    callback_query_id: callbackQueryId,
  };

  if (typeof text === 'string' && text.length > 0) {
    payload.text = text;
  }

  if (typeof showAlert === 'boolean') {
    payload.show_alert = showAlert;
  }

  if (typeof url === 'string' && url.length > 0) {
    payload.url = url;
  }

  if (Number.isFinite(cacheTime)) {
    payload.cache_time = cacheTime;
  }

  return payload;
}

export function buildTelegramChatSend({
  chatId,
  text,
  parseMode,
  threadId,
  replyToMessageId,
  disableNotification = false,
} = {}) {
  const payload = {
    chat_id: chatId,
    text,
    disable_notification: Boolean(disableNotification),
  };

  if (typeof parseMode === 'string' && parseMode.length > 0) {
    payload.parse_mode = parseMode;
  }

  if (Number.isFinite(threadId)) {
    payload.message_thread_id = threadId;
  }

  if (Number.isFinite(replyToMessageId)) {
    payload.reply_to_message_id = replyToMessageId;
  }

  return payload;
}

export class TelegramChannel extends BaseChannel {
  normalizeInboundEvent(payload) {
    return normalizeTelegramInboundEvent(payload);
  }

  buildCallbackAnswer(options) {
    return buildTelegramCallbackAnswer(options);
  }

  buildChatSend(options) {
    return buildTelegramChatSend(options);
  }
}

export function createTelegramChannel(overrides = {}) {
  return new TelegramChannel({ ...telegramChannelScaffold, ...overrides });
}
