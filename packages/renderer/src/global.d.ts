// This file augments the global Window interface to include the typed API
// exposed by the preload script via contextBridge.
// It must NOT have any top-level import/export — that would turn it into a
// module scope and break the ambient augmentation.
// We use the string literal union directly to avoid an import.

type IpcChannelLiteral =
  | 'security:getOverview'
  | 'security:search'
  | 'client:getPositions'
  | 'chat:generateSuggestion'
  | 'auth:getTier';

declare global {
  interface Window {
    api: {
      invoke<TReq, TRes>(channel: IpcChannelLiteral, req: TReq): Promise<TRes>;
    };
  }
}
