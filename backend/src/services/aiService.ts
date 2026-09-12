/**
 * IBM Granite / watsonx AI service layer.
 * Handles LLM calls for natural-language explanations, farmer-friendly summaries,
 * and conversational assistant queries.
 *
 * Falls back to a rule-based mock when credentials are not configured.
 * Replace/configure by setting WATSONX_API_KEY + WATSONX_PROJECT_ID in .env
 */

import https from 'https';

const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const MODEL_ID = process.env.WATSONX_MODEL_ID || 'ibm/granite-13b-chat-v2';

function isConfigured(): boolean {
  return !!(process.env.WATSONX_API_KEY && process.env.WATSONX_PROJECT_ID);
}

interface WatsonxParams {
  max_new_tokens?: number;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
}

async function callWatsonx(prompt: string, params: WatsonxParams = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model_id: MODEL_ID,
      input: prompt,
      parameters: {
        max_new_tokens: params.max_new_tokens || 300,
        temperature: params.temperature || 0.3,
        top_p: params.top_p || 0.9,
        repetition_penalty: params.repetition_penalty || 1.1
      },
      project_id: process.env.WATSONX_PROJECT_ID
    });

    const url = new URL(`${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WATSONX_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.results?.[0]?.generated_text || '';
          resolve(text.trim());
        } catch {
          reject(new Error('Failed to parse watsonx response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('watsonx request timeout')); });
    req.write(body);
    req.end();
  });
}

/**
 * Generate a farmer-friendly explanation using IBM Granite.
 * Falls back to a template-based response if LLM is unavailable.
 */
export async function generateExplanation(context: {
  question: string;
  data: Record<string, any>;
  role?: 'farmer' | 'buyer';
}): Promise<{ text: string; source: 'granite' | 'mock' }> {
  if (isConfigured()) {
    const prompt = buildPrompt(context);
    try {
      const text = await callWatsonx(prompt, { max_new_tokens: 400, temperature: 0.4 });
      return { text, source: 'granite' };
    } catch (err: any) {
      console.warn('watsonx call failed, using mock:', err.message);
    }
  }
  // Fallback to mock
  return { text: mockResponse(context), source: 'mock' };
}

function buildPrompt(context: { question: string; data: Record<string, any>; role?: string }): string {
  const dataStr = Object.entries(context.data)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  return `You are an AI assistant for Indian farmers using an agricultural market platform.
Answer the following question in simple, friendly English (suitable for a farmer).
Do NOT invent market prices — use only the data provided below.
Be concise (3-5 sentences). If the data supports it, give a clear recommendation.

Market Data:
${dataStr}

Farmer's Question: ${context.question}

Answer:`;
}

function mockResponse(context: { question: string; data: Record<string, any> }): string {
  const q = context.question.toLowerCase();
  const data = context.data;

  // Storage/selling decision
  if (q.includes('sell') || q.includes('wait') || q.includes('store')) {
    const rec = data.recommendation || data.storageRecommendation;
    const curr = data.currentPrice || data.price;
    const forecast = data.forecastedPrice || data.predictedPrice;
    if (rec === 'STORE_AND_SELL_LATER' || rec === 'WAIT') {
      return `Based on the current market data, it looks like ${data.crop || 'your crop'} prices are trending upward. `
        + `Current price is ₹${curr}/quintal and the forecast for ${data.storageDays || 15} days is ₹${forecast}/quintal. `
        + `After storage costs, you could earn approximately ₹${data.expectedGain?.toLocaleString('en-IN') || 'more'} extra. `
        + `However, forecasts are estimates — prices can change due to weather and market conditions. `
        + `Keep watching the market daily and sell when you are comfortable.`;
    }
    return `Based on current trends, selling now at ₹${curr}/quintal appears to be the better option. `
      + `${data.trend === 'down' ? 'Prices are currently falling.' : 'The price difference after storage costs may not justify waiting.'} `
      + `Your estimated revenue would be ₹${(Number(curr) * (data.quantity || 20)).toLocaleString('en-IN')}. `
      + `Always verify today's actual mandi price before making your final decision.`;
  }

  // Buyer recommendation
  if (q.includes('buyer') || q.includes('who') || q.includes('best')) {
    const buyer = data.topBuyer || data.bestBuyer;
    if (buyer) {
      return `The best buyer for you right now is ${buyer.buyerName || buyer.name}, offering ₹${buyer.offeredPrice || buyer.price}/quintal. `
        + `They are ${buyer.distanceKm || 'nearby'} km away and have a match score of ${buyer.matchScore || 'high'}. `
        + `${buyer.explanation || ''}`;
    }
  }

  // Price query
  if (q.includes('price') || q.includes('rate') || q.includes('kitna')) {
    const crop = data.crop || 'Cotton';
    const price = data.currentPrice || data.price;
    const trend = data.trend;
    return `Today's ${crop} price is ₹${price}/quintal. `
      + `Prices are currently ${trend === 'up' ? 'rising' : trend === 'down' ? 'falling' : 'stable'}. `
      + `For the best price, compare rates across nearby mandis like ${data.mandis?.[0] || 'Rajkot APMC'} and ${data.mandis?.[1] || 'Gondal APMC'}.`;
  }

  // Quality
  if (q.includes('quality') || q.includes('grade')) {
    const grade = data.grade;
    const impact = data.priceImpactPct;
    return `Your crop has been graded as Grade ${grade}. `
      + `This ${impact >= 0 ? 'adds' : 'reduces'} about ${Math.abs(impact)}% to the market price. `
      + `${data.explanation || ''}`;
  }

  // Generic fallback
  return `Based on the current market data, here is what you need to know: `
    + `${data.summary || JSON.stringify(data).substring(0, 150)}. `
    + `Please check with your local mandi or agent for the most up-to-date information before making any decision.`;
}
