export interface SecurityBadge {
  id: string;
  label: string;
  color: string;
}

export interface Security {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
  price: number;
  changePct: number;
  badges: SecurityBadge[];
  earningsDate: string | null;
  summary: string;
}

export interface StrategyBreakdown {
  name: string;
  qty: number;
  pct: number;
}

export interface BookPosition {
  shortQty: number;
  offerRate: number;
  availableQty: number;
  utilization: number;
  loanableQty: number;
  daysToCover: number;
  internalizationPct: number;
  ourMarketShare: number;
  strategies: StrategyBreakdown[];
  notional: number;
  dailyRevenue: number;
}

export interface StreetMetrics {
  qtyOnLoan: number;
  borrowRate: number;
  utilization: number;
  daysToCover: number;
}

export interface VendorRate {
  vendor: string;
  rate: number;
  isHighest: boolean;
  isLowest: boolean;
}

export interface ShortInterestPrediction {
  predictedQty: number;
  confidence: number;
  trend: 'up' | 'down' | 'flat';
  drivers: string[];
}
