import { useState, useEffect, useMemo } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

// Define or import Investment interface as needed
interface Investment {
  id: string;
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  allocation: number;
  purchasePrice: number;
  purchaseDate: string;
  currency: 'USD' | 'ARS';
  isFavorite?: boolean;
}



interface PredefinedAsset {
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  logo?: string;
  price: number;
  id?: string;
}

export function usePortfolioData() {
  // Chequea si el precio es un número válido y en un rango razonable
  function isValidPrice(price: number) {
    return typeof price === "number" && isFinite(price) && price > 0 && price < 10000000;
  }
  const supabase = useSupabase();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Precio CCL para conversiones ARS<->USD
  const [cclPrice, setCclPrice] = useState<number | null>(null);

  // Activos precargados: Cripto, CEDEAR, Acciones
  const [predefinedAssets, setPredefinedAssets] = useState<PredefinedAsset[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    let isMounted = true;

    if (!user?.id) {
      if (isMounted) setLoading(false);
      return;
    }

    const fetchInvestments = async () => {
      try {
        const { data, error } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          setError(error.message);
          setSuccess(null);
          throw error;
        }

        // Normalizar tipo a 'Cripto' | 'Acción' | 'CEDEAR'
        const typeMap: Record<string, 'Cripto' | 'Acción' | 'CEDEAR'> = {
          cripto: 'Cripto',
          acción: 'Acción',
          accion: 'Acción',
          cedear: 'CEDEAR',
        };

        const mapped: Investment[] = (data as any[]).map(inv => {
          // quitar diacríticos y pasar a minúsculas
          const rawType = inv.type?.toString() ?? '';
          const normalizedKey = rawType
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          const type = typeMap[normalizedKey] || 'Cripto';
          return {
            id: inv.id,
            ticker: inv.ticker,
            name: inv.name,
            type,
            quantity: inv.quantity,
            allocation: inv.allocation ?? 0,
            purchasePrice: inv.purchase_price ?? inv.purchasePrice,
            purchaseDate: inv.purchase_date ?? inv.purchaseDate,
            currency: inv.currency,
            isFavorite: inv.is_favorite ?? inv.isFavorite,
          };
        });

        if (isMounted) {
          setInvestments(mapped);
        }
      } catch (err) {
        console.error('Error al traer inversiones:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setSuccess(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInvestments();

    return () => {
      isMounted = false;
    };
  }, [supabase, user]);

  // Fetch CCL price
  useEffect(() => {
    const fetchCCL = async () => {
      try {
        const res = await fetch('https://dolarapi.com/v1/dolares');
        const data = await res.json();
        const ccl = data.find((d: any) => d.casa === 'contadoconliqui');
        if (ccl && ccl.venta) setCclPrice(Number(ccl.venta));
      } catch (err) {
        console.error('No se pudo obtener el precio CCL.', err);
      }
    };
    fetchCCL();
  }, []);

  // Fetch predefined assets (criptos, CEDEARs y acciones)
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        // Criptos
        const cryptoRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd');
        const cryptoData = await cryptoRes.json();
        const formattedAssets: PredefinedAsset[] = cryptoData.map((coin: any) => ({
          ticker: coin.symbol.toUpperCase(),
          name: coin.name,
          type: 'Cripto',
          logo: coin.image,
          price: coin.current_price,
          id: coin.id,
        }));
        // CEDEARs
        const cedearRes = await fetch('https://api.cedears.ar/cedears');
        const cedearData = await cedearRes.json();
        const cedears: PredefinedAsset[] = cedearData.map((item: any) => ({
          ticker: item.ticker,
          name: item.name,
          type: 'CEDEAR',
          logo: item.icon,
          price: item.ars?.c,
        }));
        // Acciones
        const accionesRes = await fetch('https://api.cedears.ar/acciones');
        const accionesData = await accionesRes.json();
        const acciones: PredefinedAsset[] = accionesData.map((item: any) => ({
          ticker: item.ticker,
          name: item.name,
          type: 'Acción',
          logo: item.icon,
          price: item.ars?.c,
        }));
        setPredefinedAssets([...formattedAssets, ...cedears, ...acciones]);
        // Market prices lookup
        const prices: Record<string, number> = {};
        [...formattedAssets, ...cedears, ...acciones].forEach(a => {
          prices[a.type + '-' + a.ticker] = isValidPrice(a.price) ? a.price : undefined;
        });
        setMarketPrices(prices);
      } catch (error) {
        console.error('Error fetching assets', error);
      }
    };
    fetchAssets();
  }, []);

  // Mapa rápido para lookup por tipo+ticker
  const assetMap = useMemo(() => {
    const m = new Map<string, PredefinedAsset>();
    predefinedAssets.forEach(asset => {
      m.set(asset.type + '-' + asset.ticker.toUpperCase(), asset);
    });
    return m;
  }, [predefinedAssets]);

  // Normaliza tipo y quita tildes
  const normalizeType = (type: string) =>
    type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Funciones helper expuestas
  const getAssetKey = (inv: Investment) =>
    inv.type + '-' + inv.ticker.toUpperCase();

  const getNormalizedPpcKey = (inv: Investment) => {
    const norm = normalizeType(inv.type);
    return inv.ticker.toUpperCase() + '-' + norm;
  };

  const totalQuantity = useMemo(
    () => investments.reduce((sum, inv) => sum + inv.quantity, 0),
    [investments]
  );

  // Refrescar la lista de inversiones
  const reloadInvestments = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
        setSuccess(null);
        throw error;
      }

      // Normalizar tipo a 'Cripto' | 'Acción' | 'CEDEAR'
      const typeMap: Record<string, 'Cripto' | 'Acción' | 'CEDEAR'> = {
        cripto: 'Cripto',
        acción: 'Acción',
        accion: 'Acción',
        cedear: 'CEDEAR',
      };

      // Mapear tal cual lo haces en el fetch inicial
      const mapped: Investment[] = (data as any[]).map(inv => {
        const rawType = inv.type?.toString() ?? '';
        const normalizedKey = rawType
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const type = typeMap[normalizedKey] || 'Cripto';
        return {
          id: inv.id,
          ticker: inv.ticker,
          name: inv.name,
          type,
          quantity: inv.quantity,
          allocation: inv.allocation ?? 0,
          purchasePrice: inv.purchase_price ?? inv.purchasePrice,
          purchaseDate: inv.purchase_date ?? inv.purchaseDate,
          currency: inv.currency,
          isFavorite: inv.is_favorite ?? inv.isFavorite,
        };
      });

      setInvestments(mapped);
    } catch (err) {
      console.error('Error recargando inversiones:', err);
      setError(err instanceof Error ? err.message : String(err));
      setSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  // Crear
  async function addInvestment(inv: Omit<Investment, 'id' | 'isFavorite'>) {
    if (!user?.id) throw new Error('No autenticado');
    const formattedDate = new Date(inv.purchaseDate).toISOString().split('T')[0];
    const { data, error } = await supabase.from('investments').insert([{
      user_id: user.id,
      ticker: inv.ticker,
      name: inv.name,
      type: inv.type,
      quantity: inv.quantity,
      purchase_price: inv.purchasePrice,
      purchase_date: formattedDate,
      currency: inv.currency,
      is_favorite: false,
    }]).select('*').single();
    if (error) {
      setError(error.message);
      setSuccess(null);
      throw error;
    }
    setSuccess('Inversión agregada');
    setError(null);
    // Agregar al array de investments directamente, sin recargar todo
    const newInvestment: Investment = {
      id: data?.id || Date.now().toString(), // ID real o temporal
      ticker: inv.ticker,
      name: inv.name,
      type: inv.type,
      quantity: inv.quantity,
      allocation: 0,
      purchasePrice: inv.purchasePrice,
      purchaseDate: inv.purchaseDate,
      currency: inv.currency,
      isFavorite: false,
    };
    setInvestments(prev => [newInvestment, ...prev]);
  }

  // Actualizar
  async function updateInvestment(id: string, inv: Partial<Omit<Investment, 'id'>>) {
    if (!user?.id) throw new Error('No autenticado');
    // Construimos el objeto updates solo con columnas válidas en la BD (snake_case)
    const updates: any = {};

    if (inv.ticker !== undefined) updates.ticker = inv.ticker;
    if (inv.name !== undefined) updates.name = inv.name;
    if (inv.type !== undefined) updates.type = inv.type;
    if (inv.quantity !== undefined) updates.quantity = inv.quantity;
    if (inv.allocation !== undefined) updates.allocation = inv.allocation;

    if (inv.purchaseDate !== undefined) {
      updates.purchase_date = new Date(inv.purchaseDate)
        .toISOString()
        .split('T')[0];
    }

    if (inv.purchasePrice !== undefined)
      updates.purchase_price = inv.purchasePrice;

    if (inv.currency !== undefined) updates.currency = inv.currency;

    if (inv.isFavorite !== undefined) updates.is_favorite = inv.isFavorite;

    const { error } = await supabase
      .from('investments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      setError(error.message);
      setSuccess(null);
      throw error;
    }
    await reloadInvestments();
    setSuccess('Inversión actualizada');
    setError(null);
  }

  // Borrar
  async function deleteInvestment(id: string) {
    if (!user?.id) throw new Error('No autenticado');
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      setError(error.message);
      setSuccess(null);
      throw error;
    }
    await reloadInvestments();
    setSuccess('Inversión eliminada');
    setError(null);
  }

  // Toggle favorito
  async function toggleFavorite(id: string) {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;

    const newStatus = !inv.isFavorite;

    // 1. Optimistic update en memoria (sin recargar la lista completa)
    setInvestments(prev =>
      prev.map(i =>
        i.id === id ? { ...i, isFavorite: newStatus } : i
      )
    );

    // 2. Persistir en Supabase usando snake_case
    const { error } = await supabase
      .from('investments')
      .update({ is_favorite: newStatus })
      .eq('id', id)
      .eq('user_id', user?.id ?? '');

    if (error) {
      // Revertir en caso de fallo
      setInvestments(prev =>
        prev.map(i =>
          i.id === id ? { ...i, isFavorite: inv.isFavorite } : i
        )
      );
      console.error('Error al togglear favorito:', error);
      setError(error.message);
    }
  }

  // Handler for asset selection with immediate purchasePrice calculation
  function handleAssetSelect(asset: PredefinedAsset, setNewInvestment: Function, setCurrentPrice: Function) {
    const price = asset.price;
    setCurrentPrice(price);

    const currency = asset.type === 'Cripto' ? 'USD' : 'ARS';
    let adjustedPrice = price;
    if (asset.type === 'Cripto') {
      if (currency === 'ARS' && cclPrice) {
        adjustedPrice = parseFloat((price * cclPrice).toFixed(2));
      }
    } else {
      if (currency === 'USD' && cclPrice) {
        adjustedPrice = parseFloat((price / cclPrice).toFixed(2));
      }
    }

    setNewInvestment((prev: any) => ({
      ...prev,
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      currency: currency,
      purchasePrice: adjustedPrice,
    }));
  }

  function exportToCSV() {
    if (!investments.length) return;

    const headers = ['Ticker', 'Nombre', 'Tipo', 'Cantidad', 'Precio Compra', 'Fecha', 'Moneda'];
    const rows = investments.map(inv => [
      inv.ticker,
      inv.name,
      inv.type,
      inv.quantity,
      inv.purchasePrice,
      inv.purchaseDate,
      inv.currency,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const fileName = `inversiones_${now.toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const resumenGlobalTotal = useMemo(() => {
    let totalARS = { valorActual: 0, invertido: 0, cambioTotal: 0 };
    investments.forEach(inv => {
      const key = inv.type + '-' + inv.ticker.toUpperCase();
      const currentPrice = isValidPrice(marketPrices[key]) ? marketPrices[key] : inv.purchasePrice;
      let priceARS = currentPrice;
      let ppcARS = inv.purchasePrice;
      if (inv.type === 'Cripto') {
        if (cclPrice) {
          priceARS = currentPrice * cclPrice;
          ppcARS = inv.purchasePrice * cclPrice;
        }
      } else {
        if (inv.currency === 'USD' && cclPrice) {
          priceARS = currentPrice * cclPrice;
          ppcARS = inv.purchasePrice * cclPrice;
        }
      }
      const diff = priceARS - ppcARS;
      totalARS = {
        valorActual: totalARS.valorActual + priceARS * inv.quantity,
        invertido: totalARS.invertido + ppcARS * inv.quantity,
        cambioTotal: totalARS.cambioTotal + diff * inv.quantity,
      };
    });

    // --- NUEVO: convertir todo a USD si hay CCL ---
    const toUSD = (ars: number) => cclPrice ? ars / cclPrice : ars;

    return {
      ...totalARS,
      valorActualUSD: toUSD(totalARS.valorActual),
      invertidoUSD: toUSD(totalARS.invertido),
      cambioTotalUSD: toUSD(totalARS.cambioTotal),
      porcentajeTotal: totalARS.invertido > 0 ? (totalARS.cambioTotal / totalARS.invertido) * 100 : 0,
      porcentajeTotalUSD: totalARS.invertido > 0 ? (totalARS.cambioTotal / totalARS.invertido) * 100 : 0,
    };
  }, [investments, marketPrices, cclPrice]);

  // --- RESUMEN POR TIPO (sin filtrar: total por Cripto, CEDEAR y Acción en ARS) ---
  const resumenPorTipo = useMemo(() => {
    const totals: Record<'Cripto' | 'CEDEAR' | 'Acción', number> = {
      Cripto: 0,
      CEDEAR: 0,
      Acción: 0,
    };
    investments.forEach(inv => {
      const key = inv.type + '-' + inv.ticker.toUpperCase();
      const currentPrice = isValidPrice(marketPrices[key]) ? marketPrices[key] : inv.purchasePrice;
      // Convertir todo a ARS usando la misma lógica que en resumenGlobalTotal
      let priceARS = currentPrice;
      if (inv.type === 'Cripto') {
        if (cclPrice) priceARS = currentPrice * cclPrice;
      } else {
        if (inv.currency === 'USD' && cclPrice) priceARS = currentPrice * cclPrice;
      }
      totals[inv.type] += priceARS * inv.quantity;
    });
    return totals;
  }, [investments, marketPrices, cclPrice]);
  // --- PROMEDIO PONDERADO DE PRECIO DE COMPRA (PPC) POR ACTIVO ---
  /**
   * Calcula el PPC promedio ponderado (en la moneda original de compra) de cada activo
   * Retorna un objeto ppcMap: key = TICKER-tipo normalizado, value = ppc ponderado
   */
  const ppcMap: Record<string, number> = useMemo(() => {
    const map: Record<string, { totalQty: number; totalCost: number }> = {};
    investments.forEach(inv => {
      const normalizedType = typeof inv.type === 'string'
        ? inv.type.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        : inv.type;
      const key = inv.ticker.toUpperCase() + '-' + normalizedType;
      if (!map[key]) {
        map[key] = { totalQty: 0, totalCost: 0 };
      }
      map[key].totalQty += inv.quantity;
      map[key].totalCost += inv.purchasePrice * inv.quantity;
    });
    const result: Record<string, number> = {};
    Object.keys(map).forEach(key => {
      result[key] = map[key].totalQty > 0 ? map[key].totalCost / map[key].totalQty : 0;
    });
    return result;
  }, [investments]);

  // --- RESUMEN GLOBAL FILTRADO ---
  /**
   * Calcula el resumen global (valorActual, invertido, cambioTotal) sobre un array de inversiones filtradas y agrupadas,
   * usando el mapa de PPC, precios de mercado, flags de merge y ARS/USD, y precio CCL.
   */
  function getResumenGlobalFiltrado({
    inversiones,
    ppcMap,
    marketPrices,
    mergeTransactions,
    showInARS,
    cclPrice,
  }: {
    inversiones: Investment[],
    ppcMap: Record<string, number>,
    marketPrices: Record<string, number>,
    mergeTransactions: boolean,
    showInARS: boolean,
    cclPrice: number | null,
  }) {
    return inversiones.reduce(
      (acc, inv) => {
        const key = inv.type + '-' + inv.ticker.toUpperCase();
        const ppcKey = inv.ticker.toUpperCase() + '-' + (
          typeof inv.type === 'string'
            ? inv.type.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            : inv.type
        );
        const currentPrice = isValidPrice(marketPrices[key]) ? marketPrices[key] : inv.purchasePrice;
        const isMerged = mergeTransactions;
        const priceOfPurchase = isMerged
          ? ppcMap[ppcKey] ?? inv.purchasePrice
          : inv.purchasePrice;
        let priceUnit = currentPrice;
        let ppcUnit = priceOfPurchase;
        if (inv.type === 'Cripto') {
          if (showInARS && cclPrice) {
            priceUnit = currentPrice * cclPrice;
            ppcUnit = ppcUnit * cclPrice;
          }
        } else if (inv.type === 'Acción' || inv.type === 'CEDEAR') {
          if (inv.currency === 'USD' && showInARS && cclPrice) {
            ppcUnit = ppcUnit * cclPrice;
          } else if (inv.currency === 'ARS' && !showInARS && cclPrice) {
            priceUnit = priceUnit / cclPrice;
            ppcUnit = ppcUnit / cclPrice;
          } else if (inv.currency === 'USD' && !showInARS && cclPrice) {
            priceUnit = priceUnit / cclPrice;
          }
        }
        const differencePerUnit = priceUnit - ppcUnit;
        const valorActual = priceUnit * inv.quantity;
        const cambioAbsoluto = differencePerUnit * inv.quantity;
        return {
          valorActual: acc.valorActual + valorActual,
          cambioTotal: acc.cambioTotal + cambioAbsoluto,
          invertido: acc.invertido + ppcUnit * inv.quantity,
        };
      },
      { valorActual: 0, cambioTotal: 0, invertido: 0 }
    );
  }

  /**
   * Devuelve las inversiones filtradas por tipo y búsqueda, y agrupadas por ticker-tipo si merge está activo.
   * @param params
   *  - typeFilter: 'Todos' | 'CEDEAR' | 'Cripto' | 'Acción'
   *  - merge: boolean
   *  - search: string
   */
  function getDisplayedInvestments({
                                     typeFilter = 'Todos',
                                     merge = true,
                                     search = ''
                                   }: {
    typeFilter: 'Todos' | 'CEDEAR' | 'Cripto' | 'Acción',
    merge: boolean,
    search: string
  }) {
    // Filtro por tipo y búsqueda
    const filtered = investments.filter(inv =>
        inv.ticker &&
        !isNaN(inv.purchasePrice) &&
        !isNaN(inv.quantity) &&
        (typeFilter === 'Todos' || inv.type === typeFilter) &&
        (
            inv.ticker.toLowerCase().includes(search.toLowerCase()) ||
            inv.name.toLowerCase().includes(search.toLowerCase())
        )
    );

    // Agrupamiento si merge está activo
    if (merge) {
      return Object.values(
          filtered.reduce((acc, inv) => {
            const key = `${inv.ticker}-${inv.type}`;
            if (!acc[key]) {
              acc[key] = { ...inv };
            } else {
              const prevQty = acc[key].quantity;
              const newQty = prevQty + inv.quantity;
              acc[key].purchasePrice =
                  (acc[key].purchasePrice * prevQty + inv.purchasePrice * inv.quantity) / newQty;
              acc[key].quantity = newQty;
              acc[key].allocation = (acc[key].allocation ?? 0) + (inv.allocation ?? 0);
            }
            return acc;
          }, {} as Record<string, Investment>)
      );
    } else {
      return filtered;
    }
  }

  /**
   * Devuelve los totales filtrados y mergeados, para el dashboard o resumen filtrado:
   * - valorActual: suma del valor actual de los activos filtrados
   * - invertido: suma invertida original
   * - cambioTotal: ganancia/pérdida absoluta
   * - resultadoPorcentaje: ganancia/pérdida %
   * - totalInversiones: cantidad (mergeada o no)
   */
  function getResumenDashboardFiltrado({
                                         typeFilter = 'Todos',
                                         merge = true,
                                         search = '',
                                         showInARS = true,
                                       }: {
    typeFilter?: 'Todos' | 'CEDEAR' | 'Cripto' | 'Acción',
    merge?: boolean,
    search?: string,
    showInARS?: boolean,
  }) {
    // Obtiene inversiones filtradas y agrupadas según los parámetros
    const inversiones = getDisplayedInvestments({ typeFilter, merge, search });

    // Calcula resumen global filtrado
    const resumen = getResumenGlobalFiltrado({
      inversiones,
      ppcMap,
      marketPrices,
      mergeTransactions: merge,
      showInARS,
      cclPrice,
    });

    const resultadoPorcentaje =
        resumen.invertido > 0
            ? (resumen.cambioTotal / resumen.invertido) * 100
            : 0;

    return {
      ...resumen,
      resultadoPorcentaje,
      totalInversiones: inversiones.length,
    };
  }

  /**
   * Devuelve la evolución del capital a lo largo del tiempo para graficar.
   * Agrupa por mes y tipo ('Cripto', 'CEDEAR', 'Acción') y el total.
   * Si showInARS es true, todos los valores están en ARS; si es false, en USD.
   * Solo considera compras (no ventas).
   */
  function getCapitalEvolutionData({ showInARS = true }: { showInARS?: boolean } = {}) {
    // Ordenar inversiones por fecha
    const sorted = [...investments].sort((a, b) =>
      new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    );
    if (sorted.length === 0) return [];

    // Agrupa por mes y suma tenencia (no considera ventas)
    const timeline: Record<string, { Cripto: number; CEDEAR: number; Acción: number }> = {};

    sorted.forEach(inv => {
      const dateObj = new Date(inv.purchaseDate);
      // Formato año-mes (puede cambiarse a día o semana si querés)
      const label = dateObj.toISOString().slice(0, 7);

      const key = inv.type;
      const priceKey = inv.type + '-' + inv.ticker.toUpperCase();
      let price = isValidPrice(marketPrices[priceKey]) ? marketPrices[priceKey] : inv.purchasePrice;
      let qty = inv.quantity;
      let value = price * qty;

      if (inv.type === 'Cripto') {
        if (showInARS && cclPrice) value = price * cclPrice * qty;
        if (!showInARS && inv.currency === 'ARS' && cclPrice) value = (price * qty) / cclPrice;
      } else {
        if (inv.currency === 'USD' && showInARS && cclPrice) value = price * cclPrice * qty;
        if (inv.currency === 'ARS' && !showInARS && cclPrice) value = (price * qty) / cclPrice;
      }

      // Si no existe el mes, iniciar
      if (!timeline[label]) timeline[label] = { Cripto: 0, CEDEAR: 0, Acción: 0 };
      timeline[label][key] += value;
    });

    // Transformar a array acumulando valores
    const months = Object.keys(timeline).sort();
    let lastCripto = 0, lastCEDEAR = 0, lastAcción = 0;
    const out = months.map(month => {
      // Acumulado hasta este mes
      lastCripto += timeline[month].Cripto;
      lastCEDEAR += timeline[month].CEDEAR;
      lastAcción += timeline[month].Acción;
      return {
        fecha: month,
        Cripto: lastCripto,
        CEDEAR: lastCEDEAR,
        Acción: lastAcción,
        total: lastCripto + lastCEDEAR + lastAcción,
      };
    });
    return out;
  }

  return {
    investments,
    loading,
    error,
    success,
    setSuccess,
    totalQuantity,
    cclPrice,
    predefinedAssets,
    marketPrices,
    assetMap,
    getAssetKey,
    getNormalizedPpcKey,
    ppcMap,
    reloadInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    toggleFavorite,
    handleAssetSelect,
    exportToCSV,
    resumenGlobalTotal,
    resumenPorTipo,
    getResumenGlobalFiltrado,
    getDisplayedInvestments,
    getResumenDashboardFiltrado,
    getCapitalEvolutionData,
  };
}
