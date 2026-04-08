import {
  Security,
  BookPosition,
  StreetMetrics,
  VendorRate,
  ShortInterestPrediction,
} from '../entities';

export const IpcChannel = {
  SecurityGetOverview: 'security:getOverview',
  SecuritySearch: 'security:search',
  ClientGetPositions: 'client:getPositions',
  ChatGenerateSuggestion: 'chat:generateSuggestion',
  AuthGetTier: 'auth:getTier',
} as const;

export type IpcChannelType = (typeof IpcChannel)[keyof typeof IpcChannel];

export const IpcStream = {
  PriceTicks: 'stream:priceTicks',
  RateHistory: 'stream:rateHistory',
  QtyOnLoanSeries: 'stream:qtyOnLoanSeries',
  PredictionSeries: 'stream:predictionSeries',
} as const;

export type IpcStreamType = (typeof IpcStream)[keyof typeof IpcStream];

// Base Request/Response mapping
export interface SecurityGetOverviewRequest {
  ticker: string;
  clientId: string;
}

export interface SecurityGetOverviewResponse {
  security: Security;
  ourBook: BookPosition;
  streetPicture: StreetMetrics;
  vendorRates: VendorRate[];
  prediction: ShortInterestPrediction;
  asOf: string;
}

// Subscription Envelope Types
export interface SubscribeRequest<TParams> {
  channel: IpcStreamType;
  params: TParams;
}

export interface StreamEvent<TData> {
  subscriptionId: string;
  data: TData;
  error?: string;
  isDone?: boolean;
}
