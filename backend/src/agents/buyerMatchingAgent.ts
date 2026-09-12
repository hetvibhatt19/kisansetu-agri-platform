/**
 * Agent 2: Direct Buyer-Farmer Matching Agent
 * Transparent scoring: crop + quality + quantity + price + distance + timeline
 * Score 0–100. Every match includes a plain-language explanation.
 */
import { query } from '../db/pool';
import { MOCK_BUYERS } from '../db/mockData';

const DEMO_MODE = () => process.env.DEMO_MODE === 'true';

export interface FarmerListing {
  crop: string;
  quantityQuintals: number;
  qualityGrade: string;
  location: string;
  district: string;
  expectedPricePerQuintal: number;
  harvestDate?: string;
  latitude?: number;
  longitude?: number;
}

export interface BuyerMatch {
  buyerId: string;
  buyerName: string;
  company: string;
  location: string;
  offeredPrice: number;
  requiredQuantity: number;
  minQuantity: number;
  grade: string;
  deliveryDays: number;
  distanceKm: number;
  matchScore: number;
  scoreBreakdown: {
    cropScore: number;
    qualityScore: number;
    quantityScore: number;
    priceScore: number;
    distanceScore: number;
    timelineScore: number;
  };
  explanation: string;
  priceAdvantage: number; // vs mandi price
}

/** Haversine distance in km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Grade compatibility: exact match = 100, one level off = 60, two levels = 20 */
function gradeScore(farmerGrade: string, buyerGrade: string): number {
  const grades = ['A', 'B', 'C'];
  const fi = grades.indexOf(farmerGrade.toUpperCase());
  const bi = grades.indexOf(buyerGrade.toUpperCase());
  if (fi === -1 || bi === -1) return 50;
  if (fi === bi) return 100;
  // Buyer accepts lower grade if farmer has higher — buyer still wins
  if (fi < bi) return 80; // farmer has better grade, buyer gets it
  const diff = Math.abs(fi - bi);
  return Math.max(0, 100 - diff * 40);
}

/** Quantity score: within range = 100, can partially fill = proportional */
function quantityScore(farmerQty: number, buyerMin: number, buyerRequired: number): number {
  if (farmerQty >= buyerMin && farmerQty <= buyerRequired * 1.5) return 100;
  if (farmerQty >= buyerMin) return 85;
  if (farmerQty >= buyerMin * 0.5) return 50;
  return 20;
}

/** Price score: higher offer vs expected = better for farmer */
function priceScore(offeredPrice: number, expectedPrice: number): number {
  const ratio = offeredPrice / expectedPrice;
  if (ratio >= 1.05) return 100;
  if (ratio >= 1.0) return 90;
  if (ratio >= 0.97) return 70;
  if (ratio >= 0.94) return 50;
  return Math.max(0, Math.round(ratio * 50));
}

/** Distance score: closer is better */
function distanceScore(km: number): number {
  if (km <= 30) return 100;
  if (km <= 80) return 85;
  if (km <= 150) return 65;
  if (km <= 300) return 40;
  return 20;
}

/** Delivery timeline score */
function timelineScore(deliveryDays: number): number {
  if (deliveryDays <= 7) return 100;
  if (deliveryDays <= 14) return 80;
  if (deliveryDays <= 21) return 60;
  return 40;
}

/** District coordinate lookup */
const DISTRICT_COORDS: Record<string, [number, number]> = {
  'rajkot': [22.3039, 70.8022],
  'junagadh': [21.5222, 70.4579],
  'amreli': [21.6032, 71.2213],
  'bhavnagar': [21.7645, 72.1519],
  'surendranagar': [22.727, 71.6469],
  'ahmedabad': [23.0225, 72.5714],
  'anand': [22.5645, 72.9289],
  'gondal': [21.9614, 70.8042]
};

function getCoords(district: string): [number, number] {
  return DISTRICT_COORDS[district.toLowerCase()] || [22.3039, 70.8022];
}

export async function matchBuyers(listing: FarmerListing, mandiPrice: number): Promise<BuyerMatch[]> {
  let buyers: any[] = [];

  if (!DEMO_MODE()) {
    try {
      const result = await query(`
        SELECT br.id, br.offered_price_per_quintal as "offeredPrice",
               br.quantity_quintals as "requiredQuantity", br.min_quantity_quintals as "minQuantity",
               br.quality_grade as grade, br.location, br.district,
               br.preferred_delivery_date,
               u.id as "buyerId", u.name, bp.company_name as company
        FROM buyer_requirements br
        JOIN users u ON u.id = br.buyer_id
        JOIN buyer_profiles bp ON bp.user_id = u.id
        JOIN crops c ON c.id = br.crop_id
        WHERE LOWER(c.name) = LOWER($1) AND br.status = 'active'
      `, [listing.crop]);
      buyers = result.rows;
    } catch { }
  }

  if (buyers.length === 0) {
    buyers = MOCK_BUYERS.filter(b => b.crop.toLowerCase() === listing.crop.toLowerCase());
  }

  const [farmerLat, farmerLon] = listing.latitude && listing.longitude
    ? [listing.latitude, listing.longitude]
    : getCoords(listing.district);

  const matches: BuyerMatch[] = buyers.map(buyer => {
    const [buyerLat, buyerLon] = buyer.latitude && buyer.longitude
      ? [buyer.latitude, buyer.longitude]
      : getCoords(buyer.district || buyer.location);

    const distKm = Math.round(haversineKm(farmerLat, farmerLon, buyerLat, buyerLon));
    const delivDays = buyer.deliveryDays ||
      (buyer.preferred_delivery_date ? Math.ceil((new Date(buyer.preferred_delivery_date).getTime() - Date.now()) / 86400000) : 14);

    const scores = {
      cropScore: 100, // already filtered by crop
      qualityScore: gradeScore(listing.qualityGrade, buyer.grade || buyer.quality_grade || 'B'),
      quantityScore: quantityScore(listing.quantityQuintals, buyer.minQuantity || buyer.min_quantity_quintals || 10, buyer.requiredQuantity || buyer.quantity_quintals || 50),
      priceScore: priceScore(buyer.offeredPrice || buyer.offeredPrice, listing.expectedPricePerQuintal),
      distanceScore: distanceScore(distKm),
      timelineScore: timelineScore(delivDays)
    };

    // Weighted average: price 30%, quality 25%, quantity 20%, distance 15%, timeline 10%
    const matchScore = Math.round(
      scores.cropScore * 0 +
      scores.qualityScore * 0.25 +
      scores.quantityScore * 0.20 +
      scores.priceScore * 0.30 +
      scores.distanceScore * 0.15 +
      scores.timelineScore * 0.10 +
      100 * 0 // crop always 100, only contributes via filter
    );
    // Re-scale to 0-100 (weights sum to 1.0)
    const weightedScore = Math.round(
      scores.qualityScore * 0.25 +
      scores.quantityScore * 0.20 +
      scores.priceScore * 0.30 +
      scores.distanceScore * 0.15 +
      scores.timelineScore * 0.10
    );

    const offeredPrice = buyer.offeredPrice || buyer.offered_price_per_quintal;
    const priceAdvantage = offeredPrice - mandiPrice;

    // Build plain-language explanation
    const parts: string[] = [];
    if (offeredPrice >= listing.expectedPricePerQuintal)
      parts.push(`offers ₹${offeredPrice}/quintal (meets your target of ₹${listing.expectedPricePerQuintal})`);
    else
      parts.push(`offers ₹${offeredPrice}/quintal (slightly below your target of ₹${listing.expectedPricePerQuintal})`);
    if (priceAdvantage > 0) parts.push(`₹${priceAdvantage} above mandi rate`);
    parts.push(`${distKm} km away in ${buyer.location || buyer.district}`);
    parts.push(`accepts ${buyer.grade || buyer.quality_grade} grade`);
    parts.push(`needs ${buyer.requiredQuantity || buyer.quantity_quintals} quintals (min ${buyer.minQuantity || buyer.min_quantity_quintals})`);
    if (delivDays <= 7) parts.push('wants delivery quickly');
    const explanation = `Recommended because this buyer ${parts.join(', ')}.`;

    return {
      buyerId: buyer.buyerId || buyer.id,
      buyerName: buyer.name,
      company: buyer.company || buyer.company_name,
      location: buyer.location,
      offeredPrice,
      requiredQuantity: buyer.requiredQuantity || buyer.quantity_quintals,
      minQuantity: buyer.minQuantity || buyer.min_quantity_quintals || 10,
      grade: buyer.grade || buyer.quality_grade || 'B',
      deliveryDays: delivDays,
      distanceKm: distKm,
      matchScore: weightedScore,
      scoreBreakdown: scores,
      explanation,
      priceAdvantage
    };
  });

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}
