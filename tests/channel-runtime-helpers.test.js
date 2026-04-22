import test from 'node:test';
import assert from 'node:assert/strict';

import { createSlackChannel } from '../src/channels/slack.js';
import { createTelegramChannel } from '../src/channels/telegram.js';
import { createWhatsAppChannel } from '../src/channels/whatsapp.js';
import { createFeishuChannel } from '../src/channels/feishu.js';

test('Slack channel runtime helpers cover readiness, inbound normalization, and thread replies', () => {
  const channel = createSlackChannel();

  assert.deepEqual(channel.requiredEnvVars(), ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET']);
  assert.deepEqual(channel.missingEnvVars({ SLACK_BOT_TOKEN: 'xoxb-test' }), ['SLACK_SIGNING_SECRET']);
  assert.equal(
    channel.isConfigured({
      SLACK_BOT_TOKEN: 'xoxb-test',
      SLACK_SIGNING_SECRET: 'secret',
    }),
    true,
  );
  assert.deepEqual(
    channel.missingEnvVars({
      SLACK_BOT_TOKEN: '   ',
      SLACK_SIGNING_SECRET: 'secret',
    }),
    ['SLACK_BOT_TOKEN'],
  );
  assert.equal(
    channel.isConfigured({
      SLACK_BOT_TOKEN: '   ',
      SLACK_SIGNING_SECRET: 'secret',
    }),
    false,
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      team_id: 'T-team',
      event: {
        type: 'app_mention',
        channel: 'C123',
        user: 'U456',
        text: '<@Ubot> ship it',
        ts: '1710000000.100200',
        thread_ts: '1710000000.000100',
      },
    }),
    {
      platform: 'slack',
      eventType: 'app_mention',
      channelId: 'C123',
      senderId: 'U456',
      text: '<@Ubot> ship it',
      ts: '1710000000.100200',
      threadTs: '1710000000.000100',
      teamId: 'T-team',
    },
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      team_id: 'T-team',
      event: {
        type: 'message',
        subtype: 'message_changed',
        hidden: true,
        channel: 'C123',
        ts: '1710000001.100200',
        message: {
          type: 'message',
          user: 'U789',
          text: 'updated thread reply',
          ts: '1710000001.000100',
          thread_ts: '1710000000.000100',
        },
      },
    }),
    {
      platform: 'slack',
      eventType: 'message_changed',
      channelId: 'C123',
      senderId: 'U789',
      text: 'updated thread reply',
      ts: '1710000001.000100',
      threadTs: '1710000000.000100',
      teamId: 'T-team',
    },
  );

  assert.deepEqual(
    channel.buildWebhookResponse({ type: 'url_verification', challenge: 'challenge-token' }),
    { challenge: 'challenge-token' },
  );
  assert.equal(channel.buildWebhookResponse({ type: 'event_callback' }), null);

  assert.deepEqual(
    channel.buildThreadReply({
      channelId: 'C123',
      text: 'done',
      threadTs: '1710000000.000100',
      replyBroadcast: true,
    }),
    {
      channel: 'C123',
      text: 'done',
      thread_ts: '1710000000.000100',
      reply_broadcast: true,
    },
  );
});

test('Telegram channel runtime helpers cover readiness, callback normalization, callback answers, and chat sends', () => {
  const channel = createTelegramChannel();

  assert.deepEqual(channel.requiredEnvVars(), ['TELEGRAM_BOT_TOKEN']);
  assert.deepEqual(channel.missingEnvVars({}), ['TELEGRAM_BOT_TOKEN']);
  assert.equal(channel.isConfigured({ TELEGRAM_BOT_TOKEN: 'telegram-token' }), true);

  assert.deepEqual(
    channel.normalizeInboundEvent({
      update_id: 999,
      callback_query: {
        id: 'cbq-1',
        data: 'approve',
        from: { id: 42 },
        message: {
          message_id: 314,
          message_thread_id: 77,
          date: 1710000100,
          text: 'fallback text',
          chat: {
            id: -100123,
            type: 'supergroup',
          },
        },
      },
    }),
    {
      platform: 'telegram',
      eventType: 'callback_query',
      updateId: 999,
      callbackQueryId: 'cbq-1',
      chatId: -100123,
      senderId: 42,
      text: 'approve',
      messageId: 314,
      threadId: 77,
      chatType: 'supergroup',
      timestamp: 1710000100,
    },
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      update_id: 1000,
      callback_query: {
        id: 'cbq-inline',
        data: 'approve-inline',
        from: { id: 84 },
      },
    }),
    {
      platform: 'telegram',
      eventType: 'callback_query',
      updateId: 1000,
      callbackQueryId: 'cbq-inline',
      chatId: null,
      senderId: 84,
      text: 'approve-inline',
      messageId: null,
      threadId: null,
      chatType: null,
      timestamp: null,
    },
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      update_id: 1001,
      channel_post: {
        message_id: 400,
        date: 1710000101,
        caption: 'Channel caption update',
        chat: {
          id: -100777,
          type: 'channel',
        },
        sender_chat: {
          id: -100777,
        },
      },
    }),
    {
      platform: 'telegram',
      eventType: 'channel_post',
      updateId: 1001,
      callbackQueryId: null,
      chatId: -100777,
      senderId: -100777,
      text: 'Channel caption update',
      messageId: 400,
      threadId: null,
      chatType: 'channel',
      timestamp: 1710000101,
    },
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      update_id: 1002,
      edited_channel_post: {
        message_id: 401,
        date: 1710000102,
        text: 'Edited channel broadcast',
        chat: {
          id: -100778,
          type: 'channel',
        },
        sender_chat: {
          id: -100778,
        },
      },
    }),
    {
      platform: 'telegram',
      eventType: 'edited_channel_post',
      updateId: 1002,
      callbackQueryId: null,
      chatId: -100778,
      senderId: -100778,
      text: 'Edited channel broadcast',
      messageId: 401,
      threadId: null,
      chatType: 'channel',
      timestamp: 1710000102,
    },
  );

  assert.deepEqual(
    channel.buildCallbackAnswer({
      callbackQueryId: 'cbq-1',
      text: 'Queued for review.',
      showAlert: true,
      url: 'https://example.com/runs/123',
      cacheTime: 5,
    }),
    {
      callback_query_id: 'cbq-1',
      text: 'Queued for review.',
      show_alert: true,
      url: 'https://example.com/runs/123',
      cache_time: 5,
    },
  );

  assert.deepEqual(
    channel.buildChatSend({
      chatId: -100123,
      text: 'ship the thin slice',
      parseMode: 'MarkdownV2',
      threadId: 77,
      replyToMessageId: 314,
      disableNotification: true,
    }),
    {
      chat_id: -100123,
      text: 'ship the thin slice',
      disable_notification: true,
      parse_mode: 'MarkdownV2',
      message_thread_id: 77,
      reply_to_message_id: 314,
    },
  );
});

test('WhatsApp channel runtime helpers cover readiness, interactive inbound replies, verification, and session sends', () => {
  const channel = createWhatsAppChannel();

  assert.deepEqual(channel.requiredEnvVars(), ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']);
  assert.deepEqual(
    channel.missingEnvVars({ WHATSAPP_ACCESS_TOKEN: 'wa-token' }),
    ['WHATSAPP_PHONE_NUMBER_ID'],
  );
  assert.equal(
    channel.isConfigured({
      WHATSAPP_ACCESS_TOKEN: 'wa-token',
      WHATSAPP_PHONE_NUMBER_ID: '123456789',
    }),
    true,
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1' },
                contacts: [
                  {
                    wa_id: '15550001',
                    profile: { name: 'Harry' },
                  },
                ],
                messages: [
                  {
                    from: '15550001',
                    id: 'wamid-1',
                    timestamp: '1710000200',
                    type: 'interactive',
                    interactive: {
                      button_reply: {
                        id: 'btn-1',
                        title: 'Ship it',
                      },
                    },
                    context: { id: 'wamid-parent' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
    {
      platform: 'whatsapp',
      eventType: 'interactive',
      phoneNumberId: 'phone-1',
      senderId: '15550001',
      profileName: 'Harry',
      text: 'Ship it',
      interactiveReplyType: 'button_reply',
      interactiveReplyId: 'btn-1',
      interactiveReplyTitle: 'Ship it',
      interactiveReplyDescription: null,
      messageId: 'wamid-1',
      contextMessageId: 'wamid-parent',
      timestamp: 1710000200,
    },
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1' },
                contacts: [
                  {
                    wa_id: '15550001',
                    profile: { name: 'Harry' },
                  },
                ],
                messages: [
                  {
                    from: '15550001',
                    id: 'wamid-2',
                    timestamp: '1710000201',
                    type: 'interactive',
                    interactive: {
                      list_reply: {
                        id: 'list-1',
                        title: 'Review later',
                        description: 'Send it to the review queue',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    }),
    {
      platform: 'whatsapp',
      eventType: 'interactive',
      phoneNumberId: 'phone-1',
      senderId: '15550001',
      profileName: 'Harry',
      text: 'Review later',
      interactiveReplyType: 'list_reply',
      interactiveReplyId: 'list-1',
      interactiveReplyTitle: 'Review later',
      interactiveReplyDescription: 'Send it to the review queue',
      messageId: 'wamid-2',
      contextMessageId: null,
      timestamp: 1710000201,
    },
  );

  assert.equal(
    channel.buildWebhookVerificationResponse({
      'hub.mode': 'subscribe',
      'hub.challenge': 'verify-me',
    }),
    'verify-me',
  );
  assert.equal(channel.buildWebhookVerificationResponse({ 'hub.mode': 'messages' }), null);

  assert.deepEqual(
    channel.buildSessionSend({
      to: '15550001',
      text: 'done',
      previewUrl: true,
      contextMessageId: 'wamid-parent',
    }),
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '15550001',
      type: 'text',
      text: {
        body: 'done',
        preview_url: true,
      },
      context: {
        message_id: 'wamid-parent',
      },
    },
  );
});

test('Feishu channel runtime helpers cover readiness, rich-post text normalization, verification, and bot replies', () => {
  const channel = createFeishuChannel();

  assert.deepEqual(channel.requiredEnvVars(), ['FEISHU_APP_ID', 'FEISHU_APP_SECRET']);
  assert.deepEqual(channel.missingEnvVars({ FEISHU_APP_ID: 'cli-id' }), ['FEISHU_APP_SECRET']);
  assert.equal(
    channel.isConfigured({
      FEISHU_APP_ID: 'cli-id',
      FEISHU_APP_SECRET: 'cli-secret',
    }),
    true,
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      type: 'event_callback',
      header: {
        event_type: 'im.message.receive_v1',
        tenant_key: 'tenant-1',
      },
      event: {
        sender: {
          sender_id: {
            open_id: 'ou_sender',
          },
        },
        message: {
          message_id: 'om_message_1',
          message_type: 'post',
          chat_id: 'oc_chat_1',
          thread_id: 'omt-thread-1',
          create_time: '1710000300',
          content: JSON.stringify({
            post: {
              zh_cn: {
                title: 'Daily notes',
                content: [
                  [
                    { tag: 'text', text: 'Ship' },
                    { tag: 'text', text: 'the' },
                  ],
                  [
                    { tag: 'text', text: 'thin' },
                    { tag: 'text', text: 'slice' },
                  ],
                ],
              },
            },
          }),
        },
      },
    }),
    {
      platform: 'feishu',
      eventType: 'im.message.receive_v1',
      tenantKey: 'tenant-1',
      chatId: 'oc_chat_1',
      senderId: 'ou_sender',
      messageId: 'om_message_1',
      messageType: 'post',
      text: 'Ship the thin slice',
      threadId: 'omt-thread-1',
      timestamp: 1710000300,
    },
  );

  assert.equal(
    channel.normalizeInboundEvent({
      type: 'event_callback',
      header: {
        event_type: 'im.message.receive_v1',
        tenant_key: 'tenant-1',
      },
      event: {
        sender: {
          sender_id: {
            open_id: 'ou_sender',
          },
        },
        message: {
          message_id: 'om_message_2',
          message_type: 'post',
          chat_id: 'oc_chat_1',
          thread_id: 'omt-thread-1',
          create_time: '1710000301',
          content: JSON.stringify({
            post: {
              zh_cn: {
                title: 'Daily notes',
                content: [
                  [],
                ],
              },
              en_us: {
                title: 'Daily notes',
                content: [
                  [
                    { tag: 'text', text: 'Ship' },
                    { tag: 'text', text: 'the' },
                    { tag: 'text', text: 'thin' },
                    { tag: 'text', text: 'slice' },
                  ],
                ],
              },
            },
          }),
        },
      },
    }).text,
    'Ship the thin slice',
  );

  assert.equal(
    channel.normalizeInboundEvent({
      type: 'event_callback',
      header: {
        event_type: 'im.message.receive_v1',
        tenant_key: 'tenant-1',
      },
      event: {
        sender: {
          sender_id: {
            open_id: 'ou_sender',
          },
        },
        message: {
          message_id: 'om_message_2b',
          message_type: 'post',
          chat_id: 'oc_chat_1',
          thread_id: 'omt-thread-1',
          create_time: '1710000301',
          content: JSON.stringify({
            post: {
              zh_cn: {
                title: 'Daily notes',
                content: [
                  [
                    { tag: 'text', text: 'Ship' },
                    { tag: 'text', text: 'the' },
                  ],
                ],
              },
              en_us: {
                title: 'Daily notes',
                content: [
                  [
                    { tag: 'text', text: 'thin' },
                    { tag: 'text', text: 'slice' },
                  ],
                ],
              },
            },
          }),
        },
      },
    }).text,
    'Ship the thin slice',
  );

  assert.deepEqual(
    channel.normalizeInboundEvent({
      type: 'event_callback',
      header: {
        event_type: 'im.message.receive_v1',
        tenant_key: 'tenant-1',
      },
      event: {
        sender: {
          sender_id: {
            open_id: 'ou_sender',
          },
        },
        message: {
          message_id: 'om_message_3',
          message_type: 'text',
          chat_id: 'oc_chat_1',
          create_time: '1710000302',
          content: {
            text: 'Already parsed object payload',
          },
        },
      },
    }),
    {
      platform: 'feishu',
      eventType: 'im.message.receive_v1',
      tenantKey: 'tenant-1',
      chatId: 'oc_chat_1',
      senderId: 'ou_sender',
      messageId: 'om_message_3',
      messageType: 'text',
      text: 'Already parsed object payload',
      threadId: null,
      timestamp: 1710000302,
    },
  );

  assert.deepEqual(
    channel.buildWebhookResponse({ type: 'url_verification', challenge: 'challenge-token' }),
    { challenge: 'challenge-token' },
  );
  assert.equal(channel.buildWebhookResponse({ type: 'event_callback' }), null);

  assert.deepEqual(
    channel.buildBotMessage({
      receiveId: 'oc_chat_1',
      text: 'done',
      replyInThread: true,
      threadId: 'omt-thread-1',
    }),
    {
      receive_id: 'oc_chat_1',
      msg_type: 'text',
      content: JSON.stringify({ text: 'done' }),
      reply_in_thread: true,
      thread_id: 'omt-thread-1',
    },
  );
});
