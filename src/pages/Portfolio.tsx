// Página para administrar la cartera personal

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';

const Portfolio: React.FC = () => {
  const supabase = useSupabase();
  const { user } = useAuth();

  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [message, setMessage] = useState('');
  const [registros, setRegistros] = useState<any[]>([]);
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!nombre || !numero) {
      setMessage('Por favor complete ambos campos.');
      setMessageType('error');
      return;
    }
    if (!user?.id) {
      setMessage('Usuario no identificado.');
      setMessageType('error');
      return;
    }
    const { data, error } = await supabase
      .from('registros')
      .insert([
        {
          user_id: user.id,
          nombre,
          numero,
        },
      ])
      .select('*')
      .single();
    if (error) {
      setMessage(`Error al guardar: ${error.message || JSON.stringify(error)}`);
      setMessageType('error');
    } else if (data) {
      setMessage('Guardado exitosamente.');
      setMessageType('success');
      setNombre('');
      setNumero('');
      setRegistros((prev) => [data, ...prev]);
    }
  };

  const fetchRegistros = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('registros')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });
    if (error) {
      setMessage('Error al cargar los registros.');
      setMessageType('error');
    } else {
      setRegistros(data || []);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, [user]);

  return (
    <div className="flex flex-col items-center mt-10 space-y-10 px-4">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Agregar Registro</h1>
        {message && (
          <p className={`mb-4 text-sm ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <input
            type="number"
            placeholder="Número"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg bg-white placeholder-gray-500 text-gray-800"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Guardar
          </button>
        </form>
      </div>
      {registros.length > 0 && (
        <div className="w-full max-w-2xl">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Registros</h2>
          <table className="w-full text-sm border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2 border-b">Nombre</th>
                <th className="px-4 py-2 border-b">Número</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{reg.nombre}</td>
                  <td className="px-4 py-2 border-b">{reg.numero}</td>
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
