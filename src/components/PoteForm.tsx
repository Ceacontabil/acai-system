import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Pote } from '../lib/types';
import { X } from 'lucide-react';

interface PoteFormProps {
  pote: Pote | null;
  onClose: () => void;
}

export function PoteForm({ pote, onClose }: PoteFormProps) {
  const [formData, setFormData] = useState({
    flavor: pote?.flavor || '',
    size_liters: pote?.size_liters || 0,
    cost_price: pote?.cost_price || 0,
    purchase_date: pote?.purchase_date
      ? new Date(pote.purchase_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const totalMl = Math.round(formData.size_liters * 1000);

      if (pote) {
        const { error } = await supabase
          .from('potes')
          .update({
            flavor: formData.flavor,
            size_liters: formData.size_liters,
            cost_price: formData.cost_price,
            purchase_date: new Date(formData.purchase_date).toISOString(),
            total_ml: totalMl,
            remaining_ml: totalMl,
          })
          .eq('id', pote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('potes').insert([
          {
            flavor: formData.flavor,
            size_liters: formData.size_liters,
            cost_price: formData.cost_price,
            purchase_date: new Date(formData.purchase_date).toISOString(),
            total_ml: totalMl,
            remaining_ml: totalMl,
            status: 'ativo',
          },
        ]);
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar pote:', error);
      alert('Erro ao salvar pote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {pote ? 'Editar Pote' : 'Novo Pote'}
          </h3>
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
              Sabor *
            </label>
            <input
              type="text"
              required
              value={formData.flavor}
              onChange={(e) => setFormData({ ...formData, flavor: e.target.value })}
              placeholder="Ex: Açaí tradicional, Açaí com banana..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tamanho (Litros) *
              </label>
              <input
                type="number"
                required
                step="0.1"
                min="0.1"
                value={formData.size_liters}
                onChange={(e) =>
                  setFormData({ ...formData, size_liters: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                = {Math.round(formData.size_liters * 1000)}ml
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preço de Custo *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) =>
                  setFormData({ ...formData, cost_price: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data da Compra *
            </label>
            <input
              type="date"
              required
              value={formData.purchase_date}
              onChange={(e) =>
                setFormData({ ...formData, purchase_date: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>

          {formData.size_liters > 0 && formData.cost_price > 0 && (
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Custo por ML:</span>{' '}
                <span className="text-purple-700 font-semibold">
                  R${' '}
                  {(
                    formData.cost_price /
                    (formData.size_liters * 1000)
                  ).toLocaleString('pt-BR', {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </p>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
