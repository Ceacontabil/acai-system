import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AcaiProduct } from '../lib/types';
import { formatCurrency } from '../lib/types';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ProductForm } from './ProductForm';

export function ProductList() {
  const [products, setProducts] = useState<AcaiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AcaiProduct | null>(null);

  useEffect(() => {
    loadProducts();
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
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase.from('acai_products').delete().eq('id', id);
      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
    }
  }

  function handleEdit(product: AcaiProduct) {
    setEditingProduct(product);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingProduct(null);
    loadProducts();
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Tamanhos de Copos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus size={20} />
          Novo Tamanho
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleCloseForm}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-teal-200 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800">
                  {product.name}
                </h3>
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Tamanho:</span>
                    <span className="text-sm font-medium text-slate-800">{product.size_ml}ml</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Preço:</span>
                    <span className="text-sm font-semibold text-teal-600">
                      {formatCurrency(product.sale_price)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Categoria:</span>
                    <span className="text-sm font-medium text-slate-800">{product.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 ml-4">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhum tamanho cadastrado. Clique em "Novo Tamanho" para começar.
        </div>
      )}
    </div>
  );
}
