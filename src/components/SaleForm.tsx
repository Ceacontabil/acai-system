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
    quantity: 1,
    unit_price: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AcaiProduct | null>(null);
  const [selectedPote, setSelectedPote] = useState<Pote | null>(null);

  useEffect(() => {
    loadProducts();
    loadPotes();
  }, []);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('acai_products')
        .select('*')
        .order('size_ml');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  }

  async function loadPotes() {
    try {
      const { data, error } = await supabase
        .from('potes')
        .select('*')
        .eq('status', 'ativo')
        .gt('remaining_ml', 0)
        .order('purchase_date');

      if (error) throw error;
      setPotes(data || []);
    } catch (error) {
      console.error('Erro ao carregar potes:', error);
    }
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

  function handlePoteChange(poteId: string) {
    const pote = potes.find((p) => p.id === poteId);
    setSelectedPote(pote || null);
    setFormData({
      ...formData,
      pote_id: poteId,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProduct || !selectedPote) {
      alert('Selecione um produto e um pote!');
      return;
    }

    const mlNeeded = selectedProduct.size_ml * formData.quantity;

    if (mlNeeded > selectedPote.remaining_ml) {
      alert(`ML insuficiente no pote! Necessário: ${mlNeeded}ml, Disponível: ${selectedPote.remaining_ml}ml`);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('sales').insert([
        {
          product_id: formData.product_id,
          pote_id: formData.pote_id,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          total_price: formData.quantity * formData.unit_price,
          ml_consumed: mlNeeded,
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

  const totalPrice = formData.quantity * formData.unit_price;
  const mlNeeded = selectedProduct ? selectedProduct.size_ml * formData.quantity : 0;
  const costPerMl = selectedPote ? selectedPote.cost_price / selectedPote.total_ml : 0;
  const totalCost = costPerMl * mlNeeded;
  const profit = totalPrice - totalCost;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-slate-800">Nova Venda</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tamanho do Copo *
            </label>
            <select
              required
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Selecione o tamanho</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.sale_price)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pote de Açaí *
            </label>
            <select
              required
              value={formData.pote_id}
              onChange={(e) => handlePoteChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Selecione o pote</option>
              {potes.map((pote) => (
                <option key={pote.id} value={pote.id}>
                  {pote.flavor} - {pote.remaining_ml}ml restantes
                </option>
              ))}
            </select>
          </div>

          {selectedPote && (
            <div className="bg-purple-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Pote selecionado:</span>
                <span className="font-medium text-slate-800">{selectedPote.flavor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">ML disponível:</span>
                <span className="font-medium text-purple-600">
                  {selectedPote.remaining_ml}ml
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Custo por ML:</span>
                <span className="font-medium text-slate-800">
                  {formatCurrency(costPerMl)}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preço Unitário *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {selectedProduct && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">ML necessário:</span>
                <span className="font-medium text-slate-800">{mlNeeded}ml</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={2}
            />
          </div>

          {selectedProduct && selectedPote && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total da venda:</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Custo do açaí:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                <span className="text-slate-600 font-medium">Lucro:</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(profit)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedProduct || !selectedPote}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
