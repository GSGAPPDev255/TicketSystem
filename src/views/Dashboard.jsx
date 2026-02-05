import React from 'react';
import { LayoutDashboard, Clock, AlertCircle, TrendingUp, Filter, X, Check } from 'lucide-react';
import { GlassCard, StatCard, TicketRow } from '../components/ui';

export default function DashboardView({ tickets = [], loading, role, onRefresh, onSelectTicket, onNewTicket, title = "Dashboard" }) {
  
  // Safe filtering in case tickets is null/undefined
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  
  // Calculate Stats
  const openTickets = safeTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length;
  const criticalTickets = safeTickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length;
  const slaBreaches = safeTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && t.status !== 'Resolved').length;
  const pendingVendor = safeTickets.filter(t => t.status === 'Pending Vendor').length;

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

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Open Tickets" 
          value={openTickets} 
          icon={LayoutDashboard} 
          trend={openTickets > 5 ? "+2 this week" : "Stable"}
          trendUp={openTickets > 5} // Red if high
        />
        <StatCard 
          label="SLA Breaches" 
          value={slaBreaches} 
          icon={AlertCircle} 
          trend={slaBreaches === 0 ? "Perfect" : "Attention Needed"}
          trendUp={slaBreaches === 0} // Green if 0
        />
        <StatCard 
          label="Critical Issues" 
          value={criticalTickets} 
          icon={TrendingUp} 
          trend="Requires immediate action"
          trendUp={false}
        />
        <StatCard 
          label="Pending Vendor" 
          value={pendingVendor} 
          icon={Clock} 
          trend="Waiting on 3rd party"
          trendUp={true}
        />
      </div>

      {/* ACTIVE QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Active Queue</h3>
              <span className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{safeTickets.length}</span>
           </div>
           <button className="p-2 text-slate-400 hover:text-white"><Filter size={18} /></button>
        </div>

        <div className="space-y-2">
           {loading && safeTickets.length === 0 ? (
             <div className="text-center py-12 text-slate-500">Loading tickets...</div>
           ) : safeTickets.length === 0 ? (
             <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
               <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500"><Check size={24}/></div>
               <p className="text-slate-400 font-medium">All caught up!</p>
               <p className="text-xs text-slate-500">No tickets found in this view.</p>
             </div>
           ) : (
             safeTickets.map(ticket => (
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
