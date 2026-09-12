import React, { useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../AuthContext';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/buyers').then(r => setBuyers(r.data.buyers || [])).catch(() => {
      setBuyers([
        { name: 'Gujarat Agro Traders', company: 'Gujarat Agro Traders Pvt Ltd', crop: 'Cotton', offeredPrice: 7050, requiredQuantity: 100, grade: 'A', location: 'Ahmedabad' },
        { name: 'Patel Oil Industries', company: 'Patel Oil Industries', crop: 'Groundnut', offeredPrice: 5550, requiredQuantity: 150, grade: 'A', location: 'Gondal' },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="page-header">
        <h1>🏢 Buyer Dashboard</h1>
        <p>Welcome, {user?.name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Requirements', value: '5', bg: '#dbeafe' },
          { label: 'Available Listings', value: '4', bg: '#dcfce7' },
          { label: 'Cotton Price Today', value: '₹6,850/qtl', bg: '#dcfce7' },
          { label: 'Groundnut Price Today', value: '₹5,420/qtl', bg: '#fef3c7' },
        ].map(s => (
          <div key={s.label} className="card" style={{ background: s.bg }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🧑‍🌾 Available Farmer Listings</h3>
        {[
          { farmer: 'Raju Patel', crop: 'Cotton', qty: 20, grade: 'A', price: 7000, location: 'Rajkot' },
          { farmer: 'Bhavesh Mer', crop: 'Cotton', qty: 35, grade: 'B', price: 6800, location: 'Gondal' },
          { farmer: 'Harsha Bhai', crop: 'Groundnut', qty: 25, grade: 'A', price: 5500, location: 'Junagadh' },
          { farmer: 'Savita Ben', crop: 'Groundnut', qty: 40, grade: 'B', price: 5300, location: 'Amreli' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{l.farmer} — {l.location}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>{l.crop} • {l.qty} qtl • Grade {l.grade}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>₹{l.price.toLocaleString('en-IN')}/qtl</div>
              <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12, marginTop: 4 }}>Contact Farmer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
