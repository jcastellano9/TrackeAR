/* Encabezado con navegación y cambio de tema */

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LayoutDashboard, Briefcase, BarChart, Calculator, User, Menu, X, Sun, Moon, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  const { signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { path: '/', label: 'Inicio', icon: <LayoutDashboard size={20} /> },
    { path: '/portfolio', label: 'Mi Cartera', icon: <Briefcase size={20} /> },
    { path: '/analysis', label: 'Análisis', icon: <BarChart size={20} /> },
    { path: '/simulator', label: 'Simulador', icon: <Calculator size={20} /> },
    { path: '/profile', label: 'Perfil', icon: <User size={20} /> },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <motion.header
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 transition-colors ${
        scrolled 
          ? 'bg-white/80 dark:bg-gray-900/80 shadow-lg' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <NavLink to="/" role="heading" aria-level={1}>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                TrackeAr
              </h1>
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="ml-2 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center"
            >
              <LogOut size={16} className="mr-2" />
              Salir
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <motion.div
          className="md:hidden bg-white dark:bg-gray-900 shadow-lg rounded-b-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              className="w-full mt-2 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center"
            >
              <LogOut size={16} className="mr-2" />
              Salir
            </button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};

export default Header;
