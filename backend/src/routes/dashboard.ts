import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getFarmerDashboard } from '../agents/incomeDashboardAgent';

const router = Router();

// GET /api/dashboard/farmer
router.get('/farmer', async (req: AuthRequest, res: Response) => {
  try {
    const farmerId = req.user!.id;
    const data = await getFarmerDashboard(farmerId);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as dashboardRouter };
