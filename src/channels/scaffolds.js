import { slackChannelScaffold } from './slack.js';
import { telegramChannelScaffold } from './telegram.js';
import { whatsappChannelScaffold } from './whatsapp.js';
import { feishuChannelScaffold } from './feishu.js';

export const DEFAULT_CHANNEL_SCAFFOLDS = [
  slackChannelScaffold,
  telegramChannelScaffold,
  whatsappChannelScaffold,
  feishuChannelScaffold,
];

export const DEFAULT_CHANNEL_SCAFFOLDS_BY_ID = new Map(
  DEFAULT_CHANNEL_SCAFFOLDS.map((channel) => [channel.id, channel]),
);
