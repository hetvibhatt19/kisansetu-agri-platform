import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../api';

interface StorageResult {
  recommendation: string; confidence: number;
  sellNow: { revenue: number; pricePerQuintal: number; netRevenue: number };
  storeLater: { forecastedPrice: number; storageDays: number; storageCostPerQuintal: number; totalStorageCost: number; expectedRevenue: number; netRevenue: number; expectedGain: number; breakEvenDays: number };
  summary: string; reasoning: string[]; risks: string[]; assumptions: string[]; isDemo: boolean;
}

const REC_STYLE: Record<string, { bg: string; border: string; icon: string; label: string; textColor: string }> = {
  SELL_NOW:            { bg: '#fef2f2', border: '#fca5a5', icon: '⚡', label: 'Sell Now',         textColor: '#991b1b' },
  WAIT:                { bg: '#fffbeb', border: '#fde68a', icon: '⏳', label: 'Wait & Recheck',   textColor: '#92400e' },
  STORE_AND_SELL_LATER:{ bg: '#f0fdf4', border: '#86efac', icon: '🏪', label: 'Store & Sell Later', textColor: '#15803d' },
};

// Farmer-friendly plain-language explanation per recommendation
function friendlyExplanation(rec: string, gain: number, storageDays: number, storeCost: number, forecastedPrice: number, currentPrice: number, confidence: number): string {
  const gainStr = `₹${Math.abs(gain).toLocaleString('en-IN')}`;
  const priceRise = forecastedPrice - currentPrice;
  if (rec === 'STORE_AND_SELL_LATER') {
    return `Prices are expected to rise by ₹${priceRise.toLocaleString('en-IN')}/quintal over the next ${storageDays} days. After paying ₹${storeCost.toLocaleString('en-IN')} in storage charges, you can still earn ${gainStr} more than selling today. Storing looks worthwhile right now.`;
  }
  if (rec === 'WAIT') {
    return `The forecast shows a small potential gain of ${gainStr} after storage costs, but the expected price increase is modest and the forecast confidence is ${confidence}% — not high enough to confidently recommend storing. Check prices again in a few days. If the upward trend strengthens, storing may become worthwhile.`;
  }
  return `Prices are not expected to rise enough to cover the ₹${storeCost.toLocaleString('en-IN')} storage cost over ${storageDays} days. Selling today at the current rate gives you the best return. Avoid unnecessary storage charges.`;
}

export default function StorageAdvisor() {
  const [form, setForm] = useState({ crop: 'Cotton' as 'Cotton' | 'Groundnut', quantityQuintals: 20, storageDays: 15 });
  const [result, setResult] = useState<StorageResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCropChange = (crop: 'Cotton' | 'Groundnut') => {
    setForm(f => ({ ...f, crop }));
    setResult(null);
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await api.post('/storage/analyze', form);
      setResult(res.data);
    } catch {
      // Demo fallback — all calculations explicit and transparent
      const base = form.crop === 'Cotton' ? 6850 : 5420;
      const costPerQtlPerDay = form.crop === 'Cotton' ? 2.5 : 1.8;
      const storageCostPerQtl = costPerQtlPerDay * form.storageDays;
      const totalStorageCost = storageCostPerQtl * form.quantityQuintals;
      // Forecast: gentle daily uptick (0.2%)
      const forecast = Math.round(base * (1 + form.storageDays * 0.002));
      const sellNowRevenue = base * form.quantityQuintals;
      const expectedRevenue = forecast * form.quantityQuintals;
      const netRevenueLater = expectedRevenue - totalStorageCost;
      const expectedGain = netRevenueLater - sellNowRevenue;
      const trend = expectedGain > 0 ? 'up' : 'stable';
      // Confidence is fixed at 68 in demo; require both meaningful gain AND sufficient confidence to recommend STORE
      const demoConfidence = 68;
      const rec = (expectedGain > 500 && demoConfidence >= 70)
        ? 'STORE_AND_SELL_LATER'
        : expectedGain > 0
        ? 'WAIT'
        : 'SELL_NOW';
      // breakEvenDays: how many days until cumulative price increase covers total storage cost per quintal
      // expectedPriceIncreasePerDay = (forecast - base) / storageDays
      // breakEvenDays = storageCostPerQtl / expectedPriceIncreasePerDay
      const priceIncreasePerDay = form.storageDays > 0 ? (forecast - base) / form.storageDays : 0;
      const breakEvenDays = priceIncreasePerDay > 0
        ? Math.ceil(storageCostPerQtl / priceIncreasePerDay)
        : 999;
      setResult({
        recommendation: rec,
        confidence: demoConfidence,
        sellNow: { revenue: sellNowRevenue, pricePerQuintal: base, netRevenue: sellNowRevenue },
        storeLater: {
          forecastedPrice: forecast,
          storageDays: form.storageDays,
          storageCostPerQuintal: storageCostPerQtl,
          totalStorageCost,
          expectedRevenue,
          netRevenue: netRevenueLater,
          expectedGain: Math.round(expectedGain),
          breakEvenDays,
        },
        summary: rec === 'STORE_AND_SELL_LATER'
          ? `Store for ${form.storageDays} days — forecast price ₹${forecast}/qtl gives an extra ₹${Math.round(expectedGain).toLocaleString('en-IN')} after storage costs.`
          : rec === 'WAIT'
          ? `Market trend is mildly positive. Wait a few days and recheck before deciding.`
          : `Sell now at ₹${base}/qtl — storage costs would reduce your returns.`,
        reasoning: [
          trend === 'up'
            ? `Price trend is rising — forecast ₹${forecast}/qtl in ${form.storageDays} days`
            : `Prices are stable or falling — limited benefit from waiting`,
          `Storage cost: ₹${storageCostPerQtl.toFixed(0)}/quintal for ${form.storageDays} days`,
          expectedGain > 0
            ? `Estimated net gain from storing: ₹${Math.round(expectedGain).toLocaleString('en-IN')}`
            : `Storing would result in a net loss of ₹${Math.abs(Math.round(expectedGain)).toLocaleString('en-IN')}`,
          breakEvenDays < form.storageDays
            ? `Storage cost covered in approximately ${breakEvenDays} days`
            : `Storage cost not fully covered within ${form.storageDays} days`,
        ],
        risks: [
          'Forecasts are estimates — actual prices may vary',
          'Storage quality risk (moisture, pests) may reduce grade',
          'Market conditions can change due to policy or weather',
        ],
        assumptions: [
          `Storage cost: ₹${costPerQtlPerDay}/quintal/day`,
          `${form.storageDays}-day price model based on recent trend`,
          'No quality degradation assumed during storage',
          'Prices are indicative — verify with your local mandi before deciding',
        ],
        isDemo: true,
      });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="page-header">
        <h1>🏪 Storage Advisor</h1>
        <p>Should you sell now, store, or wait? Get a clear recommendation based on current prices and forecasts.</p>
      </div>

      {/* Input form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Your Crop Details</h3>

        {/* Crop toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['Cotton', 'Groundnut'] as const).map(c => (
            <button
              key={c}
              className={`btn ${form.crop === c ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '9px 22px', fontSize: 14 }}
              onClick={() => handleCropChange(c)}
            >
              {c === 'Cotton' ? '🌿' : '🥜'} {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Quantity (Quintals)</label>
            <input
              type="number" min={1} value={form.quantityQuintals}
              onChange={e => setForm(f => ({ ...f, quantityQuintals: Math.max(1, Number(e.target.value)) }))}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Storage Duration (Days)</label>
            <input
              type="number" min={1} max={90} value={form.storageDays}
              onChange={e => setForm(f => ({ ...f, storageDays: Math.min(90, Math.max(1, Number(e.target.value))) }))}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 14, padding: '11px 28px' }}
          onClick={analyze}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Analyzing…</> : '🔍 Analyse Storage Decision'}
        </button>
      </div>

      {result && (() => {
        const style = REC_STYLE[result.recommendation] || REC_STYLE.SELL_NOW;
        const { sellNow, storeLater } = result;
        const priceRise = storeLater.forecastedPrice - sellNow.pricePerQuintal;
        const chartData = [
          { name: 'Sell Now', amount: sellNow.netRevenue,      fill: '#6b7280' },
          { name: `Store ${storeLater.storageDays}d`, amount: storeLater.netRevenue, fill: storeLater.netRevenue > sellNow.netRevenue ? '#16a34a' : '#ef4444' },
        ];
        return (
          <>
            {result.isDemo && (
              <div className="demo-banner" style={{ marginBottom: 12 }}>
                <span className="demo-badge">📊 DEMO</span> Calculations use estimated market data — verify with your local mandi before deciding
              </div>
            )}

            {/* Recommendation banner */}
            <div className="card" style={{ marginBottom: 12, background: style.bg, borderColor: style.border, borderWidth: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 36 }}>{style.icon}</span>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>
                    Recommendation
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: style.textColor }}>{style.label}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Confidence</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: style.textColor }}>{result.confidence}%</div>
                </div>
              </div>
              {/* Farmer-friendly plain language explanation */}
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}>
                {friendlyExplanation(result.recommendation, storeLater.expectedGain, storeLater.storageDays, storeLater.totalStorageCost, storeLater.forecastedPrice, sellNow.pricePerQuintal, result.confidence)}
              </p>
            </div>

            {/* Price snapshot — current vs forecast */}
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Price Snapshot</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Current Mandi Price',    value: `₹${sellNow.pricePerQuintal.toLocaleString('en-IN')}`, sub: 'per quintal today',      color: '#1f2328' },
                  { label: `Forecast (${storeLater.storageDays} days)`, value: `₹${storeLater.forecastedPrice.toLocaleString('en-IN')}`, sub: 'estimated future price', color: priceRise >= 0 ? '#16a34a' : '#dc2626' },
                  { label: 'Expected Price Gain',    value: `${priceRise >= 0 ? '+' : ''}₹${priceRise.toLocaleString('en-IN')}`,  sub: 'per quintal from storing', color: priceRise >= 0 ? '#16a34a' : '#dc2626' },
                  { label: 'Est. Storage Cost',      value: `₹${storeLater.totalStorageCost.toLocaleString('en-IN')}`,              sub: `₹${storeLater.storageCostPerQuintal.toFixed(0)}/qtl total`, color: '#d97706' },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Additional profit after storage cost */}
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: storeLater.expectedGain > 0 ? '#dcfce7' : '#fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: storeLater.expectedGain > 0 ? '#15803d' : '#991b1b', textTransform: 'uppercase' }}>
                    {storeLater.expectedGain > 0 ? '💰 Additional Profit After Storage Cost' : '⚠️ Net Loss After Storage Cost'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    (Store revenue − Sell-now revenue − Storage charges)
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: storeLater.expectedGain > 0 ? '#15803d' : '#991b1b' }}>
                  {storeLater.expectedGain >= 0 ? '+' : ''}₹{storeLater.expectedGain.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Sell Now vs Store comparison */}
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚖️ Sell Now vs Store — Net Revenue Comparison</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {/* Sell Now */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, borderLeft: result.recommendation === 'SELL_NOW' ? '4px solid #ef4444' : '4px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>⚡ Sell Now</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Price / quintal</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>₹{sellNow.pricePerQuintal.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, marginBottom: 2 }}>Total revenue ({form.quantityQuintals} qtl)</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>₹{sellNow.revenue.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, marginBottom: 2 }}>Storage cost</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>₹0</div>
                  <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Net in hand</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>₹{sellNow.netRevenue.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Store */}
                <div style={{ background: storeLater.netRevenue > sellNow.netRevenue ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: 14, borderLeft: result.recommendation === 'STORE_AND_SELL_LATER' ? '4px solid #16a34a' : '4px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🏪 Store {storeLater.storageDays} Days</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Forecasted price / quintal</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: priceRise >= 0 ? '#16a34a' : '#dc2626' }}>₹{storeLater.forecastedPrice.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, marginBottom: 2 }}>Expected revenue</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>₹{storeLater.expectedRevenue.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, marginBottom: 2 }}>Storage cost to pay</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>− ₹{storeLater.totalStorageCost.toLocaleString('en-IN')}</div>
                  <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Net in hand</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: storeLater.netRevenue > sellNow.netRevenue ? '#16a34a' : '#dc2626' }}>
                      ₹{storeLater.netRevenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                  <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={12} width={72} />
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Net Revenue']} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {storeLater.breakEvenDays < storeLater.storageDays && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>
                  ⏱ Storage cost is covered in approximately <strong>{storeLater.breakEvenDays} days</strong> of price increase.
                </div>
              )}
            </div>

            {/* Key factors */}
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🔑 Key Factors Behind This Recommendation</h3>
              {result.reasoning.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 14, borderBottom: i < result.reasoning.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>

            {/* Assumptions & Risks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card">
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#6b7280' }}>📐 Assumptions</h3>
                {result.assumptions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '3px 0', color: '#6b7280' }}>• {a}</div>
                ))}
              </div>
              <div className="card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>⚠️ Risks</h3>
                {result.risks.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '3px 0', color: '#92400e' }}>• {r}</div>
                ))}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
