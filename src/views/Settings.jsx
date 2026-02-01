import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Hash, Shield, Plus, Trash2, Search, CheckCircle2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui';

export default function SettingsView({ categories, tenants, users = [], onUpdate }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');
  
  // Access Control State
  const [userSearch, setUserSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async () => {
    if (!newCatName) return;
    const { error } = await supabase.from('categories').insert({ label: newCatName, icon: newCatIcon, color: 'text-slate-200', bg: 'bg-slate-500/10' });
    if (!error) { setNewCatName(''); onUpdate(); }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Delete category?")) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) onUpdate();
  };

  // --- ACCESS CONTROL ACTIONS ---
  const toggleAccess = async (userId, tenantId, hasAccess) => {
    if (hasAccess) {
      // Revoke
      await supabase.from('tenant_access').delete().match({ user_id: userId, tenant_id: tenantId });
    } else {
      // Grant
      await supabase.from('tenant_access').insert({ user_id: userId, tenant_id: tenantId });
    }
    onUpdate(); // Refresh global data
  };

  // --- SAFETY FILTER ---
  // Fixes the "Blank Page" crash by handling null values safely
  const filteredUsers = users.filter(u => {
    const search = userSearch.toLowerCase();
    const name = (u.full_name || '').toLowerCase(); // Fallback to empty string
    const email = (u.email || '').toLowerCase();     // Fallback to empty string
    return name.includes(search) || email.includes(search);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div><h2 className="text-2xl font-bold text-white">System Settings</h2></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT: CATEGORIES */}
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hash size={20} /></div>
              <h3>Issue Categories</h3>
           </div>
           <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cat.bg || 'bg-slate-500/10'} ${cat.color || 'text-slate-400'}`}>{getIcon(cat.icon, 16)}</div>
                      <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                   </div>
                   <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
           </div>
           <div className="flex gap-2 pt-4 border-t border-white/10">
              <div className="flex items-center justify-center w-10 h-10 bg-white/5 rounded-lg border border-white/10 shrink-0">{getIcon(newCatIcon, 20, "text-blue-400")}</div>
              <input type="text" placeholder="Name" className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 text-white" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <select className="bg-black/20 border border-white/10 rounded-lg px-3 text-slate-300" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}>
                {['Briefcase','Monitor','Cpu','Wifi','ShieldAlert','Wrench','Zap','Globe','FileText'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <button onClick={handleAddCategory} className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"><Plus size={16} /></button>
           </div>
        </GlassCard>

        {/* RIGHT: CROSS-TENANT ACCESS */}
        <GlassCard className="p-6 space-y-6 h-fit">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Shield size={20} /></div>
              <div><h3 className="font-semibold text-white">Cross-Tenant Access</h3><p className="text-xs text-slate-400">Manage multi-school permissions</p></div>
           </div>

           {/* User Search */}
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input type="text" placeholder="Search users..." className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
           </div>

           {/* User List */}
           <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredUsers.length === 0 ? (
                 <p className="text-center text-slate-500 py-4 text-sm">No users found.</p>
              ) : (
                filteredUsers.map(user => {
                   const isExpanded = expandedUser === user.id;
                   const tenantCount = user.access_list?.length || 0;
                   
                   return (
                     <div key={user.id} className={`bg-white/5 border border-white/5 rounded-xl overflow-hidden transition-all ${isExpanded ? 'bg-white/10 border-indigo-500/30' : ''}`}>
                        <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5" onClick={() => setExpandedUser(isExpanded ? null : user.id)}>
                           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                              {user.avatar_initials || '?'}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white truncate">{user.full_name || 'Unknown User'}</h4>
                              <p className="text-xs text-slate-400 truncate">{user.email || 'No Email'}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">{tenantCount} Tenants</span>
                              {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                           </div>
                        </div>

                        {/* Accordion: Tenant Toggles */}
                        {isExpanded && (
                           <div className="bg-black/20 p-3 border-t border-white/5 space-y-1">
                              <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2 ml-1">Authorized Scopes</p>
                              {tenants.map(t => {
                                 const hasAccess = user.access_list?.includes(t.id);
                                 return (
                                   <div key={t.id} onClick={() => toggleAccess(user.id, t.id, hasAccess)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 cursor-pointer group">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${hasAccess ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                         {hasAccess && <CheckCircle2 size={12} className="text-white" />}
                                      </div>
                                      <span className={`text-sm ${hasAccess ? 'text-white' : 'text-slate-400'}`}>{t.name}</span>
                                      <span className="ml-auto text-[10px] font-mono text-slate-600 bg-white/5 px-1.5 rounded">{t.code}</span>
                                   </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                   );
                })
              )}
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
