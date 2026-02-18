// src/views/Teams.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Search, Plus, Trash2, Shield, Mail, X, 
  Loader, CheckCircle2, Building2, UserPlus, Settings, Save, Edit2, Check 
} from 'lucide-react';
import { GlassCard } from '../components/ui'; 

export default function TeamsView({ departments = [], role = 'user', onUpdate }) {
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // --- ADMIN PERMISSIONS ---
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(role);

  // --- AZURE SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- TEAM MANAGEMENT STATE ---
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  
  // INLINE EDIT STATE
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // 1. INIT
  useEffect(() => {
    if (departments.length > 0 && !selectedDept) {
      handleSelectDept(departments[0]);
    }
  }, [departments]);

  // 2. FETCH TEAM MEMBERS
  const handleSelectDept = async (dept) => {
    setSelectedDept(dept);
    setLoading(true);
    
    const { data } = await supabase
      .from('department_members')
      .select('*, profiles(id, full_name, email, role, avatar_initials)')
      .eq('department_id', dept.id);

    if (data) setMembers(data.map(d => d.profiles).filter(Boolean));
    setLoading(false);
  };

  // 3. LIVE AZURE SEARCH
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/users?q=${searchQuery}`);
        const data = await res.json();
        if (data.users) setSearchResults(data.users);
      } catch (error) {
        console.error("Azure Search Error:", error);
      }
      setIsSearching(false);
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 4. ADD MEMBER + SEND INVITE
  const handleAddMember = async (azureUser) => {
    if (!selectedDept) return;
    setSearchQuery(''); 
    setSearchResults([]);
    setIsAdding(false);

    try {
      let { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', azureUser.email)
        .single();

      let userId = existingUser?.id;

      if (!userId) {
        const { data: newUser, error: createError } = await supabase
          .from('profiles')
          .insert({
            email: azureUser.email,
            full_name: azureUser.name,
            role: 'user', 
            avatar_initials: azureUser.name.substring(0, 2).toUpperCase()
          })
          .select()
          .single();
        
        if (createError) throw createError;
        userId = newUser.id;
      }

      const { error: linkError } = await supabase
        .from('department_members')
        .insert({ department_id: selectedDept.id, user_id: userId });

      if (linkError) {
         if (linkError.code === '23505') alert('User is already in this team!');
         else throw linkError;
      } else {
         await sendInviteEmail(azureUser.email, azureUser.name, selectedDept.name);
         handleSelectDept(selectedDept);
      }

    } catch (err) {
      alert('Error adding member: ' + err.message);
    }
  };

  const sendInviteEmail = async (email, name, deptName) => {
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Welcome to the ${deptName} Team`,
          body: `<h3>Hello ${name},</h3><p>You have been added to the <b>${deptName}</b> team on the Nexus Support Portal.</p><br/><a href="${window.location.origin}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>`
        })
      });
    } catch (e) { console.error("Email failed", e); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove user from this team?')) return;
    await supabase.from('department_members').delete().match({ department_id: selectedDept.id, user_id: userId });
    handleSelectDept(selectedDept);
  };

  // --- DEPARTMENT MANAGEMENT (NEW) ---

  const handleCreateDept = async () => {
      if (!newDeptName.trim()) return;
      await supabase.from('departments').insert({ name: newDeptName });
      setNewDeptName('');
      setIsCreatingDept(false);
      if (onUpdate) onUpdate(); 
  };

  const startRenaming = (dept, e) => {
      e.stopPropagation(); // Don't select the row
      setEditingDeptId(dept.id);
      setRenameValue(dept.name);
  };

  const saveRename = async (deptId) => {
      if (!renameValue.trim()) return;
      await supabase.from('departments').update({ name: renameValue }).eq('id', deptId);
      setEditingDeptId(null);
      if (onUpdate) onUpdate();
  };

  const deleteDeptFromList = async (deptId, e) => {
      e.stopPropagation();
      if (!confirm('Delete this department? This cannot be undone.')) return;
      
      const { error } = await supabase.from('departments').delete().eq('id', deptId);
      if (error) {
          alert("Error: Ensure there are no tickets linked to this department before deleting.");
      } else {
          if (selectedDept?.id === deptId) setSelectedDept(null);
          if (onUpdate) onUpdate();
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4">
      
      {/* LEFT: DEPARTMENTS LIST */}
      <GlassCard className="col-span-1 p-4 flex flex-col gap-2 h-full">
        <div className="flex justify-between items-center mb-2 px-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</h3>
            {isAdmin && (
                <button onClick={() => setIsCreatingDept(true)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Plus size={16} />
                </button>
            )}
        </div>

        {/* CREATE NEW INPUT */}
        {isCreatingDept && (
            <div className="mb-2 p-2 bg-slate-100 dark:bg-white/5 rounded-lg animate-in slide-in-from-left-2 border border-blue-200 dark:border-blue-800">
                <input 
                    autoFocus
                    className="w-full bg-white dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1.5 text-sm text-slate-900 dark:text-white mb-2 outline-none focus:border-blue-500"
                    placeholder="New Dept Name"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDept()}
                />
                <div className="flex gap-2">
                    <button onClick={handleCreateDept} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 rounded transition-colors">Save</button>
                    <button onClick={() => setIsCreatingDept(false)} className="flex-1 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs py-1 rounded transition-colors">Cancel</button>
                </div>
            </div>
        )}

        {/* LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
          {departments.map(dept => {
             const isEditing = editingDeptId === dept.id;
             const isSelected = selectedDept?.id === dept.id;

             return (
             <div 
               key={dept.id} 
               onClick={() => !isEditing && handleSelectDept(dept)}
               className={`group w-full p-3 rounded-lg text-left transition-all flex items-center justify-between border border-transparent 
                 ${isSelected 
                    ? 'bg-blue-600 text-white shadow-md border-blue-500' 
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-white/10'
                 }`}
             >
               {isEditing ? (
                   // EDIT MODE
                   <div className="flex items-center gap-2 w-full">
                       <input 
                          autoFocus
                          className="w-full bg-white dark:bg-black/40 text-slate-900 dark:text-white text-sm px-2 py-1 rounded border-none outline-none focus:ring-2 focus:ring-blue-400"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveRename(dept.id)}
                          onClick={e => e.stopPropagation()}
                       />
                       <button onClick={(e) => { e.stopPropagation(); saveRename(dept.id); }} className="text-green-500 hover:text-green-400"><Check size={14}/></button>
                       <button onClick={(e) => { e.stopPropagation(); setEditingDeptId(null); }} className="text-slate-400 hover:text-slate-200"><X size={14}/></button>
                   </div>
               ) : (
                   // VIEW MODE
                   <>
                       <div className="flex items-center gap-3 truncate">
                           <span className="font-medium truncate">{dept.name}</span>
                       </div>
                       
                       {/* HOVER ACTIONS */}
                       {isAdmin && (
                           <div className={`flex items-center gap-1 ${isSelected ? 'text-white' : 'text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                               <button 
                                   onClick={(e) => startRenaming(dept, e)}
                                   className={`p-1.5 rounded hover:bg-black/10 transition-colors`}
                                   title="Rename"
                               >
                                   <Edit2 size={12} />
                               </button>
                               <button 
                                   onClick={(e) => deleteDeptFromList(dept.id, e)}
                                   className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                   title="Delete"
                               >
                                   <Trash2 size={12} />
                               </button>
                           </div>
                       )}
                       {!isAdmin && isSelected && <Users size={16} />}
                   </>
               )}
             </div>
          )})}
        </div>
      </GlassCard>

      {/* RIGHT: TEAM DETAILS & MEMBERS */}
      <div className="md:col-span-3 flex flex-col h-full">
         {selectedDept ? (
           <GlassCard className="flex-1 p-8 relative overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-200 dark:border-white/5">
                 <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        {selectedDept.name}
                        {selectedDept.team_email && <span className="text-xs font-normal px-2 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500">{selectedDept.team_email}</span>}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{members.length} Active Members</p>
                 </div>
                 {isAdmin && (
                     <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20 shrink-0">
                        <UserPlus size={18} /> Add Member
                     </button>
                 )}
              </div>

              {members.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-60">
                      <Users size={64} strokeWidth={1} className="mb-4" />
                      <p>No members in this team yet.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar flex-1 content-start">
                     {members.map(member => (
                        <div key={member.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/10 transition-all group shadow-sm">
                           <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-white border border-slate-300 dark:border-white/10 overflow-hidden">
                              {member.avatar_initials || member.full_name?.substring(0,2).toUpperCase()}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 dark:text-white truncate">{member.full_name}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
                           </div>
                           {isAdmin && (
                               <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 size={16} />
                               </button>
                           )}
                        </div>
                     ))}
                  </div>
              )}
           </GlassCard>
         ) : (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
               <Building2 size={48} className="mb-3 opacity-50" />
               <p>Select a department to view members</p>
           </div>
         )}
      </div>

      {/* ADD MEMBER MODAL */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]">
                 <h3 className="font-bold text-slate-900 dark:text-white">Add Team Member</h3>
                 <button onClick={() => setIsAdding(false)}><X size={20} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Start typing name..." 
                      className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl pl-10 pr-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {isSearching && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />}
                 </div>
                 <div className="min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                    {searchResults.map(user => (
                       <button 
                         key={user.id}
                         onClick={() => handleAddMember(user)}
                         className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-blue-600/20 border border-transparent transition-all group text-left"
                       >
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-white">
                             {user.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900 dark:text-slate-200 text-sm">{user.name}</h4>
                             <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                       </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
