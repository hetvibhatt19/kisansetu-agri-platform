import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../api';

interface PriceRow {
  mandi: string;
  district: string;
  crop: string;
  price: number;
  min: number;
  max: number;
  arrival: number;
  date: string;
  source: string;
}

interface TrendPoint { date: string; price: number; }

const CROP_COLOR: Record<string, string> = { Cotton: '#16a34a', Groundnut: '#d97706' };
const CROP_ICON: Record<string, string> = { Cotton: '🌿', Groundnut: '🥜' };

// Generate a simple 7-day demo sparkline relative to a base price
function demoTrend(basePrice: number): TrendPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const noise = (Math.sin(i * 1.3) * 0.018 + (Math.random() - 0.5) * 0.01);
    return {
      date: d.toISOString().split('T')[0].slice(5),
      price: Math.round(basePrice * (0.97 + (i / 6) * 0.03 + noise)),
    };
  });
}

export default function MarketPrices() {
  const navigate = useNavigate();
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Cotton' | 'Groundnut'>('All');
  const [isDemo, setIsDemo] = useState(false);

  // Derive "previous day" price from the 7-day trend (second-to-last point)
  const getPrevPrice = (crop: string, currentPrice: number): number => {
    const t = trends[crop];
    if (t && t.length >= 2) return t[t.length - 2].price;
    return Math.round(currentPrice * 0.988); // fallback: ~1.2% lower
  };

  useEffect(() => {
    const fallbackPrices: PriceRow[] = [
      { mandi: 'Rajkot APMC', district: 'Rajkot', crop: 'Cotton', price: 6850, min: 6600, max: 7100, arrival: 1250, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Gondal APMC', district: 'Rajkot', crop: 'Cotton', price: 6900, min: 6700, max: 7150, arrival: 980, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Junagadh APMC', district: 'Junagadh', crop: 'Cotton', price: 6780, min: 6550, max: 7000, arrival: 760, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Surendranagar APMC', district: 'Surendranagar', crop: 'Cotton', price: 6820, min: 6600, max: 7050, arrival: 890, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Amreli APMC', district: 'Amreli', crop: 'Groundnut', price: 5420, min: 5200, max: 5650, arrival: 2100, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Junagadh APMC', district: 'Junagadh', crop: 'Groundnut', price: 5380, min: 5150, max: 5600, arrival: 1800, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Bhavnagar APMC', district: 'Bhavnagar', crop: 'Groundnut', price: 5450, min: 5250, max: 5700, arrival: 1550, date: new Date().toISOString().split('T')[0], source: 'demo' },
      { mandi: 'Gondal APMC', district: 'Rajkot', crop: 'Groundnut', price: 5390, min: 5160, max: 5610, arrival: 1200, date: new Date().toISOString().split('T')[0], source: 'demo' },
    ];

    const loadTrends = (priceList: PriceRow[], demo: boolean) => {
      const crops = ['Cotton', 'Groundnut'];
      const trendMap: Record<string, TrendPoint[]> = {};
      if (demo) {
        trendMap['Cotton'] = demoTrend(priceList.find(p => p.crop === 'Cotton')?.price ?? 6850);
        trendMap['Groundnut'] = demoTrend(priceList.find(p => p.crop === 'Groundnut')?.price ?? 5420);
        setTrends(trendMap);
        return;
      }
      Promise.all(
        crops.map(crop =>
          api.get(`/mandi/historical?crop=${crop}&days=7`)
            .then(r => {
              const pts: TrendPoint[] = (r.data.prices || []).slice(-7).map((h: any) => ({
                date: h.date.slice(5),
                price: h.price,
              }));
              trendMap[crop] = pts.length >= 2 ? pts : demoTrend(priceList.find(p => p.crop === crop)?.price ?? 6000);
            })
            .catch(() => {
              trendMap[crop] = demoTrend(priceList.find(p => p.crop === crop)?.price ?? 6000);
            })
        )
      ).then(() => setTrends(trendMap));
    };

    api.get('/mandi/prices')
      .then(r => {
        const list: PriceRow[] = r.data.prices || [];
        const demo: boolean = r.data.isDemo ?? false;
        setPrices(list.length ? list : fallbackPrices);
        setIsDemo(demo || list.length === 0);
        loadTrends(list.length ? list : fallbackPrices, demo || list.length === 0);
      })
      .catch(() => {
        setPrices(fallbackPrices);
        setIsDemo(true);
        loadTrends(fallbackPrices, true);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? prices : prices.filter(p => p.crop === filter);

  // Group rows by crop for summary stats
  const cottonPrices = prices.filter(p => p.crop === 'Cotton');
  const groundnutPrices = prices.filter(p => p.crop === 'Groundnut');
  const avgCotton = cottonPrices.length ? Math.round(cottonPrices.reduce((s, p) => s + p.price, 0) / cottonPrices.length) : 0;
  const avgGroundnut = groundnutPrices.length ? Math.round(groundnutPrices.reduce((s, p) => s + p.price, 0) / groundnutPrices.length) : 0;

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <h1>💰 Market Prices</h1>
        <p>Today's mandi rates across Gujarat APMCs — Cotton &amp; Groundnut</p>
      </div>

      {isDemo && (
        <div className="demo-banner">
          <span className="demo-badge">📊 DEMO</span> Simulated mandi data — connect live API for real prices
        </div>
      )}

      {/* Crop summary cards */}
      {!loading && (
        <div className="price-cards" style={{ marginBottom: 18 }}>
          {[
            { crop: 'Cotton', avg: avgCotton, count: cottonPrices.length },
            { crop: 'Groundnut', avg: avgGroundnut, count: groundnutPrices.length },
          ].map(({ crop, avg, count }) => {
            const color = CROP_COLOR[crop];
            const trendData = trends[crop] || [];
            const prevPrice = getPrevPrice(crop, avg);
            const change = avg - prevPrice;
            const changePct = prevPrice ? ((change / prevPrice) * 100).toFixed(1) : '0.0';
            const trendClass = change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-stable';
            const trendArrow = change > 0 ? '▲' : change < 0 ? '▼' : '→';
            return (
              <div key={crop} className={`price-card ${crop.toLowerCase()}`}>
                <div className="price-card-label">{CROP_ICON[crop]} {crop} — Avg across {count} mandis</div>
                <div className="price-card-price">₹{avg.toLocaleString('en-IN')}</div>
                <div className="price-card-unit">per quintal</div>
                <div className={`price-card-trend ${trendClass}`}>
                  {trendArrow} {change >= 0 ? '+' : ''}₹{change.toLocaleString('en-IN')} ({changePct}%) vs yesterday
                </div>
                {trendData.length >= 2 && (
                  <div style={{ height: 48, marginBottom: 8 }}>
                    <ResponsiveContainer width="100%" height={48}>
                      <LineChart data={trendData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                        <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} />
                        <Tooltip
                          formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Price']}
                          labelFormatter={(l: string) => l}
                          contentStyle={{ fontSize: 11 }}
                        />
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <button className="price-card-btn" onClick={() => navigate(`/farmer/forecast?crop=${crop}`)}>
                  📈 View Forecast →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['All', 'Cotton', 'Groundnut'] as const).map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '7px 16px', fontSize: '13px' }}
            onClick={() => setFilter(f)}
          >
            {f === 'Cotton' ? '🌿 ' : f === 'Groundnut' ? '🥜 ' : ''}{f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /> Loading prices...</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((p, i) => {
            const color = CROP_COLOR[p.crop] || '#374151';
            const trendData = trends[p.crop] || [];
            const prevPrice = getPrevPrice(p.crop, p.price);
            const change = p.price - prevPrice;
            const changePct = prevPrice ? ((change / prevPrice) * 100).toFixed(1) : '0.0';
            const trendClass = change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'trend-stable';
            const trendArrow = change > 0 ? '▲' : change < 0 ? '▼' : '→';
            return (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {/* Mandi info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.mandi}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>📍 {p.district} • {p.date}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Range: ₹{p.min.toLocaleString('en-IN')} – ₹{p.max.toLocaleString('en-IN')} &nbsp;|&nbsp; Arrival: {p.arrival} qtl
                  </div>
                </div>

                {/* 7-day sparkline */}
                {trendData.length >= 2 && (
                  <div style={{ width: 90, height: 40, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height={40}>
                      <LineChart data={trendData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                        <Line type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} dot={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                          formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Price']}
                          contentStyle={{ fontSize: 10 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Price & change */}
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                    {CROP_ICON[p.crop]} {p.crop}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2 }}>
                    ₹{p.price.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>per quintal</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }} className={trendClass}>
                    {trendArrow} {change >= 0 ? '+' : ''}₹{Math.abs(change).toLocaleString('en-IN')} ({changePct}%)
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>
                    Prev: ₹{prevPrice.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* View Forecast */}
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}
                  onClick={() => navigate(`/farmer/forecast?crop=${p.crop}`)}
                >
                  📈 Forecast
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
