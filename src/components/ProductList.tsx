import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { ProductForm } from './ProductForm';

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

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
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
    }
  }

  function handleEdit(product: Product) {
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
        <h2 className="text-2xl font-bold text-slate-800">Produtos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {showForm && (
        <ProductForm
          product={editingProduct}
          onClose={handleCloseForm}
        />
      )}

      <div className="grid gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {product.name}
                  </h3>
                  {product.stock_quantity <= product.min_stock && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm">
                      <AlertTriangle size={16} />
                      Estoque baixo
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-sm mt-1">{product.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <span className="text-xs text-slate-500">Categoria</span>
                    <p className="text-sm font-medium text-slate-700">{product.category}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Estoque</span>
                    <p className="text-sm font-medium text-slate-700">{product.stock_quantity} un.</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Custo</span>
                    <p className="text-sm font-medium text-slate-700">
                      R$ {product.cost_price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Preço Venda</span>
                    <p className="text-sm font-medium text-emerald-600">
                      R$ {product.sale_price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
        </div>
      )}
    </div>
  );
}
