import React, { useState } from 'react';
import { LayoutDashboard, Clock, AlertCircle, TrendingUp, Filter, X, Check, Bot } from 'lucide-react';
import { GlassCard, StatCard, TicketRow } from '../components/ui';

export default function DashboardView({ tickets = [], loading, role, onRefresh, onSelectTicket, onNewTicket, title = "Dashboard" }) {
  const [filterMode, setFilterMode] = useState('active'); // 'active', 'sla', 'critical', 'bot'
  
  // Safe filtering
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  
  // 1. Calculate Stats (Global)
  const openTickets = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const criticalTickets = safeTickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length;
  const slaBreaches = safeTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && t.status !== 'Resolved').length;
  // Count tickets assigned to the Bot (regardless of status, though usually Resolved)
  const botResolved = safeTickets.filter(t => t.assignee === 'Nexus Bot').length;

  // 2. Filter the List based on Selection
  let displayedTickets = [];
  let listTitle = "";

  switch (filterMode) {
    case 'bot':
      displayedTickets = safeTickets.filter(t => t.assignee === 'Nexus Bot');
      listTitle = "🤖 Auto-Resolved by Bot";
      break;
    case 'critical':
      displayedTickets = safeTickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved');
      listTitle = "🔥 Critical Issues";
      break;
    case 'sla':
      displayedTickets = safeTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && t.status !== 'Resolved');
      listTitle = "🚨 SLA Breaches";
      break;
    case 'active':
    default:
      // Standard view: Open tickets NOT assigned to bot
      displayedTickets = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed' && t.assignee !== 'Nexus Bot');
      listTitle = "Active Queue";
      break;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-slate-400">Overview of current workload</p>
        </div>
        <div className="flex gap-2">
           <button onClick={onRefresh} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors" title="Refresh Data">
             <Clock size={20} className={loading ? "animate-spin" : ""} />
           </button>
           <button onClick={onNewTicket} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
             <span>+ New Ticket</span>
           </button>
        </div>
      </div>

      {/* STATS GRID - NOW CLICKABLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: OPEN TICKETS */}
        <div onClick={() => setFilterMode('active')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'active' ? 'ring-2 ring-blue-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="Open Tickets" 
            value={openTickets} 
            icon={LayoutDashboard} 
            trend={openTickets > 5 ? "High Load" : "Stable"}
            trendUp={openTickets > 5}
          />
        </div>

        {/* CARD 2: BOT RESOLVED (NEW) */}
        <div onClick={() => setFilterMode('bot')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'bot' ? 'ring-2 ring-purple-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="Auto-Resolved" 
            value={botResolved} 
            icon={Bot} 
            trend="KB Deflection"
            trendUp={true} // Green is good here
          />
        </div>

        {/* CARD 3: SLA BREACHES */}
        <div onClick={() => setFilterMode('sla')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'sla' ? 'ring-2 ring-rose-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="SLA Breaches" 
            value={slaBreaches} 
            icon={AlertCircle} 
            trend={slaBreaches === 0 ? "Perfect" : "Attention"}
            trendUp={slaBreaches === 0}
          />
        </div>

        {/* CARD 4: CRITICAL */}
        <div onClick={() => setFilterMode('critical')} className={`cursor-pointer transition-transform active:scale-95 ${filterMode === 'critical' ? 'ring-2 ring-orange-500 rounded-2xl' : ''}`}>
          <StatCard 
            label="Critical Issues" 
            value={criticalTickets} 
            icon={TrendingUp} 
            trend="Requires Action"
            trendUp={false}
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
           
           {/* Clear Filter Button (Only shows if filtered) */}
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
                 {filterMode === 'bot' ? <Bot size={24}/> : <Check size={24}/>}
               </div>
               <p className="text-slate-400 font-medium">
                 {filterMode === 'bot' ? 'No auto-resolved tickets yet.' : 'All caught up!'}
               </p>
               <p className="text-xs text-slate-500">
                 {filterMode === 'bot' ? 'The bot is waiting for its first win.' : 'No tickets found in this view.'}
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
