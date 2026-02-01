import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, ShieldAlert, MoreHorizontal, UserPlus } from 'lucide-react';
import { GlassCard } from '../components/ui';

export default function TeamsView({ departments: initialDepts }) {
  const [departments, setDepartments] = useState(initialDepts);
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // FETCH DEPARTMENTS ON LOAD
  useEffect(() => {
    async function fetchDepts() {
      const { data } = await supabase.from('departments').select('*');
      if (data) setDepartments(data);
    }
    fetchDepts();
  }, []);

  // FETCH MEMBERS WHEN DEPARTMENT SELECTED
  useEffect(() => {
    if (selectedDept) {
      fetchMembers(selectedDept.id);
    }
  }, [selectedDept]);

  async function fetchMembers(deptId) {
    setLoading(true);
    // Join department_members with profiles to get names
    const { data, error } = await supabase
      .from('department_members')
      .select('*, profile:profiles!user_id(full_name, avatar_initials, email)')
      .eq('department_id', deptId);
    
    if (data) setMembers(data);
    setLoading(false);
  }

  const handleAddMember = async () => {
    // 1. Get Email
    const email = prompt("Enter the staff email to add:");
    if (!email) return;

    // 2. Find User ID from Profiles
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      alert("User not found! They must sign in to the app at least once.");
      return;
    }

    // 3. Add to Department
    const { error: insertError } = await supabase
      .from('department_members')
      .insert({
        department_id: selectedDept.id,
        user_id: user.id,
        role: 'Member'
      });

    if (insertError) {
      alert("Error adding member: " + insertError.message);
    } else {
      fetchMembers(selectedDept.id); // Refresh list
    }
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
             <div className={`p-3 rounded-xl ${selectedDept.bg || 'bg-blue-500/10'} ${selectedDept.color || 'text-blue-400'}`}>
                 <Users size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
               <p className="text-slate-400 text-sm">Managing staff members</p>
             </div>
          </div>
          <button 
            onClick={handleAddMember}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus size={16} /> Add Member
          </button>
        </div>

        {loading ? (
           <div className="text-slate-500 text-center py-10">Loading members...</div>
        ) : members.length === 0 ? (
           <div className="text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">
              No members found. Add one above.
           </div>
        ) : (
          <div className="grid gap-3">
             {members.map(m => (
               <GlassCard key={m.id} className="p-4 flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-white/10 text-white">
                     {m.profile?.avatar_initials || '?'}
                   </div>
                   <div>
                     <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                       {m.profile?.full_name || 'Unknown User'}
                     </h4>
                     <p className="text-xs text-slate-400">{m.role} • {m.profile?.email}</p>
                   </div>
                 </div>
                 <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg">
                   <MoreHorizontal size={16} />
                 </button>
               </GlassCard>
             ))}
          </div>
        )}
      </div>
    );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-200">Department Status</h3>
          <p className="text-sm text-slate-400">Real-time workload</p>
        </div>
      </div>

      {departments.length === 0 ? (
         <div className="text-center py-10 text-slate-500">
            No departments found. Please run the SQL seed script.
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {departments.map(dept => (
             <GlassCard 
               key={dept.id} 
               hover 
               className="p-6 space-y-4 group cursor-pointer"
               onClick={() => setSelectedDept(dept)}
             >
                <div className="flex justify-between items-start">
                   <div className={`p-3 rounded-xl ${dept.bg || 'bg-blue-500/10'} ${dept.color || 'text-blue-400'}`}>
                     <Users size={24} />
                   </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">{dept.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Lead: {dept.head_name || 'Unassigned'}</p>
                </div>
             </GlassCard>
           ))}
        </div>
      )}
    </div>
  );
}
