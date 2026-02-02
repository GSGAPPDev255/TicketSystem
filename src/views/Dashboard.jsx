import React, { useState } from 'react';
import { 
  LayoutDashboard, Clock, AlertCircle, TrendingUp, Filter, X, Check
} from 'lucide-react';
import { GlassCard, StatCard, TicketRow } from '../components/ui';

export default function DashboardView({ 
  tickets = [], 
  loading, 
  onRefresh, 
  onSelectTicket, 
  onNewTicket,
  title = "Dashboard"
}) {
  // --- FILTER STATE ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [priorityFilter, setPriorityFilter] = useState('All'); 

  // --- STATS CALCULATION ---
  const stats = {
    open: tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length,
    breaches: tickets.filter(t => t.priority === 'Critical' && t.status !== 'Resolved').length,
    avgResponse: '14m', 
    pending: tickets.filter(t => t.status === 'Pending Vendor').length
  };

  // --- FILTER LOGIC ---
  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    return true;
  });

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
      
      {/* HEADER */}
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
        <StatCard label="Open Tickets" value={stats.open} trend="+2" color="blue" icon={<LayoutDashboard size={18} />} />
        <StatCard label="SLA Breaches" value={stats.breaches} trend="stable" color="rose" icon={<AlertCircle size={18} />} />
        <StatCard label="Avg Response" value={stats.avgResponse} trend="stable" color="emerald" icon={<TrendingUp size={18} />} />
        <StatCard label="Pending Vendor" value={stats.pending} trend="+1" color="amber" icon={<Clock size={18} />} />
      </div>

      {/* TICKET LIST HEADER & FILTER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between relative">
          <h3 className="text-lg font-semibold text-white">
            {statusFilter !== 'All' || priorityFilter !== 'All' ? 'Filtered Results' : 'Active Queue'}
            <span className="ml-2 text-xs font-normal text-slate-500">({filteredTickets.length})</span>
          </h3>
          
          {/* FILTER BUTTON */}
          <div className="relative">
             <button 
               onClick={() => setIsFilterOpen(!isFilterOpen)} 
               className={`p-2 rounded-lg transition-colors ${isFilterOpen || statusFilter !== 'All' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'}`}
             >
               <Filter size={18} />
             </button>

             {/* FILTER DROPDOWN */}
             {isFilterOpen && (
               <div className="absolute right-0 top-full mt-2 w-72 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95">
                  
                  {/* Status Filter */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
                    <div className="space-y-1">
                      {['All', 'New', 'In Progress', 'Resolved'].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setStatusFilter(s)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                        >
                          {s} {statusFilter === s && <Check size={14}/>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/10 my-2"></div>

                  {/* Priority Filter */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Priority</label>
                    <div className="flex flex-wrap gap-2"> {/* Added flex-wrap */}
                      {['All', 'Critical', 'High', 'Medium'].map(p => (
                        <button 
                          key={p}
                          onClick={() => setPriorityFilter(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${priorityFilter === p ? 'bg-white text-black border-white' : 'border-white/10 text-slate-400 hover:border-white/30'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Button */}
                  {(statusFilter !== 'All' || priorityFilter !== 'All') && (
                    <button 
                      onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setIsFilterOpen(false); }}
                      className="w-full py-2 flex items-center justify-center gap-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border-t border-white/10 mt-2"
                    >
                      <X size={12} /> Clear Filters
                    </button>
                  )}
               </div>
             )}
          </div>
        </div>

        {/* TICKET LIST */}
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-slate-500 border border-white/5 rounded-xl border-dashed">
            <p>No tickets match your filters.</p>
            <button 
              onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); }} 
              className="text-blue-400 text-sm mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
             {filteredTickets.map(ticket => (
               <TicketRow 
                 key={ticket.id} 
                 ticket={ticket} 
                 onClick={() => onSelectTicket(ticket)} 
               />
             ))}
          </div>
        )}
      </div>
      
      {/* BACKDROP TO CLOSE MENU */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
      )}
    </div>
  );
}
