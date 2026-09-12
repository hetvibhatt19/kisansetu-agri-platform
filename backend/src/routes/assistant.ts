import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { generateExplanation } from '../services/aiService';
import { getCurrentPrices, getForecast } from '../agents/mandiPriceAgent';
import { matchBuyers } from '../agents/buyerMatchingAgent';
import { analyzeStorageDecision } from '../agents/storageAdvisorAgent';

const router = Router();

/**
 * POST /api/assistant/chat
 * RAG-style: retrieve structured data first, then pass to LLM for explanation.
 * LLM never invents prices — all factual data comes from the application.
 */
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, context } = req.body as { message: string; context?: Record<string, any> };

    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const lowerMsg = message.toLowerCase();
    let retrievedData: Record<string, any> = { question: message, ...(context || {}) };
    let intentDetected = 'general';

    // Intent detection and data retrieval
    const cropMention = lowerMsg.includes('groundnut') ? 'Groundnut' : 'Cotton';

    if (lowerMsg.includes('sell') || lowerMsg.includes('wait') || lowerMsg.includes('store') || lowerMsg.includes('roko') || lowerMsg.includes('vecho')) {
      intentDetected = 'storage_decision';
      const qty = extractNumber(message) || context?.quantity || 20;
      const prices = await getCurrentPrices(cropMention);
      const currentPrice = prices[0]?.price || (cropMention === 'Cotton' ? 6850 : 5420);
      const analysis = await analyzeStorageDecision(cropMention, qty, currentPrice, 15);
      retrievedData = {
        ...retrievedData,
        crop: cropMention,
        quantity: qty,
        currentPrice,
        recommendation: analysis.recommendation,
        forecastedPrice: analysis.storeLater.forecastedPrice,
        storageDays: analysis.storeLater.storageDays,
        expectedGain: analysis.storeLater.expectedGain,
        trend: analysis.storeLater.forecastedPrice > currentPrice ? 'up' : 'down',
        summary: analysis.summary
      };
    } else if (lowerMsg.includes('buyer') || lowerMsg.includes('kharido') || lowerMsg.includes('best price')) {
      intentDetected = 'buyer_matching';
      const prices = await getCurrentPrices(cropMention);
      const currentPrice = prices[0]?.price || 6850;
      const matches = await matchBuyers({
        crop: cropMention,
        quantityQuintals: extractNumber(message) || context?.quantity || 20,
        qualityGrade: context?.grade || 'A',
        location: context?.location || 'Rajkot',
        district: context?.district || 'Rajkot',
        expectedPricePerQuintal: currentPrice
      }, currentPrice);
      const top = matches[0];
      retrievedData = {
        ...retrievedData,
        crop: cropMention,
        currentPrice,
        topBuyer: top,
        totalMatches: matches.length
      };
    } else if (lowerMsg.includes('price') || lowerMsg.includes('bhav') || lowerMsg.includes('rate')) {
      intentDetected = 'price_query';
      const prices = await getCurrentPrices(cropMention);
      const forecast = await getForecast(cropMention);
      const mandis = prices.map(p => p.mandi);
      retrievedData = {
        ...retrievedData,
        crop: cropMention,
        currentPrice: prices[0]?.price,
        prices: prices.slice(0, 3),
        trend: forecast.trend,
        forecast7Day: forecast.forecasts[6],
        mandis: mandis.slice(0, 3),
        summary: forecast.summary
      };
    } else if (lowerMsg.includes('quality') || lowerMsg.includes('grade') || lowerMsg.includes('gunvatta')) {
      intentDetected = 'quality';
      const grade = context?.grade || 'A';
      const prices = await getCurrentPrices(cropMention);
      const basePrice = prices[0]?.price || 6850;
      const impact = grade === 'A' ? 5 : grade === 'B' ? 0 : -8;
      retrievedData = {
        ...retrievedData,
        crop: cropMention,
        grade,
        priceImpactPct: impact,
        basePrice,
        adjustedPrice: Math.round(basePrice * (1 + impact / 100)),
        explanation: `Grade ${grade} ${cropMention} typically ${impact > 0 ? `commands a ${impact}% premium` : impact < 0 ? `receives a ${Math.abs(impact)}% discount` : 'receives standard market price'}.`
      };
    }

    const result = await generateExplanation({
      question: message,
      data: retrievedData,
      role: req.user?.role as any
    });

    res.json({
      message: result.text,
      source: result.source,
      intent: intentDetected,
      data: retrievedData,
      isDemo: process.env.DEMO_MODE === 'true'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function extractNumber(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:quintal|kg|q)/i) || text.match(/(\d+)/);
  return match ? parseFloat(match[1]) : null;
}

export { router as assistantRouter };
