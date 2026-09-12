import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MOCK_BUYERS } from '../db/mockData';
import { query } from '../db/pool';

const router = Router();

// GET /api/buyers — list active buyers (with requirements)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { crop } = req.query as any;
    let q = `
      SELECT u.id, u.name, bp.company_name as company, u.location, u.district,
             br.offered_price_per_quintal as "offeredPrice",
             br.quantity_quintals as "requiredQuantity",
             br.quality_grade as grade,
             c.name as crop,
             br.preferred_delivery_date as "deliveryDate"
      FROM users u
      JOIN buyer_profiles bp ON bp.user_id = u.id
      JOIN buyer_requirements br ON br.buyer_id = u.id
      JOIN crops c ON c.id = br.crop_id
      WHERE br.status = 'active'
    `;
    const params: any[] = [];
    if (crop) { q += ` AND LOWER(c.name) = LOWER($1)`; params.push(crop); }
    q += ' ORDER BY br.offered_price_per_quintal DESC';
    const result = await query(q, params);
    if (result.rows.length > 0) return res.json({ buyers: result.rows });
  } catch { }
  // Demo fallback
  let buyers = MOCK_BUYERS;
  if (req.query.crop) buyers = buyers.filter(b => b.crop.toLowerCase() === (req.query.crop as string).toLowerCase());
  res.json({ buyers, isDemo: true });
});

export { router as buyersRouter };
