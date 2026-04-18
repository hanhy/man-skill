import { BaseChannel } from './base-channel.js';

export const telegramChannelScaffold = {
  id: 'telegram',
  name: 'Telegram',
  transport: 'chat',
  direction: ['inbound', 'outbound'],
  status: 'planned',
  capabilities: ['bot-token', 'webhook', 'polling'],
  auth: {
    type: 'bot-token',
    envVars: ['TELEGRAM_BOT_TOKEN'],
  },
  deliveryModes: ['polling', 'webhook'],
  inboundPath: '/hooks/telegram',
  outboundMode: 'chat-send',
  implementationPath: 'src/channels/telegram.js',
  nextStep: 'wire bot webhook intake and outbound chat sends',
};

export function createTelegramChannel(overrides = {}) {
  return new BaseChannel({ ...telegramChannelScaffold, ...overrides });
}
