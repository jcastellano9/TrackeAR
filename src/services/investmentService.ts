import { supabase } from '../lib/supabase';

export interface Investment {
  id?: string;
  user_id: string;
  ticker: string;
  name: string;
  type: 'Cripto' | 'Acción' | 'CEDEAR';
  quantity: number;
  purchase_price: number;
  current_price: number;
  purchase_date: string;
  currency: 'USD' | 'ARS';
  is_favorite?: boolean;
}

export const investmentService = {
  async create(investment: Omit<Investment, 'id' | 'current_price'>) {
    const { data, error } = await supabase
      .from('investments')
      .insert([investment])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, investment: Partial<Investment>) {
    const { data, error } = await supabase
      .from('investments')
      .update(investment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async toggleFavorite(id: string, isFavorite: boolean) {
    const { data, error } = await supabase
      .from('investments')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};