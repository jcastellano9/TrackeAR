import { createClient } from '@supabase/supabase-js';

// Inicializa el cliente de Supabase usando variables de entorno.
// En producción se definen en un archivo `.env` o similar.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);