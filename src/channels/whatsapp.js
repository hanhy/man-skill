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

export function normalizeWhatsAppInboundEvent(payload = {}) {
  const { field, value, message, contact } = pickWhatsAppChange(payload);
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
    text: typeof message?.text?.body === 'string' && message.text.body.length > 0 ? message.text.body : null,
    messageId: typeof message?.id === 'string' && message.id.length > 0 ? message.id : null,
    contextMessageId: typeof message?.context?.id === 'string' && message.context.id.length > 0 ? message.context.id : null,
    timestamp,
  };
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

  buildSessionSend(options) {
    return buildWhatsAppSessionSend(options);
  }
}

export function createWhatsAppChannel(overrides = {}) {
  return new WhatsAppChannel({ ...whatsappChannelScaffold, ...overrides });
}
