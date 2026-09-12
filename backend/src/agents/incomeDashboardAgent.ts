/**
 * Agent 5: Farmer Income Dashboard Agent
 * Aggregates farmer's transaction history, current listings, market prices.
 * Generates personalised insights and recommendations.
 */
import { query } from '../db/pool';
import { getCurrentPrices, getForecast } from './mandiPriceAgent';

const DEMO_MODE = () => process.env.DEMO_MODE === 'true';

const DEMO_TRANSACTIONS = [
  { crop: 'Cotton', quantity: 15, price: 6800, total: 102000, date: '2024-10-15', grade: 'A', buyer: 'Saurashtra Cotton Mills' },
  { crop: 'Groundnut', quantity: 10, price: 5300, total: 53000, date: '2024-09-30', grade: 'B', buyer: 'Gujarat Agro Traders' }
];

export interface DashboardData {
  summary: {
    totalQuantitySold: number;
    totalRevenue: number;
    averageSellingPrice: number;
    currentCottonPrice: number;
    currentGroundnutPrice: number;
    cottonTrend: string;
    groundnutTrend: string;
  };
  revenueByMonth: { month: string; revenue: number }[];
  transactions: { crop: string; quantity: number; price: number; total: number; date: string; grade: string; buyer: string }[];
  currentListings: { crop: string; quantity: number; grade: string; expectedPrice: number; status: string }[];
  cropValues: { crop: string; quantity: number; currentPrice: number; estimatedValue: number; potentialValue: number }[];
  bestBuyer: { name: string; crop: string; price: number; advantage: number } | null;
  insights: string[];
  sellNowRecommendation: string;
  isDemo: boolean;
}

export async function getFarmerDashboard(farmerId: string): Promise<DashboardData> {
  let transactions = DEMO_TRANSACTIONS;
  let listings: any[] = [];

  if (!DEMO_MODE()) {
    try {
      const txResult = await query(`
        SELECT c.name as crop, t.quantity_quintals as quantity, t.price_per_quintal as price,
               t.total_amount as total, t.transaction_date as date, t.quality_grade as grade,
               u.name as buyer
        FROM transactions t
        JOIN crops c ON c.id = t.crop_id
        JOIN users u ON u.id = t.buyer_id
        WHERE t.farmer_id = $1
        ORDER BY t.transaction_date DESC LIMIT 20
      `, [farmerId]);
      if (txResult.rows.length > 0) transactions = txResult.rows;

      const listResult = await query(`
        SELECT c.name as crop, fl.quantity_quintals as quantity, fl.quality_grade as grade,
               fl.expected_price_per_quintal as "expectedPrice", fl.status
        FROM farmer_listings fl
        JOIN crops c ON c.id = fl.crop_id
        WHERE fl.farmer_id = $1 AND fl.status = 'active'
      `, [farmerId]);
      listings = listResult.rows;
    } catch { }
  }

  if (listings.length === 0) {
    listings = [
      { crop: 'Cotton', quantity: 20, grade: 'A', expectedPrice: 7000, status: 'active' }
    ];
  }

  // Current prices
  const cottonPrices = await getCurrentPrices('Cotton');
  const groundnutPrices = await getCurrentPrices('Groundnut');
  const cottonPrice = cottonPrices[0]?.price || 6850;
  const groundnutPrice = groundnutPrices[0]?.price || 5420;

  const cottonForecast = await getForecast('Cotton');
  const groundnutForecast = await getForecast('Groundnut');

  // Aggregate transaction data
  const totalQuantitySold = transactions.reduce((s, t) => s + Number(t.quantity), 0);
  const totalRevenue = transactions.reduce((s, t) => s + Number(t.total), 0);
  const avgPrice = totalQuantitySold > 0 ? Math.round(totalRevenue / totalQuantitySold) : 0;

  // Revenue by month
  const monthMap: Record<string, number> = {};
  transactions.forEach(t => {
    const month = new Date(t.date).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    monthMap[month] = (monthMap[month] || 0) + Number(t.total);
  });
  const revenueByMonth = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));

  // Crop values (current listings)
  const cropValues = listings.map(l => {
    const currPrice = l.crop.toLowerCase() === 'cotton' ? cottonPrice : groundnutPrice;
    const forecast7 = l.crop.toLowerCase() === 'cotton'
      ? cottonForecast.forecasts[6]?.predicted : groundnutForecast.forecasts[6]?.predicted;
    return {
      crop: l.crop,
      quantity: Number(l.quantity),
      currentPrice: currPrice,
      estimatedValue: Math.round(currPrice * Number(l.quantity)),
      potentialValue: Math.round((forecast7 || currPrice) * Number(l.quantity))
    };
  });

  // Best buyer for first active listing
  const firstListing = listings[0];
  let bestBuyer = null;
  if (firstListing) {
    const { MOCK_BUYERS } = await import('../db/mockData');
    const matchingBuyers = MOCK_BUYERS.filter(b => b.crop.toLowerCase() === firstListing.crop?.toLowerCase());
    if (matchingBuyers.length > 0) {
      const best = matchingBuyers.sort((a, b) => b.offeredPrice - a.offeredPrice)[0];
      const currPrice = firstListing.crop?.toLowerCase() === 'cotton' ? cottonPrice : groundnutPrice;
      bestBuyer = { name: best.name, crop: best.crop, price: best.offeredPrice, advantage: best.offeredPrice - currPrice };
    }
  }

  // Personalised insights
  const insights: string[] = [];
  if (cottonForecast.trend === 'up') insights.push('Cotton prices are rising — consider holding stock for a few more days');
  if (cottonForecast.trend === 'down') insights.push('Cotton prices are falling — consider selling soon');
  if (bestBuyer && bestBuyer.advantage > 0)
    insights.push(`${bestBuyer.name} offers ₹${bestBuyer.advantage}/quintal above mandi price for ${bestBuyer.crop}`);
  if (totalRevenue > 0)
    insights.push(`You have sold ${totalQuantitySold} quintals this season for ₹${totalRevenue.toLocaleString('en-IN')}`);
  if (cropValues.length > 0) {
    const gain = cropValues[0].potentialValue - cropValues[0].estimatedValue;
    if (gain > 1000)
      insights.push(`Waiting 7 days could add ₹${gain.toLocaleString('en-IN')} to your ${cropValues[0].crop} value`);
  }

  const sellNow = cottonForecast.trend === 'down' ? 'Sell cotton now — prices falling'
    : cottonForecast.trend === 'up' ? 'Consider holding cotton — prices rising'
    : 'Cotton prices stable — sell when you find a good buyer';

  return {
    summary: {
      totalQuantitySold,
      totalRevenue,
      averageSellingPrice: avgPrice,
      currentCottonPrice: cottonPrice,
      currentGroundnutPrice: groundnutPrice,
      cottonTrend: cottonForecast.trend,
      groundnutTrend: groundnutForecast.trend
    },
    revenueByMonth,
    transactions: transactions.slice(0, 10),
    currentListings: listings,
    cropValues,
    bestBuyer,
    insights,
    sellNowRecommendation: sellNow,
    isDemo: DEMO_MODE()
  };
}
