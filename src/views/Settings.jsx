import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, Search, Plus, Trash2, Save, 
  Shield, Check, X, Filter, Users 
} from 'lucide-react';
import { GlassCard } from '../components/ui';

export default function SettingsView({ categories, tenants, users, departments = [], onUpdate }) {
  // SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL'); // 'ALL' or UUID
  const [userDeptMap, setUserDeptMap] = useState({}); // Map: userID -> [deptID, deptID]

  // CATEGORY EDIT STATE
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // USER EDIT STATE
  const [editingUser, setEditingUser] = useState(null);

  // 1. FETCH DEPARTMENT MEMBERSHIPS ON LOAD
  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    // Get all links between users and departments
    const { data } = await supabase.from('department_members').select('user_id, department_id');
    
    if (data) {
      // Transform into a quick lookup map: { 'user_123': ['dept_A', 'dept_B'] }
      const map = {};
      data.forEach(link => {
        if (!map[link.user_id]) map[link.user_id] = [];
        map[link.user_id].push(link.department_id);
      });
      setUserDeptMap(map);
    }
  };

  // --- CATEGORY LOGIC ---
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await supabase.from('categories').insert({ label: newCategory });
    setNewCategory('');
    setIsAddingCat(false);
    onUpdate();
  };

  const handleDeleteCategory = async (id) => {
    if (confirm('Delete this category?')) {
      await supabase.from('categories').delete().eq('id', id);
      onUpdate();
    }
  };

  // --- USER LOGIC ---
  const handleUpdateUser = async (userId, updates) => {
    await supabase.from('profiles').update(updates).eq('id', userId);
    onUpdate();
  };

  const handleToggleAccess = async (userId, tenantId, hasAccess) => {
    if (hasAccess) {
      await supabase.from('tenant_access').delete().match({ user_id: userId, tenant_id: tenantId });
    } else {
      await supabase.from('tenant_access').insert({ user_id: userId, tenant_id: tenantId });
    }
    onUpdate();
  };

  // --- FILTERING LOGIC ---
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = 
      deptFilter === 'ALL' || 
      (userDeptMap[user.id] && userDeptMap[user.id].includes(deptFilter));

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">System Settings</h2>
          <p className="text-slate-400">Manage drop-downs, users, and permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: CATEGORIES */}
        <div className="space-y-6">
          <GlassCard className="p-6 border-t-4 border-t-blue-500 h-full">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-blue-400">
                   <Filter size={20} />
                   <h3 className="font-bold text-lg text-white">Issue Categories</h3>
                </div>
                <button onClick={() => setIsAddingCat(true)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><Plus size={18} /></button>
             </div>

             <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {isAddingCat && (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                     <input 
                       autoFocus
                       className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" 
                       placeholder="Category Name"
                       value={newCategory}
                       onChange={e => setNewCategory(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                     />
                     <button onClick={handleAddCategory} className="p-2 bg-blue-600 text-white rounded"><Check size={16} /></button>
                  </div>
                )}
                {categories.map(cat => (
                  <div key={cat.id} className="group flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                     <span className="text-slate-200">{cat.label}</span>
                     <button onClick={() => handleDeleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity"><Trash2 size={14} /></button>
                  </div>
                ))}
             </div>
          </GlassCard>
        </div>

        {/* RIGHT COL: USER MANAGEMENT */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 border-t-4 border-t-indigo-500 min-h-[600px]">
             <div className="flex items-center gap-2 text-indigo-400 mb-6">
                <Shield size={20} />
                <h3 className="font-bold text-lg text-white">User & Access Management</h3>
             </div>

             {/* TOOLBAR: SEARCH + DEPARTMENT FILTER */}
             <div className="flex gap-4 mb-6">
                {/* Search Bar */}
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                   <input 
                     type="text" 
                     placeholder="Search users..." 
                     className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>

                {/* Department Dropdown (NEW) */}
                <div className="relative w-1/3">
                   <select 
                     className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-8 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                     value={deptFilter}
                     onChange={e => setDeptFilter(e.target.value)}
                   >
                      <option value="ALL">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                   </select>
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Users size={16} />
                   </div>
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Filter size={12} />
                   </div>
                </div>
             </div>

             {/* USER LIST */}
             <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {filteredUsers.map(user => (
                   <div key={user.id} className="bg-white/5 rounded-xl border border-white/5 p-4 transition-all hover:border-white/10">
                      <div className="flex justify-between items-start">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-white/10">
                               {user.avatar_initials}
                            </div>
                            <div>
                               <h4 className="font-bold text-white text-sm">{user.full_name || 'Unknown User'}</h4>
                               <div className="flex gap-2 items-center">
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                     user.role === 'super_admin' ? 'bg-rose-500/20 text-rose-400' :
                                     user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                     user.role === 'manager' ? 'bg-orange-500/20 text-orange-400' :
                                     user.role === 'technician' ? 'bg-blue-500/20 text-blue-400' :
                                     'bg-slate-500/20 text-slate-400'
                                  }`}>{user.role}</span>
                                  <span className="text-xs text-slate-500">{user.email}</span>
                               </div>
                            </div>
                         </div>

                         {/* EDIT TOGGLE */}
                         <button onClick={() => setEditingUser(editingUser === user.id ? null : user.id)} className="text-xs text-slate-400 hover:text-white underline">
                            {editingUser === user.id ? 'Close' : 'Manage'}
                         </button>
                      </div>

                      {/* EDIT PANEL */}
                      {editingUser === user.id && (
                        <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                           
                           {/* ROLE SELECTOR */}
                           <div className="mb-4">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Global System Role</label>
                              <select 
                                className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white"
                                value={user.role}
                                onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                              >
                                 <option value="user">Staff (User) - Can only raise tickets</option>
                                 <option value="technician">Technician - Can resolve tickets</option>
                                 <option value="manager">Manager - Can view reports</option>
                                 <option value="admin">Admin - Can manage most settings</option>
                                 <option value="super_admin">Super Admin - Full Control</option>
                              </select>
                           </div>

                           {/* TENANT TOGGLES */}
                           <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tenant Access Scopes</label>
                              <div className="space-y-2">
                                 {tenants.map(t => {
                                    const hasAccess = user.access_list?.includes(t.id);
                                    return (
                                       <div key={t.id} onClick={() => handleToggleAccess(user.id, t.id, hasAccess)} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer group">
                                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasAccess ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                             {hasAccess && <Check size={12} className="text-white" />}
                                          </div>
                                          <span className={hasAccess ? 'text-white' : 'text-slate-400'}>{t.name}</span>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                      )}
                   </div>
                ))}
             </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
