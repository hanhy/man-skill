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

export function createSlackChannel(overrides = {}) {
  return new BaseChannel({ ...slackChannelScaffold, ...overrides });
}
