import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, UserPlus, Plus, Trash2, Edit2, Search, CheckCircle2 } from 'lucide-react';
import { GlassCard, Modal } from '../components/ui';

export default function TeamsView({ departments: initialDepts }) {
  // --- STATE ---
  const [departments, setDepartments] = useState(initialDepts);
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // Search Modal
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);

  // Trackers
  const [editingDept, setEditingDept] = useState(null); 
  const [editingMember, setEditingMember] = useState(null);

  // Forms
  const [deptNameForm, setDeptNameForm] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editMemberForm, setEditMemberForm] = useState({ role: 'Member' });

  // --- 1. DATA LOADING ---
  useEffect(() => { fetchDepts(); }, []);

  async function fetchDepts() {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data);
  }

  async function fetchMembers(deptId) {
    setLoading(true);
    // Fetch members AND their profile data
    const { data } = await supabase
      .from('department_members')
      .select('*, profile:profiles(*)')
      .eq('department_id', deptId);
    if (data) setMembers(data);
    setLoading(false);
  }

  // --- 2. DEPARTMENT ACTIONS (Create/Edit/Delete) ---
  const openCreateDeptModal = () => {
    setEditingDept(null);
    setDeptNameForm('');
    setIsDeptModalOpen(true);
  };

  const openEditDeptModal = (e, dept) => {
    e.stopPropagation();
    setEditingDept(dept);
    setDeptNameForm(dept.name);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!deptNameForm) return;
    if (editingDept) {
      await supabase.from('departments').update({ name: deptNameForm }).eq('id', editingDept.id);
    } else {
      await supabase.from('departments').insert({ name: deptNameForm });
    }
    fetchDepts();
    setIsDeptModalOpen(false);
  };

  const handleDeleteDepartment = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this team? All members will be removed.")) return;
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (!error) {
      fetchDepts();
      if (selectedDept?.id === id) setSelectedDept(null);
    }
  };

  // --- 3. ADD MEMBER (SEARCH FLOW - FIXED) ---
  const handleSearch = async (val) => {
    setUserSearch(val);
    if (val.length < 2) { setSearchResults([]); return; }
    
    // UPDATED: Search profiles where Name OR Email matches the search term
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${val}%,email.ilike.%${val}%`) 
      .limit(5);
      
    // Filter out people already in the team
    const currentMemberIds = members.map(m => m.user_id);
    const newPeople = data ? data.filter(u => !currentMemberIds.includes(u.id)) : [];
    setSearchResults(newPeople);
  };

  const handleAddMember = async (userId) => {
    // Add to team with default role "Member"
    await supabase.from('department_members').insert({
      department_id: selectedDept.id,
      user_id: userId,
      role: 'Member'
    });
    setIsSearchModalOpen(false);
    setUserSearch('');
    fetchMembers(selectedDept.id);
  };

  // --- 4. EDIT MEMBER ROLE ---
  const openEditMemberModal = (member) => {
    setEditingMember(member);
    setEditMemberForm({ role: member.role || 'Member' });
    setIsEditMemberModalOpen(true);
  };

  const handleUpdateMemberRole = async () => {
    if (!editingMember) return;
    await supabase
      .from('department_members')
      .update({ role: editMemberForm.role })
      .eq('id', editingMember.id);
    
    setIsEditMemberModalOpen(false);
    fetchMembers(selectedDept.id);
  };

  const handleRemoveMember = async (id) => {
    if (!confirm("Remove user from team?")) return;
    const { error } = await supabase.from('department_members').delete().eq('id', id);
    if (!error) fetchMembers(selectedDept.id);
  };

  // --- RENDER ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {/* HEADER */}
        <div className="flex items-center justify-between">
           <button onClick={() => setSelectedDept(null)} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back</button>
           <button onClick={() => setIsSearchModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"><UserPlus size={16} /> Add Member</button>
        </div>

        {/* TEAM HEADER CARD */}
        <GlassCard className="p-6 border-l-4 border-l-blue-500 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Users size={24} /></div>
              <div><h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2><p className="text-slate-400 text-sm">{members.length} Active Members</p></div>
           </div>
        </GlassCard>

        {/* MEMBERS LIST */}
        <div className="grid gap-3">
           {members.map(m => (
             <GlassCard key={m.id} className="p-4 flex items-center justify-between group hover:border-white/20">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white border border-white/10">{m.profile?.avatar_initials}</div>
                 <div>
                    <h4 className="font-medium text-white">{m.profile?.full_name}</h4>
                    <div className="flex gap-2 text-xs text-slate-400 items-center">
                        <span className={`px-1.5 py-0.5 rounded border ${m.role === 'Lead' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {m.role || 'Member'}
                        </span>
                        <span>{m.profile?.email}</span>
                    </div>
                 </div>
               </div>
               
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditMemberModal(m)} className="p-2 text-slate-500 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg" title="Edit Role"><Edit2 size={16} /></button>
                  <button onClick={() => handleRemoveMember(m.id)} className="p-2 text-slate-500 hover:text-rose-400 bg-black/20 hover:bg-black/40 rounded-lg" title="Remove"><Trash2 size={16} /></button>
               </div>
             </GlassCard>
           ))}
           {members.length === 0 && !loading && <div className="text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">No members yet.</div>}
        </div>

        {/* MODAL: SEARCH TO ADD */}
        <Modal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} title={`Add to ${selectedDept.name}`}>
            <div className="space-y-4">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4"/>
                  <input autoFocus type="text" placeholder="Search by name or email..." className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" value={userSearch} onChange={e => handleSearch(e.target.value)} />
               </div>
               <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {searchResults.map(user => (
                    <button key={user.id} onClick={() => handleAddMember(user.id)} className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg text-left group">
                       <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">{user.avatar_initials}</div>
                       <div className="flex-1"><p className="text-sm text-white">{user.full_name}</p><p className="text-xs text-slate-500">{user.email}</p></div>
                       <Plus size={16} className="text-blue-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                  {userSearch.length > 1 && searchResults.length === 0 && <p className="text-center text-xs text-slate-500 py-2">No users found.</p>}
               </div>
            </div>
        </Modal>

        {/* MODAL: EDIT MEMBER ROLE */}
        <Modal isOpen={isEditMemberModalOpen} onClose={() => setIsEditMemberModalOpen(false)} title="Edit Team Role">
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Team Title</label>
                  <select className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-200" value={editMemberForm.role} onChange={e => setEditMemberForm({...editMemberForm, role: e.target.value})}>
                     <option value="Member">Member</option>
                     <option value="Lead">Team Lead</option>
                     <option value="Senior">Senior</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-2">This is just a label (e.g., "Team Lead"). It does not grant Admin permissions.</p>
               </div>
               <button onClick={handleUpdateMemberRole} className="w-full py-2 bg-blue-600 text-white rounded-lg">Update Role</button>
            </div>
        </Modal>
      </div>
    );
  }

  // --- RENDER LIST VIEW (DEPARTMENTS) ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Teams & Departments</h3>
        <button onClick={openCreateDeptModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"><Plus size={16} /> New Team</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {departments.map(dept => (
           <GlassCard key={dept.id} hover className="p-6 space-y-4 group cursor-pointer relative" onClick={() => { setSelectedDept(dept); fetchMembers(dept.id); }}>
              <div className="flex justify-between items-start">
                 <div className={`p-3 rounded-xl bg-blue-500/10 text-blue-400`}><Users size={24} /></div>
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEditDeptModal(e, dept)} className="p-2 text-slate-500 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={(e) => handleDeleteDepartment(e, dept.id)} className="p-2 text-slate-500 hover:text-rose-400 bg-black/20 hover:bg-black/40 rounded-lg"><Trash2 size={14} /></button>
                 </div>
              </div>
              <div><h4 className="text-lg font-semibold text-white">{dept.name}</h4><p className="text-xs text-slate-500 mt-1">Click to manage</p></div>
           </GlassCard>
         ))}
      </div>
      
      {/* DEPT MODAL */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title={editingDept ? "Edit Team Name" : "New Team"}>
         <div className="space-y-4">
            <input type="text" placeholder="Team Name (e.g. IT Services)" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={deptNameForm} onChange={(e) => setDeptNameForm(e.target.value)} />
            <button onClick={handleSaveDepartment} className="w-full py-2 bg-blue-600 text-white rounded-lg">{editingDept ? "Save Changes" : "Create Team"}</button>
         </div>
      </Modal>
    </div>
  );
}
