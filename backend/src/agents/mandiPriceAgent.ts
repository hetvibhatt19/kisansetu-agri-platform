/**
 * Agent 1: Mandi Price Forecasting Agent
 * - Real-time / mock mandi prices
 * - Historical price analysis
 * - 7/15/30-day forecast
 * - Confidence scores and trend factors
 */
import { query } from '../db/pool';
import { MOCK_CURRENT_PRICES, MOCK_MANDIS, generateHistoricalPrices, generateForecast } from '../db/mockData';

const DEMO_MODE = () => process.env.DEMO_MODE === 'true';

export interface PriceData {
  mandi: string;
  district: string;
  crop: string;
  price: number;
  min: number;
  max: number;
  arrival: number;
  date: string;
  source: 'live' | 'demo';
}

export interface ForecastPoint {
  date: string;
  predicted: number;
  low: number;
  high: number;
  confidence: number;
  daysAhead: number;
}

export interface PriceForecastResult {
  crop: string;
  currentPrice: number;
  trend: 'up' | 'down' | 'stable';
  trendPct: number;
  forecasts: ForecastPoint[];
  historicalPrices: { date: string; price: number; min: number; max: number }[];
  factors: string[];
  summary: string;
  isDemo: boolean;
}

export async function getCurrentPrices(crop?: string, district?: string): Promise<PriceData[]> {
  const today = new Date().toISOString().split('T')[0];

  if (!DEMO_MODE()) {
    try {
      let q = `
        SELECT mp.price_per_quintal as price, mp.min_price as min, mp.max_price as max,
               mp.modal_price, mp.arrival_quantity_quintals as arrival, mp.price_date as date,
               mp.source, m.name as mandi, m.district, c.name as crop
        FROM mandi_prices mp
        JOIN mandis m ON m.id = mp.mandi_id
        JOIN crops c ON c.id = mp.crop_id
        WHERE mp.price_date = $1
      `;
      const params: any[] = [today];
      if (crop) { q += ` AND LOWER(c.name) = LOWER($${params.length + 1})`; params.push(crop); }
      if (district) { q += ` AND LOWER(m.district) = LOWER($${params.length + 1})`; params.push(district); }
      q += ' ORDER BY mp.price_per_quintal DESC';
      const result = await query(q, params);
      if (result.rows.length > 0) {
        return result.rows.map((r: any) => ({ ...r, source: 'live' as const }));
      }
    } catch { /* fall through to demo */ }
  }

  // Demo mode
  let prices = MOCK_CURRENT_PRICES.map(p => ({ ...p, date: today, source: 'demo' as const }));
  if (crop) prices = prices.filter(p => p.crop.toLowerCase() === crop.toLowerCase());
  if (district) prices = prices.filter(p => p.district.toLowerCase() === district.toLowerCase());
  return prices;
}

export async function getHistoricalPrices(crop: string, mandiId?: string, days = 90) {
  if (!DEMO_MODE()) {
    try {
      const result = await query(`
        SELECT hp.price_per_quintal as price, hp.min_price as min, hp.max_price as max, hp.price_date as date
        FROM historical_prices hp
        JOIN crops c ON c.id = hp.crop_id
        WHERE LOWER(c.name) = LOWER($1) AND hp.price_date >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY hp.price_date ASC
      `, [crop]);
      if (result.rows.length > 5) return result.rows;
    } catch { }
  }
  return generateHistoricalPrices(crop as any, days);
}

export async function getForecast(crop: string): Promise<PriceForecastResult> {
  const prices = await getCurrentPrices(crop);
  const currentPrice = prices.length > 0 ? prices[0].price : (crop.toLowerCase() === 'cotton' ? 6850 : 5420);
  const historical = await getHistoricalPrices(crop);

  // Calculate trend from last 7 days
  const last7 = historical.slice(-7);
  const trendPct = last7.length >= 2
    ? ((last7[last7.length - 1].price - last7[0].price) / last7[0].price) * 100
    : 0;
  const trend = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'stable';

  const forecasts = generateForecast(crop as any, currentPrice);

  const factors = crop.toLowerCase() === 'cotton'
    ? ['Seasonal harvest supply increase', 'Export demand from textile sector', 'MSP policy stability', 'Rainfall impact on quality', 'Global cotton price index']
    : ['Post-monsoon crop arrival', 'Oil mill demand in Gujarat', 'International groundnut oil prices', 'Storage stock levels', 'Kharif season output'];

  const trendLabel = trend === 'up' ? 'rising' : trend === 'down' ? 'falling' : 'stable';
  const summary = `${crop} prices at ${currentPrice} ₹/quintal. Trend is ${trendLabel} (${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}% over last 7 days). `
    + `7-day forecast: ₹${forecasts[6].low}–${forecasts[6].high}. `
    + (trend === 'up' ? 'Prices expected to improve in short term.' : trend === 'down' ? 'Consider selling soon to avoid further loss.' : 'Prices stable — monitor market for opportunity.');

  return {
    crop,
    currentPrice,
    trend,
    trendPct: parseFloat(trendPct.toFixed(2)),
    forecasts,
    historicalPrices: historical,
    factors,
    summary,
    isDemo: DEMO_MODE() || prices[0]?.source === 'demo'
  };
}
