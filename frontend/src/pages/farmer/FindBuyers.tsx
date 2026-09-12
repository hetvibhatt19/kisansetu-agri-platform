import React, { useState } from 'react';
import api from '../../api';
import { useAuth } from '../../AuthContext';

interface MatchResult {
  buyerId: string; buyerName: string; company: string; location: string;
  offeredPrice: number; requiredQuantity: number; minQuantity: number;
  grade: string; deliveryDays: number; distanceKm: number;
  matchScore: number; scoreBreakdown: Record<string, number>;
  explanation: string; priceAdvantage: number;
}

const DISTRICTS = ['Rajkot', 'Junagadh', 'Amreli', 'Bhavnagar', 'Surendranagar', 'Ahmedabad', 'Anand', 'Gondal'];

// Relevance label + colour from match score
function matchLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 85) return { label: 'Excellent Match', color: '#15803d', bg: '#dcfce7' };
  if (score >= 70) return { label: 'Good Match',      color: '#16a34a', bg: '#f0fdf4' };
  if (score >= 55) return { label: 'Fair Match',      color: '#d97706', bg: '#fef3c7' };
  return              { label: 'Weak Match',       color: '#dc2626', bg: '#fee2e2' };
}

// Demo fallback buyers for both crops
const DEMO_MATCHES: Record<string, MatchResult[]> = {
  Cotton: [
    { buyerId: '1', buyerName: 'National Agri Exports', company: 'National Agri Exports Ltd', location: 'Ahmedabad', offeredPrice: 7100, requiredQuantity: 80, minQuantity: 10, grade: 'A', deliveryDays: 5, distanceKm: 215, matchScore: 88, scoreBreakdown: { quality: 100, quantity: 100, price: 95, distance: 40, timeline: 100 }, explanation: 'Offers ₹7100/quintal (₹250 above mandi), accepts Grade A, needs 80 qtl (min 10), delivery in 5 days.', priceAdvantage: 250 },
    { buyerId: '2', buyerName: 'Saurashtra Cotton Mills', company: 'Saurashtra Cotton Mills Ltd', location: 'Rajkot', offeredPrice: 6950, requiredQuantity: 200, minQuantity: 20, grade: 'B', deliveryDays: 7, distanceKm: 8, matchScore: 82, scoreBreakdown: { quality: 80, quantity: 100, price: 80, distance: 100, timeline: 100 }, explanation: 'Only 8 km away in Rajkot, offers ₹6950/quintal (₹100 above mandi), needs up to 200 qtl.', priceAdvantage: 100 },
    { buyerId: '3', buyerName: 'Gujarat Agro Traders', company: 'Gujarat Agro Traders Pvt Ltd', location: 'Ahmedabad', offeredPrice: 7050, requiredQuantity: 100, minQuantity: 10, grade: 'A', deliveryDays: 10, distanceKm: 215, matchScore: 79, scoreBreakdown: { quality: 100, quantity: 85, price: 90, distance: 40, timeline: 80 }, explanation: 'Offers ₹7050/quintal, accepts Grade A, needs up to 100 qtl with flexible delivery.', priceAdvantage: 200 },
    { buyerId: '4', buyerName: 'Patel Cotton Ginners', company: 'Patel Cotton Ginners', location: 'Gondal', offeredPrice: 6800, requiredQuantity: 150, minQuantity: 15, grade: 'B', deliveryDays: 12, distanceKm: 42, matchScore: 65, scoreBreakdown: { quality: 70, quantity: 90, price: 65, distance: 85, timeline: 70 }, explanation: 'Nearby in Gondal (42 km), accepts Grade B, needs 150 qtl. Price slightly below mandi rate.', priceAdvantage: -50 },
  ],
  Groundnut: [
    { buyerId: '5', buyerName: 'Patel Oil Industries', company: 'Patel Oil Industries', location: 'Gondal', offeredPrice: 5550, requiredQuantity: 150, minQuantity: 15, grade: 'A', deliveryDays: 14, distanceKm: 42, matchScore: 87, scoreBreakdown: { quality: 100, quantity: 100, price: 95, distance: 85, timeline: 80 }, explanation: 'Offers ₹5550/quintal (₹130 above mandi), accepts Grade A, needs 150 qtl, only 42 km away in Gondal.', priceAdvantage: 130 },
    { buyerId: '6', buyerName: 'Anand Agri Cooperative', company: 'Anand Agri Cooperative Society', location: 'Anand', offeredPrice: 5480, requiredQuantity: 200, minQuantity: 20, grade: 'B', deliveryDays: 12, distanceKm: 178, matchScore: 76, scoreBreakdown: { quality: 80, quantity: 100, price: 85, distance: 45, timeline: 80 }, explanation: 'Offers ₹5480/quintal (₹60 above mandi), accepts Grade B, large requirement of 200 qtl.', priceAdvantage: 60 },
    { buyerId: '7', buyerName: 'Junagadh Oil Mill', company: 'Junagadh Oil Mill Pvt Ltd', location: 'Junagadh', offeredPrice: 5510, requiredQuantity: 120, minQuantity: 10, grade: 'A', deliveryDays: 7, distanceKm: 62, matchScore: 84, scoreBreakdown: { quality: 100, quantity: 90, price: 90, distance: 80, timeline: 100 }, explanation: 'Offers ₹5510/quintal, Grade A required, quick delivery in 7 days, 62 km away in Junagadh.', priceAdvantage: 90 },
    { buyerId: '8', buyerName: 'Amreli Groundnut Traders', company: 'Amreli Groundnut Traders Ltd', location: 'Amreli', offeredPrice: 5390, requiredQuantity: 80, minQuantity: 8, grade: 'B', deliveryDays: 10, distanceKm: 95, matchScore: 61, scoreBreakdown: { quality: 70, quantity: 80, price: 70, distance: 65, timeline: 90 }, explanation: 'Accepts smaller lots from 8 qtl, Grade B, offers ₹5390/quintal near mandi rate.', priceAdvantage: -30 },
  ],
};

// Demo contact info keyed by buyerId
const DEMO_CONTACTS: Record<string, { phone: string; email: string; contactPerson: string }> = {
  '1': { phone: '+91 98240 11001', email: 'buy@natlagri.com',        contactPerson: 'Ramesh Shah' },
  '2': { phone: '+91 98240 22002', email: 'procurement@scmills.in',  contactPerson: 'Bhavesh Mer' },
  '3': { phone: '+91 98240 33003', email: 'trade@gujaratagrotraders.com', contactPerson: 'Dinesh Patel' },
  '4': { phone: '+91 98240 44004', email: 'info@patelginners.co.in', contactPerson: 'Suresh Patel' },
  '5': { phone: '+91 98240 55005', email: 'buy@pateloil.in',         contactPerson: 'Kiran Patel' },
  '6': { phone: '+91 98240 66006', email: 'coop@anandagri.org',      contactPerson: 'Mahesh Desai' },
  '7': { phone: '+91 98240 77007', email: 'mill@junagadhoil.com',    contactPerson: 'Haresh Joshi' },
  '8': { phone: '+91 98240 88008', email: 'trade@amreliground.com',  contactPerson: 'Nilesh Rathod' },
};

export default function FindBuyers() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    crop: 'Cotton' as 'Cotton' | 'Groundnut',
    quantityQuintals: 20,
    qualityGrade: 'A',
    district: user?.district || 'Rajkot',
    expectedPricePerQuintal: 7000,
  });
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [mandiPrice, setMandiPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [expressed, setExpressed] = useState<Set<string>>(new Set());
  const [contactOpen, setContactOpen] = useState<string | null>(null);

  // When crop changes, reset expected price to a sensible default
  const handleCropChange = (crop: 'Cotton' | 'Groundnut') => {
    setForm(f => ({
      ...f,
      crop,
      expectedPricePerQuintal: crop === 'Cotton' ? 7000 : 5400,
    }));
    setSearched(false);
  };

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.post('/matching/find-buyers', form);
      setMatches(res.data.matches || []);
      setMandiPrice(res.data.mandiPrice || 0);
      setIsDemo(res.data.isDemo ?? false);
    } catch {
      setMatches(DEMO_MATCHES[form.crop] || []);
      setMandiPrice(form.crop === 'Cotton' ? 6850 : 5420);
      setIsDemo(true);
    }
    setSearched(true);
    setLoading(false);
  };

  const handleExpressInterest = (buyerId: string) => {
    setExpressed(prev => new Set(prev).add(buyerId));
    // In a real system this would POST to /api/matching/express-interest
    // For demo, we just record it locally and show confirmation
  };

  // Build a plain-language explanation from the match's own typed fields,
  // avoiding any "undefined" that may come from a partially-shaped API response.
  const buildExplanation = (m: MatchResult): string => {
    const parts: string[] = [];
    const minQty = m.minQuantity ?? 0;
    const reqQty = m.requiredQuantity ?? 0;
    if (m.offeredPrice > 0) parts.push(`offers ₹${m.offeredPrice.toLocaleString('en-IN')}/quintal`);
    if (m.priceAdvantage > 0) parts.push(`₹${m.priceAdvantage} above mandi rate`);
    if (m.distanceKm > 0)  parts.push(`${m.distanceKm} km away in ${m.location}`);
    if (m.grade)            parts.push(`accepts Grade ${m.grade}`);
    if (minQty > 0 && reqQty > 0)       parts.push(`needs at least ${minQty} quintals (up to ${reqQty})`);
    else if (reqQty > 0)                 parts.push(`needs up to ${reqQty} quintals`);
    else if (minQty > 0)                 parts.push(`needs at least ${minQty} quintals`);
    if (m.deliveryDays > 0) parts.push(`delivery within ${m.deliveryDays} day${m.deliveryDays !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') + '.' : m.explanation;
  };

  const scoreBar = (score: number, label: string) => (
    <div key={label} style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{score}%</span>
      </div>
      <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#ef4444', borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  );

  const totalValue = (price: number) => (price * form.quantityQuintals).toLocaleString('en-IN');

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <h1>🤝 Find Buyers</h1>
        <p>Match your crop with the best buyers across Gujarat — sorted by overall fit</p>
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Your Crop Details</h3>

        {/* Crop toggle — prominent */}
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
            <label>Quality Grade</label>
            <select
              value={form.qualityGrade}
              onChange={e => setForm(f => ({ ...f, qualityGrade: e.target.value }))}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
            >
              <option value="A">Grade A (Premium)</option>
              <option value="B">Grade B (Standard)</option>
              <option value="C">Grade C (Below Avg)</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Your District</label>
            <select
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
            >
              {DISTRICTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Expected Price (₹/qtl)</label>
            <input
              type="number" value={form.expectedPricePerQuintal}
              onChange={e => setForm(f => ({ ...f, expectedPricePerQuintal: Number(e.target.value) }))}
              style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 14, padding: '11px 28px' }}
          onClick={search}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Finding Buyers…</> : '🔍 Find Best Buyers'}
        </button>
      </div>

      {isDemo && searched && (
        <div className="demo-banner">
          <span className="demo-badge">📊 DEMO</span> Showing demo buyer matches for {form.crop}
        </div>
      )}

      {/* Results header */}
      {searched && matches.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
            {matches.length} buyer{matches.length !== 1 ? 's' : ''} found — sorted by best overall match
          </div>
          {mandiPrice > 0 && (
            <div style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 10px', color: '#15803d', fontWeight: 600 }}>
              Mandi rate today: ₹{mandiPrice.toLocaleString('en-IN')}/qtl
            </div>
          )}
        </div>
      )}

      {/* Buyer cards */}
      {searched && matches.map((m, i) => {
        const ml = matchLabel(m.matchScore);
        const alreadyExpressed = expressed.has(m.buyerId);
        const scoreEntries = Object.entries(m.scoreBreakdown).filter(([k]) => k !== 'cropScore' && k !== 'crop');
        return (
          <div
            key={m.buyerId}
            className="card"
            style={{ marginBottom: 12, border: i === 0 ? '2px solid #16a34a' : '1px solid #e5e7eb' }}
          >
            {/* Best match banner */}
            {i === 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⭐ Best Match
              </div>
            )}

            {/* Top row: info + price + match badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

              {/* Left: name, company, location */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{m.buyerName}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  {m.company} &nbsp;•&nbsp; 📍 {m.location} &nbsp;•&nbsp; {m.distanceKm} km away
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#374151', background: '#f3f4f6', borderRadius: 5, padding: '3px 8px' }}>
                    📦 Needs {m.minQuantity}–{m.requiredQuantity} qtl
                  </span>
                  <span style={{ fontSize: 12, color: '#374151', background: '#f3f4f6', borderRadius: 5, padding: '3px 8px' }}>
                    ⭐ Grade {m.grade}
                  </span>
                  <span style={{ fontSize: 12, color: '#374151', background: '#f3f4f6', borderRadius: 5, padding: '3px 8px' }}>
                    🚚 {m.deliveryDays} day{m.deliveryDays !== 1 ? 's' : ''} delivery
                  </span>
                </div>
              </div>

              {/* Right: price + total + match */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {/* Match badge */}
                <div style={{ display: 'inline-block', background: ml.bg, color: ml.color, border: `1px solid ${ml.color}33`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {m.matchScore}% — {ml.label}
                </div>
                {/* Offered price */}
                <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
                  ₹{m.offeredPrice.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>per quintal</div>
                {m.priceAdvantage > 0 && (
                  <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                    +₹{m.priceAdvantage} vs mandi
                  </div>
                )}
                {m.priceAdvantage < 0 && (
                  <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, marginTop: 2 }}>
                    ₹{Math.abs(m.priceAdvantage)} below mandi
                  </div>
                )}
                {/* Estimated total for farmer's qty */}
                <div style={{ marginTop: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  ≈ ₹{totalValue(m.offeredPrice)} total
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                  for {form.quantityQuintals} qtl you entered
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div style={{ marginTop: 10, fontSize: 13, background: '#f8fafc', borderRadius: 6, padding: '8px 12px', color: '#374151', borderLeft: '3px solid #16a34a' }}>
              💡 {buildExplanation(m)}
            </div>

            {/* Score breakdown (collapsible) */}
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                View Score Breakdown
              </summary>
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {scoreEntries.map(([k, v]) => scoreBar(v, k.replace(/Score$/i, '')))}
              </div>
            </details>

            {/* Actions */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {alreadyExpressed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                  ✅ Interest expressed — buyer will contact you
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ padding: '9px 20px', fontSize: 13 }}
                  onClick={() => handleExpressInterest(m.buyerId)}
                >
                  🤝 Express Interest
                </button>
              )}
              <button
                className="btn btn-outline"
                style={{ padding: '9px 20px', fontSize: 13 }}
                onClick={() => setContactOpen(contactOpen === m.buyerId ? null : m.buyerId)}
              >
                📞 Contact Buyer
              </button>
            </div>

            {/* Inline contact info panel */}
            {contactOpen === m.buyerId && (() => {
              const c = DEMO_CONTACTS[m.buyerId] || { phone: '+91 98240 00000', email: 'contact@buyer.com', contactPerson: 'Procurement Team' };
              return (
                <div style={{ marginTop: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}>📋 Contact Information — {m.buyerName}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Contact Person</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.contactPerson}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Phone</div>
                      <a href={`tel:${c.phone.replace(/\s/g, '')}`} style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8' }}>{c.phone}</a>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Email</div>
                      <a href={`mailto:${c.email}`} style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8' }}>{c.email}</a>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>📊 Demo data — real contact details available after registration</div>
                </div>
              );
            })()}
          </div>
        );
      })}

      {searched && matches.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
          No buyers found for your criteria. Try adjusting quantity, grade, or expected price.
        </div>
      )}
    </div>
  );
}
