// SupabaseContext: Provee el cliente Supabase mediante React Context

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
