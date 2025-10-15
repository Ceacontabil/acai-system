import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Expense } from '../lib/types';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ExpenseForm } from './ExpenseForm';

export function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      loadExpenses();
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
    }
  }

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingExpense(null);
    loadExpenses();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Despesas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={20} />
          Nova Despesa
        </button>
      </div>

      {showForm && (
        <ExpenseForm expense={editingExpense} onClose={handleCloseForm} />
      )}

      <div className="grid gap-4">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800">
                  {expense.description}
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  {formatDate(expense.expense_date)}
                </p>
                <div className="flex gap-6 mt-3">
                  <div>
                    <span className="text-xs text-slate-500">Categoria</span>
                    <p className="text-sm font-medium text-slate-700">
                      {expense.category}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Valor</span>
                    <p className="text-sm font-medium text-red-600">
                      R$ {expense.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(expense)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {expenses.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Nenhuma despesa registrada. Clique em "Nova Despesa" para começar.
        </div>
      )}
    </div>
  );
}
