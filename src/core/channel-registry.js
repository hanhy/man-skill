export class ChannelRegistry {
  constructor(channels = []) {
    this.channels = channels;
  }

  register(channel) {
    this.channels.push(channel);
  }

  summary() {
    return {
      channelCount: this.channels.length,
      channels: this.channels,
    };
  }
}
