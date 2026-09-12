import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import { gradeQuality } from '../agents/qualityGradingAgent';
import { getCurrentPrices } from '../agents/mandiPriceAgent';

const router = Router();

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  }
});

// POST /api/quality/grade
router.post('/grade', upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { crop, ...qualityParams } = req.body;

    if (!crop) return res.status(400).json({ error: 'crop is required' });

    // Parse numeric values
    const parsedParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(qualityParams)) {
      const num = parseFloat(v as string);
      parsedParams[k] = isNaN(num) ? v : num;
    }

    const result = gradeQuality(crop, parsedParams);

    // Get current price to show price impact
    const prices = await getCurrentPrices(crop);
    const basePrice = prices.length > 0 ? prices[0].price : (crop.toLowerCase() === 'cotton' ? 6850 : 5420);
    const adjustedPrice = Math.round(basePrice * (1 + result.priceImpactPct / 100));

    res.json({
      ...result,
      basePrice,
      adjustedPrice,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      note: req.file ? 'Image uploaded — visual grading will be available with CV model integration' : undefined
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export { router as qualityRouter };
