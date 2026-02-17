// src/views/Dashboard.jsx
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  Activity, AlertCircle, CheckCircle, Clock, TrendingUp, 
  Users, ArrowUpRight, ArrowDownRight, MoreHorizontal
} from 'lucide-react';

// --- COLOR PALETTE ---
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
const STATUS_COLORS = {
  new: '#3b82f6',       // Blue
  open: '#8b5cf6',      // Purple
  pending: '#f59e0b',   // Amber
  resolved: '#10b981',  // Emerald
  breached: '#ef4444'   // Red
};

export default function Dashboard({ tickets = [], departments = [], users = [] }) {
  
  // --- 1. DATA PROCESSING (The Brains) ---
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
    const breached = tickets.filter(t => t.sla_breached).length;
    const unassigned = tickets.filter(t => !t.assignee_id && t.status !== 'resolved').length;

    // Calculate "Risk" (Due in < 4 hours)
    const now = new Date();
    const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const atRisk = tickets.filter(t => {
      if (!t.sla_due_at || t.status === 'resolved') return false;
      const due = new Date(t.sla_due_at);
      return due > now && due < fourHoursFromNow;
    }).length;

    return { total, open, breached, unassigned, atRisk };
  }, [tickets]);

  // Chart 1: Tickets by Department
  const deptData = useMemo(() => {
    const counts = {};
    tickets.forEach(t => {
      // Handle both direct department_id and category-based derivation if needed
      // For now, assuming t.department_id is populated
      const deptId = t.department_id || 'unknown';
      counts[deptId] = (counts[deptId] || 0) + 1;
    });

    return Object.keys(counts).map(id => {
      const dept = departments.find(d => d.id === id);
      return {
        name: dept ? dept.name : 'Unassigned',
        value: counts[id]
      };
    }).sort((a, b) => b.value - a.value); // Sort highest first
  }, [tickets, departments]);

  // Chart 2: Technician Workload (Top 5)
  const workloadData = useMemo(() => {
    const counts = {};
    tickets.filter(t => t.status !== 'resolved').forEach(t => {
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
      .slice(0, 5); // Top 5 only
  }, [tickets, users]);

  // Chart 3: 7-Day Velocity (Area Chart)
  const velocityData = useMemo(() => {
    const days = {};
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        days[dateStr] = 0;
    }

    tickets.forEach(t => {
        const d = new Date(t.created_at);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (days[dateStr] !== undefined) {
            days[dateStr]++;
        }
    });

    return Object.keys(days).map(day => ({ name: day, tickets: days[day] }));
  }, [tickets]);


  // --- SUB-COMPONENTS ---
  
  const StatCard = ({ title, value, sub, icon: Icon, colorClass, trend }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
       <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
          <Icon size={64} />
       </div>
       <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
             <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 text-current`}>
                <Icon size={20} className={colorClass.replace('text-', '')} />
             </div>
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</h3>
          </div>
          <div className="flex items-end gap-3">
             <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</span>
             {trend && (
                <span className={`text-xs font-bold mb-1 flex items-center ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {trend > 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                   {Math.abs(trend)}%
                </span>
             )}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">{sub}</p>
       </div>
    </div>
  );

  return (
    <div className="max-w-[1920px] mx-auto space-y-8 p-6 lg:p-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
         <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Control</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Live system metrics and performance tracking.</p>
         </div>
         <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM ONLINE
         </div>
      </div>

      {/* 1. STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard 
            title="Active Tickets" 
            value={stats.open} 
            sub={`${stats.unassigned} unassigned`} 
            icon={Activity} 
            colorClass="text-blue-500"
            trend={12} // Mock trend
         />
         <StatCard 
            title="Critical Risk" 
            value={stats.atRisk} 
            sub="Breaching in < 4h" 
            icon={AlertCircle} 
            colorClass="text-amber-500" 
         />
         <StatCard 
            title="SLA Breached" 
            value={stats.breached} 
            sub="Requires attention" 
            icon={Clock} 
            colorClass="text-rose-500" 
         />
         <StatCard 
            title="Resolution Rate" 
            value="94%" 
            sub="Avg 4.2h response" 
            icon={CheckCircle} 
            colorClass="text-emerald-500"
            trend={2.4} 
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* 2. MAIN CHART: VELOCITY (2/3 Width) */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Ticket Velocity</h3>
                  <p className="text-xs text-slate-500">Incoming volume over the last 7 days.</p>
               </div>
               <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <TrendingUp size={18} className="text-blue-500"/>
               </div>
            </div>
            
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocityData}>
                     <defs>
                        <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                     />
                     <Area type="monotone" dataKey="tickets" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 3. SIDE CHART: DEPARTMENT DISTRIBUTION (1/3 Width) */}
         <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">By Department</h3>
            <p className="text-xs text-slate-500 mb-6">Current active distribution.</p>
            
            <div className="h-[250px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={deptData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {deptData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
               {/* Center Text */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total}</span>
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Tickets</span>
               </div>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                {deptData.map((entry, index) => (
                   <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                         <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
                   </div>
                ))}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 4. TECHNICIAN WORKLOAD (New!) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h3 className="font-bold text-slate-900 dark:text-white text-lg">Technician Load</h3>
                   <p className="text-xs text-slate-500">Active tickets per staff member.</p>
                </div>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                   <Users size={18} />
                </div>
             </div>
             
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={workloadData} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {workloadData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* 5. AT RISK LIST (Actionable) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                   <AlertCircle size={18} className="text-amber-500" />
                   Priority Watchlist
                </h3>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-700">View All</button>
             </div>
             
             <div className="space-y-3">
                {tickets.filter(t => t.status !== 'resolved' && t.priority === 'high').slice(0, 4).map(ticket => (
                   <div key={ticket.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
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
                            Due 2h
                         </span>
                      </div>
                   </div>
                ))}
                
                {tickets.filter(t => t.priority === 'high').length === 0 && (
                   <div className="text-center py-8 text-slate-400 text-sm">
                      <CheckCircle size={32} className="mx-auto mb-2 opacity-20" />
                      No critical tickets. Nice work!
                   </div>
                )}
             </div>
          </div>

      </div>
    </div>
  );
}
