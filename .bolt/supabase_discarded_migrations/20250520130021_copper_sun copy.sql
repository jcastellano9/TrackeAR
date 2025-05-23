/*
  # Update investments table schema
  
  1. New Tables
    - No new tables required, updating existing investments table
    
  2. Changes
    - Added ratio column for CEDEAR ratios
    - Added current_price for real-time pricing
    - Added type column for filtering (CEDEAR, Crypto, Stock)
    - Added is_favorite column for marking favorites
    
  3. Security
    - Maintain existing RLS policies
*/

CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  ticker text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('CEDEAR', 'CRYPTO', 'STOCK')),
  quantity numeric NOT NULL,
  purchase_price numeric NOT NULL,
  current_price numeric NOT NULL,
  ratio text NULL,
  purchase_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('ARS', 'USD')),
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own investments
CREATE POLICY "Users can insert their own investments"
  ON investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to read their own investments
CREATE POLICY "Users can read their own investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy to allow users to update their own investments
CREATE POLICY "Users can update their own investments"
  ON investments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own investments
CREATE POLICY "Users can delete their own investments"
  ON investments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);