import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Metrics } from '../lib/types';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react';

type Period = 'day' | 'week' | 'month';

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    inventoryValue: 0,
    period: 'day',
  });
  const [period, setPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    loadMetrics();
    loadLowStockProducts();
  }, [period]);

  async function loadMetrics() {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
      }

      const { data: salesData } = await supabase
        .from('sales')
        .select('*, products(*)')
        .gte('sale_date', startDate.toISOString());

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString());

      const { data: productsData } = await supabase
        .from('products')
        .select('*');

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0;

      const totalProfit = salesData?.reduce((sum, sale) => {
        const product = sale.products as any;
        return sum + ((sale.unit_price - product.cost_price) * sale.quantity);
      }, 0) || 0;

      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

      const inventoryValue = productsData?.reduce(
        (sum, product) => sum + (product.cost_price * product.stock_quantity),
        0
      ) || 0;

      setMetrics({
        totalSales,
        totalRevenue,
        totalProfit,
        totalExpenses,
        inventoryValue,
        period,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLowStockProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .lte('stock_quantity', supabase.rpc('min_stock'))
        .order('stock_quantity', { ascending: true });

      if (!error) {
        const lowStock = data?.filter(p => p.stock_quantity <= p.min_stock) || [];
        setLowStockProducts(lowStock);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos com estoque baixo:', error);
    }
  }

  const periodLabels = {
    day: 'Hoje',
    week: 'Últimos 7 dias',
    month: 'Últimos 30 dias',
  };

  const netProfit = metrics.totalProfit - metrics.totalExpenses;

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === p
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Vendas</p>
              <p className="text-3xl font-bold mt-2">{metrics.totalSales}</p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <ShoppingCart size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Receita</p>
              <p className="text-3xl font-bold mt-2">
                R$ {metrics.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <DollarSign size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Lucro Bruto</p>
              <p className="text-3xl font-bold mt-2">
                R$ {metrics.totalProfit.toFixed(2)}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingUp size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Despesas</p>
              <p className="text-3xl font-bold mt-2">
                R$ {metrics.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <DollarSign size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Lucro Líquido</p>
              <p className="text-3xl font-bold mt-2">
                R$ {netProfit.toFixed(2)}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <TrendingUp size={28} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Valor do Estoque</p>
              <p className="text-3xl font-bold mt-2">
                R$ {metrics.inventoryValue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Package size={28} />
            </div>
          </div>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-amber-600" size={20} />
            <h3 className="text-lg font-semibold text-amber-900">
              Produtos com Estoque Baixo
            </h3>
          </div>
          <div className="space-y-2">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center bg-white rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{product.name}</p>
                  <p className="text-sm text-slate-600">
                    Categoria: {product.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-600">
                    {product.stock_quantity} un.
                  </p>
                  <p className="text-xs text-slate-500">
                    Mín: {product.min_stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
