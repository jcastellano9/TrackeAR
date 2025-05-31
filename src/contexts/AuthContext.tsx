// Contexto para manejar la autenticación de usuarios.
// Centraliza las funciones de inicio de sesión y
// suscripción al estado de autenticación.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
  signUp: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{
    error: Error | null;
    data: any;
  }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null, data: null }),
  signUp: async () => ({ error: null, data: null }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null, data: null }),
});

export const useAuth = () => useContext(AuthContext);

// AuthProvider: maneja autenticación global con Supabase (login, registro, logout, reset password)
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtiene el usuario actual y escucha cambios en la sesión de autenticación.
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();

    // Configura una suscripción para actualizar el usuario cuando cambia la sesión.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  // Inicia sesión con email y contraseña.
  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  // Registra un nuevo usuario con email y contraseña.
  const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password });
  };

  // Cierra la sesión del usuario actual.
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Envía un correo para restablecer la contraseña.
  const resetPassword = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
