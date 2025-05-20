/* Layout general de la página: cabecera y área de contenido */

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { motion } from 'framer-motion';

const Layout: React.FC = () => {
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </motion.div>
  );
};

export default Layout;