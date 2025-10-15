export interface Database {
  public: {
    Tables: {
      acai_products: {
        Row: AcaiProduct;
        Insert: Omit<AcaiProduct, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AcaiProduct, 'id' | 'created_at' | 'updated_at'>>;
      };
      potes: {
        Row: Pote;
        Insert: Omit<Pote, 'id' | 'created_at'>;
        Update: Partial<Omit<Pote, 'id' | 'created_at'>>;
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

export interface AcaiProduct {
  id: string;
  name: string;
  size_ml: number;
  sale_price: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Pote {
  id: string;
  flavor: string;
  size_liters: number;
  cost_price: number;
  purchase_date: string;
  total_ml: number;
  remaining_ml: number;
  status: 'ativo' | 'esgotado';
  created_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  notes: string;
  pote_id: string | null;
  ml_consumed: number;
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

export interface SaleWithDetails extends Sale {
  acai_products: AcaiProduct;
  potes: Pote | null;
}

export interface Metrics {
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalExpenses: number;
  potesInventoryValue: number;
  netProfit: number;
  period: 'day' | 'week' | 'month';
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
