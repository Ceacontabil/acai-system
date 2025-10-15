export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>;
      };
      sales: {
        Row: Sale;
        Insert: Omit<Sale, 'id' | 'created_at'>;
        Update: Partial<Omit<Sale, 'id' | 'created_at'>>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at'>;
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  notes: string;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_at: string;
}

export interface SaleWithProduct extends Sale {
  products: Product;
}

export interface Metrics {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  inventoryValue: number;
  period: 'day' | 'week' | 'month';
}
