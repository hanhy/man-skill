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

export function createWhatsAppChannel(overrides = {}) {
  return new BaseChannel({ ...whatsappChannelScaffold, ...overrides });
}
