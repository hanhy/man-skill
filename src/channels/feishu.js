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
