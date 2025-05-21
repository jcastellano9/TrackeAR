/*
  # Update investments table schema
  
  1. Changes
    - Add type validation
    - Add currency validation
    - Add updated_at column with automatic updates
    - Maintain existing RLS policies

  2. Security
    - Maintain RLS enabled
    - Update policies if they don't exist
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create or update the investments table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  ticker text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('CEDEAR', 'CRYPTO', 'STOCK')),
  quantity numeric NOT NULL,
  purchase_price numeric NOT NULL,
  current_price numeric NOT NULL,
  purchase_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('ARS', 'USD')),
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can insert their own investments" ON investments;
    DROP POLICY IF EXISTS "Users can read their own investments" ON investments;
    DROP POLICY IF EXISTS "Users can update their own investments" ON investments;
    DROP POLICY IF EXISTS "Users can delete their own investments" ON investments;
EXCEPTION
    WHEN undefined_object THEN 
        NULL;
END $$;

-- Recreate policies
CREATE POLICY "Users can insert their own investments"
  ON investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own investments"
  ON investments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investments"
  ON investments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);