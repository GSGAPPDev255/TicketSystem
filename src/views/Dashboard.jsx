import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Clock, AlertCircle, TrendingUp, Filter, X, Check, Bot, Archive, Calendar, Download } from 'lucide-react';
import { GlassCard, StatCard, TicketRow } from '../components/ui';

export default function DashboardView({ tickets = [], loading, role, onRefresh, onSelectTicket, onNewTicket, title = "Dashboard" }) {
  const [filterMode, setFilterMode] = useState('active'); // 'active', 'sla', 'critical', 'bot', 'resolved'
  const [monthFilter, setMonthFilter] = useState('ALL'); // 0-11 or 'ALL'
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const safeTickets = Array.isArray(tickets) ? tickets : [];

  // --- DATE FILTERING LOGIC ---
  // We calculate this first, but we might ignore it for the "Active" view
  const dateFilteredTickets = safeTickets.filter(t => {
    const ticketDate = new Date(t.created_at);
    const matchesYear = ticketDate.getFullYear().toString() === yearFilter;
    const matchesMonth = monthFilter === 'ALL' || ticketDate.getMonth().toString() === monthFilter;
    return matchesYear && matchesMonth;
  });

  // --- STATS CALCULATION (Based on Date Filter) ---
  // This ensures the numbers on the cards match the selected time period
  const openTickets = dateFilteredTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const criticalTickets = dateFilteredTickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length;
  const slaBreaches = dateFilteredTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && t.status !== 'Resolved').length;
  const botResolved = dateFilteredTickets.filter(t => t.assignee === 'Nexus Bot').length;
  const myResolved = dateFilteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  // --- MODE FILTERING LOGIC ---
  let displayedTickets = [];
  let listTitle = "";

  switch (filterMode) {
    case 'bot':
      displayedTickets = dateFilteredTickets.filter(t => t.assignee === 'Nexus Bot');
      listTitle = "🤖 Auto-Resolved by Bot";
      break;
    case 'critical':
      displayedTickets = dateFilteredTickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved');
      listTitle = "🔥 Critical Issues";
      break;
    case 'sla':
      displayedTickets = dateFilteredTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && t.status !== 'Resolved');
      listTitle = "🚨 SLA Breaches";
      break;
    case 'resolved':
      displayedTickets = dateFilteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
      listTitle = "✅ Resolved History";
      break;
    case 'active':
    default:
      // CRITICAL UX RULE: Active Queue should shows ALL open work, regardless of date filter.
      // You don't want to hide a ticket from last month if it's still unresolved.
      displayedTickets = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed' && t.assignee !== 'Nexus Bot');
      listTitle = "Active Queue (All Time)";
      break;
  }

  // --- CSV EXPORT FUNCTION (FIXED) ---
  const handleExportCSV = () => {
    if (displayedTickets.length === 0) {
      alert("No data to export in the current view.");
      return;
    }

    // Define headers
    const headers = ["ID", "Subject", "Status", "Priority", "Category", "Requester", "Assignee", "Created At", "Resolved At"];
    
    // Helper to format dates safely
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? '' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    // Convert data to CSV rows
    const rows = displayedTickets.map(t => [
      t.id,
      `"${t.subject.replace(/"/g, '""')}"`, // Escape quotes in subject
      t.status,
      t.priority || 'Medium',
      t.category || 'General',
      t.requester || 'Unknown',
      t.assignee || 'Unassigned',
      formatDate(t.created_at),
      formatDate(t.resolved_at) // <--- USES NEW COLUMN
    ]);

    // Build CSV string
    const csvContent = [
      headers.join(','), 
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nexus_export_${filterMode}_${yearFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  // Dynamic Year Generator (Current Year + Next Year)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1]; 

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-slate-400">Overview & Historical Data</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
           {/* TIME FILTERS */}
           <div className="flex bg-[#1e293b] border border-white/10 rounded-lg p-1">
              <select 
                className="bg-transparent text-sm text-white px-2 py-1 outline-none cursor-pointer"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="ALL">All Months</option>
                {months.map((m, i) => <option key={m} value={i.toString()}>{m}</option>)}
              </select>
              <div className="w-px bg-white/10 my-1"></div>
              <select 
                className="bg-transparent text-sm font-bold text-blue-400 px-2 py-1 outline-none cursor-pointer"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>

           {/* EXPORT BUTTON */}
           <button onClick={handleExportCSV} className="p-2 bg-[#1e293b] hover:bg-[#2d3748] text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors flex items-center gap-2 text-sm font-medium">
             <Download size={16} /> <span>Export CSV</span>
           </button>

           <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>

           <button onClick={onRefresh} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors">
             <Clock size={20} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={onNewTicket} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
             <span>+ New Ticket</span>
           </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: ACTIVE */}
        <div onClick={() => setFilterMode('active')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'active' ? 'ring-2 ring-blue-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="Open Tickets" 
            value={openTickets} 
            icon={LayoutDashboard} 
            trend="Active Queue" 
            trendUp={true} 
          />
        </div>

        {/* CARD 2: HISTORY */}
        <div onClick={() => setFilterMode('resolved')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'resolved' ? 'ring-2 ring-emerald-500 rounded-2xl' : ''}`}>
          <StatCard 
            label={`Resolved (${yearFilter})`} 
            value={myResolved} 
            icon={Archive} 
            trend={monthFilter !== 'ALL' ? `In ${months[parseInt(monthFilter)]}` : "Total this year"}
            trendUp={true}
          />
        </div>

        {/* CARD 3: SLA */}
        <div onClick={() => setFilterMode('sla')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'sla' ? 'ring-2 ring-rose-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="SLA Breaches" 
            value={slaBreaches} 
            icon={AlertCircle} 
            trend="Target Missed"
            trendUp={slaBreaches === 0}
          />
        </div>

        {/* CARD 4: BOT */}
        <div onClick={() => setFilterMode('bot')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'bot' ? 'ring-2 ring-purple-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="Bot Resolved" 
            value={botResolved} 
            icon={Bot} 
            trend="AI Deflection"
            trendUp={true}
          />
        </div>
      </div>

      {/* DYNAMIC LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{listTitle}</h3>
              <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{displayedTickets.length}</span>
           </div>
           
           {filterMode !== 'active' && (
             <button onClick={() => setFilterMode('active')} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
               <X size={12} /> Clear Filter
             </button>
           )}
        </div>

        <div className="space-y-2">
           {loading ? (
             <div className="text-center py-12 text-slate-500">Loading tickets...</div>
           ) : displayedTickets.length === 0 ? (
             <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
                 {filterMode === 'resolved' ? <Archive size={24}/> : <Check size={24}/>}
               </div>
               <p className="text-slate-400 font-medium">No tickets found.</p>
               <p className="text-xs text-slate-500">
                 {filterMode === 'resolved' ? 'Try changing the date filter.' : 'Your queue is clear!'}
               </p>
             </div>
           ) : (
             displayedTickets.map(ticket => (
               <TicketRow 
                 key={ticket.id} 
                 ticket={ticket} 
                 onClick={() => onSelectTicket(ticket)} 
               />
             ))
           )}
        </div>
      </div>
    </div>
  );
}
