/*
  # Sistema de Gestão de Estoque e Vendas

  1. Novas Tabelas
    - `products` (Produtos)
      - `id` (uuid, primary key)
      - `name` (text, nome do produto)
      - `description` (text, descrição)
      - `cost_price` (numeric, preço de custo)
      - `sale_price` (numeric, preço de venda)
      - `stock_quantity` (integer, quantidade em estoque)
      - `min_stock` (integer, estoque mínimo)
      - `category` (text, categoria do produto)
      - `created_at` (timestamptz, data de criação)
      - `updated_at` (timestamptz, data de atualização)

    - `sales` (Vendas)
      - `id` (uuid, primary key)
      - `product_id` (uuid, referência ao produto)
      - `quantity` (integer, quantidade vendida)
      - `unit_price` (numeric, preço unitário na venda)
      - `total_price` (numeric, preço total da venda)
      - `sale_date` (timestamptz, data da venda)
      - `notes` (text, observações)
      - `created_at` (timestamptz, data de criação)

    - `expenses` (Despesas)
      - `id` (uuid, primary key)
      - `description` (text, descrição da despesa)
      - `amount` (numeric, valor da despesa)
      - `category` (text, categoria da despesa)
      - `expense_date` (timestamptz, data da despesa)
      - `created_at` (timestamptz, data de criação)

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para permitir acesso público (ajustar conforme necessidade de autenticação)
    
  3. Funcionalidades
    - Trigger automático para atualizar estoque após venda
    - Trigger para atualizar updated_at em products
    - Índices para otimizar consultas de relatórios
*/

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  cost_price numeric(10, 2) NOT NULL DEFAULT 0,
  sale_price numeric(10, 2) NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  category text DEFAULT 'Geral',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de vendas
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  total_price numeric(10, 2) NOT NULL,
  sale_date timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  category text DEFAULT 'Geral',
  expense_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar estoque após venda
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estoque após venda
DROP TRIGGER IF EXISTS update_stock_trigger ON sales;
CREATE TRIGGER update_stock_trigger
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_sale();

-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir acesso público para simplificar - ajustar conforme necessidade)
CREATE POLICY "Allow public read access on products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on products"
  ON products FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access on sales"
  ON sales FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on sales"
  ON sales FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on sales"
  ON sales FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on sales"
  ON sales FOR DELETE
  USING (true);

CREATE POLICY "Allow public read access on expenses"
  ON expenses FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on expenses"
  ON expenses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on expenses"
  ON expenses FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on expenses"
  ON expenses FOR DELETE
  USING (true);