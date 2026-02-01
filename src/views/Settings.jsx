import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Hash, Shield, Plus, Trash2 } from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui';

export default function SettingsView({ categories, tenants, onUpdate }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');

  const handleAddCategory = async () => {
    if (!newCatName) return;
    const { error } = await supabase.from('categories').insert({ 
      label: newCatName, 
      icon: newCatIcon,
      color: 'text-slate-200', 
      bg: 'bg-slate-500/10'
    });
    if (!error) { 
      setNewCatName(''); 
      onUpdate(); 
    } else {
      alert(error.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) onUpdate();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-slate-400">Configure global parameters and data structures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: CATEGORIES */}
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hash size={20} /></div>
              <div><h3 className="font-semibold text-white">Issue Categories</h3></div>
           </div>

           <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cat.bg || 'bg-slate-500/10'} ${cat.color || 'text-slate-400'}`}>
                         {getIcon(cat.icon, 16)}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                   </div>
                   <button 
                     onClick={() => handleDeleteCategory(cat.id)} 
                     className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-center text-slate-500 py-4">No categories found.</p>}
           </div>

           {/* ICON SELECTOR INPUTS */}
           <div className="flex gap-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-center w-10 h-10 bg-white/5 rounded-lg border border-white/10 shrink-0">
                 {getIcon(newCatIcon, 20, "text-blue-400")}
              </div>
              <input 
                type="text" 
                placeholder="Name" 
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 text-white focus:outline-none focus:border-blue-500/50" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <select 
                className="bg-black/20 border border-white/10 rounded-lg px-3 text-slate-300 focus:outline-none" 
                value={newCatIcon} 
                onChange={e => setNewCatIcon(e.target.value)}
              >
                {['Briefcase','Monitor','Cpu','Wifi','ShieldAlert','Wrench','Zap','Globe','FileText','ShoppingBag'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <button onClick={handleAddCategory} className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                <Plus size={16} />
              </button>
           </div>
        </GlassCard>

        {/* RIGHT COLUMN: ACCESS CONTROL (RESTORED) */}
        <GlassCard className="p-6 space-y-6 h-fit">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Shield size={20} /></div>
              <div><h3 className="font-semibold text-white">Access Control</h3></div>
           </div>
           <div className="space-y-3">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tenants</label>
             {tenants.map(t => (
               <div key={t.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                 <span className="text-sm text-white">{t.name}</span>
                 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Active</span>
               </div>
             ))}
             {tenants.length === 0 && <p className="text-center text-slate-500 py-4 text-sm">No tenants loaded.</p>}
           </div>
        </GlassCard>

      </div>
    </div>
  );
}
