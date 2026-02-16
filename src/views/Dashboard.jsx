import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Clock, AlertCircle, TrendingUp, Filter, X, Check, Bot, Archive, 
  Calendar, Download, FileText, ChevronDown, CheckCircle2, BarChart3, PieChart as PieIcon 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { StatCard, TicketRow, GlassCard } from '../components/ui';

export default function DashboardView({ tickets = [], loading, role, onRefresh, onSelectTicket, onNewTicket, title = "Dashboard" }) {
  const [filterMode, setFilterMode] = useState('active'); 
  const [monthFilter, setMonthFilter] = useState('ALL'); 
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  // REPORTING STATE
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  // 1. IDENTIFY USER
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserEmail(data.user.email);
    });
  }, []);

  const safeTickets = Array.isArray(tickets) ? tickets : [];

  // --- DASHBOARD FILTERING (Visual only) ---
  const dateFilteredTickets = safeTickets.filter(t => {
    const ticketDate = new Date(t.created_at);
    const matchesYear = ticketDate.getFullYear().toString() === yearFilter;
    const matchesMonth = monthFilter === 'ALL' || ticketDate.getMonth().toString() === monthFilter;
    return matchesYear && matchesMonth;
  });

  // --- STATS ENGINE ---
  const openTickets = dateFilteredTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
  const criticalTickets = dateFilteredTickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved');
  const slaBreaches = dateFilteredTickets.filter(t => t.sla_breached);
  const botResolved = dateFilteredTickets.filter(t => t.assignee === 'Nexus Bot' || t.assignee === 'GSG Bot');
  const myResolved = dateFilteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');

  // --- CHART DATA PREP ---
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  
  const volumeData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('en-GB', { weekday: 'short' }),
    tickets: safeTickets.filter(t => t.created_at.startsWith(date)).length
  }));

  const pieData = [
    { name: 'Open', value: openTickets.length, color: '#3b82f6' },
    { name: 'Resolved', value: myResolved.length, color: '#10b981' },
  ];

  // --- VIEW LOGIC ---
  let displayedTickets = [];
  let listTitle = "";

  switch (filterMode) {
    case 'bot':
      displayedTickets = botResolved;
      listTitle = "🤖 Auto-Resolved by Bot";
      break;
    case 'critical':
      displayedTickets = criticalTickets;
      listTitle = "🔥 Critical Issues";
      break;
    case 'sla':
      displayedTickets = slaBreaches;
      listTitle = "🚨 SLA Breaches";
      break;
    case 'resolved':
      displayedTickets = myResolved;
      listTitle = "✅ Resolved History";
      break;
    case 'active':
    default:
      displayedTickets = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
      listTitle = "Active Queue";
      break;
  }

  // --- REPORTING ENGINE (PRESERVED) ---
  const generateReport = (type) => {
    let dataToExport = [];
    let fileName = `nexus_report_${type.toLowerCase()}_${new Date().toISOString().slice(0,10)}`;
    let isSimplified = false;

    switch (type) {
      case 'MY_ISSUES':
        dataToExport = safeTickets.filter(t => 
           (t.requester && currentUserEmail && t.requester.toLowerCase().includes(currentUserEmail.split('@')[0])) ||
           (t.assignee && currentUserEmail && t.assignee.toLowerCase().includes(currentUserEmail.split('@')[0]))
        );
        break;
      case 'OPEN':
        dataToExport = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
        break;
      case 'OPEN_SIMPLIFIED':
        dataToExport = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');
        isSimplified = true;
        break;
      case 'CLOSED':
        dataToExport = safeTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
        break;
      case 'ALL':
      default:
        dataToExport = safeTickets;
        break;
    }

    if (dataToExport.length === 0) {
      alert("No records found for this report type.");
      setShowReportMenu(false);
      return;
    }

    let headers = [];
    let rowMapper = null;

    if (isSimplified) {
      headers = ["ID", "Subject", "Status", "Priority", "Assignee"];
      rowMapper = (t) => [
        t.id,
        `"${t.subject.replace(/"/g, '""')}"`,
        t.status,
        t.priority,
        t.assignee || 'Unassigned'
      ];
    } else {
      headers = ["ID", "Subject", "Description", "Status", "Priority", "Category", "Requester", "Assignee", "Created At", "Resolved At"];
      rowMapper = (t) => [
        t.id,
        `"${t.subject.replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.status,
        t.priority || 'Medium',
        t.category || 'General',
        t.requester || 'Unknown',
        t.assignee || 'Unassigned',
        t.created_at ? new Date(t.created_at).toLocaleDateString() + ' ' + new Date(t.created_at).toLocaleTimeString() : '',
        t.resolved_at ? new Date(t.resolved_at).toLocaleDateString() + ' ' + new Date(t.resolved_at).toLocaleTimeString() : ''
      ];
    }

    const csvContent = [
      headers.join(','), 
      ...dataToExport.map(row => rowMapper(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReportMenu(false);
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1]; 

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4" onClick={() => showReportMenu && setShowReportMenu(false)}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400">Overview & Historical Data</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
           {/* TIME FILTERS */}
           <div className="flex bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-white/10 rounded-lg p-1 shadow-sm transition-colors">
              <select 
                className="bg-transparent text-sm text-slate-700 dark:text-white px-2 py-1 outline-none cursor-pointer"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="ALL">All Months</option>
                {months.map((m, i) => <option key={m} value={i.toString()}>{m}</option>)}
              </select>
              <div className="w-px bg-slate-200 dark:bg-white/10 my-1"></div>
              <select 
                className="bg-transparent text-sm font-bold text-blue-600 dark:text-blue-400 px-2 py-1 outline-none cursor-pointer"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>

           {/* REPORTS DROPDOWN */}
           <div className="relative">
             <button 
               onClick={(e) => { e.stopPropagation(); setShowReportMenu(!showReportMenu); }}
               className={`p-2 bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-[#2d3748] rounded-lg border border-slate-300 dark:border-white/10 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm ${showReportMenu ? 'text-blue-600 border-blue-500' : 'text-slate-600 dark:text-slate-300'}`}
             >
               <FileText size={16} /> <span>Reports</span> <ChevronDown size={14} />
             </button>

             {showReportMenu && (
               <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="py-1">
                    <button onClick={() => generateReport('MY_ISSUES')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2">
                      <Bot size={14} /> My Issues
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-white/10 my-1"></div>
                    <button onClick={() => generateReport('OPEN')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2">
                      <TrendingUp size={14} /> All Open Issues
                    </button>
                    <button onClick={() => generateReport('CLOSED')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2">
                      <Archive size={14} /> All Closed Issues
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-white/10 my-1"></div>
                    <button onClick={() => generateReport('ALL')} className="w-full text-left px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2">
                      <Download size={14} /> Full Data Dump (csv)
                    </button>
                  </div>
               </div>
             )}
           </div>

           <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-2 hidden md:block"></div>

           <button onClick={onRefresh} className="p-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-white rounded-lg border border-slate-300 dark:border-white/10 transition-colors shadow-sm">
             <Clock size={20} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={onNewTicket} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
             <span>+ New Ticket</span>
           </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setFilterMode('active')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'active' ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}>
          <StatCard label="Open Tickets" value={openTickets.length} icon={LayoutDashboard} trend="Active Queue" trendUp={true} />
        </div>

        <div onClick={() => setFilterMode('resolved')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'resolved' ? 'ring-2 ring-emerald-500 rounded-xl' : ''}`}>
          <StatCard label={`Resolved (${yearFilter})`} value={myResolved.length} icon={Archive} trend={monthFilter !== 'ALL' ? `In ${months[parseInt(monthFilter)]}` : "Total this year"} trendUp={true} />
        </div>

        <div onClick={() => setFilterMode('sla')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'sla' ? 'ring-2 ring-rose-500 rounded-xl' : ''}`}>
          <StatCard label="SLA Breaches" value={slaBreaches.length} icon={AlertCircle} trend="Target Missed" trendUp={slaBreaches.length === 0} />
        </div>

        <div onClick={() => setFilterMode('bot')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'bot' ? 'ring-2 ring-purple-500 rounded-xl' : ''}`}>
          <StatCard label="Bot Resolved" value={botResolved.length} icon={Bot} trend="AI Deflection" trendUp={true} />
        </div>
      </div>

      {/* CHARTS ROW (Only for Admin/Tech) */}
      {role !== 'user' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard className="p-6 col-span-2">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp size={20} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">7-Day Ticket Volume</h3>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={volumeData}>
                            <defs>
                                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#60a5fa' }}
                            />
                            <Area type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <PieIcon size={20} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Workload Status</h3>
                </div>
                <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{openTickets.length + myResolved.length}</span>
                        <span className="text-xs text-slate-500 uppercase">Total</span>
                    </div>
                </div>
            </GlassCard>
        </div>
      )}

      {/* DYNAMIC LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white transition-colors">{listTitle}</h3>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">{displayedTickets.length}</span>
           </div>
           
           {filterMode !== 'active' && (
             <button onClick={() => setFilterMode('active')} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400">
               <X size={12} /> Clear Filter
             </button>
           )}
        </div>

        <div className="space-y-2">
           {loading ? (
             <div className="text-center py-12 text-slate-500">Loading tickets...</div>
           ) : displayedTickets.length === 0 ? (
             <div className="text-center py-12 border border-dashed border-slate-300 dark:border-white/10 rounded-xl">
               <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
                 {filterMode === 'resolved' ? <Archive size={24}/> : <Check size={24}/>}
               </div>
               <p className="text-slate-500 dark:text-slate-400 font-medium">No tickets found.</p>
               <p className="text-xs text-slate-400 dark:text-slate-500">
                 {filterMode === 'resolved' ? 'Try changing the date filter.' : 'Your queue is clear!'}
               </p>
             </div>
           ) : (
             displayedTickets.map(ticket => (
               <TicketRow key={ticket.id} ticket={ticket} onClick={() => onSelectTicket(ticket)} />
             ))
           )}
        </div>
      </div>
    </div>
  );
}
