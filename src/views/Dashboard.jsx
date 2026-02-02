import React from 'react';
import { 
  LayoutDashboard, Clock, AlertCircle, CheckCircle2, 
  TrendingUp, MoreHorizontal, Filter
} from 'lucide-react';
import { GlassCard, StatCard, TicketRow, Badge } from '../components/ui';

export default function DashboardView({ 
  tickets = [], 
  loading, 
  role, 
  onRefresh, 
  onSelectTicket, 
  onNewTicket,
  title = "Dashboard" // Default to Dashboard, but changes for Queue
}) {

  // --- CALCULATE STATS ---
  // We calculate these on the fly based on the 'tickets' array passed in.
  // This means if you pass filtered tickets (My Queue), the stats reflect that.
  const stats = {
    open: tickets.filter(t => t.status !== 'Resolved').length,
    breaches: tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length,
    avgResponse: '14m', // Hardcoded for demo, normally calculated from timestamps
    pending: tickets.filter(t => t.status === 'Pending Vendor').length
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-slate-400">Overview of current workload</p>
        </div>
        <div className="flex gap-2">
           <button onClick={onRefresh} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
             <Clock size={20} />
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20" onClick={onNewTicket}>
             + New Ticket
           </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Open Tickets" 
          value={stats.open} 
          trend="+2" 
          color="blue" 
          icon={<LayoutDashboard size={18} />}
        />
        <StatCard 
          label="SLA Breaches" 
          value={stats.breaches} 
          trend="stable" 
          color="rose" 
          icon={<AlertCircle size={18} />}
        />
        <StatCard 
          label="Avg Response" 
          value={stats.avgResponse} 
          trend="stable" 
          color="emerald" 
          icon={<TrendingUp size={18} />}
        />
        <StatCard 
          label="Pending Vendor" 
          value={stats.pending} 
          trend="+1" 
          color="amber" 
          icon={<Clock size={18} />}
        />
      </div>

      {/* TICKET LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Active Queue</h3>
          <div className="flex gap-2">
             <button className="p-2 text-slate-400 hover:text-white"><Filter size={18} /></button>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border border-white/5 rounded-xl border-dashed">
            <p>No tickets found in this view.</p>
          </div>
        ) : (
          <div className="grid gap-3">
             {tickets.map(ticket => (
               <TicketRow 
                 key={ticket.id} 
                 ticket={ticket} 
                 onClick={() => onSelectTicket(ticket)} // <--- THIS WAS MISSING
               />
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
