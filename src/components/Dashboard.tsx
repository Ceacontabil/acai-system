import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Metrics, Pote } from '../lib/types';
import { formatCurrency } from '../lib/types';
import { TrendingUp, DollarSign, ShoppingCart, Package, PackageX } from 'lucide-react';

type Period = 'day' | 'week' | 'month';

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalExpenses: 0,
    potesInventoryValue: 0,
    netProfit: 0,
    period: 'day',
  });
  const [period, setPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(true);
  const [lowStockPotes, setLowStockPotes] = useState<Pote[]>([]);

  useEffect(() => {
    loadMetrics();
    loadLowStockPotes();
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

      // ✅ Corrigido: define relacionamentos explícitos dos potes
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          acai_products(*),
          pote_1:potes!sales_pote_id_fkey(*),
          pote_2:potes!sales_pote_id_2_fkey(*)
        `)
        .gte('sale_date', startDate.toISOString());

      if (salesError) throw salesError;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate.toISOString());

      if (expensesError) throw expensesError;

      const { data: potesData, error: potesError } = await supabase
        .from('potes')
        .select('*')
        .eq('status', 'ativo');

      if (potesError) throw potesError;

      // =============================
      // 🔹 Cálculo das métricas
      // =============================
      const totalSales = salesData?.length || 0;
      const totalRevenue =
        salesData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0;

      const totalCost =
        salesData?.reduce((sum, sale) => {
          const pote1 = sale.pote_1 as Pote | null;
          const pote2 = sale.pote_2 as Pote | null;
          const cost1 = pote1 ? pote1.cost_price / pote1.total_ml : 0;
          const cost2 = pote2 ? pote2.cost_price / pote2.total_ml : 0;

          if (sale.is_meio_a_meio) {
            return sum + cost1 * sale.ml_consumed + cost2 * sale.ml_consumed_2;
          } else {
            return sum + cost1 * sale.ml_consumed;
          }
        }, 0) || 0;

      const totalProfit = totalRevenue - totalCost;

      const totalExpenses =
        expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

      const potesInventoryValue =
        potesData?.reduce((sum, pote) => {
          const costPerMl = pote.cost_price / pote.total_ml;
          return sum + costPerMl * pote.remaining_ml;
        }, 0) || 0;

      const netProfit = totalProfit - totalExpenses;

      setMetrics({
        totalSales,
        totalRevenue,
        totalCost,
        totalProfit,
        totalExpenses,
        potesInventoryValue,
        netProfit,
        period,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLowStockPotes() {
    try {
      const { data, error } = await supabase
        .from('potes')
        .select('*')
        .eq('status', 'ativo')
        .lte('remaining_ml', 1000)
        .order('remaining_ml', { ascending: true });

      if (!error) setLowStockPotes(data || []);
    } catch (error) {
      console.error('Erro ao carregar potes com estoque baixo:', error);
    }
  }

  const periodLabels = {
    day: 'Hoje',
    week: 'Últimos 7 dias',
    month: 'Últimos 30 dias',
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
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

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Total de Vendas"
          value={metrics.totalSales}
          icon={<ShoppingCart size={28} />}
          gradient="from-blue-500 to-blue-600"
        />
        <MetricCard
          title="Receita"
          value={formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign size={28} />}
          gradient="from-emerald-500 to-emerald-600"
        />
        <MetricCard
          title="Custo do Açaí"
          value={formatCurrency(metrics.totalCost)}
          icon={<Package size={28} />}
          gradient="from-orange-500 to-orange-600"
        />
        <MetricCard
          title="Lucro Bruto"
          value={formatCurrency(metrics.totalProfit)}
          icon={<TrendingUp size={28} />}
          gradient="from-teal-500 to-teal-600"
        />
        <MetricCard
          title="Despesas"
          value={formatCurrency(metrics.totalExpenses)}
          icon={<DollarSign size={28} />}
          gradient="from-red-500 to-red-600"
        />
        <MetricCard
          title="Lucro Líquido"
          value={formatCurrency(metrics.netProfit)}
          icon={<TrendingUp size={28} />}
          gradient="from-slate-700 to-slate-800"
        />
        <MetricCard
          title="Valor em Potes"
          value={formatCurrency(metrics.potesInventoryValue)}
          icon={<Package size={28} />}
          gradient="from-purple-500 to-purple-600"
        />
      </div>

      {/* Estoque baixo */}
      {lowStockPotes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <PackageX className="text-amber-600" size={20} />
            <h3 className="text-lg font-semibold text-amber-900">
              Potes com Estoque Baixo (menos de 1L)
            </h3>
          </div>
          <div className="space-y-2">
            {lowStockPotes.map((pote) => (
              <div
                key={pote.id}
                className="flex justify-between items-center bg-white rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-slate-800">{pote.flavor}</p>
                  <p className="text-sm text-slate-600">
                    Comprado em:{' '}
                    {new Date(pote.purchase_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-amber-600">
                    {pote.remaining_ml}ml
                  </p>
                  <p className="text-xs text-slate-500">
                    de {pote.total_ml}ml
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

function MetricCard({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-lg shadow-md p-6 text-white`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className="bg-white bg-opacity-20 p-3 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
