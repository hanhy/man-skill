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
        event: payload[key],
      };
    }
  }

  if (payload?.callback_query && typeof payload.callback_query === 'object') {
    return {
      eventType: 'callback_query',
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
    event: {},
  };
}

export function normalizeTelegramInboundEvent(payload = {}) {
  const { eventType, event } = pickTelegramEventRecord(payload);
  const chat = event?.chat && typeof event.chat === 'object' ? event.chat : {};
  const sender = event?.from && typeof event.from === 'object' ? event.from : {};

  return {
    platform: 'telegram',
    eventType,
    updateId: Number.isFinite(payload?.update_id) ? payload.update_id : null,
    chatId: Number.isFinite(chat?.id) ? chat.id : null,
    senderId: Number.isFinite(sender?.id) ? sender.id : null,
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

  buildChatSend(options) {
    return buildTelegramChatSend(options);
  }
}

export function createTelegramChannel(overrides = {}) {
  return new TelegramChannel({ ...telegramChannelScaffold, ...overrides });
}
