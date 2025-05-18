import React, { useEffect, useState } from 'react';

type Billetera = {
  nombre: string;
  tna: number;
  limite: number;
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

  const sortedPlazos = [...plazosFijos].sort((a, b) => b.tnaClientes - a.tnaClientes);
  const sortedBilleteras = [...billeteras].sort((a, b) => b.tna - a.tna);
  const sortedCripto = cripto.map(entidad => ({
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
  };

  // Barra de navegación para cambiar de sección
  // (agregado justo antes del return)
  // eslint-disable-next-line
  return (
    <>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSection('plazos')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            section === 'plazos'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Plazos Fijos
        </button>
        <button
          onClick={() => setSection('billeteras')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            section === 'billeteras'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Billeteras
        </button>
        <button
          onClick={() => setSection('cripto')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            section === 'cripto'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Criptomonedas
        </button>
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
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">🏦 Plazos Fijos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedPlazos.map((p, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 flex items-center space-x-4 hover:shadow-md transition">
                    <img src={p.logo} alt={p.entidad} className="w-10 h-10 object-contain" />
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">{p.entidad}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">TNA Clientes: {(p.tnaClientes * 100).toFixed(2)}%</p>
                      {p.enlace && (
                        <a href={p.enlace} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 text-sm underline">
                          Ir al sitio
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === 'billeteras' && (
            <section>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">📱 Cuentas y Billeteras</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedBilleteras.map((b, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">{b.nombre}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">TNA: {b.tna}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold mt-1">Límite: ${b.limite.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {section === 'cripto' && (
            <section>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">🪙 Rendimientos Cripto</h3>
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-sm border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-center uppercase text-xs tracking-wide text-gray-600 dark:text-gray-300">
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-gray-800 dark:text-gray-100">Criptomoneda</th>
                      {sortedCripto.map((entidad, idx) => (
                        <th key={idx} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center text-gray-800 dark:text-gray-100">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            {iconMap[entidad.entidad.toLowerCase()] || entidad.logo ? (
                              <img
                                src={iconMap[entidad.entidad.toLowerCase()] || entidad.logo || '/placeholder-logo.svg'}
                                alt={entidad.entidad}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (!target.dataset.fallback) {
                                    target.src = '/placeholder-logo.svg';
                                    target.dataset.fallback = 'true';
                                  }
                                }}
                                className="w-6 h-6 object-contain"
                              />
                            ) : null}
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-100">{entidad.entidad}</span>
                          </div>
                        </th>
                      ))}
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
                          <tr key={idx} className="text-center even:bg-gray-50 dark:even:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                            <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-semibold text-left text-gray-800 dark:text-gray-100 text-sm">{moneda}</td>
                            {sortedCripto.map((entidad, cidx) => {
                              const rendimiento = entidad.rendimientos.find(r => r.moneda === moneda);
                              const isMax = rendimiento && typeof rendimiento.apy === 'number' && rendimiento.apy === maxAPY && maxAPY > 0;
                              return (
                                <td
                                  key={cidx}
                                  className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm ${
                                    isMax ? 'bg-blue-100 text-blue-700 font-bold dark:bg-blue-900 dark:text-blue-300 rounded-lg ring-1 ring-blue-300 dark:ring-blue-600' : 'text-gray-800 dark:text-gray-100'
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