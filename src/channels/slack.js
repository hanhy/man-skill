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

export function normalizeSlackInboundEvent(payload = {}) {
  const event = payload?.event && typeof payload.event === 'object' ? payload.event : {};

  return {
    platform: 'slack',
    eventType: typeof event.type === 'string' && event.type.length > 0
      ? event.type
      : (typeof payload?.type === 'string' && payload.type.length > 0 ? payload.type : 'unknown'),
    channelId: typeof event.channel === 'string' && event.channel.length > 0 ? event.channel : null,
    senderId: typeof event.user === 'string' && event.user.length > 0 ? event.user : null,
    text: typeof event.text === 'string' && event.text.length > 0 ? event.text : null,
    ts: typeof event.ts === 'string' && event.ts.length > 0 ? event.ts : null,
    threadTs: typeof event.thread_ts === 'string' && event.thread_ts.length > 0
      ? event.thread_ts
      : (typeof event.ts === 'string' && event.ts.length > 0 ? event.ts : null),
    teamId: typeof payload?.team_id === 'string' && payload.team_id.length > 0
      ? payload.team_id
      : (typeof payload?.authorizations?.[0]?.team_id === 'string' && payload.authorizations[0].team_id.length > 0
        ? payload.authorizations[0].team_id
        : null),
  };
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

  buildThreadReply(options) {
    return buildSlackThreadReply(options);
  }
}

export function createSlackChannel(overrides = {}) {
  return new SlackChannel({ ...slackChannelScaffold, ...overrides });
}
