import test from 'node:test';
import assert from 'node:assert/strict';

import { createSlackChannel } from '../src/channels/slack.js';
import { createTelegramChannel } from '../src/channels/telegram.js';
import { createWhatsAppChannel } from '../src/channels/whatsapp.js';
import { createFeishuChannel } from '../src/channels/feishu.js';

test('Slack channel exposes env readiness and thread reply helpers', () => {
  const slack = createSlackChannel();

  assert.deepEqual(slack.requiredEnvVars(), ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']);
  assert.deepEqual(slack.missingEnvVars({ SLACK_BOT_TOKEN: 'xoxb-demo' }), ['SLACK_SIGNING_SECRET']);
  assert.equal(slack.isConfigured({ SLACK_BOT_TOKEN: 'xoxb-demo', SLACK_SIGNING_SECRET: 'secret' }), true);
  assert.deepEqual(slack.normalizeInboundEvent({
    team_id: 'T123',
    event: {
      type: 'app_mention',
      channel: 'C123',
      user: 'U123',
      text: 'ship it',
      ts: '1710000000.123',
    },
  }), {
    platform: 'slack',
    eventType: 'app_mention',
    channelId: 'C123',
    senderId: 'U123',
    text: 'ship it',
    ts: '1710000000.123',
    threadTs: '1710000000.123',
    teamId: 'T123',
  });
  assert.deepEqual(slack.buildThreadReply({
    channelId: 'C123',
    text: 'working on it',
    threadTs: '1710000000.123',
    replyBroadcast: true,
  }), {
    channel: 'C123',
    text: 'working on it',
    thread_ts: '1710000000.123',
    reply_broadcast: true,
  });
});

test('Telegram channel normalizes callback queries into chat-send payloads', () => {
  const telegram = createTelegramChannel();

  assert.deepEqual(telegram.normalizeInboundEvent({
    update_id: 42,
    callback_query: {
      data: 'approve',
      from: { id: 99 },
      message: {
        message_id: 7,
        message_thread_id: 12,
        date: 1710000000,
        chat: { id: 12345, type: 'supergroup' },
      },
    },
  }), {
    platform: 'telegram',
    eventType: 'callback_query',
    updateId: 42,
    chatId: 12345,
    senderId: 99,
    text: 'approve',
    messageId: 7,
    threadId: 12,
    chatType: 'supergroup',
    timestamp: 1710000000,
  });
  assert.deepEqual(telegram.buildChatSend({
    chatId: 12345,
    text: 'acked',
    parseMode: 'MarkdownV2',
    threadId: 12,
    replyToMessageId: 7,
    disableNotification: true,
  }), {
    chat_id: 12345,
    text: 'acked',
    parse_mode: 'MarkdownV2',
    message_thread_id: 12,
    reply_to_message_id: 7,
    disable_notification: true,
  });
});

test('WhatsApp channel normalizes interactive reply selections into text', () => {
  const whatsapp = createWhatsAppChannel();

  assert.deepEqual(whatsapp.normalizeInboundEvent({
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: 'phone-123' },
          contacts: [{
            wa_id: '15551234567',
            profile: { name: 'Taylor' },
          }],
          messages: [{
            id: 'wamid.1',
            from: '15551234567',
            timestamp: '1710000000',
            type: 'interactive',
            interactive: {
              button_reply: {
                id: 'btn-1',
                title: 'Ship today',
              },
            },
          }],
        },
      }],
    }],
  }), {
    platform: 'whatsapp',
    eventType: 'interactive',
    phoneNumberId: 'phone-123',
    senderId: '15551234567',
    profileName: 'Taylor',
    text: 'Ship today',
    messageId: 'wamid.1',
    contextMessageId: null,
    timestamp: 1710000000,
  });
});

test('Feishu channel extracts post text and thread-aware bot messages', () => {
  const feishu = createFeishuChannel();

  assert.deepEqual(feishu.normalizeInboundEvent({
    header: {
      event_type: 'im.message.receive_v1',
      tenant_key: 'tenant-123',
    },
    event: {
      sender: {
        sender_id: {
          open_id: 'ou_123',
        },
      },
      message: {
        message_id: 'om_123',
        message_type: 'post',
        chat_id: 'oc_123',
        thread_id: 'omt_123',
        create_time: '1710000000',
        content: JSON.stringify({
          post: {
            en_us: {
              content: [[{ tag: 'text', text: 'Ship the thin slice first.' }]],
            },
          },
        }),
      },
    },
  }), {
    platform: 'feishu',
    eventType: 'im.message.receive_v1',
    tenantKey: 'tenant-123',
    chatId: 'oc_123',
    senderId: 'ou_123',
    messageId: 'om_123',
    messageType: 'post',
    text: 'Ship the thin slice first.',
    threadId: 'omt_123',
    timestamp: 1710000000,
  });
  assert.deepEqual(feishu.buildBotMessage({
    receiveId: 'oc_123',
    text: 'Acknowledged',
    replyInThread: true,
    threadId: 'omt_123',
  }), {
    receive_id: 'oc_123',
    msg_type: 'text',
    content: JSON.stringify({ text: 'Acknowledged' }),
    reply_in_thread: true,
    thread_id: 'omt_123',
  });
});
