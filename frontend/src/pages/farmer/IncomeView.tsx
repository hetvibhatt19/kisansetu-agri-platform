import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../../api';

interface IncomeData {
  summary: { totalQuantitySold: number; totalRevenue: number; averageSellingPrice: number; currentCottonPrice: number; currentGroundnutPrice: number; cottonTrend?: string; groundnutTrend?: string };
  revenueByMonth: { month: string; revenue: number }[];
  transactions: { crop: string; quantity: number; price: number; total: number; date: string; grade: string; buyer: string }[];
  cropValues: { crop: string; quantity: number; currentPrice: number; estimatedValue: number; potentialValue: number }[];
  insights: string[];
  isDemo: boolean;
}

export default function IncomeView() {
  const [data, setData] = useState<IncomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/farmer').then(r => setData(r.data)).catch(() => {
      setData({
        summary: {
          totalQuantitySold: 25,
          totalRevenue: 155000,
          averageSellingPrice: 6200,
          currentCottonPrice: 6850,
          currentGroundnutPrice: 5420,
          cottonTrend: 'up',
          groundnutTrend: 'stable',
        },
        revenueByMonth: [
          { month: 'Aug-24', revenue: 0 },
          { month: 'Sep-24', revenue: 53000 },
          { month: 'Oct-24', revenue: 102000 },
        ],
        transactions: [
          { crop: 'Cotton',    quantity: 15, price: 6800, total: 102000, date: '2024-10-15', grade: 'A', buyer: 'Saurashtra Cotton Mills' },
          { crop: 'Groundnut', quantity: 10, price: 5300, total:  53000, date: '2024-09-30', grade: 'B', buyer: 'Gujarat Agro Traders' },
        ],
        cropValues: [
          { crop: 'Cotton',    quantity: 20, currentPrice: 6850, estimatedValue: 137000, potentialValue: 143500 },
          { crop: 'Groundnut', quantity: 15, currentPrice: 5420, estimatedValue:  81300, potentialValue:  83700 },
        ],
        insights: [
          'Cotton prices are rising — holding could earn ₹6,500 more',
          'Best buyer offers ₹250 above mandi rate for Cotton',
          'Groundnut prices are stable — sell when convenient',
        ],
        isDemo: true
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><span className="spinner" /> Loading...</div>;
  if (!data) return <div>Error loading income data</div>;

  const { summary, revenueByMonth, transactions, cropValues } = data;
  const potentialGain = cropValues.reduce((s, c) => s + (c.potentialValue - c.estimatedValue), 0);

  // Crop-wise totals from transaction history
  const cropBreakdown = transactions.reduce((acc, t) => {
    const k = t.crop;
    if (!acc[k]) acc[k] = { quantity: 0, revenue: 0, count: 0 };
    acc[k].quantity += Number(t.quantity);
    acc[k].revenue  += Number(t.total);
    acc[k].count    += 1;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; count: number }>);
  const cropBreakdownData = Object.entries(cropBreakdown).map(([crop, d]) => ({
    crop,
    quantity: d.quantity,
    revenue: d.revenue,
    avgPrice: d.quantity > 0 ? Math.round(d.revenue / d.quantity) : 0,
    count: d.count,
    color: crop === 'Cotton' ? '#16a34a' : '#d97706',
    icon: crop === 'Cotton' ? '🌿' : '🥜',
  }));

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <h1>💵 My Income</h1>
        <p>Season summary and revenue analysis</p>
      </div>
      {data.isDemo && <div className="demo-banner"><span className="demo-badge">📊 DEMO</span> Sample income data</div>}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Sold', value: `${summary.totalQuantitySold} qtl`, bg: '#f0fdf4' },
          { label: 'Total Revenue', value: `₹${(summary.totalRevenue / 1000).toFixed(0)}K`, bg: '#f0fdf4' },
          { label: 'Avg Sell Price', value: `₹${summary.averageSellingPrice.toLocaleString('en-IN')}`, bg: '#f0fdf4' },
          { label: 'Potential Gain', value: `₹${(potentialGain / 1000).toFixed(1)}K`, bg: '#dcfce7' },
        ].map(s => (
          <div key={s.label} className="card" style={{ background: s.bg }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Crop-wise breakdown */}
      {cropBreakdownData.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🌾 Crop-wise Revenue Breakdown (Season)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {cropBreakdownData.map(cb => (
              <div key={cb.crop} style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', borderLeft: `4px solid ${cb.color}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{cb.icon} {cb.crop}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Qty Sold</div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{cb.quantity} <span style={{ fontSize: 11, fontWeight: 400 }}>qtl</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Revenue</div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>₹{(cb.revenue / 1000).toFixed(1)}K</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Avg Price</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: cb.color }}>₹{cb.avgPrice.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Transactions</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{cb.count}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Revenue chart */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} fontSize={11} width={48} />
              <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
              <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Crop values */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Current Crop Value</h3>
          {cropValues.map(cv => (
            <div key={cv.crop} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{cv.crop} — {cv.quantity} qtl</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <div><span style={{ color: '#6b7280' }}>Value now: </span><strong>₹{cv.estimatedValue.toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color: '#6b7280' }}>7-day potential: </span><strong style={{ color: '#16a34a' }}>₹{cv.potentialValue.toLocaleString('en-IN')}</strong></div>
              </div>
              <div style={{ marginTop: 6, height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${Math.min(100, (cv.estimatedValue / cv.potentialValue) * 100).toFixed(0)}%`, background: '#16a34a', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Transaction History</h3>
        {transactions.length === 0 ? (
          <div style={{ color: '#6b7280', padding: 16, textAlign: 'center' }}>No transactions yet this season</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Crop', 'Qty (qtl)', 'Price/qtl', 'Total', 'Grade', 'Buyer'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px' }}>{t.date}</td>
                    <td style={{ padding: '8px 10px' }}>{t.crop}</td>
                    <td style={{ padding: '8px 10px' }}>{t.quantity}</td>
                    <td style={{ padding: '8px 10px' }}>₹{Number(t.price).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>₹{Number(t.total).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: t.grade === 'A' ? '#dcfce7' : t.grade === 'B' ? '#fef3c7' : '#fee2e2', color: t.grade === 'A' ? '#166534' : t.grade === 'B' ? '#854d0e' : '#991b1b', borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>
                        {t.grade}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>{t.buyer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
