import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { motion } from 'framer-motion';
import { Heart, Pencil, Trash2, Plus } from 'lucide-react';
import { Investment } from '../services/investmentService';

const Portfolio: React.FC = () => {
  const { user } = useAuth();
  const supabase = useSupabase();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showInUSD, setShowInUSD] = useState(false);

  // Fetch investments
  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', user?.id)
            .order('purchase_date', { ascending: false });

        if (error) throw error;
        setInvestments(data || []);
      } catch (err) {
        console.error('Error fetching investments:', err);
        setError('Error al cargar las inversiones');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInvestments();
    }
  }, [user, supabase]);

  // Calculate portfolio metrics
  const totalInvestments = investments.length;
  const totalInvested = investments.reduce((sum, inv) => {
    const amount = inv.quantity * inv.purchase_price;
    return sum + (inv.currency === 'USD' ? amount * 1000 : amount); // Using a fixed rate for example
  }, 0);

  const portfolioValue = investments.reduce((sum, inv) => {
    const currentAmount = inv.quantity * (inv.current_price || inv.purchase_price);
    return sum + (inv.currency === 'USD' ? currentAmount * 1000 : currentAmount);
  }, 0);

  // Filter investments
  const filteredInvestments = investments.filter(inv => {
    const matchesFilter = activeFilter === 'Todos' || inv.type === activeFilter;
    const matchesSearch = searchTerm === '' ||
        inv.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate percentage change
  const calculateChange = (current: number, purchase: number) => {
    const change = ((current - purchase) / purchase) * 100;
    return change.toFixed(2);
  };

  return (
      <div className="space-y-6">
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Cartera</h1>
          <p className="text-gray-600 dark:text-gray-300">Gestiona tus inversiones</p>
        </motion.div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de inversiones</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalInvestments}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Invertido</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalInvested)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm col-span-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total del Portfolio</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(portfolioValue)}
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {['Todos', 'CEDEAR', 'Cripto', 'Acción'].map((filter) => (
                <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeFilter === filter
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {filter}
                </button>
            ))}
          </div>
          <div className="flex gap-4">
            <button
                onClick={() => setShowInUSD(!showInUSD)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Ver en {showInUSD ? 'ARS' : 'USD'}
            </button>
            <button
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              Exportar CSV
            </button>
            <button
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Agregar Inversión
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex justify-between items-center">
          <input
              type="text"
              placeholder="Buscar por Ticker o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-64"
          />
          <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="desc">Fecha ↓</option>
            <option value="asc">Fecha ↑</option>
          </select>
        </div>

        {/* Investments Table */}
        {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            </div>
        ) : error ? (
            <div className="text-center py-10 text-red-600 dark:text-red-400">
              {error}
            </div>
        ) : filteredInvestments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">Aún no has agregado inversiones.</p>
              <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                <Plus size={16} />
                Agregar Inversión
              </button>
            </div>
        ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Ticker</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Precio actual</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Cambio $</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Cambio %</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Ratio</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Cantidad</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">PPC</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Tenencia</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de compra</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Asignación</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvestments.map((investment) => {
                  const currentPrice = investment.current_price || investment.purchase_price;
                  const changeAmount = (currentPrice - investment.purchase_price) * investment.quantity;
                  const changePercent = calculateChange(currentPrice, investment.purchase_price);
                  const position = currentPrice * investment.quantity;
                  const allocation = (position / portfolioValue * 100).toFixed(2);

                  return (
                      <tr key={investment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-3">
                          <button className="text-gray-400 hover:text-red-500 transition-colors">
                            <Heart size={16} />
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium">{investment.ticker}</td>
                        <td className="px-4 py-3">{investment.name}</td>
                        <td className="px-4 py-3">{formatCurrency(currentPrice, investment.currency)}</td>
                        <td className={`px-4 py-3 ${changeAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(changeAmount, investment.currency)}
                        </td>
                        <td className={`px-4 py-3 ${Number(changePercent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {changePercent}%
                        </td>
                        <td className="px-4 py-3">{investment.type === 'CEDEAR' ? '10:1' : '-'}</td>
                        <td className="px-4 py-3">{investment.quantity}</td>
                        <td className="px-4 py-3">{formatCurrency(investment.purchase_price, investment.currency)}</td>
                        <td className="px-4 py-3">{formatCurrency(position, investment.currency)}</td>
                        <td className="px-4 py-3">{new Date(investment.purchase_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${allocation}%` }}
                              ></div>
                            </div>
                            <span>{allocation}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="text-gray-400 hover:text-blue-500 transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
        )}
      </div>
  );
};

export default Portfolio;