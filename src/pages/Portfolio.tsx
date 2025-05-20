import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Download, Star, Pencil, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Investment = {
  id: string;
  ticker: string;
  name: string;
  type: 'CEDEAR' | 'CRYPTO' | 'STOCK';
  current_price: number;
  purchase_price: number;
  ratio: string | null;
  quantity: number;
  purchase_date: string;
  currency: 'ARS' | 'USD';
  is_favorite: boolean;
};

const Portfolio: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  // State for investments and filters
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [filteredInvestments, setFilteredInvestments] = useState<Investment[]>([]);
  const [activeFilter, setActiveFilter] = useState<'TODOS' | 'CEDEAR' | 'CRYPTO' | 'STOCK'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInUSD, setShowInUSD] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Portfolio stats
  const [totalValue, setTotalValue] = useState(0);
  const [totalValueUSD, setTotalValueUSD] = useState(0);

  // Fetch investments
  const fetchInvestments = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      setInvestments(data || []);
      setFilteredInvestments(data || []);
      
      // Calculate totals
      const totalARS = data?.reduce((acc, inv) => acc + (inv.current_price * inv.quantity), 0) || 0;
      setTotalValue(totalARS);
      // TODO: Implement real USD conversion
      setTotalValueUSD(totalARS / 1000);
      
    } catch (error: any) {
      console.error('Error fetching investments:', error);
      setError('Error al cargar las inversiones');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter investments based on type and search term
  useEffect(() => {
    let filtered = [...investments];
    
    if (activeFilter !== 'TODOS') {
      filtered = filtered.filter(inv => inv.type === activeFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredInvestments(filtered);
  }, [activeFilter, searchTerm, investments]);

  useEffect(() => {
    fetchInvestments();
  }, [user]);

  // Format currency
  const formatCurrency = (value: number, currency: 'ARS' | 'USD' = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Calculate change values
  const calculateChange = (current: number, purchase: number) => {
    const absoluteChange = current - purchase;
    const percentageChange = ((current - purchase) / purchase) * 100;
    return {
      absolute: absoluteChange,
      percentage: percentageChange
    };
  };

  // Calculate allocation percentage
  const calculateAllocation = (investmentValue: number) => {
    return (investmentValue / totalValue) * 100;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Ticker',
      'Nombre',
      'Tipo',
      'Precio Actual',
      'Precio Compra',
      'Cambio $',
      'Cambio %',
      'Ratio',
      'Cantidad',
      'Tenencia',
      'Fecha Compra'
    ].join(',');

    const rows = filteredInvestments.map(inv => {
      const change = calculateChange(inv.current_price, inv.purchase_price);
      return [
        inv.ticker,
        inv.name,
        inv.type,
        inv.current_price,
        inv.purchase_price,
        change.absolute,
        change.percentage.toFixed(2),
        inv.ratio || '-',
        inv.quantity,
        (inv.current_price * inv.quantity),
        inv.purchase_date
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Cartera</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tus inversiones</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={() => {}} // TODO: Implement add investment modal
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Agregar Inversión
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Valor Total del Portfolio</h3>
          <div className="flex items-baseline gap-4">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {showInUSD ? formatCurrency(totalValueUSD, 'USD') : formatCurrency(totalValue, 'ARS')}
            </p>
            <button
              onClick={() => setShowInUSD(!showInUSD)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Ver en {showInUSD ? 'ARS' : 'USD'}
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Cantidad de Activos</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{investments.length}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {(['TODOS', 'CEDEAR', 'CRYPTO', 'STOCK'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-md relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por Ticker o Nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticker</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Precio actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cambio $</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cambio %</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ratio</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PPC</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenencia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asignación</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvestments.map((investment) => {
                const change = calculateChange(investment.current_price, investment.purchase_price);
                const allocation = calculateAllocation(investment.current_price * investment.quantity);
                return (
                  <tr key={investment.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {}} // TODO: Implement favorite toggle
                        className={`${
                          investment.is_favorite ? 'text-yellow-400' : 'text-gray-400'
                        } hover:text-yellow-500 transition-colors`}
                      >
                        <Star size={18} fill={investment.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {investment.ticker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {investment.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(investment.current_price, investment.currency)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                      change.absolute >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        {change.absolute >= 0 ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}
                        {formatCurrency(Math.abs(change.absolute), investment.currency)}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                      change.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {change.percentage >= 0 ? '+' : ''}{change.percentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700 dark:text-gray-300">
                      {investment.ratio || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                      {investment.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                      {formatCurrency(investment.purchase_price, investment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(investment.current_price * investment.quantity, investment.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {new Date(investment.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${allocation}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          {allocation.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => {}} // TODO: Implement edit
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => {}} // TODO: Implement delete
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
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
      </div>
    </div>
  );
};

export default Portfolio;