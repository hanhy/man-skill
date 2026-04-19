import { createSlackChannel } from './slack.js';
import { createTelegramChannel } from './telegram.js';
import { createWhatsAppChannel } from './whatsapp.js';
import { createFeishuChannel } from './feishu.js';

export function createDefaultChannels() {
  return [
    createSlackChannel(),
    createTelegramChannel(),
    createWhatsAppChannel(),
    createFeishuChannel(),
  ];
}
