// src/views/Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, Search, Plus, Trash2, 
  Shield, Check, X, Filter, Briefcase, Building, Settings, 
  ChevronRight, ChevronDown, Crown, Laptop, User, Globe, MoreHorizontal
} from 'lucide-react';

// --- INTERNAL HELPERS ---
const getIcon = (name, size=16, className="") => {
    const icons = { Briefcase, Building, Settings, Shield, Users: User, Network: Laptop, Globe };
    const Icn = icons[name] || Briefcase;
    return <Icn size={size} className={className} />;
};

const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/); 
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase(); 
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

export default function SettingsView({ categories, tenants, users, departments = [], onUpdate }) {
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL'); 
  const [tenantFilter, setTenantFilter] = useState('ALL'); 
  const [userDeptMap, setUserDeptMap] = useState({}); 
  
  // Category State
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Briefcase'); 
  const [newCategoryDepts, setNewCategoryDepts] = useState([]); 
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  // User Edit State
  const [editingUser, setEditingUser] = useState(null);

  // --- DATA FETCHING & ACTIONS ---
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

  const handleUpdateRole = async (userId, newRole) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { alert("Error: " + error.message); return; }
    setEditingUser(null);
    onUpdate();
  };

  const handleUpdateDept = async (userId, newDeptId) => {
    await supabase.from('department_members').delete().eq('user_id', userId);
    if (newDeptId) {
       await supabase.from('department_members').insert({ user_id: userId, department_id: newDeptId });
    }
    setUserDeptMap(prev => ({ ...prev, [userId]: newDeptId }));
  };

  const toggleCategoryDept = (deptId) => {
    setNewCategoryDepts(prev => {
      if (prev.includes(deptId)) return prev.filter(id => id !== deptId);
      return [...prev, deptId];
    });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const primaryDept = newCategoryDepts.length > 0 ? newCategoryDepts[0] : null;
    await supabase.from('categories').insert({ 
        label: newCategory, 
        icon: newCategoryIcon,
        default_department_id: primaryDept,
        department_ids: newCategoryDepts
    });
    setNewCategory('');
    setNewCategoryDepts([]);
    setNewCategoryIcon('Briefcase');
    setIsAddingCat(false);
    onUpdate();
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    await supabase.from('categories').delete().eq('id', id);
    onUpdate();
  };

  // --- FILTER LOGIC ---
  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) 
                       || (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const userDeptId = userDeptMap[user.id]; 
    const matchesDept = deptFilter === 'ALL' || userDeptId === deptFilter;
    const matchesTenant = tenantFilter === 'ALL' || (user.access_list && user.access_list.includes(tenantFilter));
    return matchesSearch && matchesDept && matchesTenant;
  });

  const availableIcons = ['Briefcase', 'Network', 'Building', 'Settings', 'Shield', 'Users', 'Globe'];

  // --- UI COMPONENT: PANEL WRAPPER ---
  const Panel = ({ children, title, icon: Icon, action, className = "" }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${className}`}>
       <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
             <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 dark:text-slate-400">
               <Icon size={16} />
             </div>
             <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">{title}</h3>
          </div>
          {action}
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {children}
       </div>
    </div>
  );

  return (
    <div className="max-w-[1920px] mx-auto space-y-8 p-6 lg:p-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
           <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
             System <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Configuration</span>
           </h1>
           <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
             Global settings, user permissions, and environment variables.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* --- LEFT: CATEGORIES (3/12) --- */}
        <div className="lg:col-span-3 h-full">
           <Panel 
             title="Categories" 
             icon={Briefcase}
             className="h-[calc(100vh-28rem)] min-h-[500px]" 
             action={
               <button onClick={() => setIsAddingCat(!isAddingCat)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-md transition-colors">
                  {isAddingCat ? <X size={16}/> : <Plus size={16}/>}
               </button>
             }
           >
              {isAddingCat && (
                 <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 space-y-3 mb-3 animate-in slide-in-from-top-2">
                    <input 
                      autoFocus
                      className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Category Name..."
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                    />
                    
                    {/* --- ICON PICKER DROPDOWN --- */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                            className="w-full flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {getIcon(newCategoryIcon, 14, "text-blue-500")}
                                <span>{newCategoryIcon}</span>
                            </div>
                            <ChevronDown size={12} className="text-slate-400"/>
                        </button>

                        {isIconPickerOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsIconPickerOpen(false)}/>
                                <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 grid grid-cols-4 gap-1">
                                    {availableIcons.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => { setNewCategoryIcon(icon); setIsIconPickerOpen(false); }}
                                            className={`p-2 flex flex-col items-center gap-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 ${
                                                newCategoryIcon === icon ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-slate-500'
                                            }`}
                                        >
                                            {getIcon(icon, 16)}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Routing</label>
                        <div className="flex flex-wrap gap-1">
                          {departments.map(dept => (
                             <button
                               key={dept.id}
                               onClick={() => toggleCategoryDept(dept.id)}
                               className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                 newCategoryDepts.includes(dept.id)
                                   ? 'bg-blue-600 border-blue-600 text-white'
                                   : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300'
                               }`}
                             >
                               {dept.name}
                             </button>
                          ))}
                        </div>
                    </div>

                    <button onClick={handleAddCategory} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold py-2 rounded hover:shadow-lg transition-all">
                       SAVE
                    </button>
                 </div>
              )}

              {categories.map(cat => (
                <div key={cat.id} className="group flex items-start justify-between p-2.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all">
                   <div className="flex gap-3">
                      <div className="mt-0.5 text-slate-400 group-hover:text-blue-500 transition-colors">
                         {getIcon(cat.icon, 16)}
                      </div>
                      <div>
                         <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none mb-1.5">{cat.label}</span>
                         <div className="flex flex-wrap gap-1">
                             {(() => {
                               let deptNames = [];
                               if (cat.department_ids && Array.isArray(cat.department_ids)) {
                                  deptNames = cat.department_ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean);
                               } else if (cat.default_department_id) {
                                  const d = departments.find(d => d.id === cat.default_department_id);
                                  if (d) deptNames.push(d.name);
                               }
                               if (deptNames.length === 0) return <span className="text-[9px] text-slate-400 italic">Global</span>;
                               return deptNames.map((name, i) => (
                                 <span key={i} className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                   {name}
                                 </span>
                               ));
                             })()}
                         </div>
                      </div>
                   </div>
                   <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={12} />
                   </button>
                </div>
              ))}
           </Panel>
        </div>

        {/* --- RIGHT: USERS (9/12) --- */}
        <div className="lg:col-span-9 h-full">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-28rem)] min-h-[500px]">
              
              {/* TOOLBAR */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-3 items-center bg-slate-50/30 dark:bg-white/5">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-2 w-full xl:w-auto">
                    <div className="relative flex-1 xl:flex-none">
                       <select 
                         className="w-full pl-3 pr-8 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none hover:border-blue-400 transition-colors appearance-none"
                         value={deptFilter}
                         onChange={e => setDeptFilter(e.target.value)}
                       >
                          <option value="ALL">All Depts</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                    </div>

                    <div className="relative flex-1 xl:flex-none">
                       <select 
                         className="w-full pl-3 pr-8 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none hover:border-purple-400 transition-colors appearance-none"
                         value={tenantFilter}
                         onChange={e => setTenantFilter(e.target.value)}
                       >
                          <option value="ALL">All Tenants</option>
                          <hr/>
                          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {/* USER LIST - DENSE */}
              <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2 bg-slate-50 dark:bg-slate-950/50">
                 {filteredUsers.map(user => {
                    const isEditing = editingUser === user.id;
                    const isSuper = user.role === 'super_admin';
                    const isAdmin = user.role === 'admin';

                    return (
                    <div 
                      key={user.id} 
                      className={`relative px-4 py-3 rounded-xl border transition-all duration-200 ${
                          isEditing 
                          ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-md z-10' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-600'
                      }`}
                    >
                       <div className="flex items-center justify-between">
                          <div className="flex gap-3 items-center">
                             <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                                 isSuper ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-500/30' : 
                                 isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                             }`}>
                                {user.avatar_initials || getInitials(user.full_name)}
                             </div>

                             <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{user.full_name}</h4>
                                        {isSuper && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                                </div>
                                
                                <div className="hidden sm:flex items-center gap-2">
                                   <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                                      isSuper ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                      isAdmin ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                      'bg-slate-50 text-slate-500 border-slate-200'
                                   }`}>
                                      {user.role}
                                   </span>
                                </div>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => setEditingUser(isEditing ? null : user.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-blue-50 text-blue-600' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                             {isEditing ? <X size={16} /> : <Settings size={16} />} 
                          </button>
                       </div>

                       {isEditing && (
                         <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Role</label>
                                  <select 
                                      className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                                      value={user.role || 'user'}
                                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                  >
                                      <option value="user">User</option>
                                      <option value="technician">Technician</option>
                                      <option value="manager">Manager</option>
                                      <option value="admin">Administrator</option>
                                      <option value="super_admin">Super Administrator</option>
                                  </select>
                               </div>
                               
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
                                  <select 
                                      className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none"
                                      value={userDeptMap[user.id] || ''}
                                      onChange={(e) => handleUpdateDept(user.id, e.target.value)}
                                   >
                                      <option value="">No Department</option>
                                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                   </select>
                                </div>

                               <div className="space-y-1 md:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus Access</label>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                     {tenants.map(t => {
                                        const hasAccess = user.access_list?.includes(t.id);
                                        return (
                                          <button 
                                            key={t.id} 
                                            onClick={() => handleToggleAccess(user.id, t.id, hasAccess)} 
                                            className={`px-3 py-1 rounded text-xs border transition-all ${
                                                hasAccess 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                          >
                                             {t.name}
                                          </button>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>
                         </div>
                       )}
                    </div>
                 )})}
              </div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: TENANTS GRID (Responsive Auto-Fill) --- */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
         <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                    <Building2 size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-none">Tenants</h3>
                    <p className="text-xs text-slate-500 mt-1">Manage environment access.</p>
                </div>
            </div>
            
            {/* CLEAN ACTION BUTTON - NO UGLY PLACEHOLDER */}
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                <Plus size={14} />
                <span>New Tenant</span>
            </button>
         </div>
         
         {/* THE FIX: Auto-fill Grid */}
         <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {tenants.map(t => (
                <div key={t.id} className="group relative p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xs">
                                {t.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                    <p className="text-[10px] text-slate-500 font-mono">{t.domain}</p>
                                </div>
                            </div>
                        </div>
                        <button className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-200">
                           <MoreHorizontal size={16} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-medium">CODE</span>
                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {t.code || 'N/A'}
                        </span>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
}
