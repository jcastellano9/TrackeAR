// App.tsx: Componente raíz que configura proveedores y rutas

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

// ProtectedRoute: Verifica si el usuario está autenticado antes de mostrar rutas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Si la autenticación aún se está cargando, muestra indicador de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirige a la página de login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// App: Configura proveedores de contexto y define rutas de la aplicación
function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <ThemeProvider>
          {/* Router: Define rutas públicas (login, register, reset-password) y rutas protegidas */}
          <Router>
            {/* Rutas públicas: login, registro y restablecimiento de contraseña */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Ruta raíz protegida: requiere sesión activa para acceder a Layout y rutas internas */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                {/* Rutas internas después del login: Dashboard, Portfolio, Analysis, Simulator y Profile */}
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
