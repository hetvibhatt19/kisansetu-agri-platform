import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { matchBuyers, FarmerListing } from '../agents/buyerMatchingAgent';
import { getCurrentPrices } from '../agents/mandiPriceAgent';

const router = Router();

// POST /api/matching/find-buyers
router.post('/find-buyers', async (req: AuthRequest, res: Response) => {
  const { crop, quantityQuintals, qualityGrade, location, district, expectedPricePerQuintal, harvestDate } = req.body;

  if (!crop || !quantityQuintals || !qualityGrade || !district) {
    return res.status(400).json({ error: 'crop, quantityQuintals, qualityGrade, and district are required' });
  }

  try {
    const prices = await getCurrentPrices(crop);
    const mandiPrice = prices.length > 0 ? prices[0].price : (crop.toLowerCase() === 'cotton' ? 6850 : 5420);

    const listing: FarmerListing = {
      crop, quantityQuintals: Number(quantityQuintals), qualityGrade, location, district,
      expectedPricePerQuintal: Number(expectedPricePerQuintal) || mandiPrice,
      harvestDate
    };

    const matches = await matchBuyers(listing, mandiPrice);
    res.json({
      matches: matches.slice(0, 5), // top 5
      mandiPrice,
      listing,
      isDemo: process.env.DEMO_MODE === 'true'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as matchingRouter };
