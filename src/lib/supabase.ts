// Inicializa el cliente de Supabase con las claves

import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
// In production, these would be set in the environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
