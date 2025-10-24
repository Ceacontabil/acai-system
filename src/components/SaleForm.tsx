import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AcaiProduct, Pote } from '../lib/types';
import { formatCurrency } from '../lib/types';
import { X } from 'lucide-react';

interface SaleFormProps {
  onClose: () => void;
}

export function SaleForm({ onClose }: SaleFormProps) {
  const [products, setProducts] = useState<AcaiProduct[]>([]);
  const [potes, setPotes] = useState<Pote[]>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    pote_ids: [''],
    quantity: 1,
    unit_price: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AcaiProduct | null>(null);
  const [selectedPotes, setSelectedPotes] = useState<Pote[]>([]);

  useEffect(() => {
    loadProducts();
    loadPotes();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase.from('acai_products').select('*').order('size_ml');
    if (!error) setProducts(data || []);
  }

  async function loadPotes() {
    const { data, error } = await supabase
      .from('potes')
      .select('*')
      .eq('status', 'ativo')
      .gt('remaining_ml', 0)
      .order('purchase_date');
    if (!error) setPotes(data || []);
  }

  function handleProductChange(productId: string) {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    setFormData({
      ...formData,
      product_id: productId,
      unit_price: product?.sale_price || 0,
    });
  }

  function handlePoteChange(poteId: string, index: number) {
    const updatedPotes = [...selectedPotes];
    updatedPotes[index] = potes.find((p) => p.id === poteId) || null;
    setSelectedPotes(updatedPotes);
    const updatedIds = [...formData.pote_ids];
    updatedIds[index] = poteId;
    setFormData({ ...formData, pote_ids: updatedIds });
  }

  function addPote() {
    const newPotes = [...selectedPotes, null];
    setSelectedPotes(newPotes);
    setFormData({
      ...formData,
      pote_ids: [...formData.pote_ids, ''],
    });
  }

  function removePote(index: number) {
    const updatedPotes = selectedPotes.filter((_, i) => i !== index);
    setSelectedPotes(updatedPotes);
    const updatedIds = formData.pote_ids.filter((_, i) => i !== index);
    setFormData({ ...formData, pote_ids: updatedIds });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validPotesParaValidacao = selectedPotes.filter((pote: Pote) => pote !== null && pote.id !== '');
    
    if (!selectedProduct || validPotesParaValidacao.length === 0) {
      alert('Selecione um produto e pelo menos um pote!');
      return;
    }

    const mlTotal = selectedProduct.size_ml * formData.quantity;
    const validPotes = selectedPotes.filter((pote) => pote !== null) as Pote[];
    const mlPorPote = mlTotal / validPotes.length;

    const poteSemML = validPotes.find(pote => pote.remaining_ml < mlPorPote);

    if (poteSemML) {
      alert(`O Pote "${poteSemML.flavor}" não tem ML suficiente! Precisa de ${mlPorPote.toFixed(2)}ml, tem ${poteSemML.remaining_ml}ml`);
      return;
    }

    setLoading(true);

    try {
      const total_price = formData.quantity * formData.unit_price;
      const totalCost = validPotes.reduce((acc: number, pote: Pote) => {
        const costPerMl = pote && pote.total_ml > 0 ? pote.cost_price / pote.total_ml : 0;
        return acc + (costPerMl * mlPorPote);
      }, 0);
      const totalCostValid = isNaN(totalCost) ? 0 : totalCost;

      const finalPoteIds = formData.pote_ids.filter(id => id.length > 0);
      
      if (finalPoteIds.length === 0) {
         alert('Nenhum pote válido selecionado!');
         setLoading(false);
         return; 
      }

      const { error } = await supabase.from('sales').insert([
        {
          product_id: formData.product_id,
          pote_ids: finalPoteIds, 
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          total_price,
          total_cost: totalCostValid,
          ml_consumed: mlTotal,
          notes: formData.notes,
        },
      ]);

      if (error) throw error;

      onClose();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      alert('Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  }

  const mlNeeded = selectedProduct ? selectedProduct.size_ml * formData.quantity : 0;
  const validPotes = selectedPotes.filter((pote: Pote) => pote !== null && pote !== undefined);
  const mlPorPote = validPotes.length > 0 ? mlNeeded / validPotes.length : 0;
  const totalPrice = formData.quantity * formData.unit_price;

  const totalCost = validPotes.reduce((acc, pote: Pote) => {
    const costPerMl = pote.total_ml > 0 ? pote.cost_price / pote.total_ml : 0;
    return acc + (costPerMl * mlPorPote);
  }, 0);

  const totalCostValid = isNaN(totalCost) ? 0 : totalCost;

  const profit = totalPrice - totalCostValid;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-800">Nova Venda</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Produto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tamanho do Copo *
            </label>
            <select
              required
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Selecione o tamanho</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {formatCurrency(p.sale_price)}
                </option>
              ))}
            </select>
          </div>

          {/* Botão adicionar potes */}
          <div className="flex gap-2">
            <button type="button" onClick={addPote} className="px-4 py-1 border bg-indigo-700 border-slate-300 text-white rounded-lg hover:bg-purple-500 transition ease duration-300">
              Adicionar Pote
            </button>
          </div>

          {/* Potes Selecionados */}
          {selectedPotes.map((_, index) => (
            <div key={index}>
                <label className="block w-1/4 text-sm font-medium text-slate-700 mb-1">{`Pote ${index + 1} *`}</label>
              <div  className="flex items-center gap-2">
                <select
                  required
                  value={formData.pote_ids[index]}
                  onChange={(e) => handlePoteChange(e.target.value, index)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Selecione o pote</option>
                  {potes.map((pote) => (
                    <option key={pote.id} value={pote.id}>
                      {pote.flavor} - {pote.remaining_ml}ml restantes
                    </option>
                  ))}
                </select>
                {/* Ícone de remover pote */}
                <button
                  type="button"
                  onClick={() => removePote(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}

          {/* Quantidade / Preço */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preço Unitário *</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Resumo */}
          {selectedProduct && selectedPotes.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span>ML total:</span>
                <span>{mlNeeded}ml</span>
              </div>
              {selectedPotes.filter((p) => p !== null).length > 1 && (
                <div className="flex justify-between">
                  <span>ML por pote:</span>
                  <span>{mlPorPote.toFixed(2)}ml</span>
                </div>
              )}
            </div>
          )}

          {/* Totais */}
          {selectedProduct && selectedPotes.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total da venda:</span>
                <span className="font-semibold text-blue-600">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo estimado:</span>
                <span className="font-semibold">{formatCurrency(totalCostValid)}</span> {/* AGORA FUNCIONA */}
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Lucro estimado:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(profit)}</span> {/* AGORA FUNCIONA */}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProduct || validPotes.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
