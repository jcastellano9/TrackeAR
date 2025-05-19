import React, { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  Filler
} from 'chart.js';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Loader, ExternalLink } from 'lucide-react';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  Filler
);

// Types for quotes
interface DollarQuote {
  name: string;
  buy: number;
  sell: number;
  variation: number;
}

interface CryptoQuote {
  name: string;
  price: number;
  variation: number;
}

const Dashboard: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  // Dashboard data states
  const [loading, setLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [profit, setProfit] = useState(0);
  const [profitPercentage, setProfitPercentage] = useState(0);

  // Market data states
  const [dollarQuotes, setDollarQuotes] = useState<DollarQuote[]>([]);
  const [cryptoQuotes, setCryptoQuotes] = useState<CryptoQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  // Portfolio distribution data
  const [portfolioData, setPortfolioData] = useState({
    labels: ['Cripto', 'CEDEARs', 'Acciones'],
    datasets: [{
      data: [30, 40, 30], // Distribución de ejemplo
      backgroundColor: [
        '#F97316', // Cripto - naranja intenso
        '#A855F7', // CEDEARs
        '#10B981'  // Acciones
      ],
      borderColor: [
        '#EA580C', // Borde naranja oscuro
        '#9333EA',
        '#059669'
      ],
      borderWidth: 1,
    }]
  });

  // Temporal filter state for capital evolution chart
  const [selectedRange, setSelectedRange] = useState('1Y');

  // Capital evolution data - alineado en colores con la distribución del portfolio
  const [capitalData, setCapitalData] = useState({
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Cripto',
        data: [40000, 42000, 41000, 45000, 47000, 48000], // Ejemplo
        fill: true,
        backgroundColor: 'rgba(249, 115, 22, 0.2)', // naranja
        borderColor: '#F97316',
        tension: 0.3
      },
      {
        label: 'CEDEARs',
        data: [60000, 61000, 60000, 65000, 70000, 75000], // Ejemplo
        fill: true,
        backgroundColor: 'rgba(168, 85, 247, 0.2)', // violeta
        borderColor: '#A855F7',
        tension: 0.3
      },
      {
        label: 'Acciones',
        data: [50000, 57000, 54000, 65000, 73000, 82000], // Ejemplo
        fill: true,
        backgroundColor: 'rgba(16, 185, 129, 0.2)', // verde
        borderColor: '#10B981',
        tension: 0.3
      }
    ]
  });

  // Estado base para agrupar por tipo de inversión (preparado para lógica futura)
  const [groupedCapitalData, setGroupedCapitalData] = useState({
    cripto: [],
    cedears: [],
    acciones: []
  });

  // --- Capital evolution chart temporal filter logic ---
  const allLabels = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

  const fullCapitalDataset = {
    labels: allLabels,
    datasets: [
      {
        label: 'Cripto',
        data: [38000, 40000, 42000, 41000, 40500, 39800, 40000, 42000, 41000, 45000, 47000, 48000],
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        borderColor: '#F97316',
        tension: 0.3,
        fill: true
      },
      {
        label: 'CEDEARs',
        data: [53000, 55000, 57000, 56500, 56200, 57000, 60000, 61000, 60000, 65000, 70000, 75000],
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        borderColor: '#A855F7',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Acciones',
        data: [46000, 47000, 51000, 52000, 53000, 54000, 50000, 57000, 54000, 65000, 73000, 82000],
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const rangeMap: { [key: string]: number } = {
    '1W': 1,
    '1M': 1,
    '3M': 3,
    '6M': 6,
    'YTD': 6,
    '1Y': 12
  };

  useEffect(() => {
    const monthsToShow = rangeMap[selectedRange];
    const filteredData = {
      labels: allLabels.slice(-monthsToShow),
      datasets: fullCapitalDataset.datasets.map(ds => ({
        ...ds,
        data: ds.data.slice(-monthsToShow)
      }))
    };
    setCapitalData(filteredData);
  }, [selectedRange]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Supongamos que tus inversiones ya están cargadas desde Supabase o Portfolio
        const { data, error } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        // Simulando CCL fijo por ahora (mejor: traer desde una tabla de cotizaciones si la tenés)
        const ccl = 1100;

        let invested = 0;
        let current = 0;

        data.forEach((inv) => {
          const quantity = inv.quantity;
          const purchasePrice = inv.purchase_price;
          const currentPrice = inv.current_price;
          const currency = inv.currency;

          const purchaseTotal = quantity * purchasePrice;
          const currentTotal = quantity * currentPrice;

          if (currency === 'ARS') {
            invested += purchaseTotal;
            current += currentTotal;
          } else if (currency === 'USD') {
            invested += purchaseTotal * ccl;
            current += currentTotal * ccl;
          }
        });

        setTotalInvested(invested);
        setCurrentValue(current);

        const profit = current - invested;
        setProfit(profit);
        setProfitPercentage(invested > 0 ? (profit / invested) * 100 : 0);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Fetch market data
  useEffect(() => {
    const fetchMarketData = async () => {
      let combinedQuotes: DollarQuote[] = [];
      try {
        setLoadingQuotes(true);

        // Fetch dollar quotes - nueva versión con dolarapi.com + comparadolar.ar
        try {
          const [dolarApiRes, comparaRes] = await Promise.all([
            axios.get('https://dolarapi.com/v1/dolares'),
            axios.get('https://api.comparadolar.ar/quotes')
          ]);

          const getUSDOrder = (name: string) => {
            const priority = [
              'USD Tarjeta',
              'USD Cripto',
              'USD Blue',
              'USD Bolsa',
              'USD Contado con liquidación',
              'USD Oficial',
              'USD Mayorista'
            ];
            const index = priority.findIndex(p => name === p);
            return index === -1 ? 99 : index;
          };

          combinedQuotes = dolarApiRes.data.map((item: any) => {
            const matched = comparaRes.data.find((d: any) => d.name === item.nombre);
            return {
              name: item.nombre,
              buy: item.compra,
              sell: item.venta,
              variation: matched?.variation ?? 0
            };
          });

          combinedQuotes.sort((a, b) => getUSDOrder(a.name) - getUSDOrder(b.name));
          setDollarQuotes(combinedQuotes);
        } catch (err) {
          console.error('Error al obtener cotizaciones del dólar:', err);
          setDollarQuotes([]);
        }

        // Fetch crypto quotes
        try {
          const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=ars,usd&include_24hr_change=true');
          const data = res.data;
          // Get CCL rate from combinedQuotes
          const cclQuote = combinedQuotes.find(q => q.name.toLowerCase().includes('contado'));
          const cclRate = cclQuote?.sell ?? 1100;
          const formattedCryptoQuotes: CryptoQuote[] = [
            { name: 'USDT', price: data['tether'].ars, variation: data['tether'].ars_24h_change },
            { name: 'USDC', price: data['usd-coin'].ars, variation: data['usd-coin'].ars_24h_change },
            { name: 'BTC', price: data['bitcoin'].ars / cclRate, variation: data['bitcoin'].ars_24h_change },
            { name: 'ETH', price: data['ethereum'].ars / cclRate, variation: data['ethereum'].ars_24h_change }
          ];
          setCryptoQuotes(formattedCryptoQuotes);
        } catch (error) {
          console.error('Error al obtener cotizaciones cripto:', error);
          setCryptoQuotes([]);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      } finally {
        setLoadingQuotes(false);
      }
    };

    fetchMarketData();

    // Refresh market data every 5 minutes
    const refreshInterval = setInterval(fetchMarketData, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Line chart options
  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Doughnut chart options
  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw;
            const total = context.chart._metasets[0].total || 1;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '70%',
  };

  // Format numbers as ARS currency
  const formatARS = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format numbers as USD currency
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  };

  // Get best dollar buy rate
  const getBestBuyRate = () => {
    if (dollarQuotes.length === 0) return null;

    return dollarQuotes.reduce((prev, current) =>
      prev.buy < current.buy ? prev : current
    );
  };

  // Get best dollar sell rate
  const getBestSellRate = () => {
    if (dollarQuotes.length === 0) return null;

    return dollarQuotes.reduce((prev, current) =>
      prev.sell > current.sell ? prev : current
    );
  };

  const bestBuy = getBestBuyRate();
  const bestSell = getBestSellRate();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Bienvenido a tu panel financiero</p>
      </motion.div>

      {/* Main indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invested */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invertido</p>
              {loading ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">{formatARS(totalInvested)}</p>
              )}
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Current Value */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Actual</p>
              {loading ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">{formatARS(currentValue)}</p>
              )}
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
          </div>
        </motion.div>

        {/* Profit/Loss */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ganancia/Pérdida</p>
              {loading ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <div className="flex items-center mt-1">
                  <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'} dark:text-gray-100`}>
                    {formatARS(profit)}
                  </p>
                  {profit >= 0 ? (
                    <ArrowUpRight size={18} className="ml-1 text-green-600" />
                  ) : (
                    <ArrowDownRight size={18} className="ml-1 text-red-600" />
                  )}
                </div>
              )}
            </div>
            <div className={`p-2 rounded-lg ${profit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {profit >= 0 ? (
                <ArrowUpRight size={20} className="text-green-600" />
              ) : (
                <ArrowDownRight size={20} className="text-red-600" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Performance */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rendimiento</p>
              {loading ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <div className="flex items-center mt-1">
                  <p className={`text-xl font-bold ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'} dark:text-gray-100`}>
                    {profitPercentage.toFixed(2)}%
                  </p>
                  {profitPercentage >= 0 ? (
                    <ArrowUpRight size={18} className="ml-1 text-green-600" />
                  ) : (
                    <ArrowDownRight size={18} className="ml-1 text-red-600" />
                  )}
                </div>
              )}
            </div>
            <div className={`p-2 rounded-lg ${profitPercentage >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {profitPercentage >= 0 ? (
                <ArrowUpRight size={20} className="text-green-600" />
              ) : (
                <ArrowDownRight size={20} className="text-red-600" />
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capital Evolution */}
        <motion.div
          className="lg:col-span-2 bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Temporal filters removed: Desde/Hasta */}
          <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Evolución del Capital</h2>
            <div className="flex gap-2 text-sm">
              {['1W', '1M', '3M', '6M', 'YTD', '1Y'].map((label) => (
                <button
                  key={label}
                  onClick={() => setSelectedRange(label)}
                  className={`px-3 py-1 rounded border ${
                    selectedRange === label
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200'
                  } hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-[18rem] sm:min-h-[20rem] md:min-h-[22rem]">
            <Line data={capitalData} options={lineOptions} />
          </div>
        </motion.div>

        {/* Portfolio Distribution */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Distribución del Portfolio</h2>
          <div className="flex flex-col items-center justify-center h-full py-6">
            <div className="h-64">
              <Doughnut data={portfolioData} options={doughnutOptions} />
            </div>
            {/* Custom legend */}
            <div className="mt-6 text-sm text-gray-700 dark:text-gray-300">
              <ul className="flex flex-col items-center gap-2">
                {portfolioData.labels.map((label, i) => {
                  const value = portfolioData.datasets[0].data[i];
                  const total = portfolioData.datasets[0].data.reduce((acc, val) => acc + val, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  const color = portfolioData.datasets[0].backgroundColor[i];

                  return (
                    <li
                      key={i}
                      className="flex items-center gap-2 whitespace-nowrap px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 w-fit"
                    >
                      <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                      <span className="font-medium">{label}</span>
                      <span className="text-gray-500 dark:text-gray-400">({percent}%)</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Market Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dollar Quotes */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Cotizaciones del Dólar</h2>
            <a
              href="/analysis?section=dolar"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition"
            >
              Ver más
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          </div>

          {loadingQuotes ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">Cargando datos...</p>
            </div>
          ) : dollarQuotes.length > 0 ? (
            <>
              <div className="space-y-3">
                {dollarQuotes.map((quote, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {/* Nombre */}
                    <div className="col-span-4 flex items-center">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{quote.name}</p>
                    </div>
                    {/* Compra / Venta */}
                    <div className="col-span-5 flex flex-wrap justify-end items-center gap-x-4 text-right">
                      <span className="flex items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Compra:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">{formatARS(quote.buy)}</span>
                      </span>
                      <span className="flex items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Venta:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">{formatARS(quote.sell)}</span>
                      </span>
                    </div>
                    {/* Variación */}
                    <div className="col-span-3 flex items-center sm:justify-end mt-2 sm:mt-0">
                      <span className={`text-xs ${quote.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {quote.variation >= 0 ? '+' : ''}{quote.variation.toFixed(2)}%
                      </span>
                      {quote.variation >= 0 ? (
                        <ArrowUpRight size={12} className="ml-1 text-green-600" />
                      ) : (
                        <ArrowDownRight size={12} className="ml-1 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
            </div>
          )}
        </motion.div>

        {/* Crypto Quotes */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Cotizaciones Cripto</h2>
            <a
              href="/analysis?section=cripto"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition"
            >
              Ver más
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          </div>

          {loadingQuotes ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">Cargando datos...</p>
            </div>
          ) : cryptoQuotes.length > 0 ? (
            <div className="space-y-3">
              {cryptoQuotes
                .filter(quote => quote && typeof quote.price === 'number' && !isNaN(quote.price) && quote.price > 0)
                .map((quote, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {/* Nombre */}
                    <div className="col-span-4 flex flex-col justify-center">
                      <p className="font-medium text-gray-800 dark:text-gray-100">{quote.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {['USDT', 'USDC'].includes(quote.name) ? 'Stablecoin' : 'Cryptocurrency'}
                      </p>
                    </div>
                    {/* Precio */}
                    <div className="col-span-5 flex items-center justify-end text-right">
                      <p className="font-medium text-gray-800 dark:text-gray-100">
                        {['BTC', 'ETH'].includes(quote.name) ? formatUSD(quote.price) : formatARS(quote.price)}
                      </p>
                    </div>
                    {/* Variación */}
                    <div className="col-span-3 flex items-center sm:justify-end mt-2 sm:mt-0">
                      <span className={`text-xs ${quote.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {quote.variation >= 0 ? '+' : ''}{quote.variation.toFixed(2)}%
                      </span>
                      {quote.variation >= 0 ? (
                        <ArrowUpRight size={12} className="ml-1 text-green-600" />
                      ) : (
                        <ArrowDownRight size={12} className="ml-1 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">No hay datos disponibles</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;