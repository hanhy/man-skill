import { BaseChannel } from './base-channel.js';
import { DEFAULT_CHANNEL_SCAFFOLDS } from './scaffolds.js';

export function createDefaultChannels() {
  return DEFAULT_CHANNEL_SCAFFOLDS.map((channel) => new BaseChannel({ ...channel }));
}
