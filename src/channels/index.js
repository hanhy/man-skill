import { BaseChannel } from './base-channel.js';

export function createDefaultChannels() {
  return [
    new BaseChannel({
      id: 'slack',
      name: 'Slack',
      capabilities: ['threads', 'mentions', 'bot-token'],
    }),
    new BaseChannel({
      id: 'telegram',
      name: 'Telegram',
      capabilities: ['bot-token', 'webhook', 'polling'],
    }),
    new BaseChannel({
      id: 'whatsapp',
      name: 'WhatsApp',
      capabilities: ['session', 'group-chat'],
    }),
    new BaseChannel({
      id: 'feishu',
      name: 'Feishu',
      capabilities: ['tenant-app', 'docs', 'bot'],
    }),
  ];
}
