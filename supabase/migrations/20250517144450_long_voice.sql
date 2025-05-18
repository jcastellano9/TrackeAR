/*
  # Investment Management Schema
  
  1. New Tables
    - `investments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `ticker` (text)
      - `name` (text)
      - `type` (text)
      - `quantity` (numeric)
      - `purchase_price` (numeric)
      - `purchase_date` (date)
      - `currency` (text)
      - `created_at` (timestamptz)
      - `is_favorite` (boolean)
  
  2. Security
    - Enable RLS on investments table
    - Add policies for CRUD operations
    - Link investments to users via foreign key
*/

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  quantity numeric NOT NULL,
  purchase_price numeric NOT NULL,
  purchase_date date NOT NULL,
  currency text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_favorite boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'Users can create their own investments'
  ) THEN
    CREATE POLICY "Users can create their own investments"
      ON investments
      FOR INSERT
      TO public
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'Users can view their own investments'
  ) THEN
    CREATE POLICY "Users can view their own investments"
      ON investments
      FOR SELECT
      TO public
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'Users can update their own investments'
  ) THEN
    CREATE POLICY "Users can update their own investments"
      ON investments
      FOR UPDATE
      TO public
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'investments' AND policyname = 'Users can delete their own investments'
  ) THEN
    CREATE POLICY "Users can delete their own investments"
      ON investments
      FOR DELETE
      TO public
      USING (auth.uid() = user_id);
  END IF;
END $$;