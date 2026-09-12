import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import FarmerLayout from './layouts/FarmerLayout';
import BuyerLayout from './layouts/BuyerLayout';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import MarketPrices from './pages/farmer/MarketPrices';
import PriceForecast from './pages/farmer/PriceForecast';
import FindBuyers from './pages/farmer/FindBuyers';
import StorageAdvisor from './pages/farmer/StorageAdvisor';
import QualityGrading from './pages/farmer/QualityGrading';
import IncomeView from './pages/farmer/IncomeView';
import AIAssistant from './pages/farmer/AIAssistant';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import FindFarmers from './pages/buyer/FindFarmers';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Farmer routes */}
          <Route path="/farmer" element={<ProtectedRoute role="farmer"><FarmerLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FarmerDashboard />} />
            <Route path="prices" element={<MarketPrices />} />
            <Route path="forecast" element={<PriceForecast />} />
            <Route path="buyers" element={<FindBuyers />} />
            <Route path="storage" element={<StorageAdvisor />} />
            <Route path="quality" element={<QualityGrading />} />
            <Route path="income" element={<IncomeView />} />
            <Route path="assistant" element={<AIAssistant />} />
          </Route>

          {/* Buyer routes */}
          <Route path="/buyer" element={<ProtectedRoute role="buyer"><BuyerLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<BuyerDashboard />} />
            <Route path="farmers" element={<FindFarmers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
