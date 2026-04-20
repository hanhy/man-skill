import { BaseChannel } from './base-channel.js';

export const whatsappChannelScaffold = {
  id: 'whatsapp',
  name: 'WhatsApp',
  transport: 'chat',
  direction: ['inbound', 'outbound'],
  status: 'planned',
  capabilities: ['session', 'group-chat', 'business-api'],
  auth: {
    type: 'access-token',
    envVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
  },
  deliveryModes: ['cloud-api', 'session-bridge'],
  inboundPath: '/hooks/whatsapp',
  outboundMode: 'session-send',
  implementationPath: 'src/channels/whatsapp.js',
  nextStep: 'map business-api webhooks and outbound message delivery',
};

function pickWhatsAppChange(payload = {}) {
  const entry = Array.isArray(payload?.entry) ? payload.entry.find((item) => item && typeof item === 'object') : null;
  const change = Array.isArray(entry?.changes) ? entry.changes.find((item) => item && typeof item === 'object') : null;
  const value = change?.value && typeof change.value === 'object' ? change.value : {};
  const message = Array.isArray(value?.messages) ? value.messages.find((item) => item && typeof item === 'object') : null;
  const contact = Array.isArray(value?.contacts) ? value.contacts.find((item) => item && typeof item === 'object') : null;

  return {
    field: typeof change?.field === 'string' && change.field.length > 0 ? change.field : 'unknown',
    value,
    message,
    contact,
  };
}

function extractWhatsAppInteractiveReply(message = {}) {
  if (message?.interactive?.button_reply && typeof message.interactive.button_reply === 'object') {
    return {
      type: 'button_reply',
      id: typeof message.interactive.button_reply.id === 'string' && message.interactive.button_reply.id.length > 0
        ? message.interactive.button_reply.id
        : null,
      title: typeof message.interactive.button_reply.title === 'string' && message.interactive.button_reply.title.length > 0
        ? message.interactive.button_reply.title
        : null,
      description: null,
    };
  }

  if (message?.interactive?.list_reply && typeof message.interactive.list_reply === 'object') {
    return {
      type: 'list_reply',
      id: typeof message.interactive.list_reply.id === 'string' && message.interactive.list_reply.id.length > 0
        ? message.interactive.list_reply.id
        : null,
      title: typeof message.interactive.list_reply.title === 'string' && message.interactive.list_reply.title.length > 0
        ? message.interactive.list_reply.title
        : null,
      description: typeof message.interactive.list_reply.description === 'string' && message.interactive.list_reply.description.length > 0
        ? message.interactive.list_reply.description
        : null,
    };
  }

  return {
    type: null,
    id: null,
    title: null,
    description: null,
  };
}

function extractWhatsAppMessageText(message = {}, interactiveReply = extractWhatsAppInteractiveReply(message)) {
  if (typeof message?.text?.body === 'string' && message.text.body.length > 0) {
    return message.text.body;
  }

  if (typeof interactiveReply.title === 'string' && interactiveReply.title.length > 0) {
    return interactiveReply.title;
  }

  if (typeof message?.button?.text === 'string' && message.button.text.length > 0) {
    return message.button.text;
  }

  if (typeof message?.image?.caption === 'string' && message.image.caption.length > 0) {
    return message.image.caption;
  }

  if (typeof message?.video?.caption === 'string' && message.video.caption.length > 0) {
    return message.video.caption;
  }

  if (typeof message?.document?.caption === 'string' && message.document.caption.length > 0) {
    return message.document.caption;
  }

  return null;
}

export function normalizeWhatsAppInboundEvent(payload = {}) {
  const { field, value, message, contact } = pickWhatsAppChange(payload);
  const interactiveReply = extractWhatsAppInteractiveReply(message);
  const timestamp = typeof message?.timestamp === 'string' && /^\d+$/.test(message.timestamp)
    ? Number.parseInt(message.timestamp, 10)
    : (Number.isFinite(message?.timestamp) ? message.timestamp : null);

  return {
    platform: 'whatsapp',
    eventType: typeof message?.type === 'string' && message.type.length > 0 ? message.type : field,
    phoneNumberId: typeof value?.metadata?.phone_number_id === 'string' && value.metadata.phone_number_id.length > 0
      ? value.metadata.phone_number_id
      : null,
    senderId: typeof message?.from === 'string' && message.from.length > 0
      ? message.from
      : (typeof contact?.wa_id === 'string' && contact.wa_id.length > 0 ? contact.wa_id : null),
    profileName: typeof contact?.profile?.name === 'string' && contact.profile.name.length > 0 ? contact.profile.name : null,
    text: extractWhatsAppMessageText(message, interactiveReply),
    interactiveReplyType: interactiveReply.type,
    interactiveReplyId: interactiveReply.id,
    interactiveReplyTitle: interactiveReply.title,
    interactiveReplyDescription: interactiveReply.description,
    messageId: typeof message?.id === 'string' && message.id.length > 0 ? message.id : null,
    contextMessageId: typeof message?.context?.id === 'string' && message.context.id.length > 0 ? message.context.id : null,
    timestamp,
  };
}

export function buildWhatsAppWebhookVerificationResponse(query = {}) {
  if (query?.['hub.mode'] === 'subscribe' && typeof query?.['hub.challenge'] === 'string' && query['hub.challenge'].length > 0) {
    return query['hub.challenge'];
  }

  return null;
}

export function buildWhatsAppSessionSend({
  to,
  text,
  previewUrl = false,
  contextMessageId,
} = {}) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      body: text,
      preview_url: Boolean(previewUrl),
    },
  };

  if (typeof contextMessageId === 'string' && contextMessageId.length > 0) {
    payload.context = {
      message_id: contextMessageId,
    };
  }

  return payload;
}

export class WhatsAppChannel extends BaseChannel {
  normalizeInboundEvent(payload) {
    return normalizeWhatsAppInboundEvent(payload);
  }

  buildWebhookVerificationResponse(query) {
    return buildWhatsAppWebhookVerificationResponse(query);
  }

  buildSessionSend(options) {
    return buildWhatsAppSessionSend(options);
  }
}

export function createWhatsAppChannel(overrides = {}) {
  return new WhatsAppChannel({ ...whatsappChannelScaffold, ...overrides });
}
