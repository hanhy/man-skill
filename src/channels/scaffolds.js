import { feishuChannelScaffold } from './feishu.js';
import { telegramChannelScaffold } from './telegram.js';
import { whatsappChannelScaffold } from './whatsapp.js';
import { slackChannelScaffold } from './slack.js';

export const DEFAULT_CHANNEL_SCAFFOLDS = [
  feishuChannelScaffold,
  telegramChannelScaffold,
  whatsappChannelScaffold,
  slackChannelScaffold,
];

export const DEFAULT_CHANNEL_SCAFFOLDS_BY_ID = new Map(
  DEFAULT_CHANNEL_SCAFFOLDS.map((channel) => [channel.id, channel]),
);
