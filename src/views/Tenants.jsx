import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, Plus, Search, Globe, Hash, Trash2, Edit2, CheckCircle2, XCircle 
} from 'lucide-react';
import { GlassCard, Modal } from '../components/ui';

export default function TenantsView({ tenants = [], onUpdate }) {
  // We use internal state for immediate updates, but also accept props
  const [localTenants, setLocalTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', domain: '' });

  // --- 1. FETCH DATA ---
  useEffect(() => { 
    fetchTenants(); 
  }, []);

  async function fetchTenants() {
    setLoading(true);
    const { data } = await supabase.from('tenants').select('*').order('name');
    if (data) setLocalTenants(data);
    setLoading(false);
  }

  // --- 2. ACTIONS ---
  const openCreateModal = () => {
    setEditingTenant(null);
    setFormData({ name: '', code: '', domain: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e, tenant) => {
    e.stopPropagation();
    setEditingTenant(tenant);
    setFormData({ name: tenant.name, code: tenant.code, domain: tenant.domain || '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) { 
        alert("Name and Code are required."); 
        return; 
    }

    if (editingTenant) {
      // UPDATE
      const { error } = await supabase
        .from('tenants')
        .update({ 
            name: formData.name, 
            code: formData.code, 
            domain: formData.domain 
        })
        .eq('id', editingTenant.id);
      
      if (error) alert(error.message);
    } else {
      // CREATE
      const { error } = await supabase
        .from('tenants')
        .insert({ 
            name: formData.name, 
            code: formData.code.toUpperCase(), 
            domain: formData.domain, 
            status: 'Active' 
        });
      
      if (error) alert(error.message);
    }
    
    setIsModalOpen(false);
    fetchTenants();
    if (onUpdate) onUpdate(); // Sync with App.jsx
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Are you sure? This will permanently delete the tenant.")) return;
    
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (!error) {
        fetchTenants();
        if (onUpdate) onUpdate();
    } else {
        alert(error.message);
    }
  };

  // Filter Logic
  const filteredTenants = localTenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Tenant Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Provision and manage school instances</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 group-focus-within:text-blue-500" />
            <input 
              type="text" 
              placeholder="Search tenants..." 
              className="bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 w-64 transition-all shadow-sm"
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <button 
            onClick={openCreateModal} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} /> Provision New Tenant
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredTenants.map(tenant => (
           <GlassCard 
             key={tenant.id} 
             className="p-6 relative group border border-slate-300 dark:border-white/5 hover:border-blue-400 dark:hover:border-white/20 transition-all min-h-[180px] flex flex-col justify-between"
           >
              {/* TOP ROW: Icon + Actions */}
              <div className="flex justify-between items-start">
                 <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-transparent">
                    <Building2 size={24} />
                 </div>
                 {/* Action Buttons (Top Right) */}
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditModal(e, tenant)} className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-black/20 dark:hover:bg-black/40 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={(e) => handleDelete(e, tenant.id)} className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-100 hover:bg-slate-200 dark:bg-black/20 dark:hover:bg-black/40 rounded-lg transition-colors"><Trash2 size={14} /></button>
                 </div>
              </div>
              
              {/* MIDDLE: Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{tenant.name}</h3>
                <div className="space-y-2">
                   <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <Hash size={14} className="text-slate-400 dark:text-slate-600" />
                      <span className="font-mono bg-slate-100 dark:bg-white/5 px-1.5 rounded text-xs border border-slate-200 dark:border-transparent text-slate-700 dark:text-slate-300">
                        {tenant.code}
                      </span>
                   </div>
                   <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <Globe size={14} className="text-slate-400 dark:text-slate-600" />
                      <span>{tenant.domain || 'No domain configured'}</span>
                   </div>
                </div>
              </div>

              {/* BOTTOM RIGHT: Status Badge */}
              <div className="absolute bottom-6 right-6">
                 {tenant.status === 'Active' ? 
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                      <CheckCircle2 size={10} /> ACTIVE
                    </span>
                  : 
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/10 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-500/20">
                      <XCircle size={10} /> INACTIVE
                    </span>
                 }
              </div>
           </GlassCard>
         ))}
      </div>

      {/* MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTenant ? "Edit Tenant" : "Provision New Tenant"}>
         <div className="space-y-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Organization Name</label>
               <input 
                 autoFocus
                 type="text" 
                 placeholder="e.g. Westside Academy" 
                 className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
                 value={formData.name} 
                 onChange={e => setFormData({...formData, name: e.target.value})} 
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tenant Code</label>
                 <input 
                   type="text" 
                   placeholder="WSA" 
                   className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500/50"
                   value={formData.code} 
                   onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Domain</label>
                 <input 
                   type="text" 
                   placeholder="westside.edu" 
                   className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
                   value={formData.domain} 
                   onChange={e => setFormData({...formData, domain: e.target.value})} 
                 />
               </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
                    <strong>Note:</strong> Creating a tenant establishes a new data silo. Users with the email domain <span className="font-mono font-bold">@{formData.domain || '...'}</span> will be mapped here.
                </p>
            </div>
            
            <button 
                onClick={handleSave} 
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all"
            >
                {editingTenant ? "Save Changes" : "Provision Tenant"}
            </button>
         </div>
      </Modal>
    </div>
  );
}
