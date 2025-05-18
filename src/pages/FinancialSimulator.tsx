import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Calculator, Landmark, Wallet, Bitcoin, ArrowRight, AlertCircle, Check } from 'lucide-react';
import axios from 'axios';

interface Rate {
  entity: string;
  rate: number;
  type: string;
  term?: number;
  minimumAmount?: number;
  logo?: string;
}

interface SimulationResult {
  finalAmount: number;
  interest: number;
  effectiveRate: number;
}

const FinancialSimulator: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  // Simulation type state
  const [simulationType, setSimulationType] = useState<'fixed' | 'wallet' | 'crypto' | 'installments'>('fixed');

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [term, setTerm] = useState<string>('30');
  const [rate, setRate] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');

  // Data states
  const [bankRates, setBankRates] = useState<Rate[]>([]);
  const [walletRates, setWalletRates] = useState<Rate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<Rate[]>([]);
  // Crypto selection states
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [availableCryptoPlatforms, setAvailableCryptoPlatforms] = useState<Rate[]>([]);

  // Results state
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Error and validation states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cuotas vs Contado states
  const [cashPrice, setCashPrice] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  interface InstallmentResult {
    totalFinanced: number;
    cft: number;
    suggestion: 'Sí' | 'No';
    adjustedInstallments: number[];
    inflationRate: number;
    fciProjection: number;
    pfProjection: number;
  }
  const [installmentResult, setInstallmentResult] = useState<InstallmentResult | null>(null);
  const [monthlyInflation, setMonthlyInflation] = useState<number | null>(null);

  // Fetch rates on component mount (integración real)
  useEffect(() => {
    setLoading(true);

    const fetchRates = async () => {
      try {
        // Plazo fijo - desde Comparatasas
        const fixedRes = await axios.get('https://api.comparatasas.ar/plazos-fijos');
        const fixedData = fixedRes.data.map((item: any) => ({
          entity: item.entidad,
          rate: item.tnaClientes ? parseFloat((item.tnaClientes * 100).toFixed(2)) : 0,
          type: 'Plazo Fijo',
          minimumAmount: null,
          logo: `https://icons.com.ar/logos/${item.entidad.toLowerCase().replace(/\s+/g, '-')}.svg`
        }));
        setBankRates(fixedData);

        // Cuentas remuneradas - desde Comparatasas
        const walletRes = await axios.get('https://api.comparatasas.ar/cuentas-remuneradas');
        const walletData = walletRes.data.map((item: any) => ({
          entity: item.nombre,
          rate: item.tna,
          type: 'Cuenta Remunerada',
          minimumAmount: item.limite,
          logo: `https://icons.com.ar/logos/${item.nombre.toLowerCase().replace(/\s+/g, '-')}.svg`
        }));
        setWalletRates(walletData);

        // Cripto - desde Comparatasas
        const cryptoRes = await axios.get('https://api.comparatasas.ar/v1/finanzas/rendimientos');
        const cryptoData: Rate[] = [];

        cryptoRes.data.forEach((exchange: any) => {
          exchange.rendimientos.forEach((item: any) => {
            if (item.apy > 0) {
              cryptoData.push({
                entity: `${item.moneda} (${exchange.entidad})`,
                rate: item.apy,
                type: 'Staking',
                // logo: `https://icons.com.ar/logos/${item.moneda.toLowerCase()}.svg`,
                logo: `https://icons.com.ar/logos/${item.moneda.toLowerCase().replace(/\s+/g, '-')}.svg`
              });
            }
          });
        });

        setCryptoRates(cryptoData);
      } catch (err) {
        console.error('Error al obtener tasas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();

    // Fetch inflación mensual promedio últimos 12 meses
    const fetchInflation = async () => {
      try {
        const inflationRes = await axios.get('https://api.argentinadatos.com/v1/inflacion/mensual');
        if (Array.isArray(inflationRes.data)) {
          const last12 = inflationRes.data.slice(-12);
          const avg = last12.reduce((acc, curr) => acc + parseFloat(curr.valor), 0) / last12.length;
          setMonthlyInflation(parseFloat(avg.toFixed(2)));
        }
      } catch (e) {
        console.error('Error al obtener inflación:', e);
      }
    };
    fetchInflation();
  }, []);

  // Handle entity selection
  const handleEntitySelect = (entity: string, rate: number) => {
    setSelectedEntity(entity);
    setRate(rate.toString());
  };

  // Calculate simulation results
  const calculateResults = () => {
    if (!amount || !rate || !term) {
      setError('Por favor complete todos los campos');
      return;
    }

    const principal = parseFloat(amount);
    const annualRate = parseFloat(rate);
    const days = parseInt(term);

    if (isNaN(principal) || isNaN(annualRate) || isNaN(days)) {
      setError('Por favor ingrese valores numéricos válidos');
      return;
    }

    let finalAmount, interest, effectiveRate;

    if (simulationType === 'crypto') {
      finalAmount = principal * Math.pow(1 + annualRate / 100, days / 365);
      interest = finalAmount - principal;
      effectiveRate = (Math.pow(1 + annualRate / 100, 1) - 1) * 100;
    } else {
      const dailyRate = annualRate / 365;
      finalAmount = principal * (1 + (dailyRate * days) / 100);
      interest = finalAmount - principal;
      effectiveRate = (interest / principal) * (365 / days) * 100;
    }

    setResult({
      finalAmount,
      interest,
      effectiveRate
    });

    setError(null);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Cuotas vs Contado calculation
  const calculateInstallmentComparison = () => {
    const cash = parseFloat(cashPrice);
    const totalInstallment = parseFloat(installmentAmount);
    const count = parseInt(installmentCount);

    if (isNaN(cash) || isNaN(totalInstallment) || isNaN(count)) {
      setError('Por favor ingrese valores válidos en cuotas vs contado');
      return;
    }

    const totalFinanced = totalInstallment;
    const installment = totalInstallment / count;
    // Inflación estimada
    const inflationRate = monthlyInflation ?? 3;
    const inflationFactor = (1 + inflationRate / 100);
    const adjustedInstallments: number[] = [];
    let totalAdjusted = 0;
    for (let i = 0; i < count; i++) {
      const adjusted = installment / Math.pow(inflationFactor, i);
      adjustedInstallments.push(adjusted);
      totalAdjusted += adjusted;
    }

    // Promedio billetera virtual/FCI
    const avgWalletRate = walletRates.length
      ? walletRates.reduce((sum, r) => sum + r.rate, 0) / walletRates.length
      : 30;
    const avgBankRate = bankRates.length
      ? bankRates.reduce((sum, r) => sum + r.rate, 0) / bankRates.length
      : 35;

    // Simulación inversión alternativa
    const fciProjection = cash * Math.pow(1 + avgWalletRate / 100, count / 12);
    const pfProjection = cash * Math.pow(1 + avgBankRate / 100, count / 12);

    // CFT corregido (anualizado)
    // Nuevo cálculo usando tasa efectiva mensual
    const monthlyRate = totalFinanced / cash;
    const cft = ((monthlyRate - 1) / count) * 12 * 100;
    const suggestion = totalAdjusted < cash ? 'Sí' : 'No';

    setInstallmentResult({
      totalFinanced,
      cft,
      suggestion,
      adjustedInstallments,
      inflationRate,
      fciProjection,
      pfProjection
    });
    setError(null);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Simulador Financiero</h1>
        <p className="text-gray-600 dark:text-gray-300">Calcula rendimientos y compara alternativas de inversión</p>
      </motion.div>

      {/* Simulation Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSimulationType('fixed');
            setSelectedEntity('');
            setSelectedCrypto('');
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
            simulationType === 'fixed'
              ? 'bg-blue-50 border-blue-200 shadow-sm'
              : 'bg-white border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Landmark size={24} className={`${
              simulationType === 'fixed' ? 'text-blue-600' : 'text-gray-400'
            }`} />
            <h3 className={`font-medium ${
              simulationType === 'fixed' ? 'text-blue-600' : 'text-gray-700'
            }`}>
              Plazo Fijo
            </h3>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSimulationType('wallet');
            setSelectedEntity('');
            setSelectedCrypto('');
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
            simulationType === 'wallet'
              ? 'bg-purple-50 border-purple-200 shadow-sm'
              : 'bg-white border-gray-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Wallet size={24} className={`${
              simulationType === 'wallet' ? 'text-purple-600' : 'text-gray-400'
            }`} />
            <h3 className={`font-medium ${
              simulationType === 'wallet' ? 'text-purple-600' : 'text-gray-700'
            }`}>
              Billetera Virtual
            </h3>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSimulationType('crypto');
            setSelectedEntity('');
            setSelectedCrypto('');
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
            simulationType === 'crypto'
              ? 'bg-green-50 border-green-200 shadow-sm'
              : 'bg-white border-gray-200 hover:border-green-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Bitcoin size={24} className={`${
              simulationType === 'crypto' ? 'text-green-600' : 'text-gray-400'
            }`} />
            <h3 className={`font-medium ${
              simulationType === 'crypto' ? 'text-green-600' : 'text-gray-700'
            }`}>
              Cripto
            </h3>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSimulationType('installments');
            setSelectedEntity('');
            setSelectedCrypto('');
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
            simulationType === 'installments'
              ? 'bg-orange-50 border-orange-200 shadow-sm'
              : 'bg-white border-gray-200 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Calculator size={24} className={`${
              simulationType === 'installments' ? 'text-orange-600' : 'text-gray-400'
            }`} />
            <h3 className={`font-medium ${
              simulationType === 'installments' ? 'text-orange-600' : 'text-gray-700'
            }`}>
              Cuotas vs Contado
            </h3>
          </div>
        </motion.button>
      </div>

      {/* Simulation Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        {/* Bloque para cuotas vs contado */}
        {simulationType === 'installments' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="cashPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Precio de contado
                  </label>
                  <input
                    type="number"
                    id="cashPrice"
                    value={cashPrice}
                    onChange={(e) => setCashPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ej: 100000"
                  />
                </div>
                <div>
                  <label htmlFor="installmentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Precio total en cuotas
                  </label>
                  <input
                    type="number"
                    id="installmentAmount"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ej: 10800"
                  />
                </div>
                <div>
                  <label htmlFor="installmentCount" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Cantidad de cuotas
                  </label>
                  <select
                    id="installmentCount"
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="" disabled>Seleccioná cantidad</option>
                    {[1, 2, 3, 4, 6, 9, 10, 12, 18, 24, 30, 32, 36].map((n) => (
                      <option key={n} value={n}>{n} CUOTAS</option>
                    ))}
                  </select>
                </div>
                {/* Inflación mensual estimada input */}
                <div>
                  <label htmlFor="inflationRate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Inflación mensual estimada
                    <span
                      title="Promedio mensual de inflación basado en los últimos 12 meses. Podés modificarlo si tenés una proyección distinta."
                      className="ml-1 cursor-help text-blue-500"
                    >
                      ℹ️
                    </span>
                    {monthlyInflation !== null && !isNaN(monthlyInflation) && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        (~{Math.floor((Math.pow(1 + (monthlyInflation / 100), 12) - 1) * 100)}% anual)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    id="inflationRate"
                    value={monthlyInflation ?? ''}
                    onChange={(e) => setMonthlyInflation(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.01"
                    placeholder="Ej: 2.8"
                  />
                </div>
                <button
                  onClick={calculateInstallmentComparison}
                  className="w-full py-2.5 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
                >
                  <Calculator size={18} className="mr-2" />
                  Comparar
                </button>
              </div>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-center text-red-700 dark:text-red-300">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {installmentResult && (
                  <>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-xl shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Total financiado:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {formatCurrency(installmentResult.totalFinanced)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">
                          Costo financiero total (CFT)
                          <span
                            title="El CFT refleja el encarecimiento total de las cuotas en base al precio de contado, anualizado para comparar con otras tasas."
                            className="ml-1 cursor-help text-blue-500"
                          >
                            ℹ️
                          </span>
                        </span>
                        <span className="font-medium text-orange-600">
                          {installmentResult.cft.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">¿Conviene en cuotas?</span>
                        <span className={`font-semibold ${installmentResult.suggestion === 'Sí' ? 'text-green-600' : 'text-red-600'}`}>
                          {installmentResult.suggestion}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Inflación estimada mensual:</span>
                        <span className="font-medium text-orange-700">
                          {installmentResult.inflationRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    {/* Ajuste por inflación */}
                    {installmentResult.adjustedInstallments && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Cuotas ajustadas por inflación acumulada</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm text-gray-600 dark:text-gray-400">
                          {installmentResult.adjustedInstallments.map((v, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                              Cuota #{i + 1}: ${v.toFixed(0)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Simulación alternativa */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-sm">
                          <p className="text-gray-700 dark:text-gray-200 font-medium mb-1">FCI (billetera promedio):</p>
                          <p className="text-blue-600 font-bold text-lg">{formatCurrency(installmentResult.fciProjection)}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-xl shadow-sm">
                          <p className="text-gray-700 dark:text-gray-200 font-medium mb-1">Plazo Fijo promedio:</p>
                          <p className="text-green-600 font-bold text-lg">{formatCurrency(installmentResult.pfProjection)}</p>
                        </div>
                      </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Monto a invertir
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="term" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Plazo (días)
                </label>
                <input
                  type="number"
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="30"
                />
              </div>
              <div>
                <label htmlFor="rate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tasa Nominal Anual (%)
                </label>
                <input
                  type="number"
                  id="rate"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={calculateResults}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Calculator size={18} className="mr-2" />
                Calcular
              </button>
            </div>
            {/* Results */}
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-center text-red-700 dark:text-red-300">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {result && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-xl shadow-sm">
                    <div className="flex items-center mb-2">
                      <Check size={18} className="text-green-600 mr-2" />
                      <h4 className="font-medium text-green-800 dark:text-green-300">Resultado de la simulación</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Monto final:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {formatCurrency(result.finalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">Interés ganado:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(result.interest)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300">TEA:</span>
                        <span className="font-medium text-blue-600">
                          {result.effectiveRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {simulationType === 'crypto' && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-xl shadow-sm">
                      <p className="text-sm text-yellow-700 dark:text-yellow-200">
                        Este cálculo no contempla variaciones del mercado. Los rendimientos en cripto pueden variar significativamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Available Rates */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-3">Tasas disponibles</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {simulationType === 'fixed' && (
                    <>
                      <label htmlFor="bankRateSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Seleccionar banco</label>
                      <select
                        id="bankRateSelect"
                        value={selectedEntity}
                        onChange={(e) => {
                          const selected = bankRates.find(rate => rate.entity === e.target.value);
                          if (selected) handleEntitySelect(selected.entity, selected.rate);
                        }}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="" disabled>Elegí un banco</option>
                        {bankRates.map((rate, index) => (
                          <option key={index} value={rate.entity}>
                            {rate.entity} ({rate.rate.toFixed(2)}% TNA)
                          </option>
                        ))}
                      </select>
                      {selectedEntity && (
                        <div className="flex items-center mt-3 space-x-2">
                          {(() => {
                            const r = (simulationType === 'fixed'
                              ? bankRates
                              : simulationType === 'wallet'
                              ? walletRates
                              : cryptoRates
                            ).find(r => r.entity === selectedEntity);
                            return (
                              <img
                                src={
                                  (simulationType === 'fixed'
                                    ? bankRates
                                    : simulationType === 'wallet'
                                    ? walletRates
                                    : cryptoRates
                                  ).find(r => r.entity === selectedEntity)?.logo || undefined
                                }
                                alt={selectedEntity}
                                className="w-6 h-6 object-contain"
                                style={{ display: r?.logo ? 'block' : 'none' }}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            );
                          })()}
                          <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{selectedEntity}</span>
                        </div>
                      )}
                    </>
                  )}
                  {simulationType === 'wallet' && (
                    <>
                      <label htmlFor="walletRateSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Seleccionar billetera virtual</label>
                      <select
                        id="walletRateSelect"
                        value={selectedEntity}
                        onChange={(e) => {
                          const selected = walletRates.find(rate => rate.entity === e.target.value);
                          if (selected) handleEntitySelect(selected.entity, selected.rate);
                        }}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      >
                        <option value="" disabled>Elegí una billetera</option>
                        {walletRates.map((rate, index) => (
                          <option key={index} value={rate.entity}>
                            {rate.entity} ({rate.rate.toFixed(2)}% TNA)
                          </option>
                        ))}
                      </select>
                      {selectedEntity && (
                        <div className="flex items-center mt-3 space-x-2">
                          {(() => {
                            const r = (simulationType === 'fixed'
                              ? bankRates
                              : simulationType === 'wallet'
                              ? walletRates
                              : cryptoRates
                            ).find(r => r.entity === selectedEntity);
                            return (
                              <img
                                src={
                                  (simulationType === 'fixed'
                                    ? bankRates
                                    : simulationType === 'wallet'
                                    ? walletRates
                                    : cryptoRates
                                  ).find(r => r.entity === selectedEntity)?.logo || undefined
                                }
                                alt={selectedEntity}
                                className="w-6 h-6 object-contain"
                                style={{ display: r?.logo ? 'block' : 'none' }}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            );
                          })()}
                          <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{selectedEntity}</span>
                        </div>
                      )}
                    </>
                  )}
                  {simulationType === 'crypto' && (
                    <>
                      <label htmlFor="cryptoSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Seleccionar criptomoneda
                      </label>
                      <select
                        id="cryptoSelect"
                        value={selectedCrypto}
                        onChange={(e) => {
                          setSelectedCrypto(e.target.value);
                          const filtered = cryptoRates.filter(rate => rate.entity.startsWith(e.target.value));
                          setAvailableCryptoPlatforms(filtered);
                          setSelectedEntity('');
                        }}
                        className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-4"
                      >
                        <option value="" disabled>Elegí una cripto</option>
                        {[...new Set(cryptoRates.map(rate => rate.entity.split(' ')[0]))]
                          .sort()
                          .map((crypto, index) => (
                            <option key={index} value={crypto}>
                              {crypto}
                            </option>
                        ))}
                      </select>
                      {selectedCrypto && (
                        <div className="flex items-center mt-3 space-x-2">
                          {(() => {
                            const r = (simulationType === 'crypto'
                              ? cryptoRates
                              : simulationType === 'wallet'
                              ? walletRates
                              : bankRates
                            ).find(r => r.entity.startsWith(selectedCrypto));
                            return (
                              <img
                                src={
                                  (simulationType === 'crypto'
                                    ? cryptoRates
                                    : simulationType === 'wallet'
                                    ? walletRates
                                    : bankRates
                                  ).find(r => r.entity.startsWith(selectedCrypto))?.logo || undefined
                                }
                                alt={selectedCrypto}
                                className="w-6 h-6 object-contain"
                                style={{ display: r?.logo ? 'block' : 'none' }}
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            );
                          })()}
                          <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{selectedCrypto}</span>
                        </div>
                      )}
                      {selectedCrypto && (
                        <>
                          <label htmlFor="platformSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Seleccionar plataforma
                          </label>
                          <select
                            id="platformSelect"
                            value={selectedEntity}
                            onChange={(e) => {
                              const selected = availableCryptoPlatforms.find(rate => rate.entity === e.target.value);
                              if (selected) handleEntitySelect(selected.entity, selected.rate);
                            }}
                            className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          >
                            <option value="" disabled>Elegí una plataforma</option>
                            {availableCryptoPlatforms.map((rate, index) => (
                              <option key={index} value={rate.entity}>
                                {rate.entity.split('(')[1]?.replace(')', '')} ({rate.rate.toFixed(2)}% APY)
                              </option>
                            ))}
                          </select>
                          {selectedEntity && (
                            <div className="flex items-center mt-3 space-x-2">
                              {(() => {
                                const r = (simulationType === 'crypto'
                                  ? cryptoRates
                                  : simulationType === 'wallet'
                                  ? walletRates
                                  : bankRates
                                ).find(r => r.entity === selectedEntity);
                                return (
                                  <img
                                    src={
                                      (simulationType === 'crypto'
                                        ? cryptoRates
                                        : simulationType === 'wallet'
                                        ? walletRates
                                        : bankRates
                                      ).find(r => r.entity === selectedEntity)?.logo || undefined
                                    }
                                    alt={selectedEntity}
                                    className="w-6 h-6 object-contain"
                                    style={{ display: r?.logo ? 'block' : 'none' }}
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                  />
                                );
                              })()}
                              <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{selectedEntity}</span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FinancialSimulator;