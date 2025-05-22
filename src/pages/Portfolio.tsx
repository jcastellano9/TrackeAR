import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Search, Heart, Pencil, Trash2, Plus } from 'lucide-react';

interface Investment {
  id: string;
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  currency: 'USD' | 'ARS';
  is_favorite: boolean;
}

const Portfolio: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('purchase_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchInvestments();
  }, [user]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('No user authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order(sortBy, { ascending: sortDirection === 'asc' });

      if (fetchError) {
        throw fetchError;
      }

      setInvestments(data || []);
    } catch (err) {
      console.error('Error fetching investments:', err);
      setError('Error al cargar las inversiones');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvestments = investments.filter(inv => {
    const matchesFilter = filter === 'Todos' || inv.type === filter;
    const matchesSearch = search.toLowerCase() === '' ||
      inv.ticker.toLowerCase().includes(search.toLowerCase()) ||
      inv.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const calculateTotalValue = () => {
    return filteredInvestments.reduce((total, inv) => {
      return total + (inv.quantity * inv.purchase_price);
    }, 0);
  };

  const formatCurrency = (value: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Cartera</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tus inversiones</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {/* Export logic */}}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => {/* Add investment logic */}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="mr-2" size={20} />
            Agregar Inversión
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de inversiones</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredInvestments.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total del Portfolio</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(calculateTotalValue())}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {['Todos', 'Cripto', 'CEDEAR', 'Acción'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por Ticker o Nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Investments Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-600 dark:text-red-400">{error}</div>
      ) : filteredInvestments.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 dark:text-gray-400">No hay inversiones para mostrar</p>
          <button
            onClick={() => {/* Add investment logic */}}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <Plus className="mr-2" size={20} />
            Agregar Inversión
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Favorito</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Ticker</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Nombre</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Cantidad</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Precio de Compra</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Fecha de Compra</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Moneda</th>
                <th className="px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.map((investment) => (
                <tr
                  key={investment.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3">
                    <button className="text-gray-400 hover:text-yellow-500">
                      <Heart
                        size={20}
                        className={investment.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{investment.ticker}</td>
                  <td className="px-4 py-3">{investment.name}</td>
                  <td className="px-4 py-3">{investment.type}</td>
                  <td className="px-4 py-3">{investment.quantity}</td>
                  <td className="px-4 py-3">{formatCurrency(investment.purchase_price, investment.currency)}</td>
                  <td className="px-4 py-3">
                    {new Date(investment.purchase_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{investment.currency}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {/* Edit logic */}}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => {/* Delete logic */}}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Portfolio;