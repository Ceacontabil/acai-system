import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProductList } from './components/ProductList';
import { SalesList } from './components/SalesList';
import { ExpensesList } from './components/ExpensesList';
import { PotesList } from './components/PotesList';
import { LayoutDashboard, Package, ShoppingCart, Receipt, Coffee } from 'lucide-react';

type Tab = 'dashboard' | 'potes' | 'products' | 'sales' | 'expenses';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker registrado'))
        .catch((error) => console.log('Erro ao registrar Service Worker:', error));
    }
  }, []);

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'potes' as Tab, label: 'Potes', icon: Coffee },
    { id: 'products' as Tab, label: 'Tamanhos', icon: Package },
    { id: 'sales' as Tab, label: 'Vendas', icon: ShoppingCart },
    { id: 'expenses' as Tab, label: 'Despesas', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Gestão de Açaí</h1>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-slate-800 border-b-2 border-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'potes' && <PotesList />}
        {activeTab === 'products' && <ProductList />}
        {activeTab === 'sales' && <SalesList />}
        {activeTab === 'expenses' && <ExpensesList />}
      </main>
    </div>
  );
}

export default App;
