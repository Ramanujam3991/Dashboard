import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannelType } from 'shared';

const api = {
  invoke: <TReq, TRes>(channel: IpcChannelType, req: TReq): Promise<TRes> => {
    return ipcRenderer.invoke('api:invoke', channel, req);
  },
};

contextBridge.exposeInMainWorld('api', api);
