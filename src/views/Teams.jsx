import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Search, Plus, Trash2, Shield, Mail, X, 
  Loader, CheckCircle2, Building2, UserPlus, Settings, Save 
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
  
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamEmail, setEditTeamEmail] = useState('');

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
    
    // Reset Edit State
    setEditTeamName(dept.name);
    setEditTeamEmail(dept.team_email || '');
    setIsEditingTeam(false);
    
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
        .insert({
            department_id: selectedDept.id,
            user_id: userId
        });

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

  const handleCreateDept = async () => {
      if (!newDeptName.trim()) return;
      await supabase.from('departments').insert({ name: newDeptName });
      setNewDeptName('');
      setIsCreatingDept(false);
      if (onUpdate) onUpdate(); 
  };

  const handleUpdateTeam = async () => {
    if (!editTeamName.trim()) return;
    const { error } = await supabase.from('departments').update({ name: editTeamName, team_email: editTeamEmail }).eq('id', selectedDept.id);
    if (error) {
      alert(error.message);
    } else {
      setIsEditingTeam(false);
      const updatedDept = { ...selectedDept, name: editTeamName, team_email: editTeamEmail };
      setSelectedDept(updatedDept);
      if (onUpdate) onUpdate();
    }
  };

  const handleDeleteDept = async () => {
      if (!confirm('Delete this department? This will unlink all members and tickets.')) return;
      await supabase.from('departments').delete().eq('id', selectedDept.id);
      setSelectedDept(null);
      if (onUpdate) onUpdate();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4">
      
      {/* LEFT: DEPARTMENTS LIST */}
      <GlassCard className="col-span-1 p-4 flex flex-col gap-2 h-full">
        <div className="flex justify-between items-center mb-2 px-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</h3>
            {isAdmin && (
                <button onClick={() => setIsCreatingDept(true)} className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <Plus size={16} />
                </button>
            )}
        </div>

        {isCreatingDept && (
            <div className="mb-2 p-2 bg-slate-100 dark:bg-white/5 rounded-lg animate-in slide-in-from-left-2">
                <input 
                    autoFocus
                    className="w-full bg-white dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm text-slate-900 dark:text-white mb-2 outline-none focus:border-blue-500"
                    placeholder="Dept Name"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                />
                <div className="flex gap-2">
                    <button onClick={handleCreateDept} className="flex-1 bg-blue-600 text-white text-xs py-1 rounded">Save</button>
                    <button onClick={() => setIsCreatingDept(false)} className="flex-1 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs py-1 rounded">Cancel</button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
          {departments.map(dept => (
             <button 
               key={dept.id} 
               onClick={() => handleSelectDept(dept)}
               className={`w-full p-3 rounded-lg text-left transition-all flex items-center justify-between group ${selectedDept?.id === dept.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}
             >
               <span className="font-medium truncate">{dept.name}</span>
               {selectedDept?.id === dept.id && <Users size={16} />}
             </button>
          ))}
        </div>
      </GlassCard>

      {/* RIGHT: TEAM DETAILS & MEMBERS */}
      <div className="md:col-span-3 flex flex-col h-full">
         {selectedDept ? (
           <GlassCard className="flex-1 p-8 relative overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 pb-8 border-b border-slate-200 dark:border-white/5">
                 <div className="flex-1">
                    {isEditingTeam ? (
                      <div className="flex flex-col gap-3 animate-in fade-in max-w-md">
                        <input 
                          className="bg-slate-100 dark:bg-black/30 border border-blue-500/50 rounded-lg px-3 py-2 text-xl font-bold text-slate-900 dark:text-white focus:outline-none"
                          value={editTeamName}
                          onChange={e => setEditTeamName(e.target.value)}
                          placeholder="Team Name"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-slate-400" />
                          <input 
                            className="bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:border-blue-500/50 outline-none w-full"
                            value={editTeamEmail}
                            onChange={e => setEditTeamEmail(e.target.value)}
                            placeholder="team@school.com"
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={handleUpdateTeam} className="px-3 py-1.5 bg-green-600 rounded text-xs font-bold text-white flex items-center gap-1 hover:bg-green-500"><Save size={12}/> Save</button>
                          <button onClick={() => setIsEditingTeam(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-300 dark:hover:bg-slate-600"><X size={12}/> Cancel</button>
                        </div>
                        <button onClick={handleDeleteDept} className="text-xs text-rose-500 dark:text-rose-400 hover:underline text-left mt-2 flex items-center gap-1"><Trash2 size={10}/> Delete Department</button>
                      </div>
                    ) : (
                      <>
                         <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{selectedDept.name}</h2>
                            {isAdmin && (
                                <button onClick={() => setIsEditingTeam(true)} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                                    <Settings size={20} />
                                </button>
                            )}
                         </div>
                         {selectedDept.team_email && (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-2">
                              <Mail size={14} />
                              <span className="text-sm font-medium">{selectedDept.team_email}</span>
                            </div>
                         )}
                      </>
                    )}
                 </div>
                 {isAdmin && (
                     <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20 shrink-0">
                        <UserPlus size={18} /> Add Member
                     </button>
                 )}
              </div>

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
           </GlassCard>
         ) : (
           <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">Select a team to view members</div>
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
