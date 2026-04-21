import { BaseChannel } from './base-channel.js';

export const slackChannelScaffold = {
  id: 'slack',
  name: 'Slack',
  transport: 'chat',
  direction: ['inbound', 'outbound'],
  status: 'planned',
  capabilities: ['threads', 'mentions', 'bot-token'],
  auth: {
    type: 'bot-token',
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
  },
  deliveryModes: ['events-api', 'web-api'],
  inboundPath: '/hooks/slack/events',
  outboundMode: 'thread-reply',
  implementationPath: 'src/channels/slack.js',
  nextStep: 'implement inbound event handling and outbound thread replies',
};

function pickSlackMessageRecord(event = {}) {
  if (event?.subtype === 'message_changed' && event.message && typeof event.message === 'object') {
    return event.message;
  }

  return event;
}

export function normalizeSlackInboundEvent(payload = {}) {
  const event = payload?.event && typeof payload.event === 'object' ? payload.event : {};
  const messageRecord = pickSlackMessageRecord(event);

  const eventType = typeof event?.subtype === 'string' && event.subtype.length > 0
    ? event.subtype
    : (typeof event.type === 'string' && event.type.length > 0
      ? event.type
      : (typeof payload?.type === 'string' && payload.type.length > 0 ? payload.type : 'unknown'));
  const ts = typeof messageRecord?.ts === 'string' && messageRecord.ts.length > 0
    ? messageRecord.ts
    : (typeof event?.ts === 'string' && event.ts.length > 0 ? event.ts : null);

  return {
    platform: 'slack',
    eventType,
    channelId: typeof messageRecord?.channel === 'string' && messageRecord.channel.length > 0
      ? messageRecord.channel
      : (typeof event?.channel === 'string' && event.channel.length > 0 ? event.channel : null),
    senderId: typeof messageRecord?.user === 'string' && messageRecord.user.length > 0
      ? messageRecord.user
      : (typeof event?.user === 'string' && event.user.length > 0 ? event.user : null),
    text: typeof messageRecord?.text === 'string' && messageRecord.text.length > 0 ? messageRecord.text : null,
    ts,
    threadTs: typeof messageRecord?.thread_ts === 'string' && messageRecord.thread_ts.length > 0
      ? messageRecord.thread_ts
      : (typeof event?.thread_ts === 'string' && event.thread_ts.length > 0
        ? event.thread_ts
        : ts),
    teamId: typeof payload?.team_id === 'string' && payload.team_id.length > 0
      ? payload.team_id
      : (typeof payload?.authorizations?.[0]?.team_id === 'string' && payload.authorizations[0].team_id.length > 0
        ? payload.authorizations[0].team_id
        : null),
  };
}

export function buildSlackWebhookResponse(payload = {}) {
  if (payload?.type === 'url_verification' && typeof payload?.challenge === 'string' && payload.challenge.length > 0) {
    return {
      challenge: payload.challenge,
    };
  }

  return null;
}

export function buildSlackThreadReply({ channelId, text, threadTs, replyBroadcast = false } = {}) {
  return {
    channel: channelId,
    text,
    thread_ts: threadTs,
    reply_broadcast: Boolean(replyBroadcast),
  };
}

export class SlackChannel extends BaseChannel {
  normalizeInboundEvent(payload) {
    return normalizeSlackInboundEvent(payload);
  }

  buildWebhookResponse(payload) {
    return buildSlackWebhookResponse(payload);
  }

  buildThreadReply(options) {
    return buildSlackThreadReply(options);
  }
}

export function createSlackChannel(overrides = {}) {
  return new SlackChannel({ ...slackChannelScaffold, ...overrides });
}
