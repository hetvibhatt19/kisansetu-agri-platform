import React, { useState } from 'react';
import api from '../../api';

interface GradeResult {
  grade: string; score: number; priceImpactPct: number;
  factors: { parameter: string; value: string; impact: string; weight: number }[];
  explanation: string; suggestions: string[]; basePrice: number; adjustedPrice: number; isDemo: boolean;
}

// ─── Local rule-based grader (mirrors backend logic) ───────────────────────
// Used only when the API is unreachable (pure offline demo).

function scoreParam(value: number, thresholds: [number, number], scores: [number, number, number]): number {
  if (value <= thresholds[0]) return scores[0];
  if (value <= thresholds[1]) return scores[1];
  return scores[2];
}

function computeDemoGrade(crop: string, fields: Record<string, string>): Pick<GradeResult, 'grade' | 'score' | 'priceImpactPct' | 'factors' | 'explanation' | 'suggestions'> {
  const get = (k: string, def: number) => { const v = parseFloat(fields[k]); return isNaN(v) ? def : v; };
  const getText = (k: string, def: string) => fields[k]?.toLowerCase().trim() || def;

  if (crop === 'Cotton') {
    const sl     = get('stapleLength', 28);
    const mic    = get('micronaire', 4.0);
    const moist  = get('moisture', 7);
    const fm     = get('foreignMatter', 1.5);
    const color  = getText('colorGrade', 'white');

    const slScore    = sl >= 30 ? 100 : sl >= 28 ? 85 : sl >= 26 ? 65 : 40;
    const micScore   = mic >= 3.8 && mic <= 4.9 ? 100 : mic >= 3.5 && mic <= 5.2 ? 75 : 40;
    const moistScore = moist <= 8 ? 100 : moist <= 10 ? 70 : 30;
    const fmScore    = fm <= 1 ? 100 : fm <= 2 ? 80 : fm <= 3 ? 50 : 20;
    const colorMap: Record<string, number> = { white: 100, 'cream-white': 85, 'light-spotted': 65, spotted: 40, tinged: 30 };
    const colorScore = colorMap[color] ?? 70;

    const score = Math.round((slScore*25 + micScore*20 + moistScore*20 + fmScore*20 + colorScore*15) / 100);
    const grade = score >= 78 ? 'A' : score >= 55 ? 'B' : 'C';
    const priceImpactPct = grade === 'A' ? 5 : grade === 'B' ? 0 : -8;
    const imp = (s: number) => s >= 85 ? 'positive' : s >= 65 ? 'neutral' : 'negative';
    const factors = [
      { parameter: 'Staple Length', value: `${sl} mm`, impact: imp(slScore), weight: 25 },
      { parameter: 'Micronaire', value: `${mic}`, impact: imp(micScore), weight: 20 },
      { parameter: 'Moisture Content', value: `${moist}%`, impact: imp(moistScore), weight: 20 },
      { parameter: 'Foreign Matter', value: `${fm}%`, impact: imp(fmScore), weight: 20 },
      { parameter: 'Color Grade', value: color, impact: imp(colorScore), weight: 15 },
    ];
    const negParams = factors.filter(f => f.impact === 'negative').map(f => f.parameter);
    const suggestions = negParams.length > 0
      ? negParams.map(p => `Improve ${p} to increase grade`)
      : ['Cotton quality is good — maintain current practices'];
    const explanation = `Cotton graded as Grade ${grade} (score: ${score}/100). `
      + (grade === 'A' ? 'Excellent quality — premium pricing expected.' : grade === 'B' ? 'Good quality — standard market price applies.' : 'Below average — price reduction likely.');
    return { grade, score, priceImpactPct, factors, explanation, suggestions };
  }

  // Groundnut
  const moist   = get('moisture', 8);
  const fm      = get('foreignMatter', 0.8);
  const damaged = get('damagedSeeds', 1.5);
  const oil     = get('oilContent', 49);
  const size    = getText('seedSize', 'medium');

  const moistScore = moist <= 9 ? 100 : moist <= 11 ? 65 : 30;
  const fmScore    = fm <= 1 ? 100 : fm <= 2 ? 75 : 30;
  const dmgScore   = damaged <= 2 ? 100 : damaged <= 4 ? 65 : 25;
  const oilScore   = oil >= 48 ? 100 : oil >= 45 ? 75 : 50;
  const sizeMap: Record<string, number> = { bold: 100, medium: 80, small: 55 };
  const sizeScore  = sizeMap[size] ?? 80;

  const score = Math.round((moistScore*25 + fmScore*20 + dmgScore*20 + oilScore*20 + sizeScore*15) / 100);
  const grade = score >= 80 ? 'A' : score >= 58 ? 'B' : 'C';
  const priceImpactPct = grade === 'A' ? 4 : grade === 'B' ? 0 : -6;
  const imp = (s: number) => s >= 85 ? 'positive' : s >= 65 ? 'neutral' : 'negative';
  const factors = [
    { parameter: 'Moisture Content', value: `${moist}%`, impact: imp(moistScore), weight: 25 },
    { parameter: 'Foreign Matter', value: `${fm}%`, impact: imp(fmScore), weight: 20 },
    { parameter: 'Damaged Seeds', value: `${damaged}%`, impact: imp(dmgScore), weight: 20 },
    { parameter: 'Oil Content', value: `${oil}%`, impact: imp(oilScore), weight: 20 },
    { parameter: 'Seed Size', value: size, impact: imp(sizeScore), weight: 15 },
  ];
  const negParams = factors.filter(f => f.impact === 'negative').map(f => f.parameter);
  const suggestions = negParams.length > 0
    ? negParams.map(p => `Reduce ${p} to improve grade`)
    : ['Groundnut quality is good — maintain storage conditions'];
  const explanation = `Groundnut graded as Grade ${grade} (score: ${score}/100). `
    + (grade === 'A' ? 'Premium quality — oil mills will offer best price.' : grade === 'B' ? 'Standard grade — regular market rate.' : 'Lower grade — price reduction expected.');
  return { grade, score, priceImpactPct, factors, explanation, suggestions };
}

const COTTON_FIELDS = [
  { key: 'stapleLength', label: 'Staple Length (mm)', placeholder: '28', hint: 'Ideal: 28–32 mm' },
  { key: 'micronaire', label: 'Micronaire', placeholder: '4.0', hint: 'Ideal: 3.8–4.9' },
  { key: 'moisture', label: 'Moisture Content (%)', placeholder: '7', hint: 'Ideal: ≤8%' },
  { key: 'foreignMatter', label: 'Foreign Matter (%)', placeholder: '1.5', hint: 'Ideal: ≤2%' },
  { key: 'colorGrade', label: 'Color', placeholder: 'white', hint: 'white / cream-white / light-spotted', isText: true },
];

const GROUNDNUT_FIELDS = [
  { key: 'moisture', label: 'Moisture Content (%)', placeholder: '8', hint: 'Ideal: ≤9%' },
  { key: 'foreignMatter', label: 'Foreign Matter (%)', placeholder: '0.8', hint: 'Ideal: ≤1%' },
  { key: 'damagedSeeds', label: 'Damaged Seeds (%)', placeholder: '1.5', hint: 'Ideal: ≤2%' },
  { key: 'oilContent', label: 'Oil Content (%)', placeholder: '49', hint: 'Ideal: ≥48%' },
  { key: 'seedSize', label: 'Seed Size', placeholder: 'bold', hint: 'bold / medium / small', isText: true },
];

const GRADE_COLOR: Record<string, string> = { A: '#16a34a', B: '#d97706', C: '#dc2626' };
const IMPACT_COLOR: Record<string, string> = { positive: '#16a34a', neutral: '#6b7280', negative: '#dc2626' };

export default function QualityGrading() {
  const [crop, setCrop] = useState('Cotton');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fieldDefs = crop === 'Cotton' ? COTTON_FIELDS : GROUNDNUT_FIELDS;

  const analyze = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('crop', crop);
      for (const [k, v] of Object.entries(fields)) if (v) formData.append(k, v);
      if (imageFile) formData.append('image', imageFile);
      const res = await api.post('/quality/grade', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
    } catch {
      // Demo fallback: compute grade locally from the entered field values
      const base = crop === 'Cotton' ? 6850 : 5420;
      const computed = computeDemoGrade(crop, fields);
      const adjustedPrice = Math.round(base * (1 + computed.priceImpactPct / 100));
      setResult({ ...computed, basePrice: base, adjustedPrice, isDemo: true });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1>⭐ Quality Grading</h1>
        <p>Rule-based quality grade and price estimate for your crop</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['Cotton', 'Groundnut'].map(c => (
            <button key={c} className={`btn ${crop === c ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 20px' }} onClick={() => { setCrop(c); setFields({}); setResult(null); }}>
              {c === 'Cotton' ? '🌿' : '🥜'} {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          {fieldDefs.map(f => (
            <div className="form-group" style={{ margin: 0 }} key={f.key}>
              <label>{f.label}</label>
              <input type={f.isText ? 'text' : 'number'} placeholder={f.placeholder}
                value={fields[f.key] || ''}
                onChange={e => setFields(fv => ({ ...fv, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{f.hint}</div>
            </div>
          ))}
        </div>

        {/* Optional image */}
        <div className="form-group" style={{ margin: '0 0 14px' }}>
          <label>📷 Upload Crop Photo (Optional)</label>
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
            style={{ width: '100%', padding: '8px', border: '1.5px dashed #e5e7eb', borderRadius: 8, fontSize: 13 }} />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Visual grading will be enabled with computer vision model</div>
        </div>

        <button className="btn btn-primary" style={{ padding: '11px 28px' }} onClick={analyze} disabled={loading}>
          {loading ? <><span className="spinner" /> Grading...</> : '⭐ Grade My Crop'}
        </button>
      </div>

      {result && (
        <>
          {result.isDemo && (
            <div className="demo-banner" style={{ marginBottom: 12 }}>
              <span className="demo-badge">📊 DEMO</span> Estimated grade based on entered parameters — <strong>not a certified quality certificate</strong>
            </div>
          )}

          {/* Grade result */}
          <div className="card" style={{ marginBottom: 12, background: '#f9fafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: GRADE_COLOR[result.grade], display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{result.grade}</div>
                <div style={{ fontSize: 11 }}>GRADE</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{result.explanation}</div>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>QUALITY SCORE</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{result.score}<span style={{ fontSize: 12, fontWeight: 400 }}>/100</span></div>
                  </div>
                  <div style={{ background: '#f3f4f6', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>MANDI BASE PRICE</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>₹{result.basePrice.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>per quintal</div>
                  </div>
                  <div style={{ background: GRADE_COLOR[result.grade] + '18', borderRadius: 8, padding: '8px 12px', border: `1px solid ${GRADE_COLOR[result.grade]}44` }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>EST. PRICE FOR THIS GRADE</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: GRADE_COLOR[result.grade] }}>₹{result.adjustedPrice.toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: result.priceImpactPct >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {result.priceImpactPct > 0 ? `+₹${(result.adjustedPrice - result.basePrice).toLocaleString('en-IN')} vs base (+${result.priceImpactPct}%)`
                        : result.priceImpactPct < 0 ? `−₹${(result.basePrice - result.adjustedPrice).toLocaleString('en-IN')} vs base (${result.priceImpactPct}%)`
                        : 'No change from base price'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
              ⚠️ Estimated grade only — based on entered parameters. Verify with certified testing before sale.
            </div>
          </div>

          {/* Factor breakdown */}
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Grading Factors</h3>
            {result.factors.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{f.parameter}</span>
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>({f.value})</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: IMPACT_COLOR[f.impact], textTransform: 'uppercase' }}>
                  {f.impact === 'positive' ? '✓ Good' : f.impact === 'negative' ? '✗ Needs Improvement' : '~ Average'}
                </span>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>💡 How to Improve Grade</h3>
            {result.suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 14 }}>
                <span style={{ color: '#16a34a' }}>→</span><span>{s}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
