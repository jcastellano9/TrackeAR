// Herramientas para simular inversiones y cuotas

import React, { useState, useEffect } from 'react';
import { Combobox } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Calculator, Landmark, Wallet, Bitcoin, AlertCircle, Check, ChevronDown } from 'lucide-react';
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

// Simulator: Componente para simular inversiones y comparar cuotas vs contado
const Simulator: React.FC = () => {

  // useState: Estados para tipo de simulación, formularios, datos y resultados


  // Estado tipo de simulación
  const [simulationType, setSimulationType] = useState<'fixed' | 'wallet' | 'crypto' | 'installments'>('fixed');

  // Estados del formulario
  const [amount, setAmount] = useState<string>('');
  const [term, setTerm] = useState<string>('30');
  const [rate, setRate] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');

  // Estados de datos
  const [bankRates, setBankRates] = useState<Rate[]>([]);
  const [walletRates, setWalletRates] = useState<Rate[]>([]);
  const [cryptoRates, setCryptoRates] = useState<Rate[]>([]);
  // Estados de selección cripto
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [availableCryptoPlatforms, setAvailableCryptoPlatforms] = useState<Rate[]>([]);

  // Estado de búsqueda para Comboboxes
  const [bankQuery, setBankQuery] = useState('');
  const [walletQuery, setWalletQuery] = useState('');
  const [cryptoQuery, setCryptoQuery] = useState('');

  // Estado de resultados
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Estados de error y validación
  const [error, setError] = useState<string | null>(null);

  // Estados de Cuotas vs Contado
  const [cashPrice, setCashPrice] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  interface InstallmentResult {
    totalFinanced: number;
    cft: number;
    suggestion: 'Cuotas' | 'Contado';
    adjustedInstallments: number[];
    inflationRate: number;
    fciProjection: number;
    pfProjection: number;
  }
  const [installmentResult, setInstallmentResult] = useState<InstallmentResult | null>(null);
  const [monthlyInflation, setMonthlyInflation] = useState<number | null>(null);

  // Obtener tasas al montar el componente (integración real)
  useEffect(() => {

    const fetchRates = async () => {
      try {
        // Plazo fijo
        const fixedRes = await axios.get('https://api.comparatasas.ar/plazos-fijos');
        const fixedData = fixedRes.data.map((item: any) => ({
          entity: item.entidad,
          rate: item.tnaClientes ? parseFloat((item.tnaClientes * 100).toFixed(2)) : 0,
          type: 'Plazo Fijo',
          minimumAmount: null,
          logo: `https://icons.com.ar/logos/${item.entidad.toLowerCase().replace(/\s+/g, '-')}.svg`
        }));
        setBankRates(fixedData);

        // Cuentas remuneradas - combinación de API general y billeteras FCI
        const walletMap = new Map<string, Rate>();

        // Primero, cargamos desde la API general
        try {
          const generalRes = await axios.get('https://api.comparatasas.ar/cuentas-remuneradas');
          generalRes.data.forEach((item: any) => {
            walletMap.set(item.nombre, {
              entity: item.nombre,
              rate: item.tna,
              type: 'Cuenta Remunerada',
              minimumAmount: item.limite,
              logo: `https://icons.com.ar/logos/${item.nombre.toLowerCase().replace(/\s+/g, '-')}.svg`
            });
          });
        } catch (e) {
          console.error('Error al obtener cuentas remuneradas generales:', e);
        }

        // Luego, sobreescribimos (o sumamos) con las billeteras FCI dinámicas
        const fondos: { nombre: string; url: string; logo: string }[] = [
          {
            nombre: 'Prex',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Allaria%20Ahorro%20-%20Clase%20A',
            logo: 'https://icons.com.ar/logos/prex.svg'
          },
          {
            nombre: 'Cocos',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Cocos%20Daruma%20Renta%20Mixta%20-%20Clase%20A',
            logo: 'https://icons.com.ar/logos/cocos.svg'
          },
          {
            nombre: 'Personal Pay',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Delta%20Pesos%20-%20Clase%20X',
            logo: 'https://icons.com.ar/logos/personal-pay.svg'
          },
          {
            nombre: 'MercadoPago',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Mercado%20Fondo%20-%20Clase%20A',
            logo: 'https://icons.com.ar/logos/mercadopago.svg'
          },
          {
            nombre: 'LB Finanzas',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/ST%20Zero%20-%20Clase%20D',
            logo: 'https://icons.com.ar/logos/lb-finanzas.svg'
          },
          {
            nombre: 'AstroPay',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/ST%20Zero%20-%20Clase%20D',
            logo: 'https://icons.com.ar/logos/astropay.svg'
          },
          {
            nombre: 'Lemon',
            url: 'https://good-cafci.comparatasas.ar/v1/finanzas/fci/detalle/nombre/Fima%20Premium%20-%20Clase%20P',
            logo: 'https://icons.com.ar/logos/lemoncash.svg'
          },
        ];

        for (const fondo of fondos) {
          try {
            const res = await axios.get(fondo.url);
            const tna = res.data?.detalle?.rendimientos?.diario?.tna || 0;
            walletMap.set(fondo.nombre, {
              entity: fondo.nombre,
              rate: tna,
              type: 'Cuenta Remunerada',
              logo: fondo.logo
            });
          } catch (e) {
            console.error(`Error ${fondo.nombre}:`, e);
          }
        }

        const walletData = Array.from(walletMap.values());
        setWalletRates(walletData);

        // Cripto
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
        // setLoading(false);
      }
    };

    fetchRates();

    // Fetch inflación oficial del INDEC desde datos.gob.ar (último valor mensual disponible)
    const fetchInflation = async () => {
      try {
        const res = await axios.get(
          'https://apis.datos.gob.ar/series/api/series/?metadata=full&collapse=month&ids=103.1_I2N_2016_M_19&limit=5000&representation_mode=percent_change&start=0'
        );
        if (res.data?.data && Array.isArray(res.data.data)) {
          const lastRow = res.data.data[res.data.data.length - 1];
          const lastValue = lastRow[3] ?? lastRow[2] ?? lastRow[1]; // uso del valor más reciente disponible
          if (typeof lastValue === 'number') {
            setMonthlyInflation(parseFloat((lastValue * 100).toFixed(2))); // lo multiplicamos por 100 porque la API devuelve proporción
          }
        }
      } catch (e) {
        console.error('Error al obtener inflación oficial del INDEC:', e);
      }
    };
    fetchInflation();
  }, []);

  // handleEntitySelect: Guarda entidad y tasa seleccionada para cálculos
  // Manejar selección de entidad
  const handleEntitySelect = (entity: string, rate: number) => {
    setSelectedEntity(entity);
    setRate(rate.toString());
  };

  // calculateResults: Calcula monto final, interés y TEA según tipo de simulación
  // Calcular resultados de simulación
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
      finalAmount = principal * Math.pow(1 + (annualRate / 100) / 365, days);
      interest = finalAmount - principal;
      effectiveRate = (Math.pow(1 + (annualRate / 100) / 365, 365) - 1) * 100;
    } else {
      // Usar interés compuesto diario también para no-cripto
      finalAmount = principal * Math.pow(1 + (annualRate / 100) / 365, days);
      interest = finalAmount - principal;
      effectiveRate = (Math.pow(1 + (annualRate / 100) / 365, 365) - 1) * 100;
    }

    setResult({
      finalAmount,
      interest,
      effectiveRate
    });

    setError(null);
  };

  // formatCurrency: Formatea número como moneda ARS sin decimales
  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(value);
  };

  // calculateInstallmentComparison: Compara cuotas vs contado ajustado por inflación y calcula CFT, proyecciones FCI y PF
  // Cálculo de Cuotas vs Contado
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
    if (monthlyInflation === null || isNaN(monthlyInflation)) {
      setError('No se pudo obtener la inflación esperada del BCRA. Intentá más tarde.');
      return;
    }
    const inflationRate = monthlyInflation;
    const adjustedInstallments: number[] = [];
    let totalAdjusted = 0;
    for (let i = 0; i < count; i++) {
      const adjusted = installment / Math.pow(1 + inflationRate / 100, i + 1);
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
    // Nuevo cálculo usando tasa efectiva anual realista
    // Cálculo corregido: tasa mensual = (cuota / cuota ideal proporcional al contado) - 1
    const monthlyRate = Math.pow(totalFinanced / cash, 1 / count) - 1;
    if (monthlyRate <= -1) {
      setError('Los datos ingresados generan un CFT inválido. Verificá los montos.');
      return;
    }
    const cft = (Math.pow(1 + monthlyRate, 12) - 1) * 100;
    const suggestion = totalAdjusted < cash * 1.05 ? 'Cuotas' : 'Contado';

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

  // Render: UI del simulador con selección de tipo, formulario y resultados
  return (
    <div className="space-y-6">
      {/* Encabezado: Título e introducción del simulador */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Simulador</h1>
        <p className="text-gray-600 dark:text-gray-300">Calcula rendimientos y compara alternativas de inversión</p>
      </motion.div>

      {/* Selección de tipo de simulación: Plazo fijo, Billetera, Cripto y Cuotas vs Contado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSimulationType('fixed');
            setSelectedEntity('');
            setSelectedCrypto('');
            setAmount('');
            setTerm('30');
            setRate('');
            setResult(null);
            setInstallmentResult(null);
            setCashPrice('');
            setInstallmentAmount('');
            setInstallmentCount('');
            setError(null);
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
            setAmount('');
            setTerm('30');
            setRate('');
            setResult(null);
            setInstallmentResult(null);
            setCashPrice('');
            setInstallmentAmount('');
            setInstallmentCount('');
            setError(null);
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
            setAmount('');
            setTerm('30');
            setRate('');
            setResult(null);
            setInstallmentResult(null);
            setCashPrice('');
            setInstallmentAmount('');
            setInstallmentCount('');
            setError(null);
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
            simulationType === 'crypto'
              ? 'bg-orange-50 border-orange-200 shadow-sm'
              : 'bg-white border-gray-200 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Bitcoin size={24} className={`${
              simulationType === 'crypto' ? 'text-orange-600' : 'text-gray-400'
            }`} />
            <h3 className={`font-medium ${
              simulationType === 'crypto' ? 'text-orange-600' : 'text-gray-700'
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
            setAmount('');
            setTerm('30');
            setRate('');
            setResult(null);
            setInstallmentResult(null);
            setCashPrice('');
            setInstallmentAmount('');
            setInstallmentCount('');
            setError(null);
          }}
          className={`p-4 rounded-xl border transition-all flex items-center justify-center ${
            simulationType === 'installments'
              ? 'bg-yellow-50 border-yellow-200 shadow-sm'
              : 'bg-white border-gray-200 hover:border-yellow-200'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Calculator size={24} className={`${simulationType === 'installments' ? 'text-yellow-600' : 'text-gray-400'}`} />
            <h3 className={`font-medium ${simulationType === 'installments' ? 'text-yellow-600' : 'text-gray-700'}`}>
              Cuotas vs Contado
            </h3>
          </div>
        </motion.button>
      </div>

      {/* Formulario de simulación según el tipo seleccionado */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        {/* Bloque Cuotas vs Contado: inputs de precio contado, cuotas e inflación y resultados */}
        {simulationType === 'installments' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="space-y-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-md">
                <div>
                  <label htmlFor="cashPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Precio de contado
                  </label>
                  <input
                    type="number"
                    id="cashPrice"
                    value={cashPrice}
                    onChange={(e) => setCashPrice(e.target.value)}
                    className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ej: 120000"
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
                    className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    {monthlyInflation !== null && !isNaN(monthlyInflation) && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        (~{((Math.pow(1 + (monthlyInflation / 100), 12) - 1) * 100).toFixed(2)}% anual)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    id="inflationRate"
                    value={monthlyInflation !== null ? monthlyInflation.toString() : ''}
                    onChange={(e) => setMonthlyInflation(parseFloat(e.target.value))}
                    className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    step="0.01"
                    placeholder="Ej: 2.8"
                  />
                </div>
                <button
                  onClick={calculateInstallmentComparison}
                  className="w-full py-2.5 px-5 text-base font-semibold bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center"
                >
                  <Calculator size={18} className="mr-2" />
                  Comparar
                </button>
                {installmentResult && (
                  <div className={`mt-6 p-4 rounded-lg text-sm text-left font-medium ${
                    installmentResult.suggestion === 'Cuotas'
                      ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-600'
                      : 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-600'
                  }`}>
                    <p className="font-semibold mb-1">
                      Recomendación: {installmentResult.suggestion === 'Cuotas' ? '💳 Cuotas' : '💵 Contado'}
                    </p>
                    <p className="text-sm">
                      {installmentResult.suggestion === 'Cuotas'
                        ? 'La suma de las cuotas ajustadas por inflación es menor al valor de contado.'
                        : 'El valor actualizado de las cuotas es mayor al precio de contado considerando la inflación estimada.'}
                    </p>
                    {monthlyInflation !== null && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Inflación mensual esperada según BCRA: {monthlyInflation.toFixed(2)}% (~{((Math.pow(1 + (monthlyInflation / 100), 12) - 1) * 100).toFixed(2)}% anual)
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-md h-full">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-center text-red-700 dark:text-red-300">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {installmentResult && (
                  <>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-600 rounded-xl shadow-sm space-y-4">
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 uppercase tracking-wide mb-1">
                        Análisis de cuotas
                      </p>
                      {/* Cuotas ajustadas por inflación acumulada - PRIMERO */}
                      {installmentResult.adjustedInstallments && (
                        <div className="mb-4">
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
                      {/* Total financiado */}
                      <div className="flex justify-between items-center border-b border-yellow-100 dark:border-yellow-600 pb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Total financiado:</span>
                        <span className="font-semibold text-yellow-800 dark:text-yellow-400 text-sm">
                          {formatCurrency(installmentResult.totalFinanced)}
                        </span>
                      </div>
                      {/* CFT anual efectivo */}
                      <div className="flex justify-between items-center border-b border-yellow-100 dark:border-yellow-600 pb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Costo Financiero Total (CFT anual efectivo)
                        </span>
                        <span className="font-semibold text-yellow-600 text-sm">
                          {installmentResult.cft.toFixed(2)}%
                        </span>
                      </div>
                      {/* Explicación CFT */}
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        El CFT anual efectivo refleja el costo total del financiamiento. Se calcula como la tasa anual compuesta que iguala el valor de las cuotas al precio contado. Si da negativo o 0%, puede deberse a montos inconsistentes.
                      </div>
                      {/* Inflación mensual estimada */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Inflación mensual estimada:</span>
                        <span className="font-medium text-yellow-700 text-sm">
                          {installmentResult.inflationRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    {/* Simulación alternativa */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-xl shadow-sm">
                        <p className="text-gray-700 dark:text-gray-200 font-medium mb-1">FCI (billetera promedio):</p>
                        <p className="text-blue-600 font-bold text-lg">{formatCurrency(installmentResult.fciProjection)}</p>
                        <p className="text-xs text-blue-600 mt-1">TNA estimada: {walletRates.length
                          ? (walletRates.reduce((sum, r) => sum + r.rate, 0) / walletRates.length).toFixed(2)
                          : '30.00'}%</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-xl shadow-sm">
                        <p className="text-gray-700 dark:text-gray-200 font-medium mb-1">Plazo Fijo promedio:</p>
                        <p className="text-green-600 font-bold text-lg">{formatCurrency(installmentResult.pfProjection)}</p>
                        <p className="text-xs text-green-600 mt-1">TNA estimada: {bankRates.length
                          ? (bankRates.reduce((sum, r) => sum + r.rate, 0) / bankRates.length).toFixed(2)
                          : '35.00'}%</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      <p><strong>¿Qué es FCI?</strong> Fondo Común de Inversión, como las cuentas remuneradas (ej: MercadoPago), donde el dinero genera intereses diarios y se puede retirar en cualquier momento.</p>
                      <p className="mt-2"><strong>¿Qué es un Plazo Fijo?</strong> Es una inversión bancaria en la que el dinero queda inmovilizado por un período (ej: 30 días), y se cobra el interés al final del plazo.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Bloque de simulación estándar: inputs de monto, plazo, tasa o selección cripto */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start self-start">
            {/* Input Fields */}
            <div className="space-y-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-md">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {simulationType === 'crypto'
                    ? 'Cantidad de activos a invertir'
                    : 'Monto a invertir'}
                </label>
                <div className="relative">
                  {simulationType !== 'crypto' ? (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                  ) : selectedCrypto ? (
                    <>
                      <img
                        src={cryptoRates.find(r => r.entity.startsWith(selectedCrypto))?.logo}
                        alt={selectedCrypto}
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{selectedCrypto}</span>
                    </>
                  ) : (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{selectedCrypto || 'Ξ'}</span>
                  )}
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full ${simulationType === 'crypto' ? 'pl-20' : 'pl-8'} pr-3 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="term" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Plazo (días)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[30, 90, 180, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTerm(d.toString())}
                    className="px-4 py-2 text-base rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {d === 365 ? '1 año' : `${d} días`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="30"
                />
              </div>
              {/* Sección Tasas disponibles para Plazo Fijo y Billetera usando Combobox */}
              {simulationType !== 'crypto' && (
                <div>
                  <label htmlFor="rate" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Tasa Nominal Anual (%)
                  </label>
                  <input
                    type="number"
                    id="rate"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              )}
              {/* Sección Crypto: selección de criptomoneda y plataforma con Combobox */}
              {simulationType === 'crypto' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-xl shadow-sm">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    Este cálculo no contempla variaciones del mercado. Los rendimientos en cripto pueden variar significativamente.
                  </p>
                </div>
              )}
              <button
                onClick={calculateResults}
                className={`w-full py-2.5 px-5 text-base font-semibold ${
                  simulationType === 'crypto'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : simulationType === 'wallet'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white rounded-lg transition-colors flex items-center justify-center`}
              >
                <Calculator size={18} className="mr-2" />
                Calcular
              </button>
            </div>
            {/* Results */}
            <div className={`space-y-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-md transition-all duration-300 ${
              result ? 'h-full' : ''
            }`}>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg flex items-center text-red-700 dark:text-red-300">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {/* Available Rates */}
              {simulationType !== 'crypto' && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Tasas disponibles</h4>
                  <div className="space-y-2 max-h-60 overflow-visible">
                    {simulationType === 'fixed' && (
                      <>
                        <label htmlFor="bankRateSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Buscar banco</label>
                        <Combobox value={selectedEntity} onChange={(value) => {
                          const sel = bankRates.find(r => r.entity === value);
                          if (sel) handleEntitySelect(sel.entity, sel.rate);
                        }}>
                          <div className="relative">
                            <Combobox.Input
                              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Escribe para buscar..."
                              onChange={(e) => setBankQuery(e.target.value)}
                            />
                            <Combobox.Button className="absolute inset-y-0 right-2 flex items-center">
                              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            </Combobox.Button>
                            <Combobox.Options className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                              {bankRates
                                .sort((a, b) => b.rate - a.rate)
                                .filter(r => r.entity.toLowerCase().includes(bankQuery.toLowerCase()))
                                .map((rate) => (
                                  <Combobox.Option
                                    key={rate.entity}
                                    value={rate.entity}
                                    className={({ active }) =>
                                      `cursor-pointer select-none p-2 ${active ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`
                                    }
                                  >
                                    {rate.entity} ({rate.rate.toFixed(2)}% TNA)
                                  </Combobox.Option>
                              ))}
                            </Combobox.Options>
                          </div>
                        </Combobox>
                        {selectedEntity && (
                          <div className="flex items-center mt-3 space-x-2">
                            <img
                              src={bankRates.find(r => r.entity === selectedEntity)?.logo}
                              alt={selectedEntity}
                              className="w-6 h-6 object-contain"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </>
                    )}
                    {simulationType === 'wallet' && (
                      <>
                        <label htmlFor="walletRateSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Buscar billetera virtual</label>
                        <Combobox value={selectedEntity} onChange={(value) => {
                          const sel = walletRates.find(r => r.entity === value);
                          if (sel) handleEntitySelect(sel.entity, sel.rate);
                        }}>
                          <div className="relative">
                            <Combobox.Input
                              className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Escribe para buscar..."
                              onChange={(e) => setWalletQuery(e.target.value)}
                            />
                            <Combobox.Button className="absolute inset-y-0 right-2 flex items-center">
                              <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            </Combobox.Button>
                            <Combobox.Options className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                              {walletRates
                                .sort((a, b) => b.rate - a.rate)
                                .filter(r => r.entity.toLowerCase().includes(walletQuery.toLowerCase()))
                                .map((rate) => (
                                  <Combobox.Option
                                    key={rate.entity}
                                    value={rate.entity}
                                    className={({ active }) =>
                                      `cursor-pointer select-none p-2 ${active ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`
                                    }
                                  >
                                    {rate.entity} ({rate.rate.toFixed(2)}% TNA)
                                  </Combobox.Option>
                              ))}
                            </Combobox.Options>
                          </div>
                        </Combobox>
                        {selectedEntity && (
                          <div className="flex items-center mt-3 space-x-2">
                            <img
                              src={walletRates.find(r => r.entity === selectedEntity)?.logo}
                              alt={selectedEntity}
                              className="w-6 h-6 object-contain"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* Crypto selectors moved to right column */}
              {simulationType === 'crypto' && (
                <div className="space-y-3 overflow-visible">
                  <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-1">Tasas disponibles</h4>
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
                      setResult(null);
                      setError(null);
                    }}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-1"
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
                    <div className="flex items-center space-x-2">
                      <img
                        src={cryptoRates.find(r => r.entity.startsWith(selectedCrypto))?.logo}
                        alt={selectedCrypto}
                        className="w-6 h-6 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  {selectedCrypto && (
                    <>
                      <label htmlFor="platformSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Seleccionar plataforma
                      </label>
                      <Combobox value={selectedEntity} onChange={(value) => {
                        const sel = availableCryptoPlatforms.find(r => r.entity === value);
                        if (sel) handleEntitySelect(sel.entity, sel.rate);
                      }}>
                        <div className="relative">
                          <Combobox.Input
                            className="w-full p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Escribe para buscar..."
                            onChange={(e) => setCryptoQuery(e.target.value)}
                          />
                          <Combobox.Button className="absolute inset-y-0 right-2 flex items-center">
                            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          </Combobox.Button>
                          <Combobox.Options className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto shadow-lg">
                            {availableCryptoPlatforms
                              .sort((a, b) => b.rate - a.rate)
                              .filter(r => {
                                // Search on platform name inside parentheses or full entity
                                const match = r.entity.split('(')[1]?.replace(')', '').toLowerCase() || '';
                                return (
                                  r.entity.toLowerCase().includes(cryptoQuery.toLowerCase()) ||
                                  match.includes(cryptoQuery.toLowerCase())
                                );
                              })
                              .map((rate) => (
                                <Combobox.Option
                                  key={rate.entity}
                                  value={rate.entity}
                                  className={({ active }) =>
                                    `cursor-pointer select-none p-2 ${active ? 'bg-orange-100 dark:bg-orange-900/30' : ''}`
                                  }
                                >
                                  {rate.entity.split('(')[1]?.replace(')', '') || rate.entity} ({rate.rate.toFixed(2)}% APY)
                                </Combobox.Option>
                            ))}
                          </Combobox.Options>
                        </div>
                      </Combobox>
                      {selectedEntity && (
                        <div className="flex items-center space-x-2">
                          <img
                            src={cryptoRates.find(r => r.entity === selectedEntity)?.logo}
                            alt={selectedEntity}
                            className="w-6 h-6 object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          {selectedEntity && !selectedEntity.includes('(') && (
                            <span className="text-sm text-gray-700 dark:text-gray-100 truncate">{selectedEntity}</span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {/* Resultados: muestra monto final, interés ganado, TEA y explicaciones según tipo */}
              {result && (
                <div className="space-y-4 mt-6">
                  <div className="mb-2 flex items-center">
                    <Check size={18} className="text-green-600 mr-2" />
                    <h4 className="text-green-700 dark:text-green-300 font-semibold text-base">Resultado de la simulación</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        {simulationType === 'crypto'
                          ? 'Cantidad final de activos'
                          : 'Monto final'}
                      </p>
                      {simulationType === 'crypto' ? (
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {result.finalAmount.toFixed(6)} {selectedCrypto}
                        </p>
                      ) : (
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(result.finalAmount)}</p>
                      )}
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">Interés ganado</p>
                      <p className="text-lg font-bold text-green-600">
                        {simulationType === 'crypto'
                          ? `${result.interest.toFixed(8)} ${selectedCrypto}`
                          : formatCurrency(result.interest)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center shadow-sm border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-300 mb-1">TEA</p>
                      <p className={`text-lg font-bold ${
                        simulationType === 'crypto'
                          ? 'text-orange-500'
                          : simulationType === 'wallet'
                          ? 'text-purple-600'
                          : 'text-blue-600'
                      }`}>
                        {result.effectiveRate.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  {simulationType === 'fixed' && (
                    <div className="mt-4 p-3 rounded-lg border text-sm bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200">
                      Este cálculo utiliza <strong>interés compuesto diario</strong> para estimar el rendimiento. En la práctica, los plazos fijos suelen capitalizar mensualmente. La <strong>TNA puede variar</strong> según el banco, condiciones de cliente o decisiones del BCRA.
                    </div>
                  )}
                    {simulationType === 'wallet' && (
                    <div className="mt-4 p-3 rounded-lg border text-sm bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200">
                      Las billeteras virtuales remuneradas suelen liquidar rendimientos diarios. Este simulador utiliza <strong>interés compuesto diario</strong> sobre la TNA publicada por cada plataforma.
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Simulator;
