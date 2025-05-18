import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Search, Plus, TrendingUp, TrendingDown, Loader, X, Check, AlertCircle, Calendar, DollarSign, Edit2, Trash, Heart, Download } from 'lucide-react';

interface Investment {
  id: string;
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  allocation: number;
  purchaseDate: string;
  currency: 'USD' | 'ARS';
  isFavorite?: boolean;
}

interface NewInvestment {
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: 'USD' | 'ARS';
}

interface PredefinedAsset {
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  logo: string;
}

const Portfolio: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<PredefinedAsset | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [cclPrice, setCclPrice] = useState<number | null>(null);
  // Nuevo estado para filtro por tipo de activo
  const [activeTypeFilter, setActiveTypeFilter] = useState<'Todos' | 'CEDEAR' | 'Cripto' | 'Acción'>('Todos');
  // Estado para alternar visualización entre ARS y USD
  const [showInARS, setShowInARS] = useState(true);

  // New investment form state
  const [newInvestment, setNewInvestment] = useState<NewInvestment>({
    ticker: '',
    name: '',
    type: 'CEDEAR',
    quantity: 0,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    currency: 'ARS'
  });

  // Predefined assets state (dynamic)
  const [predefinedAssets, setPredefinedAssets] = useState<PredefinedAsset[]>([]);
  // Fetch CCL price separately
  useEffect(() => {
    const fetchCCL = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares');
        const data = await res.json();
        const ccl = data.find((d: any) => d.casa === 'contadoconliqui');
        if (ccl && ccl.venta) {
          setCclPrice(Number(ccl.venta));
        }
      } catch (err) {
        console.error('No se pudo obtener el precio CCL.', err);
      }
    };
    fetchCCL();
  }, []);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd');
        const data = await res.json();
        const formattedAssets: PredefinedAsset[] = data.map((coin: any) => ({
          ticker: coin.symbol.toUpperCase(),
          name: coin.name,
          type: 'Cripto',
          logo: coin.image
        }));
        // CEDEARs y Acciones manuales con rutas reales de íconos
        const cedears: PredefinedAsset[] = [
          {
            ticker: 'AAPL',
            name: 'Apple Inc.',
            type: 'CEDEAR',
            logo: `https://icons.com.ar/icons/cedears/AAPL.png`
          },
          {
            ticker: 'MELI',
            name: 'MercadoLibre Inc.',
            type: 'CEDEAR',
            logo: `https://icons.com.ar/icons/cedears/MELI.png`
          }
        ];
        // Agregar acciones manualmente si se desea
        const acciones: PredefinedAsset[] = [
          {
            ticker: 'GGAL',
            name: 'Grupo Financiero Galicia',
            type: 'Acción',
            logo: `https://icons.com.ar/icons/acciones/GGAL.png`
          },
          {
            ticker: 'YPFD',
            name: 'YPF S.A.',
            type: 'Acción',
            logo: `https://icons.com.ar/icons/acciones/YPFD.png`
          }
        ];
        setPredefinedAssets([...formattedAssets, ...cedears, ...acciones]);
      } catch (error) {
        console.error('Error fetching crypto assets', error);
      }
    };
    fetchAssets();
  }, []);

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!user) return;

      try {
        // En producción, esto se obtendría desde Supabase.
        // Datos de prueba simulados para mostrar en la UI. En producción, esto se obtendría desde Supabase.
        const mockInvestments: Investment[] = [
          {
            id: '1',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            type: 'CEDEAR',
            quantity: 10,
            purchasePrice: 15000,
            currentPrice: 16500,
            allocation: 25,
            purchaseDate: '2024-03-01',
            currency: 'ARS',
            isFavorite: false
          },
          {
            id: '2',
            ticker: 'BTC',
            name: 'Bitcoin',
            type: 'Cripto',
            quantity: 0.05,
            purchasePrice: 12000,
            currentPrice: 13500,
            allocation: 35,
            purchaseDate: '2024-02-15',
            currency: 'USD',
            isFavorite: false
          },
          {
            id: '3',
            ticker: 'MELI',
            name: 'MercadoLibre Inc.',
            type: 'CEDEAR',
            quantity: 5,
            purchasePrice: 45000,
            currentPrice: 48000,
            allocation: 40,
            purchaseDate: '2024-01-20',
            currency: 'ARS',
            isFavorite: false
          },
        ];

        setInvestments(mockInvestments);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching investments:', error);
        setLoading(false);
      }
    };

    fetchInvestments();
  }, [user]);
  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setInvestments(prev =>
      prev.map(inv =>
        inv.id === id ? { ...inv, isFavorite: !inv.isFavorite } : inv
      )
    );
  };

  const handleAssetSelect = async (asset: PredefinedAsset) => {
    setFetchingPrice(true);
    setNewInvestment(prev => ({
      ...prev,
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      currency: asset.type === 'Cripto' ? 'USD' : 'ARS'
    }));

    try {
      let price = 0;
      if (asset.type === 'Cripto') {
        // Usar el ticker como identificador para CoinGecko (en minúsculas)
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${asset.ticker.toLowerCase()}&vs_currencies=usd`);
        const data = await res.json();
        price = data[asset.ticker.toLowerCase()]?.usd || 0;
        // No multiplicar por CCL para Cripto
      } else if (asset.type === 'CEDEAR' || asset.type === 'Acción') {
        // Precio simulado para activos no cripto
        price = Math.random() * 5000;
        try {
          const cclRes = await fetch('https://dolarapi.com/v1/dolares');
          const cclData = await cclRes.json();
          const cclPrice = cclData.find((d: any) => d.casa === 'contadoconliqui')?.venta || 1100;
          price = price * cclPrice;
        } catch (err) {
          console.error('No se pudo obtener el precio CCL. Usando valor por defecto.', err);
        }
      }

      setCurrentPrice(price);
      setNewInvestment(prev => ({
        ...prev,
        purchasePrice: price
      }));
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (!newInvestment.ticker || !newInvestment.name || !newInvestment.quantity || !newInvestment.purchasePrice || !newInvestment.purchaseDate) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (newInvestment.quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    if (newInvestment.purchasePrice <= 0) {
      setError('El precio de compra debe ser mayor a 0');
      return;
    }

    try {
      // En producción, se guardaría en Supabase. Aquí generamos un ID simulado para el nuevo registro.
      const newId = crypto.randomUUID();
      const investment: Investment = {
        ...newInvestment,
        id: newId,
        currentPrice: currentPrice || newInvestment.purchasePrice,
        allocation: 0 // This would be calculated based on total portfolio value
      };

      setInvestments(prev => [...prev, investment]);
      setSuccess('Inversión agregada exitosamente');

      // Reset form
      setNewInvestment({
        ticker: '',
        name: '',
        type: 'CEDEAR',
        quantity: 0,
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        currency: 'ARS'
      });
      setCurrentPrice(null);

      // Close modal after a short delay
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess(null);
      }, 1500);

    } catch (error) {
      console.error('Error adding investment:', error);
      setError('Error al agregar la inversión');
    }
  };

  const filteredAssets = predefinedAssets.filter(
    (asset) =>
      asset.type === newInvestment.type &&
      (asset.ticker.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase()))
  );
  // Edit investment
  const handleEditInvestment = (investment: Investment) => {
    setNewInvestment({
      ticker: investment.ticker,
      name: investment.name,
      type: investment.type,
      quantity: investment.quantity,
      purchasePrice: investment.purchasePrice,
      purchaseDate: investment.purchaseDate,
      currency: investment.currency,
    });
    setShowAddModal(true);
  };

  // Delete investment
  const handleDeleteInvestment = (id: string) => {
    setInvestments((prev) => prev.filter((inv) => inv.id !== id));
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Ticker',
      'Nombre',
      'Tipo',
      'Cantidad',
      'PPC',
      'Valor Actual',
      'Rendimiento (%)',
      'Rendimiento ($)',
      'Asignación (%)',
    ];
    const rows = investments.map((inv) => {
      const ret = calculateReturn(inv.currentPrice * inv.quantity, inv.purchasePrice * inv.quantity);
      return [
        inv.ticker,
        inv.name,
        inv.type,
        inv.quantity,
        inv.purchasePrice,
        inv.currentPrice,
        ret.percentage.toFixed(2),
        ret.amount.toFixed(2),
        inv.allocation,
      ];
    });
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cartera.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredInvestments = investments
    .filter(investment =>
      (activeTypeFilter === 'Todos' || investment.type === activeTypeFilter) &&
      (investment.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  const calculateReturn = (current: number, purchase: number) => {
    const difference = current - purchase;
    const percentage = (difference / purchase) * 100;
    return {
      amount: difference,
      percentage: percentage
    };
  };

  const formatCurrency = (value: number, currency: 'USD' | 'ARS' = 'ARS') => {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'standard',
      useGrouping: true
    });

    return formatter.format(Math.round(value));
  };

  // Calcular totales en ARS y USD y visualización dinámica
  const totalARS = investments.reduce((acc, inv) => {
    if (inv.currency === 'ARS') return acc + inv.currentPrice * inv.quantity;
    if (inv.currency === 'USD' && cclPrice) return acc + inv.currentPrice * inv.quantity * cclPrice;
    return acc;
  }, 0);

  const totalUSD = investments
    .filter((inv) => inv.currency === 'USD')
    .reduce((acc, inv) => acc + inv.currentPrice * inv.quantity, 0);

  // Totales para visualización según showInARS (corregido para convertir correctamente)
  const totalToShow = investments.reduce((acc, inv) => {
    const value = inv.currentPrice * inv.quantity;
    if (showInARS) {
      if (inv.currency === 'USD' && cclPrice) return acc + value * cclPrice;
      return acc + value;
    } else {
      if (inv.currency === 'ARS' && cclPrice) return acc + value / cclPrice;
      return acc + value;
    }
  }, 0);
  const totalCurrencyToShow = showInARS ? 'ARS' : 'USD';

  // Ratio (actual/purchase), PPC (precio promedio de compra), Tenencia (cantidad)
  // Se agregan columnas Ratio, PPC y Tenencia si faltan

  return (
    <div className="space-y-6">
      {/* Export CSV and Add Investment buttons in header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row justify-between items-center gap-4"
      >
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Cartera</h1>
          <p className="text-gray-600 dark:text-gray-300">Gestiona tus inversiones</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Download size={18} className="mr-2" />
            Exportar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-md"
          >
            <Plus size={18} className="mr-2" />
            Agregar Inversión
          </button>
        </div>
      </motion.div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-600 text-sm font-medium">
            Portfolio {showInARS ? 'ARS' : 'USD'}
          </h3>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {formatCurrency(totalToShow, totalCurrencyToShow as 'ARS' | 'USD')}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-600 text-sm font-medium">Activos</h3>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{investments.length}</p>
        </div>
        <div className="flex justify-center sm:justify-end">
          <button
            onClick={() => setShowInARS(prev => !prev)}
            className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm"
          >
            Ver en {showInARS ? 'USD' : 'ARS'}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white dark:bg-gray-900 backdrop-blur-sm bg-opacity-80 dark:bg-opacity-60 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
      >
        {/* Filtro de tipo de activo y selector de moneda */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 mb-4">
            {['Todos', 'CEDEAR', 'Cripto', 'Acción'].map((type) => (
              <button
                key={type}
                onClick={() => setActiveTypeFilter(type as any)}
                className={`px-3 py-1 rounded-lg text-sm border ${
                  activeTypeFilter === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Ticker o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader className="animate-spin text-blue-600" size={24} />
          </div>
        ) : filteredInvestments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300 text-center"> {/* Corazón (favorito) */} </th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ticker</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Nombre</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Precio actual</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Cambio $</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Cambio %</th>
                  {activeTypeFilter !== 'Cripto' && activeTypeFilter !== 'Acción' && (
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Ratio</th>
                  )}
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Cantidad</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">PPC</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Tenencia</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Fecha de compra</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Asignación</th>
                  <th className="pb-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvestments.map((investment) => {
                  // Cálculos para las columnas de cambio
                  const priceChange = investment.currentPrice - investment.purchasePrice;
                  const priceChangePercent = investment.purchasePrice !== 0
                    ? (priceChange / investment.purchasePrice) * 100
                    : 0;
                  const isChangePositive = priceChange >= 0;
                  // Ratio = currentPrice / purchasePrice SOLO para CEDEARs
                  const ratio = investment.purchasePrice > 0 ? investment.currentPrice / investment.purchasePrice : 0;
                  // Tenencia
                  const tenencia = investment.currentPrice * investment.quantity;
                  // Moneda visualizada
                  const displayCurrency = showInARS ? 'ARS' : 'USD';
                  // Mostrar valor convertido cuando showInARS es false y activo es ARS
                  const displayPriceChange = showInARS
                    ? investment.currency === 'USD' && cclPrice
                      ? priceChange * cclPrice
                      : priceChange
                    : investment.currency === 'ARS' && cclPrice
                    ? priceChange / cclPrice
                    : priceChange;
                  const displayPPC = showInARS
                    ? investment.currency === 'USD' && cclPrice
                      ? investment.purchasePrice * cclPrice
                      : investment.purchasePrice
                    : investment.currency === 'ARS' && cclPrice
                    ? investment.purchasePrice / cclPrice
                    : investment.purchasePrice;
                  const displayTenencia = showInARS
                    ? investment.currency === 'USD' && cclPrice
                      ? tenencia * cclPrice
                      : tenencia
                    : investment.currency === 'ARS' && cclPrice
                    ? tenencia / cclPrice
                    : tenencia;
                  // Moneda para formato de columnas
                  const tenenciaCurrency = displayCurrency;
                  const ppcCurrency = displayCurrency;
                  return (
                    <tr
                      key={investment.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {/* Corazón (favorito, centrado) */}
                      <td className="py-4 px-4 text-center">
                        <button onClick={() => toggleFavorite(investment.id)}>
                          <Heart
                            size={18}
                            fill={investment.isFavorite ? '#f87171' : 'none'}
                            className={`stroke-2 ${investment.isFavorite ? 'text-red-500' : 'text-gray-400'} hover:scale-110 transition-transform`}
                          />
                        </button>
                      </td>
                      {/* Ticker */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={predefinedAssets.find(a => a.ticker === investment.ticker)?.logo}
                            alt={investment.ticker}
                            className="w-5 h-5 rounded-full object-contain"
                          />
                          <span className="font-medium text-gray-800 dark:text-gray-200">{investment.ticker}</span>
                        </div>
                      </td>
                      {/* Nombre */}
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{investment.name}</td>
                      {/* Precio actual */}
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300">
                        {formatCurrency(
                          showInARS
                            ? investment.currency === 'USD' && cclPrice
                              ? investment.currentPrice * cclPrice
                              : investment.currentPrice
                            : investment.currency === 'ARS' && cclPrice
                            ? investment.currentPrice / cclPrice
                            : investment.currentPrice,
                          displayCurrency
                        )}
                      </td>
                      {/* Cambio $ */}
                      <td className={`py-4 px-4 text-center ${isChangePositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isChangePositive ? '+' : ''}
                        {formatCurrency(displayPriceChange, displayCurrency)}
                      </td>
                      {/* Cambio % */}
                      <td className={`py-4 px-4 text-center ${isChangePositive ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="inline-flex items-center">
                          {isChangePositive
                            ? <TrendingUp size={15} className="inline-block mr-1" />
                            : <TrendingDown size={15} className="inline-block mr-1" />
                          }
                          {priceChangePercent >= 0 ? '+' : ''}
                          {priceChangePercent.toFixed(2)}%
                        </span>
                      </td>
                      {/* Ratio */}
                      {activeTypeFilter !== 'Cripto' && activeTypeFilter !== 'Acción' && (
                        <td className="py-4 px-4 text-center">
                          {investment.type === 'CEDEAR'
                            ? (
                              <div className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 inline-block">
                                {ratio.toFixed(2)}:1
                              </div>
                            )
                            : '-'}
                        </td>
                      )}
                      {/* Cantidad */}
                      <td className="py-4 px-4 text-center dark:text-gray-300">{investment.quantity}</td>
                      {/* PPC */}
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300 text-center">
                        {formatCurrency(displayPPC, ppcCurrency)}
                      </td>
                      {/* Tenencia */}
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300 text-center">
                        {formatCurrency(displayTenencia, tenenciaCurrency)}
                      </td>
                      {/* Fecha de compra */}
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-300 text-center">
                        {new Date(investment.purchaseDate).toLocaleDateString('es-AR')}
                      </td>
                      {/* Asignación */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${investment.allocation}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {investment.allocation}%
                          </span>
                        </div>
                      </td>
                      {/* Acciones */}
                      <td className="py-4 px-4 flex gap-4 justify-center">
                        <button
                          onClick={() => handleEditInvestment(investment)}
                          className="text-yellow-500 hover:text-yellow-600 transition-colors"
                          title="Editar inversión"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteInvestment(investment.id)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                          title="Eliminar inversión"
                        >
                          <Trash size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">Aún no has agregado inversiones.</p>
          </div>
        )}
      </motion.div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg p-6 max-w-md w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Agregar Inversión</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
                <Check size={18} className="mr-2 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleAddInvestment} className="space-y-4">
              {/* Tipo de inversión */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo de inversión
                </label>
                <select
                  id="type"
                  value={newInvestment.type}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({
                      ...prev,
                      type: e.target.value as 'Cripto' | 'CEDEAR' | 'Acción',
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                >
                  <option value="CEDEAR">CEDEAR</option>
                  <option value="Acción">Acción</option>
                  <option value="Cripto">Cripto</option>
                </select>
              </div>
              {/* --- Asset Selection: búsqueda e íconos --- */}
              <div className="mb-4">
                <label htmlFor="assetSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Seleccionar Activo
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
                    {selectedAsset && (
                      <img
                        src={selectedAsset.logo}
                        alt={selectedAsset.name}
                        className="w-5 h-5 rounded-full object-contain"
                      />
                    )}
                    <input
                      type="text"
                      id="assetSearch"
                      value={assetSearchTerm.length > 0 ? assetSearchTerm : (selectedAsset ? selectedAsset.ticker : '')}
                      onChange={(e) => {
                        setAssetSearchTerm(e.target.value);
                        setSelectedAsset(null);
                      }}
                      placeholder="Buscar activo..."
                      className="flex-1 outline-none bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      autoComplete="off"
                    />
                  </div>
                  {(assetSearchTerm.length > 0 && filteredAssets.length > 0) && (
                    <ul className="absolute left-0 w-full z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 mt-1 max-h-52 overflow-y-auto rounded-lg shadow-lg text-gray-800 dark:text-gray-100">
                      {filteredAssets.map((asset) => (
                        <li
                          key={asset.ticker}
                          onClick={() => {
                            handleAssetSelect(asset);
                            setSelectedAsset(asset);
                            setAssetSearchTerm('');
                          }}
                          className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <img
                            src={asset.logo}
                            alt={asset.name}
                            className="w-6 h-6 rounded-full mr-2 object-contain"
                            style={{ minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{asset.ticker}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{asset.name}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Fecha de compra */}

              <div className="mb-4">
                <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Fecha de compra
                </label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                      type="date"
                      id="purchaseDate"
                      value={newInvestment.purchaseDate}
                      onChange={(e) =>
                          setNewInvestment((prev) => ({ ...prev, purchaseDate: e.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>


              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={newInvestment.quantity || ''}
                  onChange={(e) => setNewInvestment(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  step="any"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Moneda
                  </label>
                  <select
                    id="currency"
                    value={newInvestment.currency}
                    onChange={(e) => setNewInvestment(prev => ({ ...prev, currency: e.target.value as 'USD' | 'ARS' }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Precio de compra
                  </label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      id="purchasePrice"
                      value={newInvestment.purchasePrice || ''}
                      onChange={(e) => setNewInvestment(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      step="any"
                      min="0"
                    />
                  </div>
                  {fetchingPrice && (
                    <p className="mt-1 text-sm text-gray-500 flex items-center">
                      <Loader size={12} className="animate-spin mr-1" />
                      Obteniendo precio actual...
                    </p>
                  )}
                </div>
              </div>

              {currentPrice && !fetchingPrice && (
                <div className="mt-4 w-full flex items-center justify-between rounded-lg bg-blue-100 dark:bg-blue-950 px-4 py-3 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-blue-600 dark:text-blue-300" />
                    <span className="font-medium">Precio actual</span>
                  </div>
                  <strong className="text-lg">
                    {formatCurrency(Math.round(currentPrice * 100) / 100, newInvestment.currency)}
                  </strong>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus size={18} className="mr-2" />
                  Agregar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default Portfolio;