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
  // Estado para unificar transacciones repetidas
  const [mergeTransactions, setMergeTransactions] = useState(false);
  // Estado para alternar visualización entre ARS y USD
  const [showInARS, setShowInARS] = useState(true);
  // Estado para orden de la tabla (ascendente/descendente por criterio)
  const [sortBy, setSortBy] = useState<
    'tickerAZ' | 'tickerZA' |
    'gananciaPorcentajeAsc' | 'gananciaPorcentajeDesc' |
    'gananciaValorAsc' | 'gananciaValorDesc' |
    'tenenciaAsc' | 'tenenciaDesc' |
    'fechaAsc' | 'fechaDesc'
  >('fechaDesc');

  // New investment form state
  const [newInvestment, setNewInvestment] = useState<NewInvestment>({
    ticker: '',
    name: '',
    type: 'CEDEAR',
    quantity: 0,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    currency: 'ARS',
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
        // Criptos
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd');
        const data = await res.json();
        const formattedAssets: PredefinedAsset[] = data.map((coin: any) => ({
          ticker: coin.symbol.toUpperCase(),
          name: coin.name,
          type: 'Cripto',
          logo: coin.image
        }));
        // CEDEARs desde la nueva API
        const cedearRes = await fetch('https://api.cedears.ar/cedears');
        const cedearData = await cedearRes.json();
        const cedears: PredefinedAsset[] = cedearData.map((item: any) => ({
          ticker: item.ticker,
          name: item.name,
          type: 'CEDEAR',
          logo: item.icon
        }));
        // Acciones desde nueva API
        const accionesRes = await fetch('https://api.cedears.ar/acciones');
        const accionesData = await accionesRes.json();
        const acciones: PredefinedAsset[] = accionesData.map((item: any) => ({
          ticker: item.ticker,
          name: item.name,
          type: 'Acción',
          logo: item.icon
        }));
        setPredefinedAssets([...formattedAssets, ...cedears, ...acciones]);
      } catch (error) {
        console.error('Error fetching assets', error);
      }
    };
    fetchAssets();
  }, []);

  useEffect(() => {
    const fetchInvestments = async () => {
      if (!user || !user.id) {
        console.warn('Usuario no autenticado o user.id es null');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Usar los datos reales de la base como fuente de verdad.
        // Actualizar currentPrice, name y ticker desde predefinedAssets.
        let updatedInvestments: Investment[] = [];
        if (data && Array.isArray(data)) {
          updatedInvestments = data.map((inv: any) => {
            // Buscar el asset correspondiente en predefinedAssets
            const asset = predefinedAssets.find(
              (a) => a.ticker === inv.ticker && a.type === inv.type
            );
            let currentPrice = inv.current_price || inv.currentPrice || 0;
            // Si hay asset, actualizar currentPrice según tipo
            if (asset) {
              if (asset.type === 'Cripto') {
                // Buscar precio actual de la cripto en predefinedAssets
                // Suponemos que el precio actual está en una propiedad extra, si no, dejar el existente
                // Pero como predefinedAssets solo tiene logo, ticker, name, type, deberíamos obtener el precio de alguna manera
                // Como no está, dejamos el currentPrice como está (esto requiere mejora si se quiere obtener el precio real en tiempo real)
              } else if (asset.type === 'Acción' || asset.type === 'CEDEAR') {
                // Similar, no hay precio actual en predefinedAssets, dejar el currentPrice como está
              }
            }
            return {
              ...inv,
              name: asset ? asset.name : inv.name,
              ticker: asset ? asset.ticker : inv.ticker,
              type: inv.type,
              currentPrice: typeof currentPrice === 'number' ? currentPrice : 0,
            };
          });
        }
        setInvestments(updatedInvestments);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching investments:', error);
        setLoading(false);
      }
    };

    fetchInvestments();
  }, [user, predefinedAssets]);
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
    setSelectedAsset(asset); // Asegura que el asset seleccionado esté disponible para el renderizado del modal
    try {
      let price = 0;
      if (asset.type === 'Cripto') {
        // Usar el ticker como identificador para CoinGecko (en minúsculas)
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${asset.ticker.toLowerCase()}&vs_currencies=usd`);
        const data = await res.json();
        price = data[asset.ticker.toLowerCase()]?.usd || 0;
        // No multiplicar por CCL para Cripto
      } else if (asset.type === 'Acción') {
        const accionesRes = await fetch('https://api.cedears.ar/acciones');
        const accionesData = await accionesRes.json();
        const found = accionesData.find((a: any) => a.ticker === asset.ticker);
        if (found && found.ars?.c) {
          price = found.ars.c;
        } else {
          throw new Error('No se encontró precio para esta acción');
        }
      } else if (asset.type === 'CEDEAR') {
        const cedearsRes = await fetch('https://api.cedears.ar/cedears');
        const cedearsData = await cedearsRes.json();
        const found = cedearsData.find((c: any) => c.ticker === asset.ticker);
        if (found && found.ars?.c) {
          price = found.ars.c;
        } else {
          throw new Error('No se encontró precio para este CEDEAR');
        }
      }

      setCurrentPrice(price);
      // --- Ajustar purchasePrice según currency ---
      const currency = asset.type === 'Cripto' ? 'USD' : 'ARS';
      const adjustedPrice =
        asset.type === 'Cripto'
          ? price
          : currency === 'USD' && cclPrice
          ? price / cclPrice
          : price;
      // Set all relevant fields at una sola vez, incluyendo purchasePrice
      setNewInvestment(prev => ({
        ...prev,
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        currency: currency,
        purchasePrice: adjustedPrice,
      }));
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setFetchingPrice(false);
    }
  };

  // Recalcular purchasePrice cuando cambia la moneda
  useEffect(() => {
    if (!currentPrice || !selectedAsset) return;
    let adjustedPrice = 0;
    if (selectedAsset.type === 'Cripto') {
      adjustedPrice = currentPrice;
    } else if (selectedAsset.type === 'Acción' || selectedAsset.type === 'CEDEAR') {
      if (newInvestment.currency === 'ARS') {
        adjustedPrice = parseFloat(currentPrice.toFixed(2)); // Mantener en ARS sin convertir
      } else if (newInvestment.currency === 'USD' && cclPrice) {
        adjustedPrice = parseFloat((currentPrice / cclPrice).toFixed(2)); // Convertir de ARS a USD
      }
    }
    setNewInvestment(prev => ({ ...prev, purchasePrice: adjustedPrice }));
    // eslint-disable-next-line
  }, [newInvestment.currency]);

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Normalizar los valores de entrada para evitar comas como separador decimal o de miles
    newInvestment.quantity = Number(newInvestment.quantity.toString().replace(/,/g, ''));
    newInvestment.purchasePrice = Number(newInvestment.purchasePrice.toString().replace(/,/g, ''));

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
      console.warn("Precio de compra inválido:", newInvestment.purchasePrice);
      setError('El precio de compra debe ser mayor a 0');
      return;
    }

    if (!user || !user.id) {
      console.warn('Usuario no autenticado o user.id es null');
      return;
    }

    // Debug: log intent to add investment
    console.log("Intentando agregar inversión:", {
      userId: user?.id,
      ...newInvestment
    });

    // Convertir fecha al formato ISO (YYYY-MM-DD)
    const formattedDate = new Date(newInvestment.purchaseDate).toISOString().split('T')[0];

    try {
      const { data, error } = await supabase.from('investments').insert([
        {
          user_id: user.id,
          ticker: newInvestment.ticker,
          name: newInvestment.name,
          type: newInvestment.type,
          quantity: newInvestment.quantity,
          purchase_price: newInvestment.purchasePrice,
          purchase_date: formattedDate,
          currency: newInvestment.currency,
          is_favorite: false
        }
      ]);
      console.log("Respuesta de Supabase:", { data, error });

      if (error) {
        console.error("Supabase insert error:", error);
        setError(error.message);
        return;
      }

      setSuccess('Inversión agregada');

      // Reset form
      setNewInvestment({
        ticker: '',
        name: '',
        type: 'CEDEAR',
        quantity: 0,
        purchasePrice: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        currency: 'ARS',
      });
      setCurrentPrice(null);

      // Refetch investments from Supabase
      const fetchInvestments = async () => {
        if (!user || !user.id) {
          console.warn('Usuario no autenticado o user.id es null');
          return;
        }
        try {
          const { data, error } = await supabase
              .from('investments')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });
          if (error) throw error;
          setInvestments(data as Investment[]);
        } catch (error) {
          console.error('Error fetching investments after add:', error);
        }
      };
      await fetchInvestments();

      // Close modal after a short delay
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess(null);
      }, 1500);

    } catch (error) {
      console.error('Error al agregar la inversión:', error);
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
    const confirmEdit = window.confirm('✏️ ¿Estás seguro que deseas editar esta inversión? Podrás aplicar o cancelar los cambios.');
    if (!confirmEdit) return;
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
    const confirmDelete = window.confirm('🗑️ ¿Seguro que deseas eliminar esta inversión? Esta acción no se puede deshacer.');
    if (!confirmDelete) return;
    setInvestments((prev) => prev.filter((inv) => inv.id !== id));
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Ticker',
      'Nombre',
      'Tipo',
      'Precio Actual',
      'Precio Compra',
      'Cambio $',
      'Cambio %',
      'Cantidad',
      'Tenencia',
      'Fecha Compra',
    ];
    const rows = investments.map((inv) => {
      // Use purchasePrice, not purchase_price
      const priceChangeData = calculateReturn(inv.currentPrice, inv.purchasePrice);
      const priceChange = priceChangeData.amount;
      const percentageChange = priceChangeData.percentage;
      const tenencia = inv.currentPrice * inv.quantity;
      return [
        inv.ticker,
        inv.name,
        inv.type,
        inv.currentPrice,
        inv.purchasePrice,
        priceChange.toFixed(2),
        percentageChange.toFixed(2) + '%',
        inv.quantity,
        tenencia.toFixed(2),
        inv.purchaseDate
          ? new Date(inv.purchaseDate).toLocaleDateString('es-AR')
          : '-',
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

  // Ordenar inversiones según sortBy (nueva lógica completa)
  const filteredInvestments = investments
    .filter(investment =>
      investment.ticker &&
      typeof investment.currentPrice === 'number' &&
      typeof investment.purchasePrice === 'number' &&
      typeof investment.quantity === 'number' &&
      (activeTypeFilter === 'Todos' || investment.type === activeTypeFilter) &&
      (investment.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        investment.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      // Favoritos primero
      if ((b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) !== 0)
        return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      // Nueva lógica de orden:
      if (sortBy === 'tickerAZ') return a.ticker.localeCompare(b.ticker);
      if (sortBy === 'tickerZA') return b.ticker.localeCompare(a.ticker);

      if (sortBy === 'gananciaPorcentajeAsc') {
        const retA = a.currentPrice && a.purchasePrice ? calculateReturn(a.currentPrice, a.purchasePrice).percentage : 0;
        const retB = b.currentPrice && b.purchasePrice ? calculateReturn(b.currentPrice, b.purchasePrice).percentage : 0;
        return retA - retB;
      }
      if (sortBy === 'gananciaPorcentajeDesc') {
        const retA = a.currentPrice && a.purchasePrice ? calculateReturn(a.currentPrice, a.purchasePrice).percentage : 0;
        const retB = b.currentPrice && b.purchasePrice ? calculateReturn(b.currentPrice, b.purchasePrice).percentage : 0;
        return retB - retA;
      }

      if (sortBy === 'gananciaValorAsc') {
        const retA = a.currentPrice && a.purchasePrice ? calculateReturn(a.currentPrice, a.purchasePrice).amount : 0;
        const retB = b.currentPrice && b.purchasePrice ? calculateReturn(b.currentPrice, b.purchasePrice).amount : 0;
        return retA - retB;
      }
      if (sortBy === 'gananciaValorDesc') {
        const retA = a.currentPrice && a.purchasePrice ? calculateReturn(a.currentPrice, a.purchasePrice).amount : 0;
        const retB = b.currentPrice && b.purchasePrice ? calculateReturn(b.currentPrice, b.purchasePrice).amount : 0;
        return retB - retA;
      }

      if (sortBy === 'tenenciaAsc') {
        const tenA = a.currentPrice * a.quantity;
        const tenB = b.currentPrice * b.quantity;
        return tenA - tenB;
      }
      if (sortBy === 'tenenciaDesc') {
        const tenA = a.currentPrice * a.quantity;
        const tenB = b.currentPrice * b.quantity;
        return tenB - tenA;
      }

      if (sortBy === 'fechaAsc') {
        const dateA = new Date(a.purchaseDate).getTime();
        const dateB = new Date(b.purchaseDate).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'fechaDesc') {
        const dateA = new Date(a.purchaseDate).getTime();
        const dateB = new Date(b.purchaseDate).getTime();
        return dateB - dateA;
      }
      return 0;
    });

  // Agrupamiento de inversiones si mergeTransactions está activo
  const displayedInvestments = mergeTransactions
    ? Object.values(
        filteredInvestments.reduce((acc, inv) => {
          const key = `${inv.ticker}-${inv.type}`;
          if (!acc[key]) {
            acc[key] = { ...inv };
          } else {
            const prevQty = acc[key].quantity;
            const newQty = prevQty + inv.quantity;

            acc[key].quantity = newQty;
            acc[key].purchasePrice =
              (acc[key].purchasePrice * prevQty + inv.purchasePrice * inv.quantity) / newQty;
            acc[key].currentPrice =
              (acc[key].currentPrice * prevQty + inv.currentPrice * inv.quantity) / newQty;
            acc[key].allocation = (acc[key].allocation ?? 0) + (inv.allocation ?? 0);
          }
          return acc;
        }, {} as Record<string, Investment>)
      )
    : filteredInvestments;

  const calculateReturn = (current: number, purchase: number) => {
    if (!purchase || isNaN(current) || isNaN(purchase)) {
      return { amount: 0, percentage: 0 };
    }
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

  // Totales para visualización según showInARS (corregido para convertir correctamente y evitar NaN)
  const totalToShow = displayedInvestments.reduce((acc, inv) => {
    const value = inv.currentPrice * inv.quantity;
    if (showInARS) {
      if (inv.currency === 'USD' && cclPrice) return acc + value * cclPrice;
      if (inv.currency === 'ARS') return acc + value;
      return acc;
    } else {
      if (inv.currency === 'ARS' && cclPrice) return acc + value / cclPrice;
      if (inv.currency === 'USD') return acc + value;
      return acc;
    }
  }, 0);
  const totalCurrencyToShow = showInARS ? 'ARS' : 'USD';

  useEffect(() => {
    window.onerror = function (message, source, lineno, colno, error) {
      console.error("Global Error:", { message, source, lineno, colno, error });
    };
  }, []);

  console.log("Portfolio renderizado");
  if (!user) return <div>Usuario no autenticado</div>;
  return (
      <div className="space-y-6">
        {/* Export CSV, Add Investment, and View in USD buttons grouped */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap justify-between items-center gap-4"
        >
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mi Cartera</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona tus inversiones</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end items-center">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors bg-green-600 text-white hover:bg-green-700 border-green-600"
            >
              <Download size={16} />
              Exportar CSV
            </button>
            <button
              onClick={() => setShowInARS(prev => !prev)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                showInARS
                  ? 'bg-purple-700 text-white hover:bg-purple-800'
                  : 'bg-[#0EA5E9] text-white hover:bg-[#0284c7]'
              }`}
            >
              <DollarSign size={16} className="text-white" />
              Ver en {showInARS ? 'USD' : 'ARS'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg border text-sm flex items-center gap-2 transition-colors bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            >
              Agregar
              <Plus size={18} />
            </button>
          </div>
        </motion.div>

        {/* Resumen de totales (nuevo diseño y orden, todo centrado y uniforme) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 text-center text-sm font-medium">
          {/* Total de inversiones */}
          <div className={`p-4 rounded-xl ${
            activeTypeFilter === 'Todos'
              ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700'
              : activeTypeFilter === 'Cripto'
              ? 'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700'
              : activeTypeFilter === 'CEDEAR'
              ? 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700'
              : 'bg-[#E0F2FE] text-[#0EA5E9]'
          } shadow-sm border flex flex-col justify-center items-center`}>
            <h3 className="">Total de inversiones</h3>
            <p className="text-xl font-bold mt-1">
              {displayedInvestments.length}
            </p>
          </div>

          {/* Invertido */}
          <div className={`p-4 rounded-xl ${
            activeTypeFilter === 'Todos'
              ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700'
              : activeTypeFilter === 'Cripto'
              ? 'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700'
              : activeTypeFilter === 'CEDEAR'
              ? 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-700'
              : 'bg-[#E0F2FE] text-[#0EA5E9]'
          } shadow-sm border flex flex-col justify-center items-center`}>
            <h3>Invertido</h3>
            <p className="text-xl font-bold mt-1">
              {formatCurrency(
                displayedInvestments.reduce((acc, i) => {
                  const val = i.purchasePrice * i.quantity;
                  if (showInARS) {
                    if (i.currency === 'USD') return cclPrice ? acc + val * cclPrice : acc;
                    if (i.currency === 'ARS') return acc + val;
                  } else {
                    if (i.currency === 'ARS') return cclPrice ? acc + val / cclPrice : acc;
                    if (i.currency === 'USD') return acc + val;
                  }
                  return acc;
                }, 0),
                totalCurrencyToShow
              )}
            </p>
          </div>

          {/* Valor Total del Portafolio (nuevo: global, color según ganancia/pérdida global) */}
          <div className={`p-4 rounded-xl shadow-sm border flex flex-col justify-center items-center col-span-full md:col-span-2 md:col-start-3 ${
            (() => {
              const totalActual = investments.reduce((acc, i) => {
                const val = i.currentPrice * i.quantity;
                if (showInARS) {
                  if (i.currency === 'USD' && cclPrice) return acc + val * cclPrice;
                  if (i.currency === 'ARS') return acc + val;
                } else {
                  if (i.currency === 'ARS' && cclPrice) return acc + val / cclPrice;
                  if (i.currency === 'USD') return acc + val;
                }
                return acc;
              }, 0);
              const totalInvertido = investments.reduce((acc, i) => {
                const val = i.purchasePrice * i.quantity;
                if (showInARS) {
                  if (i.currency === 'USD' && cclPrice) return acc + val * cclPrice;
                  if (i.currency === 'ARS') return acc + val;
                } else {
                  if (i.currency === 'ARS' && cclPrice) return acc + val / cclPrice;
                  if (i.currency === 'USD') return acc + val;
                }
                return acc;
              }, 0);
              if (totalActual > totalInvertido) return 'bg-green-50 text-green-700';
              if (totalActual < totalInvertido) return 'bg-red-50 text-red-700';
              return 'bg-blue-50 text-blue-700';
            })()
          }`}>
            <h3>Valor Total del Portafolio</h3>
            <p className="text-xl font-bold mt-1 text-current">
              {formatCurrency(
                investments.reduce((acc, i) => {
                  const val = i.currentPrice * i.quantity;
                  if (showInARS) {
                    if (i.currency === 'USD' && cclPrice) return acc + val * cclPrice;
                    if (i.currency === 'ARS') return acc + val;
                  } else {
                    if (i.currency === 'ARS' && cclPrice) return acc + val / cclPrice;
                    if (i.currency === 'USD') return acc + val;
                  }
                  return acc;
                }, 0),
                totalCurrencyToShow
              )}
            </p>
          </div>

          {/* Actual */}
          <div className={`p-4 rounded-xl shadow-sm border flex flex-col justify-center items-center ${
            (() => {
              const actual = displayedInvestments.reduce((acc, i) => {
                const val = i.currentPrice * i.quantity;
                return showInARS
                  ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                  : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
              }, 0);
              const invertido = displayedInvestments.reduce((acc, i) => {
                const val = i.purchasePrice * i.quantity;
                return showInARS
                  ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                  : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
              }, 0);
              return actual >= invertido
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700';
            })()
          }`}>
            <h3>Actual</h3>
            <p className="text-xl font-bold mt-1">
              {formatCurrency(
                displayedInvestments.reduce((acc, i) => {
                  const val = i.currentPrice * i.quantity;
                  return showInARS
                    ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                    : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
                }, 0),
                totalCurrencyToShow
              )}
            </p>
          </div>

          {/* Resultado */}
          <div className={`p-4 rounded-xl shadow-sm border flex flex-col justify-center items-center ${
            (() => {
              const actual = displayedInvestments.reduce((acc, i) => {
                const val = i.currentPrice * i.quantity;
                return showInARS
                  ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                  : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
              }, 0);
              const invertido = displayedInvestments.reduce((acc, i) => {
                const val = i.purchasePrice * i.quantity;
                return showInARS
                  ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                  : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
              }, 0);
              return actual >= invertido
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700';
            })()
          }`}>
            <h3>Resultado</h3>
            {(() => {
              const invertido = displayedInvestments.reduce((acc, i) => {
                const val = i.purchasePrice * i.quantity;
                return showInARS
                  ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                  : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
              }, 0);
              const actual = displayedInvestments.reduce((acc, i) => {
                const val = i.currentPrice * i.quantity;
                return showInARS
                  ? acc + (i.currency === 'USD' && cclPrice ? val * cclPrice : val)
                  : acc + (i.currency === 'ARS' && cclPrice ? val / cclPrice : val);
              }, 0);
              const diff = actual - invertido;
              return (
                <p className="text-xl font-bold mt-1">
                  {formatCurrency(diff, totalCurrencyToShow)} ({invertido !== 0 ? ((diff / invertido) * 100).toFixed(2) : '0.00'}%)
                </p>
              );
            })()}
          </div>

        </div>

        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white backdrop-blur-sm bg-opacity-80 rounded-xl shadow-sm p-6 border border-gray-100"
        >
          {/* Filtro de tipo de activo, búsqueda y orden */}
          <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div className="flex gap-2 flex-wrap items-center">
              {['Todos', 'Cripto', 'CEDEAR', 'Acción'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTypeFilter(type as any)}
                  className={`px-3 py-1 rounded-lg text-sm border ${
                    activeTypeFilter === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
              <label htmlFor="mergeTransactions" className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  id="mergeTransactions"
                  checked={mergeTransactions}
                  onChange={(e) => setMergeTransactions(e.target.checked)}
                  className="form-checkbox text-blue-600 rounded"
                />
                Unificar transacciones
              </label>
            </div>
            <div className="flex gap-4 flex-wrap items-center justify-end">
              <div className="relative flex-1 w-full max-w-xs">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por Ticker o Nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sortBy" className="mr-2 text-sm text-gray-700">Ordenar por:</label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as
                    'tickerAZ' | 'tickerZA' |
                    'gananciaPorcentajeAsc' | 'gananciaPorcentajeDesc' |
                    'gananciaValorAsc' | 'gananciaValorDesc' |
                    'tenenciaAsc' | 'tenenciaDesc' |
                    'fechaAsc' | 'fechaDesc'
                  )}
                  className="px-2 py-1 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="tickerAZ">Ticker A-Z</option>
                  <option value="tickerZA">Ticker Z-A</option>
                  <option value="gananciaPorcentajeAsc">Ganancia % ↑</option>
                  <option value="gananciaPorcentajeDesc">Ganancia % ↓</option>
                  <option value="gananciaValorAsc">Ganancia $ ↑</option>
                  <option value="gananciaValorDesc">Ganancia $ ↓</option>
                  <option value="tenenciaAsc">Tenencia ↑</option>
                  <option value="tenenciaDesc">Tenencia ↓</option>
                  <option value="fechaAsc">Fecha ↑</option>
                  <option value="fechaDesc">Fecha ↓</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="animate-spin text-blue-600" size={24} />
              </div>
          ) : displayedInvestments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600 text-center"> {/* Corazón (favorito) */} </th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Ticker</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Precio actual</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Cambio $</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Cambio %</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Cantidad</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">PPC</th>
                    <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Tenencia</th>
                    {!mergeTransactions && (
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Fecha de compra</th>
                    )}
                    {!mergeTransactions && (
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Asignación</th>
                    )}
                    {!mergeTransactions && (
                      <th className="pb-3 px-4 text-sm font-semibold text-gray-600">Acciones</th>
                    )}
                  </tr>
                  </thead>
                  <tbody>
                  {displayedInvestments.map((investment) => {
                    if (
                        typeof investment.currentPrice !== 'number' ||
                        typeof investment.purchasePrice !== 'number' ||
                        typeof investment.quantity !== 'number'
                    ) {
                      console.warn('Inversión inválida detectada y omitida:', investment);
                      return null;
                    }
                    // Cálculos para las columnas de cambio con validaciones de seguridad
                    // Si mergeTransactions está activo, los datos ya están agrupados y calculados.
                    let priceChange, priceChangePercent, isChangePositive, tenencia;
                    let displayCurrency = showInARS ? 'ARS' : 'USD';
                    let displayPriceChange, displayPPC, displayTenencia;
                    let tenenciaCurrency = displayCurrency;
                    let ppcCurrency = displayCurrency;
                    if (mergeTransactions) {
                      // Para agrupados: recalcular cantidad sumada, PPC ponderado, tenencia, cambio
                      priceChange = (investment.currentPrice ?? 0) - (investment.purchasePrice ?? 0);
                      priceChangePercent = investment.purchasePrice
                        ? (priceChange / investment.purchasePrice) * 100
                        : 0;
                      isChangePositive = priceChange >= 0;
                      tenencia = (investment.currentPrice ?? 0) * (investment.quantity ?? 0);
                      // Corregido: displayPriceChange ahora es la ganancia/pérdida total (por cantidad)
                      displayPriceChange = showInARS
                        ? investment.currency === 'USD' && cclPrice
                          ? priceChange * investment.quantity * cclPrice
                          : priceChange * investment.quantity
                        : investment.currency === 'ARS' && cclPrice
                          ? priceChange * investment.quantity / cclPrice
                          : priceChange * investment.quantity;
                      displayPPC = showInARS
                        ? investment.currency === 'USD' && cclPrice
                          ? investment.purchasePrice * cclPrice
                          : investment.purchasePrice
                        : investment.currency === 'ARS' && cclPrice
                          ? investment.purchasePrice / cclPrice
                          : investment.purchasePrice;
                      displayTenencia = showInARS
                        ? investment.currency === 'USD' && cclPrice
                          ? tenencia * cclPrice
                          : tenencia
                        : investment.currency === 'ARS' && cclPrice
                          ? tenencia / cclPrice
                          : tenencia;
                    } else {
                      priceChange = (investment.currentPrice ?? 0) - (investment.purchasePrice ?? 0);
                      priceChangePercent = investment.purchasePrice
                        ? (priceChange / investment.purchasePrice) * 100
                        : 0;
                      isChangePositive = priceChange >= 0;
                      tenencia = (investment.currentPrice ?? 0) * (investment.quantity ?? 0);
                      displayCurrency = showInARS ? 'ARS' : 'USD';
                      // Corregido: displayPriceChange ahora es la ganancia/pérdida total (por cantidad)
                      displayPriceChange = showInARS
                        ? investment.currency === 'USD' && cclPrice
                          ? priceChange * investment.quantity * cclPrice
                          : priceChange * investment.quantity
                        : investment.currency === 'ARS' && cclPrice
                          ? priceChange * investment.quantity / cclPrice
                          : priceChange * investment.quantity;
                      displayPPC = showInARS
                        ? investment.currency === 'USD' && cclPrice
                          ? investment.purchasePrice * cclPrice
                          : investment.purchasePrice
                        : investment.currency === 'ARS' && cclPrice
                          ? investment.purchasePrice / cclPrice
                          : investment.purchasePrice;
                      displayTenencia = showInARS
                        ? investment.currency === 'USD' && cclPrice
                          ? tenencia * cclPrice
                          : tenencia
                        : investment.currency === 'ARS' && cclPrice
                          ? tenencia / cclPrice
                          : tenencia;
                    }
                    // --- Cálculo de asignación relativo al tipo de activo filtrado ---
                    const filteredTotal = activeTypeFilter === 'Todos'
                      ? displayedInvestments.reduce((acc, i) => acc + i.currentPrice * i.quantity, 0)
                      : displayedInvestments
                          .filter(i => i.type === activeTypeFilter)
                          .reduce((acc, i) => acc + i.currentPrice * i.quantity, 0);
                    const actualValue = investment.currentPrice * investment.quantity;
                    const allocationPercent = filteredTotal > 0 ? (actualValue / filteredTotal) * 100 : 0;
                    // ---------------------------------------------------------------
                    return (
                        <tr
                            key={investment.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
                              <span className="font-medium text-gray-800">{investment.ticker}</span>
                            </div>
                          </td>
                          {/* Nombre */}
                          <td className="py-4 px-4 text-gray-600">{investment.name}</td>
                          {/* Precio actual */}
                          <td className="py-4 px-4 text-gray-600">
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
                          {/* Cantidad */}
                          <td className="py-4 px-4 text-center">{investment.quantity.toFixed(4)}</td>
                          {/* PPC */}
                          <td className="py-4 px-4 text-gray-600 text-center">
                            {formatCurrency(displayPPC, ppcCurrency)}
                          </td>
                          {/* Tenencia */}
                          <td className="py-4 px-4 text-gray-600 text-center">
                            {displayTenencia < 1
                              ? new Intl.NumberFormat('es-AR', {
                                  style: 'currency',
                                  currency: tenenciaCurrency,
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1
                                }).format(displayTenencia)
                              : formatCurrency(displayTenencia, tenenciaCurrency)}
                          </td>
                          {/* Fecha de compra */}
                          {!mergeTransactions && (
                            <td className="py-4 px-4 text-gray-600 text-center">
                              {investment.purchaseDate
                                  ? new Date(investment.purchaseDate).toLocaleDateString('es-AR')
                                  : 'Fecha no disponible'}
                            </td>
                          )}
                          {/* Asignación */}
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    activeTypeFilter === 'Todos'
                                      ? 'bg-blue-600'
                                      : activeTypeFilter === 'Cripto'
                                      ? 'bg-orange-500'
                                      : activeTypeFilter === 'CEDEAR'
                                      ? 'bg-purple-600'
                                      : 'bg-[#0EA5E9]'
                                  }`}
                                  style={{ width: `${allocationPercent.toFixed(0)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">
                                {allocationPercent.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          {/* Acciones */}
                          {!mergeTransactions && (
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
                          )}
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
          {/* Agregar inversión (botón secundario, centrado debajo de la tabla) */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} />
              Agregar inversión
            </button>
          </div>
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
                  className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full border border-gray-200"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">📈 Agregar nueva inversión</h3>
                  <button
                      onClick={() => {
                        setShowAddModal(false);
                        setNewInvestment({
                          ticker: '',
                          name: '',
                          type: 'CEDEAR',
                          quantity: 0,
                          purchasePrice: 0,
                          purchaseDate: new Date().toISOString().split('T')[0],
                          currency: 'ARS',
                        });
                        setSelectedAsset(null);
                        setCurrentPrice(null);
                        setAssetSearchTerm('');
                      }}
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
                    <label htmlFor="type" className="block text-sm font-medium text-gray-800 mb-1">
                      Tipo de inversión
                    </label>
                    <select
                        id="type"
                        value={newInvestment.type}
                        onChange={(e) => {
                          const newType = e.target.value as 'Cripto' | 'CEDEAR' | 'Acción';
                          setNewInvestment((prev) => ({
                            ...prev,
                            type: newType,
                            ticker: '',
                            name: '',
                            quantity: 0,
                            purchasePrice: 0,
                            currency: newType === 'Cripto' ? 'USD' : 'ARS',
                          }));
                          setAssetSearchTerm('');
                          setSelectedAsset(null);
                          setCurrentPrice(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    >
                      <option value="CEDEAR">CEDEAR</option>
                      <option value="Acción">Acción</option>
                      <option value="Cripto">Cripto</option>
                    </select>
                  </div>
                  {/* --- Asset Selection: búsqueda e íconos --- */}
                  <div className="mb-4">
                    <label htmlFor="assetSearch" className="block text-sm font-medium text-gray-800 mb-1">
                      Seleccionar Activo
                    </label>
                    <div className="relative">
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                        <input
                          type="text"
                          id="assetSearch"
                          value={assetSearchTerm}
                          onChange={(e) => {
                            setAssetSearchTerm(e.target.value);
                            setSelectedAsset(null);
                          }}
                          placeholder={selectedAsset ? `${selectedAsset.name} (${selectedAsset.ticker})` : 'Buscar activo...'}
                          className="flex-1 outline-none bg-transparent text-sm text-gray-800"
                          autoComplete="off"
                        />
                      </div>
                      {(assetSearchTerm.length > 0 && filteredAssets.length > 0) && (
                        <ul className="absolute left-0 w-full z-50 bg-white border border-gray-200 mt-1 max-h-52 overflow-y-auto rounded-lg shadow-lg">
                          {filteredAssets.map((asset) => (
                            <li
                              key={asset.ticker}
                              onClick={() => {
                                handleAssetSelect(asset);
                                setSelectedAsset(asset);
                                setAssetSearchTerm('');
                              }}
                              className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <img
                                src={asset.logo}
                                alt={asset.name}
                                className="w-6 h-6 rounded-full mr-2 object-contain"
                                style={{ minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{asset.name}</p>
                                <p className="text-xs text-gray-500">{asset.ticker}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {/* Mostrar el activo seleccionado debajo del input */}
                    {selectedAsset && (
                      <div className="flex items-center gap-3 mt-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <img
                          src={selectedAsset.logo}
                          alt={selectedAsset.name}
                          className="w-7 h-7 rounded-full object-contain"
                          style={{ minWidth: 28, minHeight: 28, maxWidth: 28, maxHeight: 28 }}
                        />
                        <div>
                          <div className="font-semibold text-gray-800">{selectedAsset.name}</div>
                          <div className="text-xs text-gray-500">{selectedAsset.ticker}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fecha de compra */}

                  <div className="mb-4">
                    <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-800 mb-1">
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
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>


                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-800 mb-1">
                      Cantidad
                    </label>
                    <input
                        type="number"
                        id="quantity"
                        value={newInvestment.quantity || ''}
                        step={newInvestment.type === 'Cripto' ? 'any' : '1'}
                        min="0"
                        inputMode="decimal"
                        onChange={(e) =>
                          setNewInvestment((prev) => ({
                            ...prev,
                            quantity:
                              newInvestment.type === 'Cripto'
                                ? parseFloat(e.target.value.replace(',', '.')) || 0
                                : Math.floor(Number(e.target.value.replace(',', ''))) || 0
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                    {newInvestment.quantity > 0 && newInvestment.purchasePrice > 0 && cclPrice && (
                      <div className="mt-3 px-4 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-700 text-sm">
                        Esta compra equivale actualmente a:{' '}
                        <strong className="text-gray-900">
                          {newInvestment.currency === 'USD'
                            ? `${(newInvestment.quantity * newInvestment.purchasePrice).toFixed(2)} USD`
                            : `${(newInvestment.quantity * newInvestment.purchasePrice).toFixed(2)} ARS`}
                        </strong>{' '}
                        /{' '}
                        <strong className="text-gray-900">
                          {newInvestment.currency === 'USD'
                            ? `${(newInvestment.quantity * newInvestment.purchasePrice * cclPrice).toFixed(2)} ARS`
                            : `${(newInvestment.quantity * newInvestment.purchasePrice / cclPrice).toFixed(2)} USD`}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-800 mb-1">
                        Moneda
                      </label>
                      <select
                          id="currency"
                          value={newInvestment.currency}
                          onChange={(e) => setNewInvestment(prev => ({ ...prev, currency: e.target.value as 'USD' | 'ARS' }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      >
                        <option value="ARS">🇦🇷 ARS</option>
                        <option value="USD">🇺🇸 USD</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-800 mb-1">
                        Precio de compra
                      </label>
                      <div className="relative">
                        <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="number"
                            id="purchasePrice"
                            value={newInvestment.purchasePrice || ''}
                            onChange={(e) =>
                              setNewInvestment(prev => ({
                                ...prev,
                                purchasePrice: parseFloat(e.target.value.replace(',', '.')) || 0
                              }))
                            }
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors flex items-center"
                    >
                      <Plus size={18} className="mr-2" />
                      Agregar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
        )}
      {/* Tabla de resumen total por tipo de activo (eliminada por nuevo diseño) */}




    </div>
  );
};

export default Portfolio;

