import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NAV = [
  { to: '/buyer/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/buyer/farmers', icon: '🧑‍🌾', label: 'Find Farmers' },
];

export default function BuyerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="farmer-layout">
      <header className="top-bar" style={{ background: '#1d4ed8' }}>
        <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)}>☰</button>
        <div className="top-bar-brand">🏢 KisanSetu Buyer</div>
        <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
      </header>
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`} style={{ borderRightColor: '#dbeafe' }}>
        <div className="sidebar-brand"><span>🏢</span><div><div className="brand-name" style={{ color: '#1d4ed8' }}>KisanSetu</div><div className="brand-sub">Buyer Portal</div></div></div>
        <div className="user-info" style={{ background: '#dbeafe' }}>
          <div className="user-avatar">🏢</div>
          <div><div className="user-display-name">{user?.name}</div><div className="user-location">📍 {user?.location}</div></div>
        </div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={({ isActive }) => isActive ? { background: '#1d4ed8', color: 'white' } : {}}
            onClick={() => setMenuOpen(false)}>
            <span className="nav-icon">{n.icon}</span><span>{n.label}</span>
          </NavLink>
        ))}
        <button className="sidebar-logout" onClick={handleLogout}>🚪 Sign Out</button>
      </nav>
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
