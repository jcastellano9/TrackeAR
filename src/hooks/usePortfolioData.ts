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
          prices[a.type + '-' + a.ticker] = a.price;
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

  // --- RESUMEN GLOBAL TOTAL (sin filtrar: todos los activos, siempre en ARS) ---
  const resumenGlobalTotal = useMemo(() => {
    return investments.reduce(
      (acc, inv) => {
        const key = inv.type + '-' + inv.ticker.toUpperCase();
        const currentPrice = marketPrices[key] ?? inv.purchasePrice;

        // Convertimos todo a ARS
        let priceARS = currentPrice;
        let ppcARS   = inv.purchasePrice;

        if (inv.type === 'Cripto') {
          // Los precios de criptos vienen en USD → pasamos a ARS si tenemos CCL
          if (cclPrice) {
            priceARS = currentPrice * cclPrice;
            ppcARS   = inv.purchasePrice * cclPrice;
          }
        } else {
          // Acciones / CEDEAR: si la moneda registrada es USD, convertir
          if (inv.currency === 'USD' && cclPrice) {
            priceARS = currentPrice * cclPrice;
            ppcARS   = inv.purchasePrice * cclPrice;
          }
        }

        const diff = priceARS - ppcARS;

        return {
          valorActual: acc.valorActual + priceARS * inv.quantity,
          invertido:   acc.invertido   + ppcARS   * inv.quantity,
          cambioTotal: acc.cambioTotal + diff      * inv.quantity,
        };
      },
      { valorActual: 0, invertido: 0, cambioTotal: 0 }
    );
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
      const currentPrice = marketPrices[key] ?? inv.purchasePrice;
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
    reloadInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    toggleFavorite,
    handleAssetSelect,
    exportToCSV,
    resumenGlobalTotal,
    resumenPorTipo,
  };
}
