import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Hash, Shield, Plus, Trash2, Search, UserPlus, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui';

export default function SettingsView({ tenants }) {
  // --- REAL STATE ---
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- INPUT STATE ---
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');
  const [userSearch, setUserSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  // --- 1. FETCH DATA ON LOAD ---
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (data) setCategories(data);
    setLoading(false);
  }

  // --- 2. ADD CATEGORY (REAL DB INSERT) ---
  const handleAddCategory = async () => {
    if (!newCatName) return;

    const newCat = {
      label: newCatName,
      icon: newCatIcon,
      color: 'text-slate-200', // Default styling
      bg: 'bg-slate-500/10'
    };

    // OPTIMISTIC UPDATE (Show it immediately)
    const tempId = Date.now();
    setCategories([...categories, { ...newCat, id: tempId }]);
    setNewCatName('');

    // DB INSERT
    const { error } = await supabase.from('categories').insert(newCat);
    
    if (error) {
      alert("Failed to save: " + error.message);
      fetchCategories(); // Revert on error
    } else {
      fetchCategories(); // Refresh to get real ID
    }
  };

  // --- 3. DELETE CATEGORY (REAL DB DELETE) ---
  const handleDeleteCategory = async (id) => {
    // OPTIMISTIC UPDATE
    setCategories(categories.filter(c => c.id !== id));

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert("Failed to delete: " + error.message);
      fetchCategories();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-slate-400">Configure global parameters and data structures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: CATEGORIES (CONNECTED TO DB) */}
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hash size={20} /></div>
              <div>
                <h3 className="font-semibold text-white">Issue Categories</h3>
                <p className="text-xs text-slate-400">Define the classification for tickets</p>
              </div>
           </div>

           <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cat.bg} ${cat.color}`}>
                         {getIcon(cat.icon, 16)}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                   </div>
                   <button 
                     onClick={() => handleDeleteCategory(cat.id)}
                     className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              ))}
              {categories.length === 0 && !loading && <p className="text-sm text-slate-500 text-center py-4">No categories found.</p>}
           </div>

           {/* INPUTS */}
           <div className="flex gap-2 pt-4 border-t border-white/10">
              <input 
                type="text" 
                placeholder="New Category Name" 
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <select 
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
              >
                <option value="Briefcase">Generic</option>
                <option value="Monitor">Hardware</option>
                <option value="Cpu">Software</option>
                <option value="Wifi">Network</option>
                <option value="ShieldAlert">Security</option>
              </select>
              <button 
                onClick={handleAddCategory}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
              </button>
           </div>
        </GlassCard>

        {/* RIGHT COLUMN: ACCESS CONTROL (Mock for now, needs Users table populating first) */}
        <GlassCard className="p-6 space-y-6 h-fit">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Shield size={20} /></div>
              <div>
                <h3 className="font-semibold text-white">Cross-Tenant Access</h3>
                <p className="text-xs text-slate-400">Manage users with multi-school permissions</p>
              </div>
           </div>
           
           <div className="text-center py-8 text-slate-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
              <p>User Directory Integration Required.</p>
              <p className="text-xs mt-2">Once users sign in via SSO, they will appear here.</p>
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
