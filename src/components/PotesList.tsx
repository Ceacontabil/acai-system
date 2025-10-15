import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Pote } from '../lib/types';
import { formatCurrency } from '../lib/types';
import { Plus, Edit2, Trash2, PackageX } from 'lucide-react';
import { PoteForm } from './PoteForm';

export function PotesList() {
  const [potes, setPotes] = useState<Pote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPote, setEditingPote] = useState<Pote | null>(null);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'esgotado'>('todos');

  useEffect(() => {
    loadPotes();
  }, []);

  async function loadPotes() {
    try {
      let query = supabase
        .from('potes')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (filterStatus !== 'todos') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPotes(data || []);
    } catch (error) {
      console.error('Erro ao carregar potes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este pote?')) return;

    try {
      const { error } = await supabase.from('potes').delete().eq('id', id);
      if (error) throw error;
      loadPotes();
    } catch (error) {
      console.error('Erro ao excluir pote:', error);
    }
  }

  function handleEdit(pote: Pote) {
    setEditingPote(pote);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingPote(null);
    loadPotes();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function getPercentageRemaining(pote: Pote): number {
    return (pote.remaining_ml / pote.total_ml) * 100;
  }

  const filteredPotes = potes;

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Potes de Açaí</h2>
        <div className="flex gap-3 items-center">
          <div className="flex gap-2 bg-slate-200 rounded-lg p-1">
            {(['todos', 'ativo', 'esgotado'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setTimeout(loadPotes, 0);
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Novo Pote
          </button>
        </div>
      </div>

      {showForm && <PoteForm pote={editingPote} onClose={handleCloseForm} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPotes.map((pote) => {
          const percentRemaining = getPercentageRemaining(pote);
          return (
            <div
              key={pote.id}
              className={`bg-white rounded-lg shadow-sm p-4 border-2 transition-all ${
                pote.status === 'esgotado'
                  ? 'border-slate-300 opacity-60'
                  : 'border-purple-200 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {pote.flavor}
                    </h3>
                    {pote.status === 'esgotado' && (
                      <span className="flex items-center gap-1 text-slate-500 text-xs">
                        <PackageX size={14} />
                        Esgotado
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm">
                    {pote.size_liters}L ({pote.total_ml}ml)
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(pote)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(pote.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Custo:</span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(pote.cost_price)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Comprado em:</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(pote.purchase_date)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Restante:</span>
                  <span className="font-medium text-purple-600">
                    {pote.remaining_ml}ml de {pote.total_ml}ml
                  </span>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Progresso</span>
                    <span>{percentRemaining.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentRemaining > 50
                          ? 'bg-emerald-500'
                          : percentRemaining > 20
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${percentRemaining}%` }}
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-1">
                  <span>Custo por ML: </span>
                  <span className="font-medium">
                    {formatCurrency(pote.cost_price / pote.total_ml)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPotes.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhum pote cadastrado. Clique em "Novo Pote" para começar.
        </div>
      )}
    </div>
  );
}
