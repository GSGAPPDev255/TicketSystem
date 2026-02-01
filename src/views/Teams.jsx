import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, MoreHorizontal, UserPlus, Plus, Trash2, Mail, Briefcase, User } from 'lucide-react';
import { GlassCard, Modal } from '../components/ui';

export default function TeamsView({ departments: initialDepts }) {
  const [departments, setDepartments] = useState(initialDepts);
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- MODAL STATE ---
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  
  // Department Form
  const [newDeptName, setNewDeptName] = useState('');
  
  // Member Form
  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Staff'
  });

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    fetchDepts();
  }, []);

  async function fetchDepts() {
    const { data } = await supabase.from('departments').select('*').order('name');
    if (data) setDepartments(data);
  }

  async function fetchMembers(deptId) {
    setLoading(true);
    const { data } = await supabase
      .from('department_members')
      .select('*, profile:profiles!user_id(full_name, avatar_initials, email, role)')
      .eq('department_id', deptId);
    
    if (data) setMembers(data);
    setLoading(false);
  }

  // --- 2. DEPARTMENT ACTIONS ---
  const handleAddDepartment = async () => {
    if (!newDeptName) return;
    const { error } = await supabase.from('departments').insert({ name: newDeptName });
    if (error) {
      alert("Error creating department: " + error.message);
    } else {
      fetchDepts();
      setIsDeptModalOpen(false);
      setNewDeptName('');
    }
  };

  const handleDeleteDepartment = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? This will delete the department and remove all member assignments.")) return;
    
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      alert("Error deleting: " + error.message);
    } else {
      fetchDepts();
      if (selectedDept?.id === id) setSelectedDept(null);
    }
  };

  // --- 3. MEMBER ACTIONS (ADD & REMOVE) ---
  const handleAddMember = async () => {
    const { firstName, lastName, email, role } = memberForm;
    if (!email || !firstName || !lastName) return;

    const fullName = `${firstName} ${lastName}`;
    const initials = (firstName[0] + lastName[0]).toUpperCase();

    // A. Check if user exists
    let { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).single();
    let userId = existingUser?.id;

    // B. If not, CREATE SHADOW PROFILE (Provisioning)
    if (!userId) {
      const { data: newUser, error: createError } = await supabase.from('profiles').insert({
        email,
        full_name: fullName,
        avatar_initials: initials,
        role: 'user' // Default system role
      }).select().single();

      if (createError) {
        alert("Error creating user profile: " + createError.message);
        return;
      }
      userId = newUser.id;
    }

    // C. Add to Department
    const { error: linkError } = await supabase.from('department_members').insert({
      department_id: selectedDept.id,
      user_id: userId,
      role: role // The specific role in this department
    });

    if (linkError) {
      alert("Error adding member: " + linkError.message);
    } else {
      setIsMemberModalOpen(false);
      setMemberForm({ firstName: '', lastName: '', email: '', role: 'Staff' }); // Reset
      fetchMembers(selectedDept.id); // Refresh
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Remove this user from the team?")) return;
    
    const { error } = await supabase.from('department_members').delete().eq('id', memberId);
    if (!error) {
      fetchMembers(selectedDept.id);
    }
  };

  // --- RENDER: DETAIL VIEW ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        {/* Header */}
        <div className="flex items-center justify-between">
           <button onClick={() => setSelectedDept(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back
           </button>
           <div className="flex gap-2">
              <button onClick={() => setIsMemberModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20">
                <UserPlus size={16} /> Add Member
              </button>
           </div>
        </div>

        {/* Title Card */}
        <GlassCard className="p-6 border-l-4 border-l-blue-500 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Users size={24} /></div>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
                <p className="text-slate-400 text-sm">{members.length} Active Members</p>
              </div>
           </div>
           <button onClick={(e) => handleDeleteDepartment(e, selectedDept.id)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
              <Trash2 size={20} />
           </button>
        </GlassCard>

        {/* Member List */}
        <div className="grid gap-3">
           {members.map(m => (
             <GlassCard key={m.id} className="p-4 flex items-center justify-between group hover:border-white/20">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold border border-white/10 text-white shadow-inner">
                   {m.profile?.avatar_initials || '?'}
                 </div>
                 <div>
                   <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                     {m.profile?.full_name || 'Unknown User'}
                   </h4>
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-slate-300">{m.role}</span>
                      <span>•</span>
                      <span>{m.profile?.email}</span>
                   </div>
                 </div>
               </div>
               <button 
                 onClick={() => handleRemoveMember(m.id)}
                 className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                 title="Remove from team"
               >
                 <Trash2 size={16} />
               </button>
             </GlassCard>
           ))}
           {members.length === 0 && !loading && (
             <div className="text-center py-12 text-slate-500 border border-white/5 rounded-xl border-dashed bg-white/5">
                <Users size={32} className="mx-auto mb-3 opacity-50" />
                <p>No members yet.</p>
                <p className="text-xs mt-1">Click "Add Member" to build this team.</p>
             </div>
           )}
        </div>

        {/* --- ADD MEMBER MODAL --- */}
        <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Team Member">
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><User size={12}/> First Name</label>
                    <input 
                      type="text" placeholder="Jane" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                      value={memberForm.firstName} onChange={e => setMemberForm({...memberForm, firstName: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><User size={12}/> Last Name</label>
                    <input 
                      type="text" placeholder="Doe" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                      value={memberForm.lastName} onChange={e => setMemberForm({...memberForm, lastName: e.target.value})}
                    />
                 </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><Mail size={12}/> Email Address</label>
                <input 
                  type="email" placeholder="jane.doe@school.edu" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                  value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><Briefcase size={12}/> Role</label>
                <select 
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})}
                >
                   <option value="Staff">Staff Member</option>
                   <option value="Admin">Administrator</option>
                   <option value="Manager">Manager</option>
                   <option value="Technician">Technician</option>
                </select>
              </div>

              <button 
                onClick={handleAddMember}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all"
              >
                Confirm & Add User
              </button>
           </div>
        </Modal>
      </div>
    );
  }

  // --- RENDER: LIST VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-lg font-medium text-slate-200">Departments</h3>
           <p className="text-sm text-slate-400">Manage organizational structure</p>
        </div>
        <button onClick={() => setIsDeptModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
          <Plus size={16} /> New Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {departments.map(dept => (
           <GlassCard key={dept.id} hover className="p-6 space-y-4 group cursor-pointer relative" onClick={() => { setSelectedDept(dept); fetchMembers(dept.id); }}>
              <div className="flex justify-between items-start">
                 <div className={`p-3 rounded-xl bg-blue-500/10 text-blue-400`}><Users size={24} /></div>
                 <button 
                   onClick={(e) => handleDeleteDepartment(e, dept.id)} 
                   className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                   title="Delete Department"
                 >
                   <Trash2 size={16} />
                 </button>
              </div>
              <div>
                 <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">{dept.name}</h4>
                 <p className="text-xs text-slate-500 mt-1">Click to manage members</p>
              </div>
           </GlassCard>
         ))}
         {departments.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">
               No departments found. Create one to get started.
            </div>
         )}
      </div>

      {/* New Dept Modal */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Create Department">
         <div className="space-y-4">
            <div>
               <label className="block text-xs font-medium text-slate-400 mb-1.5">Department Name</label>
               <input 
                 type="text" placeholder="e.g. Human Resources" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50"
                 value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
               />
            </div>
            <button onClick={handleAddDepartment} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
               Create Department
            </button>
         </div>
      </Modal>
    </div>
  );
}
