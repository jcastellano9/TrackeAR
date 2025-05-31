// Página principal del Dashboard con indicadores, gráficos y cotizaciones
import React, { useEffect, useState } from 'react';
import type { ChartOptions } from 'chart.js';
import { usePortfolioData } from '../hooks/usePortfolioData';
// import { useSupabase } from '../contexts/SupabaseContext';
// import { useAuth } from '../contexts/AuthContext';
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
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, ExternalLink } from 'lucide-react';
import axios from 'axios';

// Registrar componentes de ChartJS para habilitar gráficos de líneas y dona
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

// Definir tipos para cotizaciones de dólar y cripto
interface DollarQuote {
  name: string;
  buy: number;
  sell: number;
  variation: number | null;
}

interface CryptoQuote {
  name: string;
  price: number;
  variation: number;
}

// Definir emojis para representar cada tipo de cotización
const dollarEmoji: Record<string, string> = {
  Oficial: '💵',
  Blue: '🔵',
  Bolsa: '💹',
  CCL: '📈',
  Mayorista: '🏦',
  Cripto: '🪙',
  Tarjeta: '💳',
};
const cryptoEmoji: Record<string, string> = {
  USDT: '🟢',
  USDC: '🔵',
  BTC: '🟠',
  ETH: '🟣',
  Inflación: '📊',
};

const Dashboard: React.FC = () => {
  // Obtener contexto de Supabase y usuario autenticado
  // const supabase = useSupabase();
  // const { user } = useAuth();

  // Estados de visualización y preferencias
  const [showInARS, setShowInARS] = useState(true); // Alternar entre mostrar en ARS o USD
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark')); // Detectar modo oscuro
  useEffect(() => {
    // Observar cambios en la clase 'dark' para actualizar isDarkMode
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Filtrar por tipo de activo para resúmenes y gráficos
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Cripto' | 'CEDEAR' | 'Acción'>('Todos');

  // Obtener datos y funciones del hook de portafolio
  const {
    investments,
    loading: loadingDashboard,
    error: dashboardError,
    getResumenDashboardFiltrado,
    getCapitalEvolutionData,
    marketPrices,
    cclPrice,
  } = usePortfolioData();

  // Obtener resumen global filtrado con parámetros actuales
  const resumenGlobal = getResumenDashboardFiltrado({
    typeFilter,
    merge: true,
    search: '',
    showInARS,
  });
  const totalInvested = resumenGlobal?.invertido ?? 0; // Total invertido
  const currentValue = resumenGlobal?.valorActual ?? 0; // Valor actual del portafolio
  const profit = resumenGlobal?.cambioTotal ?? 0; // Ganancia o pérdida total
  const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0; // Porcentaje de rendimiento

  // Estados de cotizaciones y carga de datos de mercado
  const [dollarQuotes, setDollarQuotes] = useState<DollarQuote[]>([]);
  const [cryptoQuotes, setCryptoQuotes] = useState<CryptoQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  // Estado para inflación mensual oficial: valor, fecha y posible error
  const [lastInflation, setLastInflation] = useState<number | null>(null);
  const [inflationError, setInflationError] = useState(false);
  useEffect(() => {
    // Obtener datos de inflación desde datos.gob.ar y actualizar estado
    const fetchInflationData = async () => {
      try {
        const response = await fetch('https://apis.datos.gob.ar/series/api/series/?metadata=full&collapse=month&ids=103.1_I2N_2016_M_19&limit=5000&representation_mode=percent_change&start=0');
        const json = await response.json();
        const rawData = json.data;
        if (rawData && rawData.length > 0) {
          const today = new Date();
          const recentEntry = rawData
            .map((entry: [string, number | null]): { date: Date; value: number | null } => ({
              date: new Date(entry[0]),
              value: entry[1]
            }))
            .filter(
              (entry: { date: Date; value: number | null }): entry is { date: Date; value: number } =>
                entry.date <= today && entry.value !== null
            )
            .sort(
              (a: { date: Date; value: number }, b: { date: Date; value: number }) =>
                b.date.getTime() - a.date.getTime()
            )[0];
          if (recentEntry) {
            setLastInflation(recentEntry.value! * 100);
          } else {
            console.warn("No hay datos de inflación recientes.");
            setInflationError(true);
          }
        } else {
          console.warn("No se recibieron datos de inflación.");
          setInflationError(true);
        }
      } catch (error) {
        console.error('Error al obtener inflación desde datos.gob.ar:', error);
        setInflationError(true);
      }
    };
    fetchInflationData();
  }, []);

  // Recalcular distribución del portafolio por tipo usando valores actuales filtrados
  const distributionData = React.useMemo(() => {
    // Etiquetas para gráfico de dona
    const labels = ['Criptomonedas', 'CEDEARs', 'Acciones'] as string[];

    // Obtener valor actual por cada tipo de activo
    const typeKeys: ('Cripto' | 'CEDEAR' | 'Acción')[] = ['Cripto', 'CEDEAR', 'Acción'];
    const values = typeKeys.map(type => {
      const r = getResumenDashboardFiltrado({
        typeFilter: type,
        merge: true,
        search: '',
        showInARS,
      });
      return r.valorActual || 0;
    });
    const total = values.reduce((sum, v) => sum + v, 0);
    const data = total === 0 ? [1, 0, 0] : values;

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#F97316', '#A855F7', '#0EA5E9'],
        borderColor: ['#EA580C','#9333EA','#0284C7'],
        borderWidth: 1,
      }]
    };
  }, [getResumenDashboardFiltrado, showInARS]);

  // Estado temporal para filtro de rango de tiempo en evolución de capital
  const [selectedRange, setSelectedRange] = useState<'All' | '1M' | '3M' | '6M' | 'YTD' | '1Y'>('All');

  // Datos para gráfico de evolución de capital
  const [capitalData, setCapitalData] = useState<{ labels: string[]; datasets: any[] }>({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    // Obtener evolución del capital y aplicar filtro de rango
    const dataRaw = getCapitalEvolutionData({ showInARS }) || [];
    let filteredDataRaw;
    if (selectedRange === 'All') {
      filteredDataRaw = dataRaw;
    } else {
      const now = new Date();
      const threshold = new Date(now);
      switch (selectedRange) {
        case '1M':
          threshold.setMonth(now.getMonth() - 1);
          break;
        case '3M':
          threshold.setMonth(now.getMonth() - 3);
          break;
        case '6M':
          threshold.setMonth(now.getMonth() - 6);
          break;
        case 'YTD':
          threshold.setFullYear(now.getFullYear(), 0, 1);
          break;
        case '1Y':
          threshold.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      filteredDataRaw = dataRaw.filter(item => new Date(item.fecha) >= threshold);
    }
    if (!Array.isArray(filteredDataRaw) || filteredDataRaw.length === 0) {
      setCapitalData({ labels: [], datasets: [] });
      return;
    }
    // Extraer etiquetas (fechas) y series sin modificaciones
    const labels = filteredDataRaw.map(item => item.fecha);
    const seriesCripto = filteredDataRaw.map(item => item.Cripto);
    const seriesCedear = filteredDataRaw.map(item => item.CEDEAR);
    const seriesAccion = filteredDataRaw.map(item => item['Acción']);

    // Lógica de ajuste para vista ARS/USD
    const cclRate = cclPrice ?? 1;
    let seriesCriptoAdjusted = seriesCripto;
    let seriesCedearAdjusted = seriesCedear;
    let seriesAccionAdjusted = seriesAccion;
    if (showInARS) {
      // En ARS, multiplicar CEDEAR y Acción por CCL
      seriesCedearAdjusted = seriesCedear.map(val => val / cclRate);
      seriesAccionAdjusted = seriesAccion.map(val => val / cclRate);
    } else {
      // En USD, dividir Cripto por CCL
      seriesCedearAdjusted = seriesCedear.map(val => val / cclRate);
      seriesAccionAdjusted = seriesAccion.map(val => val / cclRate);
    }
    const seriesTotal = seriesCriptoAdjusted.map((_, idx) =>
      seriesCriptoAdjusted[idx] + seriesCedearAdjusted[idx] + seriesAccionAdjusted[idx]
    );

    // Definir colores para cada tipo de activo
    const colorMap = {
      Cripto: { bg: 'rgba(249, 115, 22, 0.2)', border: '#F97316' },
      CEDEAR: { bg: 'rgba(168, 85, 247, 0.2)', border: '#A855F7' },
      Acción: { bg: 'rgba(14, 165, 233, 0.2)', border: '#0EA5E9' },
    };

    // Construir datasets filtrando por typeFilter
    let datasets;
    if (typeFilter === 'Todos') {
      datasets = [
        {
          label: 'Cripto',
          data: seriesCriptoAdjusted,
          fill: true,
          backgroundColor: colorMap.Cripto.bg,
          borderColor: colorMap.Cripto.border,
          tension: 0.3,
        },
        {
          label: 'CEDEAR',
          data: seriesCedearAdjusted,
          fill: true,
          backgroundColor: colorMap.CEDEAR.bg,
          borderColor: colorMap.CEDEAR.border,
          tension: 0.3,
        },
        {
          label: 'Acción',
          data: seriesAccionAdjusted,
          fill: true,
          backgroundColor: colorMap.Acción.bg,
          borderColor: colorMap.Acción.border,
          tension: 0.3,
        },
        {
          label: 'Total',
          data: seriesTotal,
          fill: false,
          borderColor: isDarkMode ? '#FFFFFF' : '#1E293B',
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(30,41,59,0.1)',
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.3,
          type: 'line',
          borderDash: [5, 5],
        },
      ];
    } else {
      const mapSeries: Record<'Cripto' | 'CEDEAR' | 'Acción', number[]> = {
        Cripto: seriesCriptoAdjusted,
        CEDEAR: seriesCedearAdjusted,
        Acción: seriesAccionAdjusted,
      };
      const selectedSeries = mapSeries[typeFilter];
      datasets = [
        {
          label: typeFilter,
          data: selectedSeries,
          fill: true,
          backgroundColor: colorMap[typeFilter].bg,
          borderColor: colorMap[typeFilter].border,
          tension: 0.3,
        }
      ];
    }
    setCapitalData({ labels, datasets });
  }, [
    showInARS,
    investments,
    marketPrices,
    cclPrice,
    typeFilter,
    selectedRange,
    isDarkMode,
  ]);

  // Obtener datos de mercado: cotizaciones de dólar y cripto
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoadingQuotes(true);

        // Obtener cotizaciones del dólar - unificado
        try {
          const response = await axios.get('https://dolarapi.com/v1/ambito/dolares');
          const quotes: DollarQuote[] = response.data.map((item: any) => {
            const rawName = item.nombre;
            const name = rawName === 'Contado con liquidación' ? 'CCL' : rawName;
            return {
              name,
              buy: item.compra,
              sell: item.venta,
              variation: item.variacion ?? null
            };
          });
          setDollarQuotes(quotes);
        } catch (err) {
          console.error('Error al obtener cotizaciones del dólar:', err);
          setDollarQuotes([]);
        }

        // Obtener cotizaciones de criptomonedas
        try {
          const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=ars,usd&include_24hr_change=true');
          const data = res.data;
          const formattedCryptoQuotes: CryptoQuote[] = [
            { name: 'USDT', price: data['tether'].ars, variation: data['tether'].ars_24h_change },
            { name: 'USDC', price: data['usd-coin'].ars, variation: data['usd-coin'].ars_24h_change },
            { name: 'BTC', price: data['bitcoin'].usd, variation: data['bitcoin'].usd_24h_change },
            { name: 'ETH', price: data['ethereum'].usd, variation: data['ethereum'].usd_24h_change }
          ];
          setCryptoQuotes(formattedCryptoQuotes);
        } catch (error) {
          console.error('Error al obtener cotizaciones cripto:', error);
          setCryptoQuotes([]);
        }
      } catch (error) {
        console.error('Error al obtener datos de mercado:', error);
      } finally {
        setLoadingQuotes(false);
      }
    };

    // Llamar a la función e iniciar intervalo de refresco cada 5 minutos
    fetchMarketData();
    const refreshInterval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Opciones para gráfico de líneas (evolución de capital)
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? context.raw;
            return showInARS
              ? `${label}: ${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : `${label}: ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: number) {
            return showInARS
              ? value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  } as ChartOptions<'line'>;

  // PARCHADO getCapitalEvolutionData para usar "Acción" de forma consistente
  // (Si se mueve esta función, mantener este parche)
  // Opciones para gráfico de dona (distribución de portafolio)
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

  // Formatear números como ARS
  const formatARS = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Formatear números como USD
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Dashboard con título y subtítulo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300">Bienvenido a tu panel financiero</p>
      </motion.div>

      {/*
        Indicadores principales
        Mostrar total invertido, valor actual, ganancia/pérdida y rendimiento
        usando exclusivamente valores de resumenGlobal del hook.
        Botón ARS/USD cambia solo el formato visual, no la lógica ni el origen.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invertido */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Invertido ({showInARS ? 'ARS' : 'USD'})
              </p>
              {loadingDashboard ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                  {showInARS ? formatARS(totalInvested) : formatUSD(totalInvested)}
                </p>
              )}
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
          </div>
        </motion.div>

        {/* Valor Actual */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Valor Actual ({showInARS ? 'ARS' : 'USD'})
              </p>
              {loadingDashboard ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                  {showInARS ? formatARS(currentValue) : formatUSD(currentValue)}
                </p>
              )}
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
          </div>
        </motion.div>

        {/* Ganancia/Pérdida */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ganancia/Pérdida ({showInARS ? 'ARS' : 'USD'})
              </p>
              {loadingDashboard ? (
                <div className="h-7 w-28 bg-gray-200 animate-pulse rounded mt-1"></div>
              ) : (
                <div className="flex items-center mt-1">
                  <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'} dark:text-gray-100`}>
                    {showInARS ? formatARS(profit) : formatUSD(profit)}
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

        {/* Rendimiento */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rendimiento</p>
              {loadingDashboard ? (
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

      {/* Mostrar mensaje de error si ocurre al cargar datos del Dashboard */}
      {dashboardError && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-4">
          Error cargando datos del dashboard: {typeof dashboardError === 'string' ? dashboardError : String(dashboardError)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolución del Capital con gráfico de líneas */}
        <motion.div
          className="lg:col-span-2 bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Seleccionar rango de tiempo para el gráfico */}
          <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Evolución del Capital</h2>
            <div className="flex gap-2 text-sm">
              {['All','1M','3M','6M','YTD','1Y'].map(label => (
                <button
                  key={label}
                  onClick={() => setSelectedRange(label as 'All' | '1M' | '3M' | '6M' | 'YTD' | '1Y')}
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
          {/* Leyenda interactiva para filtrar tipo de activo */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {['Todos','Acción','CEDEAR','Cripto'].map(label => {
              let display = label === 'Acción' ? 'Acciones'
                          : label === 'CEDEAR' ? 'CEDEARs'
                          : label === 'Cripto' ? 'Criptomonedas'
                          : 'Todos';
              return (
                <button
                  key={label}
                  onClick={() => setTypeFilter(label as 'Todos'|'Cripto'|'CEDEAR'|'Acción')}
                  className={`
                    px-2 py-1 rounded text-sm transition
                    ${
                      typeFilter === label
                        ? label === 'Cripto'
                          ? 'bg-orange-100 text-orange-600 font-semibold'
                          : label === 'CEDEAR'
                          ? 'bg-purple-100 text-purple-600 font-semibold'
                          : label === 'Acción'
                          ? 'bg-sky-100 text-sky-600 font-semibold'
                          : 'bg-gray-200 text-gray-900 font-semibold'
                        : label === 'Cripto'
                        ? 'text-orange-600 hover:bg-orange-50'
                        : label === 'CEDEAR'
                        ? 'text-purple-600 hover:bg-purple-50'
                        : label === 'Acción'
                        ? 'text-sky-600 hover:bg-sky-50'
                        : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  {display}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Distribución del Portafolio con gráfico de dona */}
        <motion.div
          className="bg-white dark:bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Distribución del Portfolio</h2>
            <button
              onClick={() => setShowInARS(prev => !prev)}
              className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                showInARS
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-[#0EA5E9] text-white hover:bg-[#0284c7]'
              }`}
            >
              <DollarSign size={14} className="text-white" />
              Ver en {showInARS ? 'USD' : 'ARS'}
            </button>
          </div>
          <div className="flex flex-col items-center justify-center h-full py-6">
            <div className="w-full flex justify-center">
              <div className="h-64 w-64">
                <Doughnut data={distributionData} options={doughnutOptions} />
              </div>
            </div>
            {/* Leyenda personalizada para mostrar porcentaje por tipo */}
            <div className="mt-6 text-sm text-gray-700 dark:text-gray-300">
              <ul className="flex flex-col items-center gap-2">
                {distributionData.labels.map((label, i) => {
                  const value = distributionData.datasets[0].data[i];
                  const total = distributionData.datasets[0].data.reduce((acc, val) => acc + val, 0);
                  const percent = ((value / total) * 100).toFixed(1);
                  const color = distributionData.datasets[0].backgroundColor[i];
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

      {/* Datos de mercado: cotizaciones de dólar y cripto */}
      <div className="grid grid-cols-1 gap-6">
        {/* Cotizaciones del Dólar */}
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
            <div className="grid grid-cols-7 gap-3 justify-center">
              {dollarQuotes.map((quote, index) => (
                <div
                  key={index}
                  className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-center">
                    {dollarEmoji[quote.name] || ''} {quote.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 justify-items-center">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Venta</div>
                      <div className="font-medium text-gray-800 dark:text-gray-100">{formatARS(quote.sell)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Compra</div>
                      <div className="font-medium text-gray-800 dark:text-gray-100">{formatARS(quote.buy)}</div>
                    </div>
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

        {/* Cotizaciones Cripto */}
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
            <div className="grid grid-cols-5 gap-3 justify-center">
              {cryptoQuotes
                .filter(quote => typeof quote.price === 'number' && quote.price > 0)
                .map((quote, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2"
                  >
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-center">
                      {cryptoEmoji[quote.name] || ''} {quote.name}
                    </h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                      {['USDT','USDC'].includes(quote.name) ? 'Moneda estable' : 'Criptomoneda'}
                    </div>
                    <div className="grid grid-cols-2 gap-4 justify-items-center">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {['BTC','ETH'].includes(quote.name) ? 'Precio (USD)' : 'Precio (ARS)'}
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-100 text-center">
                          {['BTC','ETH'].includes(quote.name) ? formatUSD(quote.price) : formatARS(quote.price)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">Variación 24h</div>
                        <div className={`text-sm font-medium text-center ${quote.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {quote.variation >= 0 ? '+' : ''}{quote.variation.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {/* Mostrar inflación mensual */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 space-y-2 border-l-4 border-orange-400 text-center">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {cryptoEmoji['Inflación']} Inflación mensual
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fuente: INDEC</p>
                {inflationError ? (
                  <p className="text-base text-red-500">Datos no disponibles</p>
                ) : lastInflation !== null ? (
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {lastInflation.toFixed(2)}%
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
                )}
              </div>
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
