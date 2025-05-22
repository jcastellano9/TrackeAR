/*
  # Update investments table policies

  1. Security
    - Enable RLS on investments table
    - Add policies for authenticated users to:
      - Read their own investments
      - Insert their own investments
      - Update their own investments
      - Delete their own investments
*/

-- Enable RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Policy for reading investments
CREATE POLICY "Users can read own investments"
  ON investments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for inserting investments
CREATE POLICY "Users can insert own investments"
  ON investments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for updating investments
CREATE POLICY "Users can update own investments"
  ON investments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for deleting investments
CREATE POLICY "Users can delete own investments"
  ON investments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);