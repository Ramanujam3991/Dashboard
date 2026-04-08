import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IpcChannelType, IpcStreamType } from 'shared';
import { SubscriptionManager } from '../streaming/SubscriptionManager';

// A handler maps a typed request to a typed response.
// We use `unknown` at the boundary and cast inside register() where the caller
// provides the concrete types — keeping the Map itself homogeneous.
type BoundaryHandler = (req: unknown) => Promise<unknown>;

const registry = new Map<IpcChannelType, BoundaryHandler>();
const subscriptionManager = new SubscriptionManager();

export const ipcRouter = {
  register: <TReq, TRes>(channel: IpcChannelType, handler: (req: TReq) => Promise<TRes>) => {
    // Cast is safe: the caller owns the types at the call-site.
    const boundaryHandler: BoundaryHandler = (req) => handler(req as TReq);
    registry.set(channel, boundaryHandler);
  },

  init: () => {
    ipcMain.handle(
      'api:invoke',
      async (_event: IpcMainInvokeEvent, channel: IpcChannelType, req: unknown) => {
        const handler = registry.get(channel);
        if (!handler) {
          throw new Error(`[IPC] No handler registered for channel: ${channel}`);
        }
        try {
          return await handler(req);
        } catch (err) {
          console.error(`[IPC] Error executing handler for ${channel}:`, err);
          throw err;
        }
      },
    );

    // Subscription (streaming) messages use send/on, not invoke/handle,
    // because they are fire-and-forget from the renderer.
    ipcMain.on(
      'stream:subscribe',
      (event, channel: IpcStreamType, params: unknown, subscriptionId: string) => {
        console.log(`[IPC] subscribe channel=${channel} id=${subscriptionId}`);
        subscriptionManager.subscribe(channel, params, event.sender, subscriptionId);
      },
    );

    ipcMain.on('stream:unsubscribe', (_event, subscriptionId: string) => {
      console.log(`[IPC] unsubscribe id=${subscriptionId}`);
      subscriptionManager.unsubscribe(subscriptionId);
    });
  },
};
