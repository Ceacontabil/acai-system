import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import { X } from 'lucide-react';

interface SaleFormProps {
  onClose: () => void;
}

export function SaleForm({ onClose }: SaleFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock_quantity', 0)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProduct) return;

    if (formData.quantity > selectedProduct.stock_quantity) {
      alert('Quantidade maior que o estoque disponível!');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('sales').insert([
        {
          product_id: formData.product_id,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          total_price: formData.quantity * formData.unit_price,
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
  const profit = selectedProduct
    ? (formData.unit_price - selectedProduct.cost_price) * formData.quantity
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
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
              Produto *
            </label>
            <select
              required
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Selecione um produto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Estoque: {product.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Estoque disponível:</span>
                <span className="font-medium text-slate-800">
                  {selectedProduct.stock_quantity} un.
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Preço sugerido:</span>
                <span className="font-medium text-slate-800">
                  R$ {selectedProduct.sale_price.toFixed(2)}
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
                max={selectedProduct?.stock_quantity || 999999}
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

          {selectedProduct && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total da venda:</span>
                <span className="font-semibold text-blue-600">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Lucro estimado:</span>
                <span className="font-semibold text-emerald-600">
                  R$ {profit.toFixed(2)}
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
              disabled={loading || !selectedProduct}
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
