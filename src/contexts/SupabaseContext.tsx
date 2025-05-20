// Provee el cliente de Supabase a toda la app.
// Esto permite acceder al cliente desde cualquier componente
// usando el hook `useSupabase`.

import React, { createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseContext = createContext(supabase);

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};
