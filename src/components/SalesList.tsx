import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { SaleWithDetails, AcaiProduct, Pote } from '../lib/types';
import { formatCurrency } from '../lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { SaleForm } from './SaleForm';

interface SalePoteDetails {
  [saleId: string]: Pote[];
}

export function SalesList() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [poteDetails, setPoteDetails] = useState<SalePoteDetails>({});

  useEffect(() => {
    loadSales();
  }, []);


  async function fetchPoteDetails(poteIds: string[]): Promise<Pote[]> {
    if (poteIds.length === 0) return [];
    
    const uniquePoteIds = Array.from(new Set(poteIds.filter(id => id.length > 0)));

    if (uniquePoteIds.length === 0) return [];

    const { data, error } = await supabase
      .from('potes')
      .select('id, flavor, total_ml, remaining_ml') 
      .in('id', uniquePoteIds);

    if (error) {
      console.error('Erro ao buscar detalhes dos potes:', error);
      return [];
    }
    return data as Pote[];
  }

  async function loadSales() {
    setLoading(true);
    try {
      const { data: salesData, error } = await supabase
        .from('sales')
        .select(`
          *,
          acai_products(*)
        `)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      
      const salesList = salesData || [];
      setSales(salesList);
      
      const allPoteIds = salesList.flatMap(sale => sale.pote_ids as string[] || []);

      const poteData = await fetchPoteDetails(allPoteIds);
      
      const newPoteDetails: SalePoteDetails = {};
      
      salesList.forEach(sale => {
        const salePoteIds = sale.pote_ids as string[] || [];
        newPoteDetails[sale.id] = poteData.filter(pote => salePoteIds.includes(pote.id));
      });

      setPoteDetails(newPoteDetails);

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

        const poteIds = (sale.pote_ids as string[] || []).filter(id => id.length > 0);
        
        const mlPorPote = sale.ml_consumed / poteIds.length;

        const rpcCalls = poteIds.map(poteId => 
            supabase.rpc('devolve_ml_pote', {
                pote_id_param: poteId,
                ml_devolvido: mlPorPote,
            })
        );
        
        await Promise.all(rpcCalls);
        
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
          const potesUsados = poteDetails[sale.id] || []; 
          
          const totalCost = sale.total_cost || 0; 
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

                  {potesUsados.length > 0 && (
                    <div className="text-xs text-purple-600 mt-2 space-y-1">
                      <p className="font-semibold">ML Consumido: {sale.ml_consumed}ml</p>
                      {potesUsados.map((pote, index) => (
                        <p key={pote.id}>
                          Pote {index + 1}: {pote.flavor} | {(sale.ml_consumed / potesUsados.length).toFixed(1)}ml
                        </p>
                      ))}
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
