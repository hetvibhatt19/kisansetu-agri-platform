import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getCurrentPrices, getHistoricalPrices, getForecast } from '../agents/mandiPriceAgent';

const router = Router();

// GET /api/mandi/prices — current prices, optional ?crop=Cotton&district=Rajkot
router.get('/prices', async (req: AuthRequest, res: Response) => {
  try {
    const { crop, district } = req.query as any;
    const prices = await getCurrentPrices(crop, district);
    res.json({ prices, isDemo: process.env.DEMO_MODE === 'true', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mandi/historical?crop=Cotton&days=90
router.get('/historical', async (req: AuthRequest, res: Response) => {
  try {
    const { crop = 'Cotton', days = '90' } = req.query as any;
    const prices = await getHistoricalPrices(crop, undefined, parseInt(days));
    res.json({ crop, prices, isDemo: process.env.DEMO_MODE === 'true' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mandi/forecast?crop=Cotton
router.get('/forecast', async (req: AuthRequest, res: Response) => {
  try {
    const { crop = 'Cotton' } = req.query as any;
    const forecast = await getForecast(crop as string);
    res.json(forecast);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as mandiRouter };
