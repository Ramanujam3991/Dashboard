import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannelType, IpcStreamType, StreamEvent } from 'shared';

// A unique, monotonically increasing subscription ID generator.
// Using a counter (rather than crypto.randomUUID) avoids a dep on the
// Web Crypto API, which may not be available in the preload context.
let nextSubId = 0;
function generateSubId(): string {
  nextSubId += 1;
  return `sub_${Date.now()}_${nextSubId}`;
}

const api = {
  invoke: <TReq, TRes>(channel: IpcChannelType, req: TReq): Promise<TRes> => {
    return ipcRenderer.invoke('api:invoke', channel, req);
  },

  subscribe: <TData>(
    channel: IpcStreamType,
    params: unknown,
    onMessage: (event: StreamEvent<TData>) => void,
  ): string => {
    const subscriptionId = generateSubId();
    const ipcChannel = `stream:event:${subscriptionId}`;

    ipcRenderer.on(ipcChannel, (_event, streamEvent: StreamEvent<TData>) => {
      onMessage(streamEvent);
    });

    ipcRenderer.send('stream:subscribe', channel, params, subscriptionId);
    return subscriptionId;
  },

  unsubscribe: (subscriptionId: string): void => {
    ipcRenderer.send('stream:unsubscribe', subscriptionId);
    ipcRenderer.removeAllListeners(`stream:event:${subscriptionId}`);
  },
};

contextBridge.exposeInMainWorld('api', api);
