// Ambient global declarations for the contextBridge API exposed by the preload.
// IMPORTANT: this file must NOT have any top-level import or export statement —
// that would turn it into a module and break the global Window augmentation.

type IpcChannelLiteral =
  | 'security:getOverview'
  | 'security:search'
  | 'client:getPositions'
  | 'chat:generateSuggestion'
  | 'auth:getTier';

type IpcStreamLiteral =
  | 'stream:priceTicks'
  | 'stream:rateHistory'
  | 'stream:qtyOnLoanSeries'
  | 'stream:predictionSeries';

interface StreamEventLiteral<TData> {
  subscriptionId: string;
  data: TData;
  error?: string;
  isDone?: boolean;
}

declare global {
  interface Window {
    api: {
      invoke<TReq, TRes>(channel: IpcChannelLiteral, req: TReq): Promise<TRes>;
      subscribe<TData>(
        channel: IpcStreamLiteral,
        params: unknown,
        onMessage: (event: StreamEventLiteral<TData>) => void,
      ): string;
      unsubscribe(subscriptionId: string): void;
    };
  }
}
