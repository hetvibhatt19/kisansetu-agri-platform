import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function FindFarmers() {
  const [listings, setListings] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    api.get('/buyers').then(() => {}).catch(() => {});
    setListings([
      { farmer: 'Raju Patel', crop: 'Cotton', qty: 20, grade: 'A', price: 7000, location: 'Rajkot', harvest: '5 days ago' },
      { farmer: 'Bhavesh Mer', crop: 'Cotton', qty: 35, grade: 'B', price: 6800, location: 'Gondal', harvest: '3 days ago' },
      { farmer: 'Harsha Bhai', crop: 'Groundnut', qty: 25, grade: 'A', price: 5500, location: 'Junagadh', harvest: '7 days ago' },
      { farmer: 'Savita Ben', crop: 'Groundnut', qty: 40, grade: 'B', price: 5300, location: 'Amreli', harvest: '2 days ago' },
    ]);
  }, []);

  const filtered = filter === 'All' ? listings : listings.filter(l => l.crop === filter);

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>🧑‍🌾 Find Farmers</h1>
        <p>Active crop listings from Gujarat farmers</p>
      </div>
      <div className="demo-banner" style={{ marginBottom: 14 }}><span className="demo-badge">📊 DEMO</span> Sample farmer listings</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['All', 'Cotton', 'Groundnut'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '7px 16px', fontSize: '13px' }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {filtered.map((l, i) => (
        <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{l.farmer} — {l.location}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {l.crop} • {l.qty} quintals • Grade {l.grade} • Harvested {l.harvest}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>₹{l.price.toLocaleString('en-IN')}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>expected per quintal</div>
            <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '13px', marginTop: 6 }}>📞 Contact</button>
          </div>
        </div>
      ))}
    </div>
  );
}
