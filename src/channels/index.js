import { createFeishuChannel } from './feishu.js';
import { createTelegramChannel } from './telegram.js';
import { createWhatsAppChannel } from './whatsapp.js';
import { createSlackChannel } from './slack.js';

export function createDefaultChannels() {
  return [
    createFeishuChannel(),
    createTelegramChannel(),
    createWhatsAppChannel(),
    createSlackChannel(),
  ];
}
