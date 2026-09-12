/**
 * Agent 3: Storage & Selling Timing Advisor
 * Deterministic financial comparison: Sell Now vs Store & Sell Later
 * Clear recommendations with assumptions stated.
 */

import { getForecast } from './mandiPriceAgent';

export type Recommendation = 'SELL_NOW' | 'WAIT' | 'STORE_AND_SELL_LATER';

export interface StorageAnalysis {
  recommendation: Recommendation;
  confidence: number; // 0-100
  sellNow: {
    revenue: number;
    pricePerQuintal: number;
    netRevenue: number;
    storageCost: number;
  };
  storeLater: {
    forecastedPrice: number;
    storageDays: number;
    storageCostPerQuintal: number;
    totalStorageCost: number;
    expectedRevenue: number;
    netRevenue: number;
    expectedGain: number;
    breakEvenDays: number;
  };
  summary: string;
  reasoning: string[];
  risks: string[];
  assumptions: string[];
  isDemo: boolean;
}

export async function analyzeStorageDecision(
  crop: string,
  quantityQuintals: number,
  currentPrice: number,
  storageDays: number = 15,
  storageCostPerQuintalPerDay: number = 2.50
): Promise<StorageAnalysis> {
  const forecast = await getForecast(crop);
  const targetForecast = forecast.forecasts.find(f => f.daysAhead === storageDays)
    || forecast.forecasts[Math.min(storageDays - 1, forecast.forecasts.length - 1)];

  const forecastedPrice = targetForecast.predicted;
  const confidence = targetForecast.confidence;

  // Sell now calculations
  const sellNowRevenue = currentPrice * quantityQuintals;
  const storageCostPerQuintal = storageCostPerQuintalPerDay * storageDays;
  const totalStorageCost = storageCostPerQuintal * quantityQuintals;

  // Store and sell later
  const expectedRevenue = forecastedPrice * quantityQuintals;
  const netRevenueLater = expectedRevenue - totalStorageCost;
  const netRevenueNow = sellNowRevenue; // no storage cost if sold now
  const expectedGain = netRevenueLater - netRevenueNow;

  // Break-even: how many days until price increase covers storage cost
  const dailyPriceIncrease = (forecastedPrice - currentPrice) / storageDays;
  const breakEvenDays = dailyPriceIncrease > 0
    ? Math.ceil(storageCostPerQuintalPerDay / dailyPriceIncrease)
    : 999;

  // Determine recommendation
  let recommendation: Recommendation;
  if (expectedGain > 500 && confidence >= 65 && forecast.trend === 'up') {
    recommendation = 'STORE_AND_SELL_LATER';
  } else if (forecast.trend === 'down' || expectedGain < -200) {
    recommendation = 'SELL_NOW';
  } else if (confidence < 60 || Math.abs(expectedGain) < 200) {
    recommendation = 'SELL_NOW'; // when uncertain, default to sell
  } else {
    recommendation = expectedGain > 0 ? 'WAIT' : 'SELL_NOW';
  }

  const reasoning: string[] = [];
  if (forecast.trend === 'up') reasoning.push(`Price trend is rising (+${forecast.trendPct.toFixed(1)}% over last 7 days)`);
  if (forecast.trend === 'down') reasoning.push(`Price trend is falling (${forecast.trendPct.toFixed(1)}% over last 7 days) — better to sell now`);
  if (forecast.trend === 'stable') reasoning.push('Prices are stable — minimal benefit from waiting');
  reasoning.push(`Forecast for ${storageDays} days: ₹${forecastedPrice}/quintal (confidence: ${confidence}%)`);
  reasoning.push(`Storage cost: ₹${storageCostPerQuintal.toFixed(0)}/quintal for ${storageDays} days`);
  if (expectedGain > 0)
    reasoning.push(`Expected net gain from waiting: ₹${Math.round(expectedGain).toLocaleString('en-IN')}`);
  else
    reasoning.push(`Waiting would result in a net loss of ₹${Math.abs(Math.round(expectedGain)).toLocaleString('en-IN')} after storage costs`);
  if (breakEvenDays < storageDays)
    reasoning.push(`Price increase covers storage cost in approximately ${breakEvenDays} days`);

  const risks = [
    'Forecasts are estimates — actual prices may vary',
    'Storage quality risk (moisture, pests) may reduce grade',
    'Market conditions can change due to policy or weather',
    confidence < 70 ? 'Low forecast confidence — higher uncertainty' : 'Moderate to high forecast confidence'
  ];

  const summaryMap: Record<Recommendation, string> = {
    SELL_NOW: `Sell now at ₹${currentPrice}/quintal. Expected net: ₹${netRevenueNow.toLocaleString('en-IN')}. Waiting may not cover storage costs.`,
    WAIT: `Consider waiting a few days. Market shows upward trend but monitor daily prices.`,
    STORE_AND_SELL_LATER: `Store for ${storageDays} days. Expected price: ₹${forecastedPrice}/quintal. Potential extra gain: ₹${Math.round(expectedGain).toLocaleString('en-IN')} after storage costs.`
  };

  return {
    recommendation,
    confidence,
    sellNow: {
      revenue: sellNowRevenue,
      pricePerQuintal: currentPrice,
      netRevenue: netRevenueNow,
      storageCost: 0
    },
    storeLater: {
      forecastedPrice,
      storageDays,
      storageCostPerQuintal,
      totalStorageCost,
      expectedRevenue,
      netRevenue: netRevenueLater,
      expectedGain: Math.round(expectedGain),
      breakEvenDays
    },
    summary: summaryMap[recommendation],
    reasoning,
    risks,
    assumptions: [
      `Storage cost assumed: ₹${storageCostPerQuintalPerDay}/quintal/day`,
      `Forecast based on ${storageDays}-day price model`,
      'No quality degradation assumed during storage',
      'Prices are indicative — verify with your local mandi before deciding'
    ],
    isDemo: process.env.DEMO_MODE === 'true'
  };
}
