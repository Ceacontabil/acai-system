import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SaleWithDetails, AcaiProduct, Pote } from '../lib/types';
import { formatCurrency } from '../lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { SaleForm } from './SaleForm';

export function SalesList() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          acai_products(*),
          pote_1:potes!sales_pote_id_fkey(*),
          pote_2:potes!sales_pote_id_2_fkey(*)
        `)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta venda? O ML será devolvido ao(s) pote(s).')) return;

    try {
      const sale = sales.find(s => s.id === id);
      if (!sale) return;

      // Devolver ML para o pote principal
      if (sale.pote_id && sale.ml_consumed > 0 && sale.pote_1) {
        await supabase
          .from('potes')
          .update({
            remaining_ml: (sale.pote_1 as Pote).remaining_ml + sale.ml_consumed,
            status: 'ativo'
          })
          .eq('id', sale.pote_id);
      }

      // Devolver ML para o segundo pote (se for meio a meio)
      if (sale.is_meio_a_meio && sale.pote_id_2 && sale.ml_consumed_2 > 0 && sale.pote_2) {
        await supabase
          .from('potes')
          .update({
            remaining_ml: (sale.pote_2 as Pote).remaining_ml + sale.ml_consumed_2,
            status: 'ativo'
          })
          .eq('id', sale.pote_id_2);
      }

      // Remover a venda
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;

      loadSales();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      alert('Erro ao excluir venda');
    }
  }

  function handleCloseForm() {
    setShowForm(false);
    loadSales();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Vendas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nova Venda
        </button>
      </div>

      {showForm && <SaleForm onClose={handleCloseForm} />}

      <div className="grid gap-4">
        {sales.map((sale) => {
          const product = sale.acai_products as AcaiProduct;
          const pote1 = sale.pote_1 as Pote | null;
          const pote2 = sale.pote_2 as Pote | null;

          const cost1 = pote1 ? pote1.cost_price / pote1.total_ml : 0;
          const cost2 = pote2 ? pote2.cost_price / pote2.total_ml : 0;

          const totalCost = sale.is_meio_a_meio
            ? (cost1 * sale.ml_consumed + cost2 * sale.ml_consumed_2)
            : cost1 * sale.ml_consumed;

          const profit = sale.total_price - totalCost;

          return (
            <div
              key={sale.id}
              className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {product?.name || 'Produto removido'}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {formatDate(sale.sale_date)}
                  </p>

                  {(pote1 || pote2) && (
                    <div className="text-xs text-purple-600 mt-1 space-y-1">
                      {pote1 && (
                        <p>
                          Pote 1: {pote1.flavor} | {sale.ml_consumed}ml
                        </p>
                      )}
                      {sale.is_meio_a_meio && pote2 && (
                        <p>
                          Pote 2: {pote2.flavor} | {sale.ml_consumed_2}ml
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <span className="text-xs text-slate-500">Quantidade</span>
                      <p className="text-sm font-medium text-slate-700">{sale.quantity} un.</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Preço Unitário</span>
                      <p className="text-sm font-medium text-slate-700">
                        {formatCurrency(sale.unit_price)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Total Venda</span>
                      <p className="text-sm font-medium text-blue-600">
                        {formatCurrency(sale.total_price)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Lucro</span>
                      <p className="text-sm font-medium text-emerald-600">
                        {formatCurrency(profit)}
                      </p>
                    </div>
                  </div>

                  {sale.notes && (
                    <p className="text-sm text-slate-600 mt-2 italic">{sale.notes}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleDelete(sale.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sales.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhuma venda registrada. Clique em "Nova Venda" para começar.
        </div>
      )}
    </div>
  );
}
