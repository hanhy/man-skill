import { BaseChannel } from './base-channel.js';

export function createDefaultChannels() {
  return [
    new BaseChannel({
      id: 'slack',
      name: 'Slack',
      capabilities: ['threads', 'mentions', 'bot-token'],
      auth: {
        type: 'bot-token',
        envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
      },
      deliveryModes: ['events-api', 'web-api'],
    }),
    new BaseChannel({
      id: 'telegram',
      name: 'Telegram',
      capabilities: ['bot-token', 'webhook', 'polling'],
      auth: {
        type: 'bot-token',
        envVars: ['TELEGRAM_BOT_TOKEN'],
      },
      deliveryModes: ['polling', 'webhook'],
    }),
    new BaseChannel({
      id: 'whatsapp',
      name: 'WhatsApp',
      capabilities: ['session', 'group-chat', 'business-api'],
      auth: {
        type: 'access-token',
        envVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
      },
      deliveryModes: ['cloud-api', 'session-bridge'],
    }),
    new BaseChannel({
      id: 'feishu',
      name: 'Feishu',
      capabilities: ['tenant-app', 'docs', 'bot'],
      auth: {
        type: 'tenant-app',
        envVars: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'],
      },
      deliveryModes: ['event-subscription', 'webhook'],
    }),
  ];
}
