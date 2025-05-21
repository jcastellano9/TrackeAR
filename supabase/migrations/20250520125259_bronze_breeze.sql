/*
  # Create investments table

  1. New Tables
    - `investments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `ticker` (text)
      - `name` (text)
      - `type` (text)
      - `quantity` (numeric)
      - `purchase_price` (numeric)
      - `current_price` (numeric)
      - `purchase_date` (date)
      - `currency` (text)
      - `is_favorite` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `investments` table
    - Add policies for authenticated users to:
      - Insert their own investments
      - Read their own investments
      - Update their own investments
      - Delete their own investments
*/

CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  ticker text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  quantity numeric NOT NULL,
  purchase_price numeric NOT NULL,
  current_price numeric,
  purchase_date date NOT NULL,
  currency text NOT NULL,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

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