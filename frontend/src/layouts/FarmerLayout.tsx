import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './FarmerLayout.css';

const NAV = [
  { to: '/farmer/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/farmer/prices', icon: '💰', label: 'Market Prices' },
  { to: '/farmer/forecast', icon: '📈', label: 'Price Forecast' },
  { to: '/farmer/buyers', icon: '🤝', label: 'Find Buyers' },
  { to: '/farmer/storage', icon: '🏪', label: 'Storage Advisor' },
  { to: '/farmer/quality', icon: '⭐', label: 'Quality Grading' },
  { to: '/farmer/income', icon: '💵', label: 'My Income' },
  { to: '/farmer/assistant', icon: '🤖', label: 'AI Assistant' },
];

export default function FarmerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="farmer-layout">
      {/* Top bar */}
      <header className="top-bar">
        <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)}>☰</button>
        <div className="top-bar-brand">🌾 KisanSetu</div>
        <div className="top-bar-user">
          <span className="user-name">{user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* Sidebar */}
      <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span>🌾</span>
          <div>
            <div className="brand-name">KisanSetu</div>
            <div className="brand-sub">Smart Agri Platform</div>
          </div>
        </div>
        <div className="user-info">
          <div className="user-avatar">👨‍🌾</div>
          <div>
            <div className="user-display-name">{user?.name}</div>
            <div className="user-location">📍 {user?.location || 'Gujarat'}</div>
          </div>
        </div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
        <button className="sidebar-logout" onClick={handleLogout}>🚪 Sign Out</button>
      </nav>

      {/* Overlay */}
      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
