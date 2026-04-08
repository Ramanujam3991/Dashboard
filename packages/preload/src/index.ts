import { contextBridge } from 'electron';

const api = {
  // Empty window.api for now
};

contextBridge.exposeInMainWorld('api', api);
