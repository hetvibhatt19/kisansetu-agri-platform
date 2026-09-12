import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../api';
import { useAuth } from '../../AuthContext';
import './FarmerDashboard.css';

interface DashboardData {
  summary: { totalQuantitySold: number; totalRevenue: number; averageSellingPrice: number; currentCottonPrice: number; currentGroundnutPrice: number; cottonTrend: string; groundnutTrend: string; };
  cropValues: { crop: string; quantity: number; currentPrice: number; estimatedValue: number; potentialValue: number }[];
  bestBuyer: { name: string; crop: string; price: number; advantage: number } | null;
  insights: string[];
  sellNowRecommendation: string;
  revenueByMonth: { month: string; revenue: number }[];
  isDemo: boolean;
}

const trendIcon = (t: string) => t === 'up' ? '📈' : t === 'down' ? '📉' : '➡️';
const trendClass = (t: string) => t === 'up' ? 'trend-up' : t === 'down' ? 'trend-down' : 'trend-stable';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/farmer').then(r => setData(r.data)).catch(() => {
      // demo fallback
      setData({
        summary: { totalQuantitySold: 25, totalRevenue: 155000, averageSellingPrice: 6200, currentCottonPrice: 6850, currentGroundnutPrice: 5420, cottonTrend: 'up', groundnutTrend: 'stable' },
        cropValues: [{ crop: 'Cotton', quantity: 20, currentPrice: 6850, estimatedValue: 137000, potentialValue: 143500 }],
        bestBuyer: { name: 'National Agri Exports', crop: 'Cotton', price: 7100, advantage: 250 },
        insights: ['Cotton prices rising — consider holding for 7 days', 'National Agri Exports offers ₹250 above mandi rate'],
        sellNowRecommendation: 'Consider holding cotton — prices rising',
        revenueByMonth: [{ month: 'Sep-24', revenue: 53000 }, { month: 'Oct-24', revenue: 102000 }],
        isDemo: true
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><span className="spinner" /> Loading dashboard...</div>;
  if (!data) return <div>Failed to load dashboard</div>;

  const { summary, cropValues, bestBuyer, insights, sellNowRecommendation, revenueByMonth } = data;
  const totalCropValue = cropValues.reduce((s, c) => s + c.estimatedValue, 0);

  return (
    <div className="farmer-dashboard">
      {data.isDemo && <div className="demo-banner"><span className="demo-badge">📊 DEMO MODE</span> Showing simulated market data for demonstration</div>}

      <div className="page-header">
        <h1>Namaste, {user?.name} 🙏</h1>
        <p>Here's your farm market overview for today</p>
      </div>

      {/* Key price cards */}
      <div className="price-cards">
        <div className="price-card cotton">
          <div className="price-card-label">🌿 Cotton (Kapas)</div>
          <div className="price-card-price">₹{summary.currentCottonPrice.toLocaleString('en-IN')}</div>
          <div className="price-card-unit">per quintal</div>
          <div className={`price-card-trend ${trendClass(summary.cottonTrend)}`}>
            {trendIcon(summary.cottonTrend)} {summary.cottonTrend === 'up' ? 'Rising' : summary.cottonTrend === 'down' ? 'Falling' : 'Stable'}
          </div>
          <button className="price-card-btn" onClick={() => navigate('/farmer/forecast')}>View Forecast →</button>
        </div>
        <div className="price-card groundnut">
          <div className="price-card-label">🥜 Groundnut (Mungfali)</div>
          <div className="price-card-price">₹{summary.currentGroundnutPrice.toLocaleString('en-IN')}</div>
          <div className="price-card-unit">per quintal</div>
          <div className={`price-card-trend ${trendClass(summary.groundnutTrend)}`}>
            {trendIcon(summary.groundnutTrend)} {summary.groundnutTrend === 'up' ? 'Rising' : summary.groundnutTrend === 'down' ? 'Falling' : 'Stable'}
          </div>
          <button className="price-card-btn" onClick={() => navigate('/farmer/forecast')}>View Forecast →</button>
        </div>
      </div>

      {/* Sell now recommendation */}
      <div className={`recommendation-banner ${summary.cottonTrend === 'down' ? 'sell-now' : 'wait'}`}>
        <span className="rec-icon">{summary.cottonTrend === 'down' ? '⚠️' : '💡'}</span>
        <div>
          <div className="rec-title">AI Recommendation</div>
          <div className="rec-text">{sellNowRecommendation}</div>
        </div>
        <button className="btn btn-outline rec-btn" onClick={() => navigate('/farmer/storage')}>Storage Advisor →</button>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Sold</div>
          <div className="stat-value">{summary.totalQuantitySold} qtl</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">₹{(summary.totalRevenue / 1000).toFixed(0)}K</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Price</div>
          <div className="stat-value">₹{summary.averageSellingPrice.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-label">Crop Value</div>
          <div className="stat-value">₹{(totalCropValue / 1000).toFixed(0)}K</div>
        </div>
      </div>

      <div className="dash-grid">
        {/* Current crop values */}
        <div className="card">
          <h3>📦 Current Crop Value</h3>
          {cropValues.map(cv => (
            <div key={cv.crop} className="crop-value-row">
              <div className="crop-value-name">{cv.crop} — {cv.quantity} qtl (Grade A)</div>
              <div className="crop-value-amounts">
                <span>Now: <strong>₹{cv.estimatedValue.toLocaleString('en-IN')}</strong></span>
                <span className="potential">Potential: ₹{cv.potentialValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="crop-value-actions">
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => navigate('/farmer/buyers')}>Find Buyer</button>
                <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => navigate('/farmer/storage')}>Storage Advice</button>
              </div>
            </div>
          ))}
        </div>

        {/* Best buyer */}
        {bestBuyer && (
          <div className="card best-buyer-card">
            <h3>🏆 Best Available Buyer</h3>
            <div className="best-buyer-name">{bestBuyer.name}</div>
            <div className="best-buyer-price">₹{bestBuyer.price.toLocaleString('en-IN')}/qtl for {bestBuyer.crop}</div>
            <div className="best-buyer-advantage">+₹{bestBuyer.advantage}/qtl above mandi price</div>
            <button className="btn btn-primary" onClick={() => navigate('/farmer/buyers')}>View All Buyers →</button>
          </div>
        )}

        {/* Revenue chart */}
        {revenueByMonth.length > 0 && (
          <div className="card chart-card">
            <h3>💰 Revenue This Season</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={revenueByMonth}>
                <XAxis dataKey="month" fontSize={11} />
                <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} fontSize={11} width={50} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: '#16a34a' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI insights */}
        <div className="card insights-card">
          <h3>🤖 AI Insights</h3>
          {insights.map((ins, i) => (
            <div key={i} className="insight-item">
              <span className="insight-dot">•</span>
              <span>{ins}</span>
            </div>
          ))}
          <button className="btn btn-outline" style={{ marginTop: '12px', width: '100%' }} onClick={() => navigate('/farmer/assistant')}>
            Ask AI Assistant 💬
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          {[
            { icon: '💰', label: 'Check Prices', path: '/farmer/prices' },
            { icon: '🤝', label: 'Find Buyers', path: '/farmer/buyers' },
            { icon: '🏪', label: 'Storage Advice', path: '/farmer/storage' },
            { icon: '⭐', label: 'Grade My Crop', path: '/farmer/quality' },
          ].map(a => (
            <button key={a.path} className="action-btn" onClick={() => navigate(a.path)}>
              <span className="action-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
