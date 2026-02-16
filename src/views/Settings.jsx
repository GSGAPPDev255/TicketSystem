import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, Search, Plus, Trash2, Save, 
  Shield, Check, X, Filter, Users, Briefcase, Network, Building
} from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui'; 

export default function SettingsView({ categories, tenants, users, departments = [], onUpdate }) {
  // SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL'); 
  const [tenantFilter, setTenantFilter] = useState('ALL'); // <--- NEW TENANT FILTER
  const [userDeptMap, setUserDeptMap] = useState({}); 

  // CATEGORY EDIT STATE
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Briefcase'); 
  const [newCategoryDept, setNewCategoryDept] = useState(''); 
  const [isAddingCat, setIsAddingCat] = useState(false);

  // USER EDIT STATE
  const [editingUser, setEditingUser] = useState(null);

  // --- AVATAR HELPER ---
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/); 
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase(); 
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // 1. FETCH DEPARTMENT MEMBERSHIPS
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from('department_members').select('*');
      if (data) {
        const map = {};
        data.forEach(m => { map[m.user_id] = m.department_id; });
        setUserDeptMap(map);
      }
    };
    fetchMembers();
  }, []);

  // 2. TOGGLE TENANT ACCESS
  const handleToggleAccess = async (userId, tenantId, hasAccess) => {
    try {
      if (hasAccess) {
        await supabase.from('tenant_access').delete().match({ user_id: userId, tenant_id: tenantId });
      } else {
        await supabase.from('tenant_access').insert({ user_id: userId, tenant_id: tenantId });
      }
      onUpdate(); 
    } catch (error) {
      console.error("Access toggle failed:", error);
    }
  };

  // 3. UPDATE USER ROLE
  const handleUpdateRole = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setEditingUser(null);
    onUpdate();
  };

  // 4. UPDATE USER DEPARTMENT
  const handleUpdateDept = async (userId, newDeptId) => {
    // A. Remove old
    await supabase.from('department_members').delete().eq('user_id', userId);
    
    // B. Add new (if not "None")
    if (newDeptId) {
       await supabase.from('department_members').insert({ user_id: userId, department_id: newDeptId });
    }
    
    // C. Update local state
    setUserDeptMap(prev => ({ ...prev, [userId]: newDeptId }));
  };

  // 5. ADD CATEGORY
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    await supabase.from('categories').insert({ 
        label: newCategory, 
        icon: newCategoryIcon,
        default_department_id: newCategoryDept || null
    });
    setNewCategory('');
    setNewCategoryDept('');
    setIsAddingCat(false);
    onUpdate();
  };

  // 6. DELETE CATEGORY
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    await supabase.from('categories').delete().eq('id', id);
    onUpdate();
  };

  // --- FILTER LOGIC (UPDATED) ---
  const filteredUsers = users.filter(user => {
    // 1. Search
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) 
                       || (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Department Filter
    const userDeptId = userDeptMap[user.id]; 
    const matchesDept = deptFilter === 'ALL' || userDeptId === deptFilter;

    // 3. Tenant Filter (NEW)
    // Checks if the user's access list includes the selected tenant ID
    const matchesTenant = tenantFilter === 'ALL' || (user.access_list && user.access_list.includes(tenantFilter));

    return matchesSearch && matchesDept && matchesTenant;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Configuration</h1>
           <p className="text-slate-500 dark:text-slate-400">Manage categories, tenants, and user access control.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN: CATEGORIES (3/12) --- */}
        <div className="lg:col-span-3 space-y-6">
           <GlassCard className="p-0 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
              <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                 <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                   <Briefcase size={18} className="text-blue-500"/> Categories
                 </h3>
                 <button onClick={() => setIsAddingCat(!isAddingCat)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded">
                    {isAddingCat ? <X size={18}/> : <Plus size={18}/>}
                 </button>
              </div>
              
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                 {isAddingCat && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-2 mb-2 border border-blue-100 dark:border-blue-500/30">
                       <input 
                         autoFocus
                         className="w-full text-sm p-2 rounded border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-black/20"
                         placeholder="Category Name"
                         value={newCategory}
                         onChange={e => setNewCategory(e.target.value)}
                       />
                       <select
                          className="w-full text-sm p-2 rounded border border-blue-200 dark:border-blue-500/30 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-300"
                          value={newCategoryDept}
                          onChange={e => setNewCategoryDept(e.target.value)}
                       >
                          <option value="">No Auto-Assign</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>Assign to {d.name}</option>
                          ))}
                       </select>
                       <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded shadow-sm">
                          Save Category
                       </button>
                    </div>
                 )}

                 {categories.map(cat => (
                   <div key={cat.id} className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white dark:bg-white/10 rounded-md shadow-sm text-slate-600 dark:text-slate-300">
                            {getIcon(cat.icon)}
                         </div>
                         <div>
                            <span className="block text-sm font-medium text-slate-900 dark:text-white">{cat.label}</span>
                            {cat.default_department_id && (
                               <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 px-1.5 py-0.5 rounded">
                                 {departments.find(d => d.id === cat.default_department_id)?.name || 'Unknown Dept'}
                               </span>
                            )}
                         </div>
                      </div>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Trash2 size={16} />
                      </button>
                   </div>
                 ))}
              </div>
           </GlassCard>
        </div>

        {/* --- MIDDLE COLUMN: TENANTS LIST (2/12) --- */}
        <div className="lg:col-span-2 space-y-6">
           <GlassCard className="p-0 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
              <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                 <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                   <Building2 size={18} className="text-purple-500"/> Tenants
                 </h3>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                 {tenants.map(t => (
                   <div key={t.id} className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1 break-all">{t.domain}</p>
                   </div>
                 ))}
              </div>
           </GlassCard>
        </div>

        {/* --- RIGHT COLUMN: USERS (7/12) --- */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-0 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
              
              {/* TOOLBAR */}
              <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex flex-col xl:flex-row gap-3">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 focus:outline-none focus:border-blue-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-2">
                    {/* DEPARTMENT FILTER */}
                    <div className="relative">
                       <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
                       <select 
                         className="pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 focus:outline-none focus:border-blue-500 appearance-none min-w-[140px]"
                         value={deptFilter}
                         onChange={e => setDeptFilter(e.target.value)}
                       >
                          <option value="ALL">All Depts</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                    </div>

                    {/* NEW: TENANT FILTER */}
                    <div className="relative">
                       <Building className="absolute left-3 top-2.5 text-slate-400" size={16} />
                       <select 
                         className="pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 focus:outline-none focus:border-blue-500 appearance-none min-w-[140px]"
                         value={tenantFilter}
                         onChange={e => setTenantFilter(e.target.value)}
                       >
                          <option value="ALL">All Schools</option>
                          <hr/>
                          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {/* USER LIST */}
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 grid gap-4">
                 {filteredUsers.map(user => (
                    <div key={user.id} className="relative p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                {user.avatar_initials || getInitials(user.full_name)}
                             </div>
                             <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{user.full_name}</h4>
                                <p className="text-xs text-slate-500">{user.email}</p>
                                
                                <div className="flex items-center gap-2 mt-2">
                                   {/* ROLE BADGE */}
                                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                      user.role === 'admin' || user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                   }`}>
                                      {user.role}
                                   </span>
                                   
                                   {/* DEPT DROPDOWN */}
                                   <select 
                                      className="text-[10px] px-1 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-transparent text-slate-600 dark:text-slate-400 focus:outline-none focus:border-blue-500"
                                      value={userDeptMap[user.id] || ''}
                                      onChange={(e) => handleUpdateDept(user.id, e.target.value)}
                                   >
                                      <option value="">No Dept</option>
                                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                   </select>
                                </div>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400"
                          >
                             <Settings size={16} />
                          </button>
                       </div>

                       {/* EXPANDABLE EDIT AREA */}
                       {editingUser === user.id && (
                         <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4">
                               {/* ROLE EDIT */}
                               <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">System Role</label>
                                  <select 
                                    className="w-full text-xs p-2 rounded border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20"
                                    value={user.role || 'user'}
                                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                  >
                                     <option value="user">User</option>
                                     <option value="technician">Technician</option>
                                     <option value="manager">Manager</option>
                                     <option value="admin">Admin</option>
                                  </select>
                               </div>

                               {/* TENANT ACCESS TOGGLES */}
                               <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">School Access</label>
                                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                     {tenants.map(t => {
                                        const hasAccess = user.access_list?.includes(t.id);
                                        return (
                                          <div key={t.id} onClick={() => handleToggleAccess(user.id, t.id, hasAccess)} className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer group transition-colors">
                                             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                 hasAccess 
                                                 ? 'bg-indigo-500 border-indigo-500' 
                                                 : 'bg-white dark:bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                                             }`}>
                                                {hasAccess && <Check size={12} className="text-white" />}
                                             </div>
                                             <span className={`text-sm font-medium ${hasAccess ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{t.name}</span>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>
                         </div>
                       )}
                    </div>
                 ))}
                 
                 {filteredUsers.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                       <Shield size={48} className="mx-auto mb-2 opacity-20" />
                       <p>No users found matching filters.</p>
                    </div>
                 )}
              </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
