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
    pote_id: '',
    pote_id_2: '',
    is_meio_a_meio: false,
    quantity: 1,
    unit_price: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AcaiProduct | null>(null);
  const [selectedPote, setSelectedPote] = useState<Pote | null>(null);
  const [selectedPote2, setSelectedPote2] = useState<Pote | null>(null);

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

  function handlePoteChange(poteId: string, isSecond = false) {
    const pote = potes.find((p) => p.id === poteId);
    if (isSecond) {
      setSelectedPote2(pote || null);
      setFormData({ ...formData, pote_id_2: poteId });
    } else {
      setSelectedPote(pote || null);
      setFormData({ ...formData, pote_id: poteId });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProduct || !selectedPote) {
      alert('Selecione um produto e pelo menos um pote!');
      return;
    }

    const mlTotal = selectedProduct.size_ml * formData.quantity;
    const mlPorPote = formData.is_meio_a_meio ? mlTotal / 2 : mlTotal;

    // Validações
    if (mlPorPote > selectedPote.remaining_ml) {
      alert(`Pote 1 sem ML suficiente! Precisa de ${mlPorPote}ml, tem ${selectedPote.remaining_ml}ml`);
      return;
    }

    if (formData.is_meio_a_meio && (!selectedPote2 || mlPorPote > selectedPote2.remaining_ml)) {
      alert(`Pote 2 sem ML suficiente! Precisa de ${mlPorPote}ml, tem ${selectedPote2?.remaining_ml || 0}ml`);
      return;
    }

    setLoading(true);

    try {
      const total_price = formData.quantity * formData.unit_price;
      const total_cost = (() => {
        const cost1 = selectedPote ? selectedPote.cost_price / selectedPote.total_ml : 0;
        const cost2 = selectedPote2 ? selectedPote2.cost_price / selectedPote2.total_ml : 0;
        return formData.is_meio_a_meio ? ((cost1 + cost2) / 2) * mlTotal : cost1 * mlTotal;
      })();

      const { error } = await supabase.from('sales').insert([
        {
          product_id: formData.product_id,
          pote_id: formData.pote_id,
          pote_id_2: formData.is_meio_a_meio ? formData.pote_id_2 : null,
          is_meio_a_meio: formData.is_meio_a_meio,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          total_price,
          total_cost,
          ml_consumed: formData.is_meio_a_meio ? mlPorPote : mlTotal,
          ml_consumed_2: formData.is_meio_a_meio ? mlPorPote : 0,
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
  const mlPorPote = formData.is_meio_a_meio ? mlNeeded / 2 : mlNeeded;
  const costPerMl = selectedPote ? selectedPote.cost_price / selectedPote.total_ml : 0;
  const totalCost = costPerMl * mlNeeded;
  const totalPrice = formData.quantity * formData.unit_price;
  const profit = totalPrice - totalCost;

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

          {/* Checkbox meio a meio */}
          <div className="flex items-center gap-2">
            <input
              id="is_meio_a_meio"
              type="checkbox"
              checked={formData.is_meio_a_meio}
              onChange={(e) => setFormData({ ...formData, is_meio_a_meio: e.target.checked })}
            />
            <label htmlFor="is_meio_a_meio" className="text-sm text-slate-700 font-medium">
              Venda meio a meio
            </label>
          </div>

          {/* Pote principal */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pote 1 *</label>
            <select
              required
              value={formData.pote_id}
              onChange={(e) => handlePoteChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Selecione o pote</option>
              {potes.map((pote) => (
                <option key={pote.id} value={pote.id}>
                  {pote.flavor} - {pote.remaining_ml}ml restantes
                </option>
              ))}
            </select>
          </div>

          {/* Pote 2 (só se meio a meio) */}
          {formData.is_meio_a_meio && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pote 2 *</label>
              <select
                required
                value={formData.pote_id_2}
                onChange={(e) => handlePoteChange(e.target.value, true)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Selecione o segundo pote</option>
                {potes
                  .filter((p) => p.id !== formData.pote_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.flavor} - {p.remaining_ml}ml restantes
                    </option>
                  ))}
              </select>
            </div>
          )}

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
          {selectedProduct && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span>ML total:</span>
                <span>{mlNeeded}ml</span>
              </div>
              {formData.is_meio_a_meio && (
                <div className="flex justify-between">
                  <span>ML por pote:</span>
                  <span>{mlPorPote}ml</span>
                </div>
              )}
            </div>
          )}

          {/* Totais */}
          {selectedProduct && selectedPote && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total da venda:</span>
                <span className="font-semibold text-blue-600">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo estimado:</span>
                <span className="font-semibold">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Lucro estimado:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(profit)}</span>
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
              disabled={loading || !selectedProduct || !selectedPote || (formData.is_meio_a_meio && !selectedPote2)}
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
