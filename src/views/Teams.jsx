import React, { useState } from 'react';
import { ArrowLeft, Users, ShieldAlert, MoreHorizontal } from 'lucide-react';
import { GlassCard } from '../components/ui';

export default function TeamsView({ departments = [], members = {} }) {
  const [selectedDept, setSelectedDept] = useState(null);

  if (selectedDept) {
    const deptMembers = members[selectedDept.id] || [];
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
        <button onClick={() => setSelectedDept(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Departments
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl ${selectedDept.bg} ${selectedDept.color}`}>
                 <selectedDept.icon size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
               <p className="text-slate-400 text-sm">Managing staff members</p>
             </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Add Member
          </button>
        </div>

        {deptMembers.length === 0 ? (
           <div className="text-center py-10 text-slate-500 border border-white/5 rounded-xl border-dashed">
              No members assigned to this department yet.
           </div>
        ) : (
          <div className="grid gap-3">
             {deptMembers.map(member => (
               <GlassCard key={member.id} className="p-4 flex items-center justify-between group">
                 {/* Member Card Logic Here */}
               </GlassCard>
             ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-200">Department Status</h3>
          <p className="text-sm text-slate-400">Real-time workload</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors border border-blue-500/20">
          <Users size={16} />
          Manage Groups
        </button>
      </div>

      {departments.length === 0 ? (
         <div className="text-center py-10 text-slate-500">
            No departments found. Add them in Supabase directly for now.
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
                   <div className={`p-3 rounded-xl ${dept.bg || 'bg-white/10'} ${dept.color || 'text-white'}`}>
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
