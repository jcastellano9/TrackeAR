// Componente principal que define las rutas y los contextos

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Analysis from './pages/Analysis.tsx';
import Simulator from './pages/Simulator.tsx';
import Profile from './pages/Profile';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';

// Envuelve rutas que requieren sesión activa
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="simulator" element={<Simulator />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}

export default App
