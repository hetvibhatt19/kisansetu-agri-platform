/**
 * Agent 4: Quality Grading Assistance Agent
 * Rule-based grading engine (modular — can be swapped for CV model).
 * Cotton and Groundnut specific parameters.
 * Price impact estimation from grade.
 */

export interface CottonQualityInput {
  stapleLength?: number;     // mm (26-32 typical)
  micronaire?: number;       // 3.5-5.5 ideal
  strength?: number;         // g/tex
  uniformity?: number;       // % (80-90)
  moisture?: number;         // %  (<=8 ideal)
  foreignMatter?: number;    // % (<=2 ideal)
  colorGrade?: string;       // 'white','light-spotted','spotted'
}

export interface GroundnutQualityInput {
  moisture?: number;         // % (<=9 ideal)
  foreignMatter?: number;    // % (<=1 ideal)
  damagedSeeds?: number;     // % (<=2 ideal)
  oilContent?: number;       // % (>=48 ideal)
  seedSize?: 'bold' | 'medium' | 'small';
  shrivelled?: number;       // %
  aflatoxin?: 'low' | 'medium' | 'high';
}

export type QualityInput = CottonQualityInput | GroundnutQualityInput;

export interface GradeResult {
  grade: 'A' | 'B' | 'C';
  score: number;               // 0–100
  priceImpactPct: number;      // vs base price
  factors: { parameter: string; value: string; impact: 'positive' | 'neutral' | 'negative'; weight: number }[];
  explanation: string;
  suggestions: string[];
  isDemo: boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function gradeCotton(input: CottonQualityInput): GradeResult {
  const factors: GradeResult['factors'] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Staple length (25%)
  const sl = input.stapleLength ?? 28;
  const slScore = sl >= 30 ? 100 : sl >= 28 ? 85 : sl >= 26 ? 65 : 40;
  factors.push({ parameter: 'Staple Length', value: `${sl} mm`, impact: slScore >= 85 ? 'positive' : slScore >= 65 ? 'neutral' : 'negative', weight: 25 });
  totalScore += slScore * 25; totalWeight += 25;

  // Micronaire (20%)
  const mic = input.micronaire ?? 4.0;
  const micScore = mic >= 3.8 && mic <= 4.9 ? 100 : mic >= 3.5 && mic <= 5.2 ? 75 : 40;
  factors.push({ parameter: 'Micronaire', value: `${mic}`, impact: micScore >= 85 ? 'positive' : micScore >= 65 ? 'neutral' : 'negative', weight: 20 });
  totalScore += micScore * 20; totalWeight += 20;

  // Moisture (20%)
  const moist = input.moisture ?? 7;
  const moistScore = moist <= 8 ? 100 : moist <= 10 ? 70 : 30;
  factors.push({ parameter: 'Moisture Content', value: `${moist}%`, impact: moistScore >= 85 ? 'positive' : moistScore >= 65 ? 'neutral' : 'negative', weight: 20 });
  totalScore += moistScore * 20; totalWeight += 20;

  // Foreign matter (20%)
  const fm = input.foreignMatter ?? 1.5;
  const fmScore = fm <= 1 ? 100 : fm <= 2 ? 80 : fm <= 3 ? 50 : 20;
  factors.push({ parameter: 'Foreign Matter', value: `${fm}%`, impact: fmScore >= 85 ? 'positive' : fmScore >= 65 ? 'neutral' : 'negative', weight: 20 });
  totalScore += fmScore * 20; totalWeight += 20;

  // Color (15%)
  const colorMap: Record<string, number> = { 'white': 100, 'cream-white': 85, 'light-spotted': 65, 'spotted': 40, 'tinged': 30 };
  const colorScore = colorMap[input.colorGrade?.toLowerCase() || 'white'] ?? 70;
  factors.push({ parameter: 'Color Grade', value: input.colorGrade || 'White', impact: colorScore >= 85 ? 'positive' : colorScore >= 65 ? 'neutral' : 'negative', weight: 15 });
  totalScore += colorScore * 15; totalWeight += 15;

  const score = Math.round(totalScore / totalWeight);
  const grade: 'A' | 'B' | 'C' = score >= 78 ? 'A' : score >= 55 ? 'B' : 'C';
  const priceImpact = grade === 'A' ? 5 : grade === 'B' ? 0 : -8;

  const negFactors = factors.filter(f => f.impact === 'negative').map(f => f.parameter);
  const suggestions = negFactors.length > 0
    ? negFactors.map(p => `Improve ${p} to increase grade`)
    : ['Cotton quality is good — maintain current practices'];

  return {
    grade, score,
    priceImpactPct: priceImpact,
    factors,
    explanation: `Cotton graded as Grade ${grade} (score: ${score}/100). `
      + (grade === 'A' ? 'Excellent quality — premium pricing expected.' : grade === 'B' ? 'Good quality — standard market price applies.' : 'Below average — price reduction likely.'),
    suggestions,
    isDemo: process.env.DEMO_MODE === 'true'
  };
}

export function gradeGroundnut(input: GroundnutQualityInput): GradeResult {
  const factors: GradeResult['factors'] = [];
  let totalScore = 0;

  const moist = input.moisture ?? 8;
  const moistScore = moist <= 9 ? 100 : moist <= 11 ? 65 : 30;
  factors.push({ parameter: 'Moisture Content', value: `${moist}%`, impact: moistScore >= 85 ? 'positive' : moistScore >= 65 ? 'neutral' : 'negative', weight: 25 });

  const fm = input.foreignMatter ?? 0.8;
  const fmScore = fm <= 1 ? 100 : fm <= 2 ? 75 : 30;
  factors.push({ parameter: 'Foreign Matter', value: `${fm}%`, impact: fmScore >= 85 ? 'positive' : fmScore >= 65 ? 'neutral' : 'negative', weight: 20 });

  const damaged = input.damagedSeeds ?? 1.5;
  const dmgScore = damaged <= 2 ? 100 : damaged <= 4 ? 65 : 25;
  factors.push({ parameter: 'Damaged Seeds', value: `${damaged}%`, impact: dmgScore >= 85 ? 'positive' : dmgScore >= 65 ? 'neutral' : 'negative', weight: 20 });

  const oil = input.oilContent ?? 49;
  const oilScore = oil >= 48 ? 100 : oil >= 45 ? 75 : 50;
  factors.push({ parameter: 'Oil Content', value: `${oil}%`, impact: oilScore >= 85 ? 'positive' : oilScore >= 65 ? 'neutral' : 'negative', weight: 20 });

  const sizeMap: Record<string, number> = { bold: 100, medium: 80, small: 55 };
  const sizeScore = sizeMap[input.seedSize || 'medium'];
  factors.push({ parameter: 'Seed Size', value: input.seedSize || 'medium', impact: sizeScore >= 85 ? 'positive' : sizeScore >= 65 ? 'neutral' : 'negative', weight: 15 });

  const weights = [25, 20, 20, 20, 15];
  const scores = [moistScore, fmScore, dmgScore, oilScore, sizeScore];
  const score = Math.round(scores.reduce((acc, s, i) => acc + s * weights[i], 0) / 100);
  const grade: 'A' | 'B' | 'C' = score >= 80 ? 'A' : score >= 58 ? 'B' : 'C';
  const priceImpact = grade === 'A' ? 4 : grade === 'B' ? 0 : -6;

  const negFactors = factors.filter(f => f.impact === 'negative').map(f => f.parameter);
  const suggestions = negFactors.length > 0
    ? negFactors.map(p => `Reduce ${p} to improve grade`)
    : ['Groundnut quality is good — maintain storage conditions'];

  return {
    grade, score,
    priceImpactPct: priceImpact,
    factors,
    explanation: `Groundnut graded as Grade ${grade} (score: ${score}/100). `
      + (grade === 'A' ? 'Premium quality — oil mills will offer best price.' : grade === 'B' ? 'Standard grade — regular market rate.' : 'Lower grade — price reduction expected.'),
    suggestions,
    isDemo: process.env.DEMO_MODE === 'true'
  };
}

export function gradeQuality(crop: string, input: QualityInput): GradeResult {
  if (crop.toLowerCase() === 'cotton') return gradeCotton(input as CottonQualityInput);
  if (crop.toLowerCase() === 'groundnut') return gradeGroundnut(input as GroundnutQualityInput);
  throw new Error(`Unsupported crop: ${crop}`);
}
