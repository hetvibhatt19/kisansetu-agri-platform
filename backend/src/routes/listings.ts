import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// GET /api/listings — farmer's own listings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT fl.*, c.name as crop_name FROM farmer_listings fl
      JOIN crops c ON c.id = fl.crop_id
      WHERE fl.farmer_id = $1 ORDER BY fl.created_at DESC
    `, [req.user!.id]);
    res.json({ listings: result.rows });
  } catch {
    // Demo fallback
    res.json({ listings: [
      { id: '1', crop_name: 'Cotton', quantity_quintals: 20, quality_grade: 'A', expected_price_per_quintal: 7000, location: 'Rajkot', status: 'active', created_at: new Date() }
    ], isDemo: true });
  }
});

// POST /api/listings — create new listing
router.post('/', async (req: AuthRequest, res: Response) => {
  const { cropId, quantityQuintals, qualityGrade, expectedPricePerQuintal, location, district, harvestDate } = req.body;
  if (!cropId || !quantityQuintals || !qualityGrade) {
    return res.status(400).json({ error: 'cropId, quantityQuintals, and qualityGrade are required' });
  }
  try {
    const result = await query(`
      INSERT INTO farmer_listings (farmer_id, crop_id, quantity_quintals, quality_grade, expected_price_per_quintal, location, district, harvest_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.user!.id, cropId, quantityQuintals, qualityGrade, expectedPricePerQuintal, location, district, harvestDate]);
    res.status(201).json({ listing: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as listingsRouter };
