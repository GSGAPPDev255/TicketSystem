import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Users, MoreHorizontal, UserPlus, Search, X } from 'lucide-react';
import { GlassCard, Modal } from '../components/ui';

export default function TeamsView({ departments: initialDepts }) {
  const [departments, setDepartments] = useState(initialDepts);
  const [selectedDept, setSelectedDept] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [adding, setAdding] = useState(false);

  // FETCH DEPARTMENTS ON LOAD
  useEffect(() => {
    async function fetchDepts() {
      const { data } = await supabase.from('departments').select('*');
      if (data && data.length > 0) setDepartments(data);
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
    const { data } = await supabase
      .from('department_members')
      .select('*, profile:profiles!user_id(full_name, avatar_initials, email)')
      .eq('department_id', deptId);
    
    if (data) setMembers(data);
    setLoading(false);
  }

  // 1. SEARCH USER
  const handleSearchUser = async () => {
    setSearchResult(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', searchEmail) // Case insensitive search
      .single();

    if (data) {
      setSearchResult(data);
    } else {
      alert("User not found. They must sign in to the app first.");
    }
  };

  // 2. ADD USER TO TEAM
  const handleConfirmAdd = async () => {
    if (!searchResult || !selectedDept) return;
    setAdding(true);

    const { error } = await supabase.from('department_members').insert({
      department_id: selectedDept.id,
      user_id: searchResult.id,
      role: 'Member'
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setIsModalOpen(false);
      setSearchEmail('');
      setSearchResult(null);
      fetchMembers(selectedDept.id); // Refresh list
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
             <div className={`p-3 rounded-xl ${selectedDept.bg || 'bg-blue-500/10'} ${selectedDept.color || 'text-blue-400'}`}>
                 <Users size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
               <p className="text-slate-400 text-sm">Managing staff members</p>
             </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <UserPlus size={16} /> Add Member
          </button>
        </div>

        {loading ? (
           <div className="text-slate-500 text-center py-10">Loading members...</div>
        ) : members.length === 0 ? (
           <div className="text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">
              No members found. Click "Add Member" to build your team.
           </div>
        ) : (
          <div className="grid gap-3">
             {members.map(m => (
               <GlassCard key={m.id} className="p-4 flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-bold border border-white/10 text-white shadow-inner">
                     {m.profile?.avatar_initials || '?'}
                   </div>
                   <div>
                     <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                       {m.profile?.full_name || 'Unknown User'}
                     </h4>
                     <p className="text-xs text-slate-400">{m.role} • {m.profile?.email}</p>
                   </div>
                 </div>
                 <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                   <MoreHorizontal size={16} />
                 </button>
               </GlassCard>
             ))}
          </div>
        )}

        {/* --- ADD MEMBER MODAL --- */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Team Member">
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Search by Email</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="colleague@school.edu" 
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                  />
                  <button onClick={handleSearchUser} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300">
                    <Search size={18} />
                  </button>
                </div>
              </div>

              {/* Search Result Preview */}
              {searchResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                   <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                      {searchResult.avatar_initials}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-200 truncate">{searchResult.full_name}</p>
                      <p className="text-xs text-emerald-500/70 truncate">{searchResult.email}</p>
                   </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-transparent hover:bg-white/5 text-slate-400 rounded-lg text-sm transition-colors">Cancel</button>
                <button 
                  onClick={handleConfirmAdd} 
                  disabled={!searchResult || adding}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                  {adding ? 'Adding...' : 'Confirm Access'}
                </button>
              </div>
           </div>
        </Modal>
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
