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
  implementationPath: 'src/channels/whatsapp.js',
  nextStep: 'map business-api webhooks and outbound message delivery',
};
