import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, MoreHorizontal, UserPlus, Search, Plus, Trash2 } from 'lucide-react';
import { GlassCard, Modal } from '../components/ui';

export default function TeamsView({ departments: initialDepts }) {
  const [departments, setDepartments] = useState(initialDepts);
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [adding, setAdding] = useState(false);

  // Dept Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // 1. FETCH DATA
  useEffect(() => {
    fetchDepts();
  }, []);

  async function fetchDepts() {
    const { data } = await supabase.from('departments').select('*');
    if (data) setDepartments(data);
  }

  async function fetchMembers(deptId) {
    setLoading(true);
    const { data } = await supabase
      .from('department_members')
      .select('*, profile:profiles!user_id(full_name, avatar_initials, email)')
      .eq('department_id', deptId);
    if (data) setMembers(data);
    setLoading(false);
  }

  // 2. DEPARTMENT ACTIONS
  const handleAddDepartment = async () => {
    if (!newDeptName) return;
    const { error } = await supabase.from('departments').insert({ name: newDeptName });
    if (!error) {
      fetchDepts();
      setIsDeptModalOpen(false);
      setNewDeptName('');
    } else {
      alert(error.message);
    }
  };

  const handleDeleteDepartment = async (e, id) => {
    e.stopPropagation(); // Prevent opening the department
    if (!window.confirm("Delete this department? All members will be removed.")) return;
    
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (!error) fetchDepts();
  };

  // 3. MEMBER ACTIONS
  const handleSearchUser = async () => {
    setSearchResult(null);
    const { data } = await supabase.from('profiles').select('*').ilike('email', searchEmail).single();
    if (data) setSearchResult(data);
    else alert("User not found.");
  };

  const handleConfirmAddMember = async () => {
    if (!searchResult || !selectedDept) return;
    setAdding(true);
    const { error } = await supabase.from('department_members').insert({
      department_id: selectedDept.id,
      user_id: searchResult.id
    });
    if (!error) {
      setIsMemberModalOpen(false);
      setSearchEmail('');
      setSearchResult(null);
      fetchMembers(selectedDept.id);
    }
    setAdding(false);
  };

  // --- RENDER DETAIL VIEW ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <button onClick={() => setSelectedDept(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Departments
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl bg-blue-500/10 text-blue-400`}><Users size={24} /></div>
             <div><h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2></div>
          </div>
          <button onClick={() => setIsMemberModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <UserPlus size={16} /> Add Member
          </button>
        </div>

        {/* Member List */}
        <div className="grid gap-3">
           {members.map(m => (
             <GlassCard key={m.id} className="p-4 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">{m.profile?.avatar_initials}</div>
                 <div>
                   <h4 className="font-medium text-white">{m.profile?.full_name}</h4>
                   <p className="text-xs text-slate-400">{m.role} • {m.profile?.email}</p>
                 </div>
               </div>
             </GlassCard>
           ))}
           {members.length === 0 && <div className="text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">No members yet.</div>}
        </div>

        {/* Add Member Modal */}
        <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Team Member">
           <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" placeholder="Search by email..." className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                <button onClick={handleSearchUser} className="p-2 bg-white/10 rounded-lg"><Search size={18} /></button>
              </div>
              {searchResult && (
                <div className="p-3 bg-emerald-500/10 rounded-lg flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">{searchResult.avatar_initials}</div>
                   <div><p className="text-sm text-emerald-200">{searchResult.full_name}</p><p className="text-xs text-emerald-500/70">{searchResult.email}</p></div>
                </div>
              )}
              <button onClick={handleConfirmAddMember} disabled={!searchResult} className="w-full py-2 bg-blue-600 disabled:opacity-50 text-white rounded-lg">Add User</button>
           </div>
        </Modal>
      </div>
    );
  }

  // --- RENDER DEPARTMENTS LIST ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Departments</h3>
        <button onClick={() => setIsDeptModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
          <Plus size={16} /> New Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {departments.map(dept => (
           <GlassCard key={dept.id} hover className="p-6 space-y-4 group cursor-pointer relative" onClick={() => { setSelectedDept(dept); fetchMembers(dept.id); }}>
              <div className="flex justify-between items-start">
                 <div className={`p-3 rounded-xl bg-blue-500/10 text-blue-400`}><Users size={24} /></div>
                 <button onClick={(e) => handleDeleteDepartment(e, dept.id)} className="p-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
              </div>
              <div><h4 className="text-lg font-semibold text-white">{dept.name}</h4><p className="text-xs text-slate-500 mt-1">Lead: {dept.head_name || 'Unassigned'}</p></div>
           </GlassCard>
         ))}
      </div>

      {/* Add Dept Modal */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="New Department">
         <div className="space-y-4">
            <input type="text" placeholder="Department Name (e.g. HR)" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} />
            <button onClick={handleAddDepartment} className="w-full py-2 bg-blue-600 text-white rounded-lg">Create</button>
         </div>
      </Modal>
    </div>
  );
}
