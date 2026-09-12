import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import api from '../../api';

interface ForecastResult {
  crop: string; currentPrice: number; trend: string; trendPct: number;
  forecasts: { date: string; predicted: number; low: number; high: number; confidence: number; daysAhead: number }[];
  historicalPrices: { date: string; price: number }[];
  factors: string[]; summary: string; isDemo: boolean;
}

const COLORS = { Cotton: '#16a34a', Groundnut: '#d97706' };

export default function PriceForecast() {
  const [searchParams] = useSearchParams();
  const initialCrop = (searchParams.get('crop') === 'Groundnut' ? 'Groundnut' : 'Cotton') as 'Cotton' | 'Groundnut';
  const [crop, setCrop] = useState<'Cotton' | 'Groundnut'>(initialCrop);
  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState(30);

  const load = (c: string) => {
    setLoading(true);
    api.get(`/mandi/forecast?crop=${c}`).then(r => setData(r.data)).catch(() => {
      // demo fallback
      const base = c === 'Cotton' ? 6850 : 5420;
      const hist = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
        price: Math.round(base * (0.96 + i / 30 * 0.06 + (Math.random() - 0.5) * 0.02))
      }));
      const fore = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0],
        predicted: Math.round(base * (1 + (i + 1) / 30 * 0.04)),
        low: Math.round(base * (1 + (i + 1) / 30 * 0.04 - 0.03 - i * 0.001)),
        high: Math.round(base * (1 + (i + 1) / 30 * 0.04 + 0.03 + i * 0.001)),
        confidence: Math.max(50, 88 - i * 1.2),
        daysAhead: i + 1
      }));
      setData({ crop: c, currentPrice: base, trend: 'up', trendPct: 2.1, forecasts: fore, historicalPrices: hist,
        factors: ['Seasonal harvest', 'Export demand', 'MSP policy'], summary: `${c} prices trending up. 7-day forecast: ₹${fore[6].low}–₹${fore[6].high}.`, isDemo: true });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(crop); }, [crop]);

  const color = COLORS[crop];
  const forecastSlice = data?.forecasts.slice(0, horizon) || [];
  const histSlice = data?.historicalPrices.slice(-30) || [];

  // Merge historical + forecast for chart
  const chartData = [
    ...histSlice.map(h => ({ date: h.date.slice(5), actual: h.price, predicted: undefined, low: undefined, high: undefined })),
    ...(data ? [{ date: 'Today', actual: data.currentPrice, predicted: data.currentPrice, low: data.currentPrice, high: data.currentPrice }] : []),
    ...forecastSlice.map(f => ({ date: f.date.slice(5), actual: undefined, predicted: f.predicted, low: f.low, high: f.high }))
  ];

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <h1>📈 Price Forecast</h1>
        <p>AI-powered short-term price prediction</p>
      </div>

      {data?.isDemo && <div className="demo-banner"><span className="demo-badge">📊 DEMO</span> Forecast based on simulated historical data</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['Cotton', 'Groundnut'] as const).map(c => (
          <button key={c} className={`btn ${crop === c ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 20px' }} onClick={() => setCrop(c)}>
            {c === 'Cotton' ? '🌿' : '🥜'} {c}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[7, 15, 30].map(d => (
            <button key={d} className={`btn ${horizon === d ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => setHorizon(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="page-loading"><span className="spinner" /> Loading forecast...</div> : data && (
        <>
          {/* Summary strip */}
          <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Current Price</div>
              <div style={{ fontSize: 26, fontWeight: 800, color }}>₹{data.currentPrice.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>7-Day Forecast</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>₹{data.forecasts[6]?.low}–{data.forecasts[6]?.high}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Trend</div>
              <div className={`trend-${data.trend}`} style={{ fontSize: 16, fontWeight: 700 }}>
                {data.trend === 'up' ? '📈 Rising' : data.trend === 'down' ? '📉 Falling' : '➡️ Stable'}
                {' '}{data.trendPct > 0 ? '+' : ''}{data.trendPct}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Confidence</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{data.forecasts[6]?.confidence}%</div>
            </div>
          </div>

          {/* Chart */}
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Price History + {horizon}-Day Forecast</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" fontSize={10} interval={6} tick={{ fill: '#9ca3af' }} />
                <YAxis fontSize={10} tickFormatter={v => `₹${(v/1000).toFixed(1)}K`} domain={['auto', 'auto']} />
                <Tooltip formatter={(v: any, name: string) => [`₹${Number(v).toLocaleString('en-IN')}`, name === 'actual' ? 'Actual' : name === 'predicted' ? 'Forecast' : name]} />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2} dot={false} name="Actual Price" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke={color} strokeWidth={2} strokeDasharray="5 3" dot={false} name="Forecast" connectNulls={false} />
                <Line type="monotone" dataKey="low" stroke={color} strokeWidth={1} strokeDasharray="2 4" dot={false} name="Low Range" opacity={0.5} connectNulls={false} />
                <Line type="monotone" dataKey="high" stroke={color} strokeWidth={1} strokeDasharray="2 4" dot={false} name="High Range" opacity={0.5} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
              — — Dashed lines indicate forecast (estimates, not guarantees)
            </p>
          </div>

          {/* Summary */}
          <div className="card" style={{ marginBottom: 14, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>💡 {data.summary}</p>
          </div>

          {/* Factors */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Factors Influencing Price</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.factors.map((f, i) => (
                <span key={i} style={{ background: '#f3f4f6', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#374151' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
