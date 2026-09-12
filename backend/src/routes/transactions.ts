import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../db/pool';

const router = Router();

// GET /api/transactions — user's transactions
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const field = req.user!.role === 'farmer' ? 'farmer_id' : 'buyer_id';
    const result = await query(`
      SELECT t.*, c.name as crop_name,
             f.name as farmer_name, b.name as buyer_name
      FROM transactions t
      JOIN crops c ON c.id = t.crop_id
      JOIN users f ON f.id = t.farmer_id
      JOIN users b ON b.id = t.buyer_id
      WHERE t.${field} = $1
      ORDER BY t.transaction_date DESC
    `, [req.user!.id]);
    res.json({ transactions: result.rows });
  } catch {
    res.json({ transactions: [], isDemo: true });
  }
});

// POST /api/transactions — record a transaction
router.post('/', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can record transactions' });
  const { buyerId, cropId, quantityQuintals, pricePerQuintal, qualityGrade, notes } = req.body;
  if (!buyerId || !cropId || !quantityQuintals || !pricePerQuintal) {
    return res.status(400).json({ error: 'buyerId, cropId, quantityQuintals, pricePerQuintal are required' });
  }
  try {
    const total = Number(quantityQuintals) * Number(pricePerQuintal);
    const result = await query(`
      INSERT INTO transactions (farmer_id, buyer_id, crop_id, quantity_quintals, price_per_quintal, total_amount, quality_grade, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.user!.id, buyerId, cropId, quantityQuintals, pricePerQuintal, total, qualityGrade, notes]);
    res.status(201).json({ transaction: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as transactionsRouter };
