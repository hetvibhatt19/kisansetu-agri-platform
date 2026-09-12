import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyzeStorageDecision } from '../agents/storageAdvisorAgent';
import { getCurrentPrices } from '../agents/mandiPriceAgent';

const router = Router();

// POST /api/storage/analyze
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const { crop, quantityQuintals, storageDays = 15, customStorageCost } = req.body;

    if (!crop || !quantityQuintals) {
      return res.status(400).json({ error: 'crop and quantityQuintals are required' });
    }

    const prices = await getCurrentPrices(crop);
    const currentPrice = prices.length > 0 ? prices[0].price : (crop.toLowerCase() === 'cotton' ? 6850 : 5420);
    const storageCost = customStorageCost || (crop.toLowerCase() === 'cotton' ? 2.50 : 1.80);

    const analysis = await analyzeStorageDecision(
      crop, Number(quantityQuintals), currentPrice, Number(storageDays), storageCost
    );

    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/storage/analyze?crop=Cotton&qty=20&days=15
router.get('/analyze', async (req: AuthRequest, res: Response) => {
  try {
    const { crop = 'Cotton', qty = '20', days = '15' } = req.query as any;
    const prices = await getCurrentPrices(crop);
    const currentPrice = prices.length > 0 ? prices[0].price : (crop.toLowerCase() === 'cotton' ? 6850 : 5420);
    const storageCost = crop.toLowerCase() === 'cotton' ? 2.50 : 1.80;
    const analysis = await analyzeStorageDecision(crop, Number(qty), currentPrice, Number(days), storageCost);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as storageRouter };
