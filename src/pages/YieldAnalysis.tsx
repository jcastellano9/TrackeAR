// Análisis detallado de tasas y rendimientos

import React, { useEffect, useState } from 'react';
import { Bitcoin, Landmark } from 'lucide-react';

type Billetera = {
  nombre: string;
  tna: number;
  limite: number;
  url?: string;
};

type PlazoFijo = {
  entidad: string;
  logo: string;
  tnaClientes: number;
  enlace?: string;
};

type CriptoEntidad = {
  entidad: string;
  logo: string;
  url?: string;
  rendimientos: {
    moneda: string;
    apy: number;
  }[];
};

interface Props {
  activeSection: 'plazos' | 'billeteras' | 'cripto';
}

const YieldAnalysis: React.FC<Props> = ({ activeSection }) => {
  const [section, setSection] = useState<"plazos" | "billeteras" | "cripto">("plazos");
  const [sortOption, setSortOption] = useState<'alphabetical' | 'apyDesc' | 'apyAsc'>('alphabetical');
  const [billeteras, setBilleteras] = useState<Billetera[]>([]);
  const [plazosFijos, setPlazosFijos] = useState<PlazoFijo[]>([]);
  const [cripto, setCripto] = useState<CriptoEntidad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [billeterasRes, plazosRes, criptoRes] = await Promise.all([
          fetch('https://api.comparatasas.ar/cuentas-remuneradas'),
          fetch('https://api.comparatasas.ar/plazos-fijos'),
          fetch('https://api.comparatasas.ar/v1/finanzas/rendimientos')
        ]);

        if (!billeterasRes.ok || !plazosRes.ok || !criptoRes.ok) {
          throw new Error('Error al obtener los datos desde la API.');
        }

        const billeterasData = await billeterasRes.json();
        const plazosData = await plazosRes.json();
        const criptoData = await criptoRes.json();


        setBilleteras(billeterasData);
        setPlazosFijos(plazosData);
        setCripto(criptoData);
      } catch (err: any) {
        console.error(err);
        setError('Hubo un error al cargar los datos. Por favor, intenta nuevamente más tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedPlazos = [...plazosFijos].sort((a, b) => {
    if (sortOption === 'apyDesc') return b.tnaClientes - a.tnaClientes;
    if (sortOption === 'apyAsc') return a.tnaClientes - b.tnaClientes;
    return a.entidad.localeCompare(b.entidad);
  });
  const sortedBilleteras = [...billeteras].sort((a, b) => {
    if (sortOption === 'apyDesc') return b.tna - a.tna;
    if (sortOption === 'apyAsc') return a.tna - b.tna;
    return a.nombre.localeCompare(b.nombre);
  });
  const sortedCripto = cripto
      .sort((a, b) => {
        if (sortOption === 'alphabetical') return a.entidad.localeCompare(b.entidad);
        const aMax = Math.max(...a.rendimientos.map(r => r.apy));
        const bMax = Math.max(...b.rendimientos.map(r => r.apy));
        if (sortOption === 'apyDesc') return bMax - aMax;
        if (sortOption === 'apyAsc') return aMax - bMax;
        return 0;
      })
      .map(entidad => ({
        ...entidad,
        rendimientos: [...entidad.rendimientos].sort((a, b) => b.apy - a.apy)
      }));

  const getMaxAPY = (moneda: string): number => {
    let max = 0;
    for (const entidad of sortedCripto) {
      const rendimiento = entidad.rendimientos.find(r => r.moneda === moneda);
      if (rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy > max) {
        max = rendimiento.apy;
      }
    }
    return max;
  };

  const iconMap: Record<string, string> = {
    'buenbit': '/icons/buenbit.svg',
    'fiwind': '/icons/fiwind.svg',
    'letsbit': '/icons/letsbit.svg',
    'belo': '/icons/belo.svg',
    'lemoncash': '/icons/lemoncash.svg',
    'ripio': '/icons/ripio.svg',
    'satoshitango': '/icons/satoshitango.svg',
    'cocos': '/icons/cocos.svg',
    'prex': '/icons/prex.svg',
    'lb': '/icons/lb.svg',
    'mercadopago': '/icons/mercadopago.svg',
  };

  // Barra de navegación para cambiar de sección
  // (agregado justo antes del return)
  // eslint-disable-next-line
  return (
    <>
      <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSection('plazos')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              section === 'plazos'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Landmark size={18} className="mr-2" />
            Plazos Fijos
          </button>
          <button
            onClick={() => setSection('billeteras')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              section === 'billeteras'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="mr-2 w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
              <rect x="3" y="7" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="15" cy="12" r="1" fill="currentColor"/>
            </svg>
            Billeteras
          </button>
          <button
            onClick={() => setSection('cripto')}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              section === 'cripto'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Bitcoin size={18} className="mr-2" />
            Criptomonedas
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
            Última actualización: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-800 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="alphabetical">Orden alfabético</option>
            <option value="apyDesc">Mayor rendimiento</option>
            <option value="apyAsc">Menor rendimiento</option>
          </select>
        </div>
      </div>
      <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-10 text-gray-600">Cargando datos...</div>
      ) : (
        <>
          {error && (
            <div className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 p-4 rounded">
              {error}
            </div>
          )}

          {section === 'plazos' && (
            <section>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">Plazos Fijos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPlazos.map((p, i) => (
                  p.enlace ? (
                    <a
                      key={i}
                      href={p.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 flex items-center space-x-4 hover:shadow-md transition no-underline"
                    >
                      <span className="absolute top-3 right-3 bg-blue-100 text-blue-700 text-sm font-medium px-3 py-0.5 rounded-full border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700">
                        {(p.tnaClientes * 100).toFixed(2)}%
                      </span>
                      <img
                        src={p.logo || '/placeholder-logo.svg'}
                        alt={p.entidad}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.src = '/placeholder-logo.svg';
                            target.dataset.fallback = 'true';
                          }
                        }}
                        className="w-10 h-10 object-contain"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{p.entidad}</h4>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={i}
                      className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 flex items-center space-x-4 cursor-default"
                    >
                      <span className="absolute top-3 right-3 bg-blue-100 text-blue-700 text-sm font-medium px-3 py-0.5 rounded-full border border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700">
                        {(p.tnaClientes * 100).toFixed(2)}%
                      </span>
                      <img
                        src={p.logo || '/placeholder-logo.svg'}
                        alt={p.entidad}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.src = '/placeholder-logo.svg';
                            target.dataset.fallback = 'true';
                          }
                        }}
                        className="w-10 h-10 object-contain"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100">{p.entidad}</h4>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </section>
          )}

          {section === 'billeteras' && (
            <section>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">Billeteras</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBilleteras.map((b, i) => {
                  const lowerNombre = b.nombre.toLowerCase();
                  const iconSrc = iconMap[lowerNombre] || '/placeholder-logo.svg';
                  return b.url ? (
                    <a
                      key={i}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex items-center space-x-4 no-underline"
                    >
                      <span className="absolute top-3 right-3 bg-purple-100 text-purple-700 text-sm font-medium px-3 py-0.5 rounded-full border border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700">
                        {b.tna.toFixed(2)}%
                      </span>
                      <img
                        src={iconSrc}
                        alt={b.nombre}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.src = '/placeholder-logo.svg';
                            target.dataset.fallback = 'true';
                          }
                        }}
                        className="w-8 h-8 object-contain"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{b.nombre}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold mt-1">Límite: ${b.limite.toLocaleString()}</p>
                      </div>
                    </a>
                  ) : (
                    <div
                      key={i}
                      className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition flex items-center space-x-4 cursor-default"
                    >
                      <span className="absolute top-3 right-3 bg-purple-100 text-purple-700 text-sm font-medium px-3 py-0.5 rounded-full border border-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700">
                        {b.tna.toFixed(2)}%
                      </span>
                      <img
                        src={iconSrc}
                        alt={b.nombre}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.src = '/placeholder-logo.svg';
                            target.dataset.fallback = 'true';
                          }
                        }}
                        className="w-8 h-8 object-contain"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{b.nombre}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold mt-1">Límite: ${b.limite.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {section === 'cripto' && (
            <section>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">Criptomonedas</h3>
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-sm rounded-xl bg-white dark:bg-gray-900 shadow-md divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 uppercase text-center tracking-wide">
                      <th className="px-4 py-3 text-gray-800 dark:text-gray-100">Criptomoneda</th>
                      {sortedCripto.map((entidad, idx) => {
                        const lowerEntidad = entidad.entidad.toLowerCase();
                        const iconSrc = iconMap[lowerEntidad] || entidad.logo || '/placeholder-logo.svg';
                        return (
                          <th key={idx} className="px-4 py-3 text-center text-gray-800 dark:text-gray-100">
                            {entidad.url ? (
                              <a
                                href={entidad.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center space-y-1 hover:underline"
                              >
                                <img
                                  src={iconSrc}
                                  alt={entidad.entidad}
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.fallback) {
                                      target.src = '/placeholder-logo.svg';
                                      target.dataset.fallback = 'true';
                                    }
                                  }}
                                  className="w-6 h-6 object-contain"
                                />
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{entidad.entidad}</span>
                              </a>
                            ) : (
                              <div className="flex flex-col items-center justify-center space-y-1">
                                <img
                                  src={iconSrc}
                                  alt={entidad.entidad}
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.fallback) {
                                      target.src = '/placeholder-logo.svg';
                                      target.dataset.fallback = 'true';
                                    }
                                  }}
                                  className="w-6 h-6 object-contain"
                                />
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{entidad.entidad}</span>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(sortedCripto.flatMap(ent => ent.rendimientos.map(r => r.moneda)))]
                      .filter(moneda =>
                        sortedCripto.some(entidad =>
                          entidad.rendimientos.some(r => r.moneda === moneda && typeof r.apy === 'number' && r.apy > 0)
                        )
                      )
                      .sort((a, b) => a.localeCompare(b))
                      .map((moneda, idx) => {
                        const maxAPY = getMaxAPY(moneda);
                        return (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 font-semibold text-left">{moneda}</td>
                            {sortedCripto.map((entidad, cidx) => {
                              const rendimiento = entidad.rendimientos.find(r => r.moneda === moneda);
                              const isMax = rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy === maxAPY && maxAPY > 0;
                              return (
                                <td
                                  key={cidx}
                                  className={`px-4 py-3 text-sm text-gray-800 dark:text-gray-200 text-center ${
                                    isMax
                                      ? 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-semibold ring-1 ring-orange-200 dark:ring-orange-600 rounded-md'
                                      : ''
                                  }`}
                                >
                                  {rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy > 0
                                    ? `${rendimiento.apy.toFixed(2)}%`
                                    : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </>
      )}
    </div>
    </>
  );
};

export default YieldAnalysis;