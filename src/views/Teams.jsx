import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, MoreHorizontal, UserPlus, Plus, Trash2, Mail, Briefcase, User, Edit2 } from 'lucide-react';
import { GlassCard, Modal } from '../components/ui';

export default function TeamsView({ departments: initialDepts }) {
  const [departments, setDepartments] = useState(initialDepts);
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- MODAL STATE ---
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  
  // Dept Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // Track which dept we are editing
  const [deptNameForm, setDeptNameForm] = useState('');
  
  // Member Form
  const [memberForm, setMemberForm] = useState({ firstName: '', lastName: '', email: '', role: 'Staff' });

  // --- 1. INITIAL LOAD ---
  useEffect(() => { fetchDepts(); }, []);

  async function fetchDepts() {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data);
  }

  async function fetchMembers(deptId) {
    setLoading(true);
    const { data } = await supabase.from('department_members').select('*, profile:profiles!user_id(full_name, avatar_initials, email, role)').eq('department_id', deptId);
    if (data) setMembers(data);
    setLoading(false);
  }

  // --- 2. DEPARTMENT ACTIONS ---
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
      // UPDATE
      const { error } = await supabase.from('departments').update({ name: deptNameForm }).eq('id', editingDept.id);
      if (error) alert(error.message);
    } else {
      // CREATE
      const { error } = await supabase.from('departments').insert({ name: deptNameForm });
      if (error) alert(error.message);
    }

    fetchDepts();
    setIsDeptModalOpen(false);
  };

  const handleDeleteDepartment = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this department? All members will be removed.")) return;
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (!error) {
      fetchDepts();
      if (selectedDept?.id === id) setSelectedDept(null);
    }
  };

  // --- 3. MEMBER ACTIONS ---
  const handleAddMember = async () => {
    const { firstName, lastName, email, role } = memberForm;
    if (!email || !firstName || !lastName) return;

    const fullName = `${firstName} ${lastName}`;
    const initials = (firstName[0] + lastName[0]).toUpperCase();

    // Check/Create User
    let { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).single();
    let userId = existingUser?.id;

    if (!userId) {
      const { data: newUser, error } = await supabase.from('profiles').insert({ email, full_name: fullName, avatar_initials: initials, role: 'user' }).select().single();
      if (error) { alert(error.message); return; }
      userId = newUser.id;
    }

    // Link to Dept
    const { error: linkError } = await supabase.from('department_members').insert({ department_id: selectedDept.id, user_id: userId, role });
    if (!linkError) {
      setIsMemberModalOpen(false);
      setMemberForm({ firstName: '', lastName: '', email: '', role: 'Staff' });
      fetchMembers(selectedDept.id);
    } else {
      alert(linkError.message);
    }
  };

  const handleRemoveMember = async (id) => {
    if (!confirm("Remove user?")) return;
    const { error } = await supabase.from('department_members').delete().eq('id', id);
    if (!error) fetchMembers(selectedDept.id);
  };

  // --- RENDER DETAIL VIEW ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <div className="flex items-center justify-between">
           <button onClick={() => setSelectedDept(null)} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back</button>
           <button onClick={() => setIsMemberModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"><UserPlus size={16} /> Add Member</button>
        </div>
        <GlassCard className="p-6 border-l-4 border-l-blue-500 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Users size={24} /></div>
              <div><h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2><p className="text-slate-400 text-sm">{members.length} Active Members</p></div>
           </div>
        </GlassCard>
        <div className="grid gap-3">
           {members.map(m => (
             <GlassCard key={m.id} className="p-4 flex items-center justify-between group hover:border-white/20">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">{m.profile?.avatar_initials}</div>
                 <div><h4 className="font-medium text-white">{m.profile?.full_name}</h4><div className="flex gap-2 text-xs text-slate-400"><span className="bg-white/5 px-1.5 rounded">{m.role}</span><span>{m.profile?.email}</span></div></div>
               </div>
               <button onClick={() => handleRemoveMember(m.id)} className="p-2 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
             </GlassCard>
           ))}
           {members.length === 0 && !loading && <div className="text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">No members yet.</div>}
        </div>

        <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Team Member">
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <input type="text" placeholder="First Name" className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={memberForm.firstName} onChange={e => setMemberForm({...memberForm, firstName: e.target.value})} />
                 <input type="text" placeholder="Last Name" className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={memberForm.lastName} onChange={e => setMemberForm({...memberForm, lastName: e.target.value})} />
              </div>
              <input type="email" placeholder="Email Address" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} />
              <select className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-200" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})}>
                 {['Staff','Admin','Manager','Technician'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={handleAddMember} className="w-full py-2 bg-blue-600 text-white rounded-lg">Confirm & Add</button>
           </div>
        </Modal>
      </div>
    );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Departments</h3>
        <button onClick={openCreateDeptModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"><Plus size={16} /> New Department</button>
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
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title={editingDept ? "Edit Department" : "New Department"}>
         <div className="space-y-4">
            <input type="text" placeholder="Department Name" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={deptNameForm} onChange={(e) => setDeptNameForm(e.target.value)} />
            <button onClick={handleSaveDepartment} className="w-full py-2 bg-blue-600 text-white rounded-lg">{editingDept ? "Save Changes" : "Create Department"}</button>
         </div>
      </Modal>
    </div>
  );
}
