import React from 'react';
import { Clock, Filter } from 'lucide-react';
import { StatCard, TicketRow } from '../components/ui';

export default function DashboardView({ tickets, loading, role, onRefresh, onSelectTicket, onNewTicket }) {
  // Logic: If 'My Queue' is selected, we filter tickets assigned to current user.
  // For this prototype, we show all, but the UI supports the switch.
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* KPI Cards - Only for Techs/Admins */}
      {role !== 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Open Tickets" value={tickets.length} trend="+2" color="blue" />
          <StatCard label="SLA Breaches" value="0" trend="stable" color="rose" />
          <StatCard label="Avg Response" value="14m" trend="stable" color="emerald" />
          <StatCard label="Pending Vendor" value="3" trend="+1" color="purple" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-300">Active Queue</h3>
        <div className="flex gap-2">
           <button onClick={onRefresh} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5"><Clock size={16} /></button>
           <button className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5"><Filter size={16} /></button>
        </div>
      </div>

      {loading ? (
         <div className="text-center py-10 text-slate-500">Syncing with Supabase...</div>
      ) : tickets.length === 0 ? (
         <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5 border-dashed">
            <p className="text-slate-400 mb-2">No tickets found.</p>
            <button onClick={onNewTicket} className="text-blue-400 hover:underline">Create your first ticket</button>
         </div>
      ) : (
        <div className="grid gap-3">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} onClick={() => onSelectTicket(ticket)} />
          ))}
        </div>
      )}
    </div>
  );
}
