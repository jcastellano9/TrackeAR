/*
  # Create investments table

  1. New Tables
    - `investments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `ticker` (text)
      - `name` (text)
      - `type` (text)
      - `quantity` (numeric)
      - `purchase_price` (numeric)
      - `current_price` (numeric)
      - `purchase_date` (date)
      - `currency` (text)
      - `is_favorite` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `investments` table
    - Add policies for authenticated users to:
      - Read their own investments
      - Create investments
      - Update their own investments
      - Delete their own investments
*/

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  ticker text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Cripto', 'Acción', 'CEDEAR')),
  quantity numeric NOT NULL,
  purchase_price numeric NOT NULL,
  current_price numeric DEFAULT 0,
  purchase_date date NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'ARS')),
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create investments"
  ON investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments"
  ON investments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments"
  ON investments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
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