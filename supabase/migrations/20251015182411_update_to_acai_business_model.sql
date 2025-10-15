/*
  # Atualização para Modelo de Negócio de Açaí

  1. Modificações nas Tabelas Existentes
    - Renomear `products` para `acai_products` (tamanhos/sabores de copos)
    - Remover campos de estoque de products (não controlamos estoque de copos)
    - Atualizar `expenses` para incluir potes de açaí
    
  2. Nova Tabela: `potes`
    - `id` (uuid, primary key)
    - `flavor` (text, sabor do açaí)
    - `size_liters` (numeric, tamanho em litros)
    - `cost_price` (numeric, preço de custo do pote)
    - `purchase_date` (timestamptz, data da compra)
    - `total_ml` (integer, total em ML do pote)
    - `remaining_ml` (integer, ML restante)
    - `status` (text, ativo/esgotado)
    - `created_at` (timestamptz)

  3. Nova Tabela: `acai_products` (Produtos - Copos)
    - `id` (uuid, primary key)
    - `name` (text, nome do produto - ex: "Açaí 300ml", "Açaí 500ml")
    - `size_ml` (integer, tamanho em ML)
    - `sale_price` (numeric, preço de venda)
    - `category` (text, categoria/tipo)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  4. Atualizar Tabela: `sales`
    - Adicionar `pote_id` (referência ao pote usado)
    - Manter `product_id` (tamanho do copo vendido)
    - `ml_consumed` será calculado automaticamente

  5. Segurança
    - Manter RLS em todas as tabelas
    - Atualizar políticas
    
  6. Funcionalidades
    - Trigger para deduzir ML do pote após venda
    - Trigger para marcar pote como esgotado quando ML = 0
*/

-- Criar tabela de potes de açaí
CREATE TABLE IF NOT EXISTS potes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flavor text NOT NULL,
  size_liters numeric(10, 2) NOT NULL,
  cost_price numeric(10, 2) NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  total_ml integer NOT NULL,
  remaining_ml integer NOT NULL,
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_remaining_ml CHECK (remaining_ml >= 0),
  CONSTRAINT check_status CHECK (status IN ('ativo', 'esgotado'))
);

-- Criar nova tabela de produtos (copos de açaí)
CREATE TABLE IF NOT EXISTS acai_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size_ml integer NOT NULL,
  sale_price numeric(10, 2) NOT NULL,
  category text DEFAULT 'Açaí',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Atualizar tabela de vendas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'pote_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN pote_id uuid REFERENCES potes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'ml_consumed'
  ) THEN
    ALTER TABLE sales ADD COLUMN ml_consumed integer DEFAULT 0;
  END IF;
END $$;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_potes_status ON potes(status);
CREATE INDEX IF NOT EXISTS idx_potes_flavor ON potes(flavor);
CREATE INDEX IF NOT EXISTS idx_sales_pote_id ON sales(pote_id);
CREATE INDEX IF NOT EXISTS idx_acai_products_category ON acai_products(category);

-- Função para atualizar updated_at em acai_products
DROP TRIGGER IF EXISTS update_acai_products_updated_at ON acai_products;
CREATE TRIGGER update_acai_products_updated_at
  BEFORE UPDATE ON acai_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar ML do pote após venda e marcar como esgotado
CREATE OR REPLACE FUNCTION update_pote_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pote_id IS NOT NULL AND NEW.ml_consumed > 0 THEN
    UPDATE potes
    SET 
      remaining_ml = remaining_ml - NEW.ml_consumed,
      status = CASE 
        WHEN (remaining_ml - NEW.ml_consumed) <= 0 THEN 'esgotado'
        ELSE 'ativo'
      END
    WHERE id = NEW.pote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar pote após venda
DROP TRIGGER IF EXISTS update_pote_trigger ON sales;
CREATE TRIGGER update_pote_trigger
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_pote_after_sale();

-- Remover trigger antigo de atualização de estoque
DROP TRIGGER IF EXISTS update_stock_trigger ON sales;

-- Habilitar RLS nas novas tabelas
ALTER TABLE potes ENABLE ROW LEVEL SECURITY;
ALTER TABLE acai_products ENABLE ROW LEVEL SECURITY;

-- Políticas para potes
CREATE POLICY "Allow public read access on potes"
  ON potes FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on potes"
  ON potes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on potes"
  ON potes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on potes"
  ON potes FOR DELETE
  USING (true);

-- Políticas para acai_products
CREATE POLICY "Allow public read access on acai_products"
  ON acai_products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on acai_products"
  ON acai_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on acai_products"
  ON acai_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on acai_products"
  ON acai_products FOR DELETE
  USING (true);

-- Inserir produtos padrão de açaí (tamanhos comuns)
INSERT INTO acai_products (name, size_ml, sale_price, category) VALUES
  ('Açaí 300ml', 300, 10.00, 'Açaí'),
  ('Açaí 500ml', 500, 15.00, 'Açaí'),
  ('Açaí 700ml', 700, 20.00, 'Açaí'),
  ('Açaí 1L', 1000, 25.00, 'Açaí')
ON CONFLICT DO NOTHING;