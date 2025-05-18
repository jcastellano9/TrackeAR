import React, { useState, useEffect } from 'react';
import YieldAnalysis from './YieldAnalysis';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { DollarSign, Bitcoin, Wallet, ArrowUpRight, ArrowDownRight, ExternalLink, Loader, Ban as Bank, TrendingUp, AlertCircle } from 'lucide-react';
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
  Filler
);

interface Quote {
  name: string;
  buy: number | null;
  sell: number | null;
  spread?: number | null;
  source: string;
  variation?: number;
  logo?: string;
  is24x7?: boolean;
}

interface Rate {
  entity: string;
  rate: number | null;
  type: string;
  term?: number;
  minimumAmount?: number;
}

interface Sparkline {
  entity: string;
  data: number[];
  labels: string[];
}

// Retry function with exponential backoff
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<any> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const FinancialAnalysis: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  // Active section states
  const [activeMainSection, setActiveMainSection] = useState<'quotes'>('quotes');
  const [activeQuoteSection, setActiveQuoteSection] = useState<'dollar' | 'crypto' | 'pix'>('dollar');
  const [activeAnalysisSection, setActiveAnalysisSection] = useState<'summary' | 'yield'>('summary');

  // Data states
  const [dollarQuotes, setDollarQuotes] = useState<Quote[]>([]);
  const [cryptoQuotes, setCryptoQuotes] = useState<Quote[]>([]);
  const [pixQuotes, setPixQuotes] = useState<Quote[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dollar visual filter logic: selectedCurrency and filteredDollarQuotes
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'Bancos' | 'Alternativos' | 'Billeteras Virtuales'>('USD');
  // Cripto visual filter logic: selectedToken
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  // PIX visual filter logic: selectedPixSymbol
  const [selectedPixSymbol, setSelectedPixSymbol] = useState<string | null>(null);
  // Filtro para cotizaciones de dólar según selección visual
  const filteredDollarQuotes = dollarQuotes.filter(({ name }) => {
    if (selectedCurrency === 'USD') {
      // Solo USD Oficial, USD Blue, USD Bolsa, USD CCL, USD Tarjeta, USD Mayorista
      return (
        name.toLowerCase().includes('oficial') ||
        name.toLowerCase().includes('blue') ||
        name.toLowerCase().includes('bolsa') ||
        name.toLowerCase().includes('contado con liquidación') ||
        name.toLowerCase().includes('tarjeta') ||
        name.toLowerCase().includes('mayorista')
      );
    }
    if (selectedCurrency === 'Bancos') {
      // Bancos tradicionales
      return (
        name.toLowerCase().includes('banco') ||
        name.toLowerCase().includes('nacion') ||
        name.toLowerCase().includes('galicia') ||
        name.toLowerCase().includes('santander') ||
        name.toLowerCase().includes('bbva') ||
        name.toLowerCase().includes('hsbc') ||
        name.toLowerCase().includes('macro') ||
        name.toLowerCase().includes('supervielle')
      );
    }
    if (selectedCurrency === 'Billeteras Virtuales') {
      // Alternativos: billeteras, exchanges, fintechs
      return (
        name.toLowerCase().includes('bit') ||
        name.toLowerCase().includes('fiwind') ||
        name.toLowerCase().includes('plus') ||
        name.toLowerCase().includes('ripio') ||
        name.toLowerCase().includes('crypto') ||
        name.toLowerCase().includes('naranja') ||
        name.toLowerCase().includes('brubank') ||
        name.toLowerCase().includes('lemon')
      );
    }
    return true;
  });

  // Fetch dollar quotes: combina DolarAPI y ComparaDolar
  useEffect(() => {
    const fetchDollarQuotes = async () => {
      try {
        setLoading(true);
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

        const oficialQuotes = Array.isArray(dolarApiRes.data)
          ? dolarApiRes.data.map((q: any) => ({
              name: `USD ${q.nombre}`,
              buy: typeof q.compra === 'number' ? q.compra : null,
              sell: typeof q.venta === 'number' ? q.venta : null,
              spread: (typeof q.compra === 'number' && typeof q.venta === 'number')
                ? +(q.venta - q.compra).toFixed(2) : null,
              source: 'DolarAPI',
              variation: 0
            }))
          : [];

        const comparaQuotes = Array.isArray(comparaRes.data)
          ? comparaRes.data.map((q: any) => ({
              name: q.name.charAt(0).toUpperCase() + q.name.slice(1),
              buy: typeof q.bid === 'number' ? q.bid : null,
              sell: typeof q.ask === 'number' ? q.ask : null,
              spread: (typeof q.bid === 'number' && typeof q.ask === 'number')
                ? +(q.ask - q.bid).toFixed(2) : null,
              source: q.url || 'ComparaDolar',
              logo: q.logoUrl || null,
              is24x7: q.is24x7 || false,
              variation: 0
            }))
          : [];

        const combinedQuotes = [
          ...oficialQuotes.sort((a, b) => getUSDOrder(a.name) - getUSDOrder(b.name)),
          ...comparaQuotes.sort((a, b) => {
            if (a.spread === null) return 1;
            if (b.spread === null) return -1;
            return a.spread - b.spread;
          })
        ];
        setDollarQuotes(combinedQuotes);
      } catch (error) {
        console.error('Error fetching dollar quotes:', error);
        setError('Error al cargar cotizaciones del dólar');
      } finally {
        setLoading(false);
      }
    };

    if (activeMainSection === 'quotes' && activeQuoteSection === 'dollar') {
      fetchDollarQuotes();
      const interval = setInterval(fetchDollarQuotes, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeMainSection, activeQuoteSection]);

  // Fetch crypto quotes
  useEffect(() => {
    const fetchCryptoQuotes = async () => {
      try {
        setLoading(true);
        const tokens = ['usdt', 'usdc', 'btc', 'eth'];

        const responses = await Promise.all(
          tokens.map(token =>
            axios.get(`https://api.comparadolar.ar/crypto/${token}`)
              .catch(err => {
                console.error(`Error fetching ${token}:`, err);
                return { data: null };
              })
          )
        );

        const allQuotes = responses.flatMap((response, i) => {
          const token = tokens[i];
          if (!response.data || typeof response.data !== 'object') return [];

          return Object.entries(response.data).map(([provider, info]: [string, any]) => ({
            name: `${info.prettyName} (${token.toUpperCase()})`,
            buy: typeof info.bid === 'number' ? info.bid : null,
            sell: typeof info.ask === 'number' ? info.ask : null,
            spread: (typeof info.ask === 'number' && typeof info.bid === 'number')
              ? +(info.ask - info.bid).toFixed(2) : null,
            source: info.url || provider,
            logo: info.logo || null,
            is24x7: true,
            variation: 0
          }));
        });

        if (allQuotes.every(q => !q.buy && !q.sell)) {
          setError('No se pudieron cargar las cotizaciones de criptomonedas (datos vacíos).');
        }

        const sortedQuotes = allQuotes.sort((a, b) => {
          if (a.spread === null) return 1;
          if (b.spread === null) return -1;
          return a.spread - b.spread;
        });

        setCryptoQuotes(sortedQuotes);
      } catch (error) {
        console.error('Error fetching crypto quotes:', error);
        setError('Error al cargar cotizaciones de criptomonedas');
      } finally {
        setLoading(false);
      }
    };

    if (activeMainSection === 'quotes' && activeQuoteSection === 'crypto') {
      fetchCryptoQuotes();
      const interval = setInterval(fetchCryptoQuotes, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeMainSection, activeQuoteSection]);

  // Fetch PIX quotes from pix.ferminrp.com API
  useEffect(() => {
    const fetchPixQuotes = async () => {
      try {
        const response = await axios.get('https://pix.ferminrp.com/quotes');

        if (response?.data && typeof response.data === 'object') {
          const formattedQuotes: Quote[] = [];

          Object.entries(response.data).forEach(([provider, info]: [string, any]) => {
            if (Array.isArray(info.quotes)) {
              info.quotes.forEach((quote: any) => {
                const name = `${provider} (${quote.symbol})`.replace(/-/g, ' ').replace(/_/g, ' ').toUpperCase();
                formattedQuotes.push({
                  name,
                  buy: typeof quote.buy === 'number' ? quote.buy : null,
                  sell: typeof quote.sell === 'number' ? quote.sell : null,
                  spread: (typeof quote.spread === 'number') ? +quote.spread.toFixed(6) : null,
                  logo: info.logo || null,
                  source: info.url || 'pix.ferminrp.com',
                  is24x7: true,
                  variation: 0
                });
              });
            }
          });

          const sortedQuotes = formattedQuotes.sort((a, b) => {
            if (a.spread === null) return 1;
            if (b.spread === null) return -1;
            return a.spread - b.spread;
          });

          setPixQuotes(sortedQuotes);
        } else {
          setPixQuotes([]);
        }
      } catch (error) {
        console.error('Error fetching PIX quotes:', error);
        setError('No se pudieron cargar las cotizaciones de PIX. Por favor, intente más tarde.');
        setPixQuotes([]);
      }
    };

    if (activeMainSection === 'quotes' && activeQuoteSection === 'pix') {
      fetchPixQuotes();
      const interval = setInterval(fetchPixQuotes, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [activeMainSection, activeQuoteSection]);


  // Format currency
  const formatCurrency = (value: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Main section tabs (with "Rendimientos" button)
  const MainSectionTabs = () => (
    <div className="flex space-x-2 mb-6">
      <button
        onClick={() => setActiveMainSection('quotes')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeMainSection === 'quotes'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <div className="flex items-center">
          <TrendingUp size={18} className="mr-2" />
          Cotizaciones
        </div>
      </button>
      <button
        onClick={() => setActiveMainSection('rates')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeMainSection === 'rates'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <div className="flex items-center">
          <ArrowUpRight size={18} className="mr-2" />
          Rendimientos
        </div>
      </button>
    </div>
  );

  // Quote sections navigation
  const QuoteSectionsNav = () => (
    <div className="flex space-x-2 mb-6">
      <button
        onClick={() => setActiveQuoteSection('dollar')}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          activeQuoteSection === 'dollar'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <DollarSign size={18} className="mr-2" />
        Dólar
      </button>
      <button
        onClick={() => setActiveQuoteSection('crypto')}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          activeQuoteSection === 'crypto'
            ? 'bg-orange-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <Bitcoin size={18} className="mr-2" />
        Cripto
      </button>
      <button
        onClick={() => setActiveQuoteSection('pix')}
        className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
          activeQuoteSection === 'pix'
            ? 'bg-teal-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <Wallet size={18} className="mr-2" />
        PIX
      </button>
    </div>
  );


  // Quote card component
  const QuoteCard = ({ quote }: { quote: Quote }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          {quote.logo && (
            <img src={quote.logo} alt={quote.name} className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{quote.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{quote.source}</p>
          </div>
          {quote.is24x7 && (
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-semibold">24/7</span>
          )}
        </div>
        <div className="flex flex-col items-end">
          {typeof quote.spread === 'number' && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Spread: <span className="font-medium text-gray-700 dark:text-gray-200">{quote.spread.toFixed(2)}</span>
            </span>
          )}
          {typeof quote.variation === 'number' && (
            <div className={`flex items-center ${
              quote.variation >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {quote.variation >= 0 ? (
                <ArrowUpRight size={16} className="mr-1" />
              ) : (
                <ArrowDownRight size={16} className="mr-1" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(quote.variation).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Compra</p>
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {typeof quote.buy === 'number' ? formatCurrency(quote.buy) : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Venta</p>
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {typeof quote.sell === 'number' ? formatCurrency(quote.sell) : 'N/A'}
          </p>
        </div>
      </div>
    </motion.div>
  );


  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
          <TrendingUp size={24} className="text-blue-600" />
          <span>Análisis Financiero</span>
        </h1>
      </motion.div>

      <MainSectionTabs />

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-lg flex items-center text-red-700 dark:text-red-400">
          <AlertCircle size={20} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {activeMainSection === 'quotes' ? (
        <>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center space-x-2">
          </h2>
          <QuoteSectionsNav />

          {/* Barra superior de actualización y última actualización */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Última actualización: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <button
              onClick={() => {
                if (activeQuoteSection === 'dollar') {
                  // Refetch dollar quotes
                  // Se fuerza el fetch ejecutando el mismo código que en el useEffect
                  // Pero mejor definir funciones locales para poder llamarlas aquí
                  // Así que las sacamos de los useEffect y las ponemos arriba
                  fetchDollarQuotes();
                }
                if (activeQuoteSection === 'crypto') {
                  fetchCryptoQuotes();
                }
                if (activeQuoteSection === 'pix') {
                  fetchPixQuotes();
                }
              }}
              className="mt-2 md:mt-0 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              🔄 Actualizar datos
            </button>
          </div>

          {/* Mejores precios para cripto con token seleccionado o dólar con Bancos/Billeteras */}
          {((activeQuoteSection === 'crypto' && selectedToken) ||
            (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales'))) && (() => {
            let quotes: Quote[] = [];
            if (activeQuoteSection === 'crypto' && selectedToken) {
              // Filtrar las cotizaciones cripto solo por el token seleccionado
              quotes = cryptoQuotes.filter(q => {
                const match = q.name.match(/\(([^)]+)\)$/);
                const token = match?.[1] || 'OTROS';
                return token === selectedToken;
              });
            } else if (activeQuoteSection === 'dollar' && (selectedCurrency === 'Bancos' || selectedCurrency === 'Billeteras Virtuales')) {
              quotes = filteredDollarQuotes;
            }
            if (!quotes || quotes.length === 0) return null;

            const bestBuy = quotes.reduce((a, b) => (b.buy !== null && (a.buy === null || b.buy < a.buy) ? b : a), quotes[0]);
            const bestSell = quotes.reduce((a, b) => (b.sell !== null && (a.sell === null || b.sell > a.sell) ? b : a), quotes[0]);
            const bestSpread = quotes.reduce((a, b) => (b.spread !== null && (a.spread === null || b.spread < a.spread) ? b : a), quotes[0]);

            const BestCard = ({ title, value, entity }: { title: string, value: string, entity: Quote }) => (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600 flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{value}</p>
                <div className="flex items-center space-x-2">
                  {entity.logo && <img src={entity.logo} className="w-5 h-5 rounded-full border dark:border-gray-600" />}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{entity.name}</span>
                  {entity.is24x7 && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-semibold">24/7</span>
                  )}
                </div>
              </div>
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <BestCard title="Mejor para comprar" value={formatCurrency(bestBuy.buy || 0)} entity={bestBuy} />
                <BestCard title="Mejor para vender" value={formatCurrency(bestSell.sell || 0)} entity={bestSell} />
                <BestCard title="Menor Spread" value={formatCurrency(bestSpread.spread || 0)} entity={bestSpread} />
              </div>
            );
          })()}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="animate-spin text-blue-600" size={24} />
            </div>
          ) : (
            <>
              {/* Dólar visual filter */}
              {activeQuoteSection === 'dollar' && (
                <>
                  <div className="flex space-x-2 mb-4">
                    {['USD', 'Bancos', 'Billeteras Virtuales'].map(option => (
                      <button
                        key={option}
                        onClick={() => setSelectedCurrency(option as 'USD' | 'Bancos' | 'Alternativos' | 'Billeteras Virtuales')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedCurrency === option
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDollarQuotes.map((quote, index) => (
                      <QuoteCard key={`dollar-${index}`} quote={quote} />
                    ))}
                  </div>
                </>
              )}
              {/* Filtro visual de tokens para cripto */}
              {activeQuoteSection === 'crypto' && (
                <>
                  <div className="flex space-x-2 mb-4">
                    {['USDT', 'USDC', 'BTC', 'ETH'].map(token => (
                      <button
                        key={token}
                        onClick={() => setSelectedToken(token === selectedToken ? null : token)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedToken === token
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    // Agrupa las cotizaciones por token (extraído del nombre)
                    const groupedCryptoQuotes = cryptoQuotes.reduce((acc: { [token: string]: Quote[] }, quote) => {
                      const match = quote.name.match(/\(([^)]+)\)$/);
                      const token = match?.[1] || 'OTROS';
                      if (!acc[token]) acc[token] = [];
                      acc[token].push(quote);
                      return acc;
                    }, {});

                    // Si hay un token seleccionado, solo mostrar ese grupo; si no, mostrar todos los tokens disponibles
                    return (
                      <>
                        {Object.entries(groupedCryptoQuotes)
                          .filter(([token]) => !selectedToken || token === selectedToken)
                          .map(([token, quotes]) => (
                            <div key={token} className="mb-8 w-full">
                              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">{token}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {quotes.map((quote, index) => (
                                  <QuoteCard key={`${token}-${index}`} quote={quote} />
                                ))}
                              </div>
                            </div>
                          ))}
                      </>
                    );
                  })()}
                </>
              )}
              {activeQuoteSection === 'pix' && (
                <>
                  {/* Filtro visual de símbolos para PIX */}
                  {(() => {
                    const uniquePixSymbols = [...new Set(pixQuotes.map(q => q.name.match(/\(([^)]+)\)/)?.[1]))].filter(Boolean);
                    return (
                      <div className="flex space-x-2 mb-4">
                        {uniquePixSymbols.map(symbol => (
                          <button
                            key={symbol}
                            onClick={() => setSelectedPixSymbol(symbol === selectedPixSymbol ? null : symbol)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedPixSymbol === symbol
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {symbol}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pixQuotes
                      .filter(q => {
                        if (!selectedPixSymbol) return true;
                        const match = q.name.match(/\(([^)]+)\)/);
                        return match?.[1] === selectedPixSymbol;
                      })
                      .map((quote, index) => (
                        <QuoteCard key={`pix-${index}`} quote={quote} />
                      ))}
                    {pixQuotes.length === 0 && !loading && (
                      <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                        No hay cotizaciones PIX disponibles en este momento
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )
    : null}

      {activeMainSection === 'rates' && (
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center space-x-2">
          </h2>
          <YieldAnalysis />
        </div>
      )}
  </div>
);
}

export default FinancialAnalysis;