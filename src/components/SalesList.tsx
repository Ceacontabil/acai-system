import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SaleWithProduct, Product } from '../lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { SaleForm } from './SaleForm';

export function SalesList() {
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  async function loadSales() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*, products(*)')
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
    if (!confirm('Tem certeza que deseja excluir esta venda? O estoque será ajustado.')) return;

    try {
      const sale = sales.find(s => s.id === id);
      if (!sale) return;

      await supabase
        .from('products')
        .update({ stock_quantity: (sale.products as Product).stock_quantity + sale.quantity })
        .eq('id', sale.product_id);

      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;

      loadSales();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
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
        {sales.map((sale) => (
          <div
            key={sale.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800">
                  {(sale.products as Product).name}
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  {formatDate(sale.sale_date)}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <span className="text-xs text-slate-500">Quantidade</span>
                    <p className="text-sm font-medium text-slate-700">{sale.quantity} un.</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Preço Unitário</span>
                    <p className="text-sm font-medium text-slate-700">
                      R$ {sale.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Total</span>
                    <p className="text-sm font-medium text-blue-600">
                      R$ {sale.total_price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Lucro</span>
                    <p className="text-sm font-medium text-emerald-600">
                      R$ {((sale.unit_price - (sale.products as Product).cost_price) * sale.quantity).toFixed(2)}
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
        ))}
      </div>

      {sales.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhuma venda registrada. Clique em "Nova Venda" para começar.
        </div>
      )}
    </div>
  );
}
