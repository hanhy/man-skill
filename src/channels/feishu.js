import { BaseChannel } from './base-channel.js';

export const feishuChannelScaffold = {
  id: 'feishu',
  name: 'Feishu',
  transport: 'chat',
  direction: ['inbound', 'outbound'],
  status: 'planned',
  capabilities: ['tenant-app', 'docs', 'bot'],
  auth: {
    type: 'tenant-app',
    envVars: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'],
  },
  deliveryModes: ['event-subscription', 'webhook'],
  inboundPath: '/hooks/feishu/events',
  outboundMode: 'bot-message',
  implementationPath: 'src/channels/feishu.js',
  nextStep: 'hook tenant-app event subscriptions into inbound delivery flow',
};

function parseFeishuMessageContent(rawContent) {
  if (typeof rawContent !== 'string' || rawContent.length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawContent);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function pickFirstFeishuText(post) {
  const languages = post && typeof post === 'object' ? Object.values(post) : [];
  for (const language of languages) {
    const contentRows = Array.isArray(language?.content) ? language.content : [];
    for (const row of contentRows) {
      const textBlock = Array.isArray(row)
        ? row.find((item) => item && typeof item === 'object' && typeof item.text === 'string' && item.text.length > 0)
        : null;
      if (textBlock?.text) {
        return textBlock.text;
      }
    }
  }

  return null;
}

export function normalizeFeishuInboundEvent(payload = {}) {
  const header = payload?.header && typeof payload.header === 'object' ? payload.header : {};
  const event = payload?.event && typeof payload.event === 'object' ? payload.event : {};
  const sender = event?.sender && typeof event.sender === 'object' ? event.sender : {};
  const senderId = sender?.sender_id && typeof sender.sender_id === 'object' ? sender.sender_id : {};
  const message = event?.message && typeof event.message === 'object' ? event.message : {};
  const content = parseFeishuMessageContent(message.content);
  const timestamp = typeof message?.create_time === 'string' && /^\d+$/.test(message.create_time)
    ? Number.parseInt(message.create_time, 10)
    : (Number.isFinite(message?.create_time) ? message.create_time : null);

  return {
    platform: 'feishu',
    eventType: typeof header?.event_type === 'string' && header.event_type.length > 0 ? header.event_type : 'unknown',
    tenantKey: typeof header?.tenant_key === 'string' && header.tenant_key.length > 0 ? header.tenant_key : null,
    chatId: typeof message?.chat_id === 'string' && message.chat_id.length > 0 ? message.chat_id : null,
    senderId: typeof senderId?.open_id === 'string' && senderId.open_id.length > 0
      ? senderId.open_id
      : (typeof senderId?.user_id === 'string' && senderId.user_id.length > 0
        ? senderId.user_id
        : (typeof senderId?.union_id === 'string' && senderId.union_id.length > 0 ? senderId.union_id : null)),
    messageId: typeof message?.message_id === 'string' && message.message_id.length > 0 ? message.message_id : null,
    messageType: typeof message?.message_type === 'string' && message.message_type.length > 0 ? message.message_type : null,
    text: typeof content?.text === 'string' && content.text.length > 0
      ? content.text
      : pickFirstFeishuText(content?.post),
    threadId: typeof message?.thread_id === 'string' && message.thread_id.length > 0 ? message.thread_id : null,
    timestamp,
  };
}

export function buildFeishuWebhookResponse(payload = {}) {
  if (payload?.type === 'url_verification' && typeof payload?.challenge === 'string' && payload.challenge.length > 0) {
    return {
      challenge: payload.challenge,
    };
  }

  return null;
}

export function buildFeishuBotMessage({ receiveId, text, replyInThread = false, threadId } = {}) {
  const payload = {
    receive_id: receiveId,
    msg_type: 'text',
    content: JSON.stringify({ text }),
  };

  if (replyInThread) {
    payload.reply_in_thread = true;
  }

  if (typeof threadId === 'string' && threadId.length > 0) {
    payload.thread_id = threadId;
  }

  return payload;
}

export class FeishuChannel extends BaseChannel {
  normalizeInboundEvent(payload) {
    return normalizeFeishuInboundEvent(payload);
  }

  buildWebhookResponse(payload) {
    return buildFeishuWebhookResponse(payload);
  }

  buildBotMessage(options) {
    return buildFeishuBotMessage(options);
  }
}

export function createFeishuChannel(overrides = {}) {
  return new FeishuChannel({ ...feishuChannelScaffold, ...overrides });
}
