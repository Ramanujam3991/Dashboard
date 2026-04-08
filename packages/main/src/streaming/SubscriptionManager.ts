import { WebContents } from 'electron';
import { IpcStreamType, StreamEvent } from 'shared';

interface Subscriber {
  subscriptionId: string;
  webContents: WebContents;
}

interface UpstreamEntry {
  timer: ReturnType<typeof setInterval>;
  subscribers: Map<string, Subscriber>;
}

// Returns a stable cache key for a (channel, params) pair.
function makeParamsKey(params: unknown): string {
  return JSON.stringify(params);
}

// Returns the IPC event name renderer listens on for a given subscriptionId.
export function streamEventChannel(subscriptionId: string): string {
  return `stream:event:${subscriptionId}`;
}

export class SubscriptionManager {
  // upstreamKey → upstream entry (one interval per unique channel+params)
  private readonly upstreams = new Map<string, UpstreamEntry>();

  // subscriptionId → upstreamKey (for fast unsubscribe lookup)
  private readonly subToUpstream = new Map<string, string>();

  subscribe(
    channel: IpcStreamType,
    params: unknown,
    webContents: WebContents,
    subscriptionId: string,
  ): void {
    const upstreamKey = `${channel}:${makeParamsKey(params)}`;

    let entry = this.upstreams.get(upstreamKey);

    if (!entry) {
      // Create a new upstream stub for this (channel, params) pair.
      const timer = this.createStubUpstream(channel, params, upstreamKey);
      entry = { timer, subscribers: new Map() };
      this.upstreams.set(upstreamKey, entry);
    }

    entry.subscribers.set(subscriptionId, { subscriptionId, webContents });
    this.subToUpstream.set(subscriptionId, upstreamKey);
  }

  unsubscribe(subscriptionId: string): void {
    const upstreamKey = this.subToUpstream.get(subscriptionId);
    if (!upstreamKey) return;

    const entry = this.upstreams.get(upstreamKey);
    if (!entry) return;

    entry.subscribers.delete(subscriptionId);
    this.subToUpstream.delete(subscriptionId);

    // If no subscribers remain, tear down the upstream interval.
    if (entry.subscribers.size === 0) {
      clearInterval(entry.timer);
      this.upstreams.delete(upstreamKey);
    }
  }

  private createStubUpstream(
    channel: IpcStreamType,
    params: unknown,
    upstreamKey: string,
  ): ReturnType<typeof setInterval> {
    let basePrice = 100 + Math.random() * 400;

    return setInterval(() => {
      const entry = this.upstreams.get(upstreamKey);
      if (!entry) return;

      // Simulate a small random price walk for the stub.
      basePrice = basePrice + (Math.random() - 0.5) * 2;

      const payload = this.buildStubPayload(channel, params, basePrice);

      for (const { subscriptionId, webContents } of entry.subscribers.values()) {
        if (webContents.isDestroyed()) {
          this.unsubscribe(subscriptionId);
          continue;
        }
        const event: StreamEvent<unknown> = {
          subscriptionId,
          data: payload,
        };
        webContents.send(streamEventChannel(subscriptionId), event);
      }
    }, 1000);
  }

  private buildStubPayload(channel: IpcStreamType, params: unknown, price: number): unknown {
    const ticker =
      params !== null &&
      typeof params === 'object' &&
      'ticker' in params &&
      typeof (params as Record<string, unknown>).ticker === 'string'
        ? (params as Record<string, string>).ticker
        : 'UNKNOWN';

    switch (channel) {
      case 'stream:priceTicks':
        return {
          ticker,
          price: parseFloat(price.toFixed(2)),
          changePct: parseFloat(((Math.random() - 0.5) * 4).toFixed(2)),
          volume: Math.floor(Math.random() * 1_000_000),
          timestamp: new Date().toISOString(),
        };
      case 'stream:rateHistory':
        return {
          timestamp: new Date().toISOString(),
          rate: parseFloat((Math.random() * 10).toFixed(4)),
        };
      default:
        return { timestamp: new Date().toISOString(), value: price };
    }
  }
}
