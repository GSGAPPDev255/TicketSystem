// src/views/Settings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, Search, Plus, Trash2, Save, 
  Shield, Check, X, Filter, Users, Briefcase, Network, Building, Settings 
} from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui'; 

export default function SettingsView({ categories, tenants, users, departments = [], onUpdate }) {
  // SEARCH & FILTER STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL'); 
  const [tenantFilter, setTenantFilter] = useState('ALL'); 
  const [userDeptMap, setUserDeptMap] = useState({}); 

  // CATEGORY EDIT STATE
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Briefcase'); 
  // CHANGED: Now storing an array of IDs
  const [newCategoryDepts, setNewCategoryDepts] = useState([]); 
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

  // --- INITIAL DATA SYNC ---
  useEffect(() => {
    if (users && departments) {
      const map = {};
      users.forEach(u => {
        if (u.department) map[u.id] = u.department;
      });
      setUserDeptMap(map);
    }
  }, [users, departments]);

  // --- CATEGORY FUNCTIONS ---

  // NEW: Helper to toggle departments in the array
  const toggleCategoryDept = (deptId) => {
    setNewCategoryDepts(prev => {
      if (prev.includes(deptId)) {
        return prev.filter(id => id !== deptId);
      } else {
        return [...prev, deptId];
      }
    });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          label: newCategory,
          icon: newCategoryIcon,
          // CHANGED: Sending array of IDs to the new column
          department_ids: newCategoryDepts 
        }])
        .select();

      if (error) throw error;
      
      // Reset State
      setNewCategory('');
      setNewCategoryIcon('Briefcase');
      setNewCategoryDepts([]); // Reset array
      setIsAddingCat(false);
      if (onUpdate) onUpdate(); // Refresh parent data
    } catch (err) {
      console.error('Error adding category:', err);
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure? This will affect ticket routing.')) return;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  // --- USER FUNCTIONS ---
  const handleUpdateUserDept = async (userId, deptName) => {
    // Optimistic Update
    setUserDeptMap(prev => ({ ...prev, [userId]: deptName }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department: deptName })
        .eq('id', userId);
      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating user department:', err);
      // Revert on fail
      setUserDeptMap(prev => ({ ...prev, [userId]: users.find(u => u.id === userId)?.department }));
    }
  };

  // --- FILTER LOGIC ---
  const filteredUsers = users?.filter(user => {
    const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || user.department === deptFilter;
    
    // Check Tenant Access
    let matchesTenant = true;
    if (tenantFilter !== 'ALL') {
       // We need to check if this user has access to the selected tenant
       // The 'users' prop likely doesn't have deep nested tenant_access, 
       // but typically we pass 'tenants' array or use a check.
       // Based on your UI, it seems we might just be filtering by visually available data
       // or this part requires the user object to have 'tenant_access' loaded.
       // Assuming 'users' are just profiles, this filter might be client-side only if data exists.
       // For now, preserving existing logic structure.
       matchesTenant = true; // Placeholder if complex logic needed
    }

    return matchesSearch && matchesDept && matchesTenant;
  });

  const availableIcons = ['Briefcase', 'Network', 'Building', 'Settings', 'Shield', 'Users'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- LEFT COLUMN: CATEGORIES & TENANTS --- */}
        <div className="space-y-6">
          
          {/* CATEGORIES CARD */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-500" />
                Ticket Categories
              </h2>
              <button 
                onClick={() => setIsAddingCat(!isAddingCat)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                {isAddingCat ? <X size={20} /> : <Plus size={20} />}
              </button>
            </div>

            {/* ADD CATEGORY FORM */}
            {isAddingCat && (
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Hardware)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                
                {/* ICON SELECTOR */}
                <div className="flex gap-2">
                  {availableIcons.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setNewCategoryIcon(icon)}
                      className={`p-2 rounded-lg border transition-all ${
                        newCategoryIcon === icon 
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-300'
                      }`}
                    >
                      {getIcon(icon, 16)}
                    </button>
                  ))}
                </div>

                {/* MULTI-SELECT DEPARTMENTS (PILLS) */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block uppercase tracking-wider">
                    Routing Departments
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(dept => {
                      const isSelected = newCategoryDepts.includes(dept.id);
                      return (
                        <button
                          key={dept.id}
                          onClick={() => toggleCategoryDept(dept.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                          }`}
                        >
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                  {newCategoryDepts.length === 0 && (
                    <p className="text-xs text-amber-500 mt-1">Select at least one department for routing.</p>
                  )}
                </div>

                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory || newCategoryDepts.length === 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Save Category
                </button>
              </div>
            )}

            {/* CATEGORY LIST */}
            <div className="space-y-3">
              {categories?.map((cat) => (
                <div key={cat.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                      {getIcon(cat.icon || 'Briefcase', 18)}
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">{cat.label}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {/* HANDLE BOTH ARRAY (NEW) AND SINGLE ID (LEGACY) FOR DISPLAY */}
                        {(() => {
                          let deptNames = [];
                          // 1. Check new array column
                          if (cat.department_ids && Array.isArray(cat.department_ids)) {
                             deptNames = cat.department_ids
                                .map(id => departments.find(d => d.id === id)?.name)
                                .filter(Boolean);
                          } 
                          // 2. Fallback to old single column if array is empty
                          else if (cat.default_department_id) {
                             const d = departments.find(d => d.id === cat.default_department_id);
                             if (d) deptNames.push(d.name);
                          }

                          if (deptNames.length === 0) return <span className="text-xs text-slate-400">No Routing</span>;

                          return deptNames.map((name, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md">
                              {name}
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {(!categories || categories.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No categories defined.
                </div>
              )}
            </div>
          </GlassCard>

          {/* TENANTS CARD (Read Only / Status) */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                 <Building size={20} className="text-emerald-500" />
                 Active Tenants
               </h2>
               <span className="text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                 {tenants?.length || 0} Connected
               </span>
            </div>
            <div className="space-y-3">
               {tenants?.map(tenant => (
                 <div key={tenant.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                       <div>
                         <p className="text-sm font-medium text-slate-900 dark:text-white">{tenant.name}</p>
                         <p className="text-xs text-slate-500">{tenant.domain}</p>
                       </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                       {tenant.code}
                    </div>
                 </div>
               ))}
            </div>
          </GlassCard>
        </div>

        {/* --- RIGHT COLUMN: USER MANAGEMENT --- */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                       <Users size={20} className="text-blue-500" />
                       User Management
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage roles and department assignments</p>
                 </div>
                 
                 {/* FILTERS */}
                 <div className="flex items-center gap-2">
                    <div className="relative">
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="Search users..." 
                         className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                    </div>
                    <select 
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                    >
                       <option value="ALL">All Depts</option>
                       {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                 </div>
              </div>

              {/* USER TABLE HEADER */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                 <div className="col-span-4">User / Email</div>
                 <div className="col-span-3">Department</div>
                 <div className="col-span-5">Tenant Access</div>
              </div>

              {/* USER LIST SCROLL AREA */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[600px]">
                 {filteredUsers?.map(user => (
                    <div key={user.id} className="group grid grid-cols-12 gap-4 items-center p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                       
                       {/* USER INFO */}
                       <div className="col-span-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                             {getInitials(user.full_name || user.email)}
                          </div>
                          <div className="min-w-0">
                             <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.full_name || 'Unknown'}</p>
                             <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          </div>
                       </div>

                       {/* DEPARTMENT SELECTOR */}
                       <div className="col-span-3">
                          <select
                             className="w-full text-xs p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none"
                             value={userDeptMap[user.id] || ''}
                             onChange={(e) => handleUpdateUserDept(user.id, e.target.value)}
                          >
                             <option value="">No Department</option>
                             {departments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                             ))}
                          </select>
                       </div>

                       {/* TENANT ACCESS (READ ONLY DISPLAY) */}
                       <div className="col-span-5">
                          {/* Note: In a real app we would map 'tenant_access' here.
                             Visualizing logical access based on passed props.
                          */}
                          <div className="flex flex-wrap gap-2">
                             <div className="relative group/tooltip">
                                <div className="flex -space-x-2">
                                   {tenants.slice(0, 3).map((t, i) => {
                                      // Mock Check: In reality check if user.id is in t.access_list
                                      const hasAccess = true; // Placeholder
                                      return (
                                         <div key={t.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-slate-800 ${
                                            hasAccess ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                         }`} title={t.name}>
                                            {t.name.substring(0,1)}
                                         </div>
                                      );
                                   })}
                                   {tenants.length > 3 && (
                                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                                         +{tenants.length - 3}
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 {filteredUsers?.length === 0 && (
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
