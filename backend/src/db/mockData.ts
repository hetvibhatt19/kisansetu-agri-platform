/**
 * Mock data layer — used when DB is unavailable or DEMO_MODE=true.
 * All realistic Gujarat agricultural market data.
 */

export const MOCK_CROPS = [
  { id: 'crop-cotton', name: 'Cotton', name_gujarati: 'કપાસ', unit: 'quintal', grades: ['A', 'B', 'C'], storage_cost_per_quintal_per_day: 2.50 },
  { id: 'crop-groundnut', name: 'Groundnut', name_gujarati: 'મગફળી', unit: 'quintal', grades: ['A', 'B', 'C'], storage_cost_per_quintal_per_day: 1.80 }
];

export const MOCK_MANDIS = [
  { id: 'm1', name: 'Rajkot APMC', district: 'Rajkot', latitude: 22.3039, longitude: 70.8022 },
  { id: 'm2', name: 'Gondal APMC', district: 'Rajkot', latitude: 21.9614, longitude: 70.8042 },
  { id: 'm3', name: 'Junagadh APMC', district: 'Junagadh', latitude: 21.5222, longitude: 70.4579 },
  { id: 'm4', name: 'Amreli APMC', district: 'Amreli', latitude: 21.6032, longitude: 71.2213 },
  { id: 'm5', name: 'Bhavnagar APMC', district: 'Bhavnagar', latitude: 21.7645, longitude: 72.1519 },
  { id: 'm6', name: 'Surendranagar APMC', district: 'Surendranagar', latitude: 22.727, longitude: 71.6469 }
];

export const MOCK_CURRENT_PRICES = [
  { mandi: 'Rajkot APMC', district: 'Rajkot', crop: 'Cotton', price: 6850, min: 6600, max: 7100, arrival: 1250 },
  { mandi: 'Gondal APMC', district: 'Rajkot', crop: 'Cotton', price: 6900, min: 6700, max: 7150, arrival: 980 },
  { mandi: 'Junagadh APMC', district: 'Junagadh', crop: 'Cotton', price: 6780, min: 6550, max: 7000, arrival: 760 },
  { mandi: 'Surendranagar APMC', district: 'Surendranagar', crop: 'Cotton', price: 6820, min: 6600, max: 7050, arrival: 890 },
  { mandi: 'Amreli APMC', district: 'Amreli', crop: 'Groundnut', price: 5420, min: 5200, max: 5650, arrival: 2100 },
  { mandi: 'Junagadh APMC', district: 'Junagadh', crop: 'Groundnut', price: 5380, min: 5150, max: 5600, arrival: 1800 },
  { mandi: 'Bhavnagar APMC', district: 'Bhavnagar', crop: 'Groundnut', price: 5450, min: 5250, max: 5700, arrival: 1550 },
  { mandi: 'Gondal APMC', district: 'Rajkot', crop: 'Groundnut', price: 5390, min: 5160, max: 5610, arrival: 1200 }
];

/** Generate 90 days of realistic historical prices */
export function generateHistoricalPrices(crop: 'Cotton' | 'Groundnut', days = 90) {
  const basePrice = crop === 'Cotton' ? 6500 : 5150;
  const prices = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const trend = ((days - i) / days) * 0.06;
    const seasonal = Math.sin((i / 30) * Math.PI) * 0.025;
    const noise = (Math.random() - 0.5) * 0.035;
    const price = Math.round(basePrice * (1 + trend + seasonal + noise));
    prices.push({
      date: d.toISOString().split('T')[0],
      price,
      min: Math.round(price * 0.97),
      max: Math.round(price * 1.03)
    });
  }
  return prices;
}

/** Generate 30-day price forecast */
export function generateForecast(crop: 'Cotton' | 'Groundnut', currentPrice: number) {
  const trend = crop === 'Cotton' ? 0.002 : 0.0015; // slight daily upward
  const forecasts = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const trendFactor = 1 + trend * i;
    const seasonal = Math.sin((i / 14) * Math.PI) * 0.02;
    const predicted = Math.round(currentPrice * (trendFactor + seasonal));
    const uncertainty = 0.02 + (i / 30) * 0.04; // grows with time
    const confidence = Math.max(50, Math.round(90 - i * 1.2));
    forecasts.push({
      date: d.toISOString().split('T')[0],
      predicted,
      low: Math.round(predicted * (1 - uncertainty)),
      high: Math.round(predicted * (1 + uncertainty)),
      confidence,
      daysAhead: i
    });
  }
  return forecasts;
}

export const MOCK_BUYERS = [
  {
    id: '44444444-0000-0000-0000-000000000001',
    name: 'Gujarat Agro Traders',
    company: 'Gujarat Agro Traders Pvt Ltd',
    location: 'Ahmedabad',
    district: 'Ahmedabad',
    crop: 'Cotton',
    quantity: 100,
    minQuantity: 10,
    grade: 'A',
    offeredPrice: 7050,
    deliveryDays: 10,
    latitude: 23.0225,
    longitude: 72.5714
  },
  {
    id: '44444444-0000-0000-0000-000000000002',
    name: 'Saurashtra Cotton Mills',
    company: 'Saurashtra Cotton Mills Ltd',
    location: 'Rajkot',
    district: 'Rajkot',
    crop: 'Cotton',
    quantity: 200,
    minQuantity: 20,
    grade: 'B',
    offeredPrice: 6950,
    deliveryDays: 7,
    latitude: 22.3039,
    longitude: 70.8022
  },
  {
    id: '44444444-0000-0000-0000-000000000003',
    name: 'Patel Oil Industries',
    company: 'Patel Oil Industries',
    location: 'Gondal',
    district: 'Rajkot',
    crop: 'Groundnut',
    quantity: 150,
    minQuantity: 15,
    grade: 'A',
    offeredPrice: 5550,
    deliveryDays: 14,
    latitude: 21.9614,
    longitude: 70.8042
  },
  {
    id: '44444444-0000-0000-0000-000000000004',
    name: 'National Agri Exports',
    company: 'National Agri Exports Ltd',
    location: 'Ahmedabad',
    district: 'Ahmedabad',
    crop: 'Cotton',
    quantity: 80,
    minQuantity: 10,
    grade: 'A',
    offeredPrice: 7100,
    deliveryDays: 5,
    latitude: 23.0225,
    longitude: 72.5714
  },
  {
    id: '44444444-0000-0000-0000-000000000005',
    name: 'Anand Agri Cooperative',
    company: 'Anand Agri Cooperative Society',
    location: 'Anand',
    district: 'Anand',
    crop: 'Groundnut',
    quantity: 200,
    minQuantity: 20,
    grade: 'B',
    offeredPrice: 5480,
    deliveryDays: 12,
    latitude: 22.5645,
    longitude: 72.9289
  }
];

export const MOCK_FARMERS = [
  {
    id: '33333333-0000-0000-0000-000000000001',
    name: 'Raju Patel',
    location: 'Rajkot',
    district: 'Rajkot',
    latitude: 22.3039,
    longitude: 70.8022,
    phone: '98765xxxxx'
  },
  {
    id: '33333333-0000-0000-0000-000000000002',
    name: 'Bhavesh Mer',
    location: 'Gondal',
    district: 'Rajkot',
    latitude: 21.9614,
    longitude: 70.8042,
    phone: '98765xxxxx'
  }
];
