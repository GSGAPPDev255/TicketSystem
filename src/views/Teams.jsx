import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Search, Plus, Trash2, Shield, Mail, X, 
  Loader, CheckCircle2, Building2, UserPlus 
} from 'lucide-react';
import { GlassCard } from '../components/ui'; 

export default function TeamsView({ departments = [] }) {
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // --- AZURE SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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
    
    // Fetch members + profile details
    const { data } = await supabase
      .from('department_members')
      .select('*, profiles(id, full_name, email, role, avatar_initials)')
      .eq('department_id', dept.id);

    if (data) setMembers(data.map(d => d.profiles));
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
    
    // Optimistic UI update
    setSearchQuery(''); 
    setSearchResults([]);
    setIsAdding(false);

    try {
      // Step A: Check if they exist in Supabase
      let { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', azureUser.email)
        .single();

      let userId = existingUser?.id;

      // Step B: If not, create a "Ghost" Profile
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

      // Step C: Add to Department
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
         // Step D: Send Email Invite (The New Logic)
         await sendInviteEmail(azureUser.email, azureUser.name, selectedDept.name);
         
         // Refresh list
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
          subject: `Welcome to the ${deptName} Team on Nexus`,
          body: `
            <h3>Hello ${name},</h3>
            <p>You have been added to the <b>${deptName}</b> team on the Nexus Support Portal.</p>
            <p>You can now access your dashboard to view and manage tickets.</p>
            <br/>
            <a href="${window.location.origin}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
            <br/><br/>
            <p>Best regards,<br/>Nexus System</p>
          `
        })
      });
    } catch (e) {
      console.error("Failed to send invite email", e);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove user from this team?')) return;
    await supabase.from('department_members').delete().match({ department_id: selectedDept.id, user_id: userId });
    handleSelectDept(selectedDept);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4">
      {/* LEFT: DEPARTMENTS LIST */}
      <GlassCard className="p-4 flex flex-col gap-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Departments</h3>
        {departments.map(dept => (
           <button 
             key={dept.id} 
             onClick={() => handleSelectDept(dept)}
             className={`p-3 rounded-lg text-left transition-all flex items-center justify-between group ${selectedDept?.id === dept.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-white/5 text-slate-300'}`}
           >
             <span className="font-medium">{dept.name}</span>
             {selectedDept?.id === dept.id && <Users size={16} />}
           </button>
        ))}
        {departments.length === 0 && <div className="text-slate-500 text-sm px-2">No teams found.</div>}
      </GlassCard>

      {/* RIGHT: MEMBERS LIST */}
      <div className="md:col-span-2 flex flex-col gap-6">
         {selectedDept ? (
           <GlassCard className="flex-1 p-6 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
                    <p className="text-slate-400 text-sm">Manage team access and roles</p>
                 </div>
                 <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
                    <UserPlus size={18} /> Add Member
                 </button>
              </div>

              {/* MEMBERS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                 {members.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                       <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white border border-white/10">
                          {member.avatar_initials}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate">{member.full_name}</h4>
                          <p className="text-xs text-slate-400 truncate">{member.email}</p>
                       </div>
                       <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={16} />
                       </button>
                    </div>
                 ))}
                 {members.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-slate-500 border border-dashed border-white/10 rounded-xl">
                       <Users size={32} className="mx-auto mb-2 opacity-50"/>
                       <p>No members yet.</p>
                    </div>
                 )}
              </div>
           </GlassCard>
         ) : (
           <div className="h-full flex items-center justify-center text-slate-500">Select a team to view members</div>
         )}
      </div>

      {/* ADD MEMBER MODAL (AZURE INTEGRATED) */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0f172a]">
                 <h3 className="font-bold text-white">Add Team Member</h3>
                 <button onClick={() => setIsAdding(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
              </div>
              
              <div className="p-6 space-y-4">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Start typing name (e.g. 'Hitesh')..." 
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {isSearching && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />}
                 </div>

                 <div className="min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                    {searchQuery.length > 0 && searchQuery.length < 3 && (
                       <p className="text-center text-slate-500 py-4 text-sm">Keep typing...</p>
                    )}
                    
                    {!isSearching && searchQuery.length >= 3 && searchResults.length === 0 && (
                       <p className="text-center text-slate-500 py-4 text-sm">No users found in Azure Directory.</p>
                    )}

                    {searchResults.map(user => (
                       <button 
                         key={user.id}
                         onClick={() => handleAddMember(user)}
                         className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/30 border border-transparent transition-all group text-left"
                       >
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white group-hover:bg-blue-500 transition-colors">
                             {user.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-200 group-hover:text-white text-sm">{user.name}</h4>
                             <p className="text-xs text-slate-500 group-hover:text-blue-200">{user.email}</p>
                             <p className="text-[10px] text-slate-600 group-hover:text-blue-300 uppercase font-bold mt-0.5">{user.role}</p>
                          </div>
                          <Plus size={16} className="ml-auto text-slate-500 group-hover:text-white opacity-0 group-hover:opacity-100" />
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
