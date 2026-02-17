// src/views/Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, Search, Plus, Trash2, 
  Shield, Check, X, Filter, Briefcase, Building, Settings, 
  ChevronRight, ChevronDown, Crown, Laptop, User, Globe
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
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false); // NEW: Dropdown state

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
       <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5 flex justify-between items-center backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 dark:text-slate-400">
               <Icon size={18} />
             </div>
             <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          </div>
          {action}
       </div>
       <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {children}
       </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
           <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
             System <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Configuration</span>
           </h1>
           <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">
             Manage your organization's taxonomy and user privileges.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- LEFT: CATEGORIES (4/12) --- */}
        <div className="lg:col-span-4 h-full">
           <Panel 
             title="Categories" 
             icon={Briefcase}
             className="h-[calc(100vh-24rem)]" // Fixed height for scrolling
             action={
               <button onClick={() => setIsAddingCat(!isAddingCat)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-full transition-colors">
                  {isAddingCat ? <X size={18}/> : <Plus size={18}/>}
               </button>
             }
           >
              {isAddingCat && (
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 space-y-4 mb-4 animate-in slide-in-from-top-2">
                    <input 
                      autoFocus
                      className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Category Name..."
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                    />
                    
                    {/* --- NEW: ICON PICKER DROPDOWN --- */}
                    <div className="relative">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Icon</label>
                        <button 
                            onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                            className="w-full flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {getIcon(newCategoryIcon, 18, "text-blue-500")}
                                <span>{newCategoryIcon}</span>
                            </div>
                            <ChevronDown size={14} className="text-slate-400"/>
                        </button>

                        {/* DROPDOWN POPUP */}
                        {isIconPickerOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsIconPickerOpen(false)}/>
                                <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 grid grid-cols-4 gap-2">
                                    {availableIcons.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => { setNewCategoryIcon(icon); setIsIconPickerOpen(false); }}
                                            className={`p-2 flex flex-col items-center gap-1 rounded-md transition-all hover:bg-slate-50 dark:hover:bg-slate-700 ${
                                                newCategoryIcon === icon ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-slate-500'
                                            }`}
                                        >
                                            {getIcon(icon, 20)}
                                            <span className="text-[10px]">{icon}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Routed Departments</label>
                        <div className="flex flex-wrap gap-2">
                          {departments.map(dept => (
                             <button
                               key={dept.id}
                               onClick={() => toggleCategoryDept(dept.id)}
                               className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
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

                    <button onClick={handleAddCategory} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold py-3 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all">
                       Save Category
                    </button>
                 </div>
              )}

              {categories.map(cat => (
                <div key={cat.id} className="group flex items-start justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-sm">
                   <div className="flex gap-3">
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                         {getIcon(cat.icon, 14)}
                      </div>
                      <div>
                         <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{cat.label}</span>
                         <div className="flex flex-wrap gap-1 mt-1.5">
                             {(() => {
                               let deptNames = [];
                               if (cat.department_ids && Array.isArray(cat.department_ids)) {
                                  deptNames = cat.department_ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean);
                               } else if (cat.default_department_id) {
                                  const d = departments.find(d => d.id === cat.default_department_id);
                                  if (d) deptNames.push(d.name);
                               }
                               if (deptNames.length === 0) return <span className="text-[10px] text-slate-400 italic">Global</span>;
                               return deptNames.map((name, i) => (
                                 <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
                                   {name}
                                 </span>
                               ));
                             })()}
                         </div>
                      </div>
                   </div>
                   <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                   </button>
                </div>
              ))}
           </Panel>
        </div>

        {/* --- RIGHT: USERS (8/12 - EXPANDED) --- */}
        <div className="lg:col-span-8 h-full">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-24rem)]">
              
              {/* TOOLBAR */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row gap-4 items-center bg-slate-50/30 dark:bg-white/5">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Find a user..." 
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-2 w-full xl:w-auto">
                    <div className="relative flex-1 xl:flex-none">
                       <select 
                         className="w-full pl-3 pr-8 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none hover:border-blue-400 transition-colors appearance-none"
                         value={deptFilter}
                         onChange={e => setDeptFilter(e.target.value)}
                       >
                          <option value="ALL">All Departments</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                       <Filter className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                    </div>

                    <div className="relative flex-1 xl:flex-none">
                       <select 
                         className="w-full pl-3 pr-8 py-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none hover:border-purple-400 transition-colors appearance-none"
                         value={tenantFilter}
                         onChange={e => setTenantFilter(e.target.value)}
                       >
                          <option value="ALL">All Campuses</option>
                          <hr/>
                          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                       </select>
                       <Building className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                    </div>
                 </div>
              </div>

              {/* USER LIST */}
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50">
                 {filteredUsers.map(user => {
                    const isEditing = editingUser === user.id;
                    const isSuper = user.role === 'super_admin';
                    const isAdmin = user.role === 'admin';

                    return (
                    <div 
                      key={user.id} 
                      className={`relative p-4 rounded-xl border transition-all duration-300 ${
                          isEditing 
                          ? 'bg-white dark:bg-slate-900 border-blue-500 shadow-lg ring-1 ring-blue-500/20' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-md'
                      }`}
                    >
                       <div className="flex items-start justify-between">
                          <div className="flex gap-4 items-center">
                             
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${
                                 isSuper ? 'bg-amber-100 text-amber-600 ring-2 ring-amber-500/30' : 
                                 isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                             }`}>
                                {user.avatar_initials || getInitials(user.full_name)}
                             </div>

                             <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800 dark:text-white text-base">{user.full_name}</h4>
                                    {isSuper && <Crown size={14} className="text-amber-500 fill-amber-500" />}
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                
                                <div className="flex items-center gap-2 mt-2">
                                   <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                      isSuper ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                      isAdmin ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                                      'bg-slate-50 text-slate-600 border-slate-200'
                                   }`}>
                                      {user.role}
                                   </span>
                                   
                                   <select 
                                      className="text-[10px] pl-2 pr-6 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 focus:outline-none focus:border-blue-500 hover:bg-slate-50 cursor-pointer"
                                      value={userDeptMap[user.id] || ''}
                                      onChange={(e) => handleUpdateDept(user.id, e.target.value)}
                                   >
                                      <option value="">No Department</option>
                                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                   </select>
                                </div>
                             </div>
                          </div>
                          
                          <button 
                            onClick={() => setEditingUser(isEditing ? null : user.id)}
                            className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-100 text-blue-600' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'}`}
                          >
                             {isEditing ? <X size={20} /> : <Settings size={20} />} 
                          </button>
                       </div>

                       {isEditing && (
                         <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1">
                            <div className="grid grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Shield size={10}/> System Role
                                  </label>
                                  <div className="relative">
                                    <select 
                                        className="w-full text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                                        value={user.role || 'user'}
                                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                    >
                                        <option value="user">Standard User</option>
                                        <option value="technician">Technician</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Administrator</option>
                                        <option value="super_admin">Super Administrator</option>
                                    </select>
                                    <ChevronRight className="absolute right-3 top-3.5 text-slate-400 rotate-90" size={14} />
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Building2 size={10}/> Campus Access
                                  </label>
                                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                     {tenants.map(t => {
                                        const hasAccess = user.access_list?.includes(t.id);
                                        return (
                                          <div 
                                            key={t.id} 
                                            onClick={() => handleToggleAccess(user.id, t.id, hasAccess)} 
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${
                                                hasAccess 
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                                : 'bg-white border-transparent hover:bg-slate-50'
                                            }`}
                                          >
                                             <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                 hasAccess 
                                                 ? 'bg-blue-500 border-blue-500' 
                                                 : 'bg-white border-slate-300'
                                             }`}>
                                                {hasAccess && <Check size={12} className="text-white" />}
                                             </div>
                                             <span className={`text-xs font-semibold ${hasAccess ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>{t.name}</span>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>
                         </div>
                       )}
                    </div>
                 )})}
                 
                 {filteredUsers.length === 0 && (
                    <div className="text-center py-20 text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                       <Shield size={48} className="mx-auto mb-4 opacity-10" />
                       <p className="font-medium">No users found.</p>
                       <p className="text-xs opacity-50">Try adjusting your filters.</p>
                    </div>
                 )}
              </div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION: TENANTS GRID --- */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                <Building2 size={20} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Authorized Tenants</h3>
                <p className="text-sm text-slate-500">Active environments and domain configurations.</p>
            </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tenants.map(t => (
                <div key={t.id} className="group relative p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg transition-all duration-300">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse"></span>
                    </div>
                    
                    <div className="mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {t.name.substring(0,2).toUpperCase()}
                        </div>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-white">{t.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1 mb-3">{t.domain}</p>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-wider">
                            Code: {t.code || 'N/A'}
                        </span>
                    </div>
                </div>
            ))}
            
            {/* Add Tenant Placeholder (Visual Only) */}
            <button className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-purple-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all gap-2 group">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-purple-900/30 transition-colors">
                    <Plus size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide">Add Tenant</span>
            </button>
         </div>
      </div>
    </div>
  );
}
