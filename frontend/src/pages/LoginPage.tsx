import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(phone, password);
      navigate('/');
    } catch {
      setError('Invalid phone or password. Use demo login below.');
    } finally { setLoading(false); }
  };

  const handleDemo = async (role: 'farmer' | 'buyer') => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(role);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Demo login failed — check backend is running on port 5000.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-logo">🌾</div>
        <h1>KisanSetu</h1>
        <p>AI-Powered Cotton & Groundnut Market Platform</p>
        <p className="login-subtitle">Gujarat, India</p>
      </div>

      <div className="login-card">
        <h2>Sign In</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Mobile Number</label>
            <input type="tel" placeholder="e.g. 9876543001" value={phone}
              onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="demo-section">
          <div className="demo-divider"><span>Quick Demo Access</span></div>
          <div className="demo-badge-row"><span className="demo-badge">📊 DEMO MODE</span></div>
          <p className="demo-hint">Click below for instant demo access</p>
          <div className="demo-buttons">
            <button className="btn btn-primary demo-btn" onClick={() => handleDemo('farmer')} disabled={loading}>
              🧑‍🌾 Login as Farmer<br/><small>Raju Patel, Rajkot</small>
            </button>
            <button className="btn btn-outline demo-btn" onClick={() => handleDemo('buyer')} disabled={loading}>
              🏢 Login as Buyer<br/><small>Gujarat Agro Traders</small>
            </button>
          </div>
          <p className="demo-creds">
            Demo credentials: Phone <strong>9876543001</strong> / Password <strong>demo123</strong>
          </p>
        </div>
      </div>

      <div className="login-footer">
        <p>Built with IBM Bob · IBM watsonx Granite · Gujarat Hackathon 2026</p>
      </div>
    </div>
  );
}
