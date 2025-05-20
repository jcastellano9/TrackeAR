// Inicializa el cliente de Supabase con las claves

import { createClient } from '@supabase/supabase-js';

// Inicializa el cliente de Supabase usando variables de entorno.
// En producción se definen en un archivo `.env` o similar.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
