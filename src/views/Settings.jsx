import React, { useState } from 'react';
import { Hash, Shield, Plus, Trash2, Search, UserPlus, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui';

export default function SettingsView({ categories: initialCategories, tenants }) {
  // --- LOCAL STATE FOR UI INTERACTION ---
  const [categories, setCategories] = useState(initialCategories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');
  
  const [userSearch, setUserSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  
  // Mock Data for the "Cross-Tenant" demo
  const [privilegedUsers, setPrivilegedUsers] = useState([
    { id: 'u1', name: 'Alex Chen', role: 'IT Lead', tenants: ['t1', 't2', 't3', 't4'], avatar: 'AC', color: 'bg-indigo-500' },
    { id: 'u2', name: 'Susan Wojcicki', role: 'Head of HR', tenants: ['t1', 't2', 't3'], avatar: 'SW', color: 'bg-rose-500' },
    { id: 'u3', name: 'Dave Miller', role: 'Estates Mgr', tenants: ['t1', 't2'], avatar: 'DM', color: 'bg-amber-500' }
  ]);

  // --- HANDLERS ---
  const handleAddCategory = () => {
    if (!newCatName) return;
    const newCat = {
      id: newCatName.toLowerCase().replace(' ', '-'),
      label: newCatName,
      icon: newCatIcon,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10'
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
  };

  const handleDeleteCategory = (id) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const handleAddUser = () => {
    if (!userSearch) return;
    const newUser = {
        id: `u${Date.now()}`,
        name: userSearch,
        role: 'Staff',
        tenants: ['t1'], 
        avatar: userSearch.charAt(0).toUpperCase(),
        color: 'bg-emerald-500'
    };
    setPrivilegedUsers([...privilegedUsers, newUser]);
    setUserSearch('');
  };

  const toggleTenantForUser = (userId, tenantId) => {
    setPrivilegedUsers(users => users.map(u => {
        if (u.id !== userId) return u;
        const hasTenant = u.tenants.includes(tenantId);
        return {
            ...u,
            tenants: hasTenant 
                ? u.tenants.filter(t => t !== tenantId)
                : [...u.tenants, tenantId]
        };
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-slate-400">Configure global parameters and data structures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: CATEGORIES */}
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
           </div>

           {/* Add Category Input */}
           <div className="flex gap-2 pt-4 border-t border-white/10">
              <input 
                type="text" 
                placeholder="New Category Name" 
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <select 
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
              >
                <option value="Briefcase">Generic</option>
                <option value="Globe">Web</option>
                <option value="Zap">Power</option>
                <option value="Monitor">Hardware</option>
              </select>
              <button 
                onClick={handleAddCategory}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
              </button>
           </div>
        </GlassCard>

        {/* RIGHT COLUMN: CROSS-TENANT ACCESS */}
        <GlassCard className="p-6 space-y-6 h-fit">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Shield size={20} /></div>
              <div>
                <h3 className="font-semibold text-white">Cross-Tenant Access</h3>
                <p className="text-xs text-slate-400">Manage users with multi-school permissions</p>
              </div>
           </div>

           {/* User Search */}
           <div className="flex gap-2">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                 <input 
                    type="text" 
                    placeholder="Search directory to grant access..." 
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                 />
              </div>
              <button 
                 onClick={handleAddUser}
                 disabled={!userSearch}
                 className="px-3 py-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-sm transition-colors border border-indigo-500/20"
              >
                 <UserPlus size={16} />
              </button>
           </div>

           {/* Privileged User List */}
           <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Privileged Users ({privilegedUsers.length})</label>
              {privilegedUsers.map(user => (
                 <div key={user.id} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden transition-all">
                    <div 
                       className="p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5"
                       onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    >
                       <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                          {user.avatar}
                       </div>
                       <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">{user.name}</h4>
                          <p className="text-xs text-slate-400">{user.role} • {user.tenants.length} Tenants</p>
                       </div>
                       {expandedUser === user.id ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                    </div>

                    {/* Accordion Content */}
                    {expandedUser === user.id && (
                       <div className="bg-black/20 p-3 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Authorized Scopes</p>
                          {tenants.map(t => (
                             <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${user.tenants.includes(t.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 bg-transparent'}`}>
                                   {user.tenants.includes(t.id) && <CheckCircle2 size={12} className="text-white" />}
                                </div>
                                <input 
                                   type="checkbox" 
                                   className="hidden" 
                                   checked={user.tenants.includes(t.id)}
                                   onChange={() => toggleTenantForUser(user.id, t.id)}
                                />
                                <span className={`text-sm ${user.tenants.includes(t.id) ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{t.name}</span>
                                <span className="ml-auto text-[10px] text-slate-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">{t.code}</span>
                             </label>
                          ))}
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
