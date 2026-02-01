import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Hash, Shield, Plus, Trash2 } from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui';

export default function SettingsView({ categories, tenants, onUpdate }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');

  const handleAddCategory = async () => {
    if (!newCatName) return;
    const { error } = await supabase.from('categories').insert({ label: newCatName, icon: newCatIcon });
    if (!error) { setNewCatName(''); onUpdate(); }
  };

  const handleDeleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) onUpdate();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div><h2 className="text-2xl font-bold text-white">System Settings</h2></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hash size={20} /></div>
              <h3>Issue Categories</h3>
           </div>
           <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-slate-500/10 text-slate-400`}>{getIcon(cat.icon, 16)}</div>
                      <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                   </div>
                   <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
           </div>
           {/* IMPROVED SELECTOR */}
           <div className="flex gap-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-center w-10 h-10 bg-white/5 rounded-lg border border-white/10">
                 {getIcon(newCatIcon, 20, "text-blue-400")}
              </div>
              <input type="text" placeholder="Name" className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 text-white" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <select className="bg-black/20 border border-white/10 rounded-lg px-3 text-slate-300" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}>
                {['Briefcase','Monitor','Cpu','Wifi','ShieldAlert','Wrench','Zap','Globe','FileText'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <button onClick={handleAddCategory} className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"><Plus size={16} /></button>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
