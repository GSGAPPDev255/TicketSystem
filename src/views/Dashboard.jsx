// src/views/Dashboard.jsx
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  Activity, AlertCircle, CheckCircle, Clock, TrendingUp, 
  Users, ArrowUpRight, ArrowDownRight, Search, Filter
} from 'lucide-react';

// --- COLOR PALETTE ---
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

// ADDED: onTicketClick prop
export default function Dashboard({ tickets = [], departments = [], users = [], onTicketClick }) {
  
  // --- 1. DATA PROCESSING ---
  const stats = useMemo(() => {
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    
    const total = safeTickets.length;
    const open = safeTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
    const resolved = safeTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    
    // Risk: Due in < 4 hours AND not resolved
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const atRisk = safeTickets.filter(t => {
      if (!t.sla_due_at || t.status === 'resolved' || t.status === 'closed') return false;
      const due = new Date(t.sla_due_at);
      return due > now && due < fourHoursFromNow;
    }).length;

    const breached = safeTickets.filter(t => t.sla_breached).length;

    return { total, open, resolved, atRisk, breached };
  }, [tickets]);

  // Chart 1: Tickets by Department
  const deptData = useMemo(() => {
    const counts = {};
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    
    safeTickets.forEach(t => {
      const deptId = t.department_id || 'unknown';
      counts[deptId] = (counts[deptId] || 0) + 1;
    });

    return Object.keys(counts).map(id => {
      const dept = departments.find(d => d.id === id);
      return {
        name: dept ? dept.name : 'Unassigned',
        value: counts[id]
      };
    }).sort((a, b) => b.value - a.value);
  }, [tickets, departments]);

  // Chart 2: Active Workload
  const workloadData = useMemo(() => {
    const counts = {};
    const safeTickets = Array.isArray(tickets) ? tickets : [];

    safeTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').forEach(t => {
       const assignee = t.assignee_id || 'unassigned';
       counts[assignee] = (counts[assignee] || 0) + 1;
    });

    return Object.keys(counts)
      .map(id => {
         if (id === 'unassigned') return { name: 'Unassigned', value: counts[id], color: '#94a3b8' };
         const user = users.find(u => u.id === id);
         return { name: user ? user.full_name.split(' ')[0] : 'Unknown', value: counts[id], color: '#6366f1' };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); 
  }, [tickets, users]);

  // Chart 3: Velocity
  const velocityData = useMemo(() => {
    const days = {};
    const safeTickets = Array.isArray(tickets) ? tickets : [];

    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        days[dateStr] = 0;
    }

    safeTickets.forEach(t => {
        if (!t.created_at) return;
        const d = new Date(t.created_at);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (days[dateStr] !== undefined) {
            days[dateStr]++;
        }
    });

    return Object.keys(days).map(day => ({ name: day, tickets: days[day] }));
  }, [tickets]);

  // Helper for Status Badges
  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      open: 'bg-purple-100 text-purple-700 border-purple-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      closed: 'bg-slate-100 text-slate-700 border-slate-200',
      breached: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${styles[status] || styles.new}`}>
        {status}
      </span>
    );
  };

  // --- COMPONENT RENDER ---

  const StatCard = ({ title, value, sub, icon: Icon, colorClass }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
       <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
          <Icon size={64} />
       </div>
       <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
             <div className={`p-1.5 rounded-md ${colorClass} bg-opacity-10 text-current`}>
                <Icon size={16} className={colorClass.replace('text-', '')} />
             </div>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</h3>
          </div>
          <div className="flex items-end gap-3">
             <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{sub}</p>
       </div>
    </div>
  );

  return (
    <div className="max-w-[1920px] mx-auto space-y-6 p-6 lg:p-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200 dark:border-slate-800">
         <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
              Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Control</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Live system metrics.</p>
         </div>
      </div>

      {/* 1. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard 
            title="Total Tickets" 
            value={stats.total} 
            sub="All time volume" 
            icon={Activity} 
            colorClass="text-slate-500"
         />
         <StatCard 
            title="Active Queue" 
            value={stats.open} 
            sub="Currently unresolved" 
            icon={Clock} 
            colorClass="text-blue-500"
         />
         <StatCard 
            title="Critical Risk" 
            value={stats.atRisk} 
            sub="Breaching < 4h" 
            icon={AlertCircle} 
            colorClass="text-amber-500" 
         />
         <StatCard 
            title="Resolved" 
            value={stats.resolved} 
            sub="Successfully closed" 
            icon={CheckCircle} 
            colorClass="text-emerald-500"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* 2. VELOCITY CHART */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-900 dark:text-white text-sm">7-Day Velocity</h3>
            </div>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocityData}>
                     <defs>
                        <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                     />
                     <Area type="monotone" dataKey="tickets" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 3. WORKLOAD BAR CHART */}
         <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4">Active Workload</h3>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={workloadData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                        {workloadData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 4. WATCHLIST (Actionable) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                   <AlertCircle size={16} className="text-amber-500" />
                   Priority Watchlist
                </h3>
             </div>
             
             <div className="space-y-2">
                {tickets.filter(t => t.status !== 'resolved' && t.priority === 'high').slice(0, 4).map(ticket => (
                   // ADDED: onClick and cursor-pointer
                   <div 
                      key={ticket.id} 
                      onClick={() => onTicketClick && onTicketClick(ticket)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition-all"
                   >
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center font-bold text-xs">
                            !
                         </div>
                         <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</p>
                            <p className="text-[10px] text-slate-500">#{ticket.friendly_id} • {ticket.category || 'Support'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <span className="block text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                            Urgent
                         </span>
                      </div>
                   </div>
                ))}
                
                {tickets.filter(t => t.priority === 'high').length === 0 && (
                   <div className="text-center py-8 text-slate-400 text-xs">
                      <CheckCircle size={24} className="mx-auto mb-2 opacity-20" />
                      No critical tickets.
                   </div>
                )}
             </div>
          </div>

          {/* 5. LIVE FEED (Actionable) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" />
                    Live Feed
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950/30 text-slate-500 font-medium">
                      <tr>
                          <th className="px-4 py-2 text-[10px] uppercase tracking-wider">ID</th>
                          <th className="px-4 py-2 text-[10px] uppercase tracking-wider">Subject</th>
                          <th className="px-4 py-2 text-[10px] uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Array.isArray(tickets) && [...tickets]
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .slice(0, 5)
                          .map(ticket => (
                          // ADDED: onClick and cursor-pointer
                          <tr 
                            key={ticket.id} 
                            onClick={() => onTicketClick && onTicketClick(ticket)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                          >
                              <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">#{ticket.friendly_id}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white text-xs max-w-[150px] truncate">
                                {ticket.subject}
                              </td>
                              <td className="px-4 py-2.5">
                                {getStatusBadge(ticket.status || 'new')}
                              </td>
                          </tr>
                      ))}
                    </tbody>
                </table>
              </div>
          </div>
      </div>
    </div>
  );
}
