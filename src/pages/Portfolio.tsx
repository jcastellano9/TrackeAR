// Página para administrar la cartera personal

import React, { useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

const Portfolio: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [investments, setInvestments] = useState<any[]>([]);
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!ticker || !name || quantity <= 0 || purchasePrice <= 0 || !purchaseDate) {
      setMessage('Por favor complete todos los campos correctamente.');
      setMessageType('error');
      return;
    }

    if (!user?.id) {
      setMessage('Usuario no identificado.');
      setMessageType('error');
      return;
    }

    const { error } = await supabase.from('investments').insert([
      {
        id: crypto.randomUUID(),
        user_id: user.id,
        ticker,
        name,
        type: 'CEDEAR', // default type
        quantity,
        purchase_price: purchasePrice,
        current_price: purchasePrice,
        purchase_date: purchaseDate,
        currency: 'ARS',
        is_favorite: false
      }
    ]);

    if (error) {
      console.error('Error Supabase:', error);
      setMessage(`Error al guardar la inversión: ${error.message || JSON.stringify(error)}`);
      setMessageType('error');
    } else {
      setMessage('Inversión guardada exitosamente.');
      setMessageType('success');
      setTicker('');
      setName('');
      setQuantity(0);
      setPurchasePrice(0);
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      fetchInvestments(); // reload after saving
    }
  };

  const fetchInvestments = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false });
    if (error) {
      console.error('Error fetching investments:', error);
      setMessage('Error al cargar las inversiones.');
      setMessageType('error');
    } else {
      setInvestments(data || []);
    }
  };

  React.useEffect(() => {
    fetchInvestments();
  }, [user]);

  return (
    <div className="flex flex-col items-center mt-10 space-y-10 px-4">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Agregar Inversión</h1>
        {message && (
          <p
            className={`mb-4 text-sm ${
              messageType === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <input
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <input
            type="number"
            placeholder="Cantidad"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value))}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <input
            type="number"
            placeholder="Precio de compra"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(parseFloat(e.target.value))}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Guardar inversión
          </button>
        </form>
      </div>

      {investments.length > 0 && (
        <div className="w-full max-w-4xl">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Inversiones cargadas</h2>
          <table className="w-full text-sm border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2 border-b">Ticker</th>
                <th className="px-4 py-2 border-b">Nombre</th>
                <th className="px-4 py-2 border-b">Cantidad</th>
                <th className="px-4 py-2 border-b">Precio</th>
                <th className="px-4 py-2 border-b">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{inv.ticker}</td>
                  <td className="px-4 py-2 border-b">{inv.name}</td>
                  <td className="px-4 py-2 border-b">{inv.quantity}</td>
                  <td className="px-4 py-2 border-b">${inv.purchase_price}</td>
                  <td className="px-4 py-2 border-b">{inv.purchase_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Portfolio;