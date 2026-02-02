import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe, HelpCircle,
  Mail, MessageCircle, ChevronRight, ArrowLeft, Trash2, Users, FileText, LayoutDashboard,
  CheckCircle2, Clock, AlertCircle, TrendingUp, MoreHorizontal, Filter, Send, CheckCircle
} from 'lucide-react';

// --- ICONS & HELPERS ---
export const getIcon = (iconName, size = 20, className) => {
  const icons = { Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe, Users, FileText };
  const IconComponent = icons[iconName] || HelpCircle;
  return <IconComponent size={size} className={className} />;
};

export const SourceIcon = ({ source }) => {
  switch (source) {
    case 'email': return <Mail size={14} className="text-purple-400" />;
    case 'teams': return <MessageCircle size={14} className="text-indigo-400" />;
    default: return <Globe size={14} className="text-cyan-400" />;
  }
};

// --- VISUAL PRIMITIVES ---
export const GlassCard = ({ children, className = '', hover = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`relative overflow-hidden bg-[#1e293b]/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl ${hover ? 'transition-all duration-300 hover:bg-[#1e293b]/80 hover:scale-[1.01] hover:border-white/20 cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Badge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Pending Vendor': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Closed': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'Critical': 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>{status}</span>;
};

export const NavItem = ({ icon: Icon, label, active, count, onClick, collapsed }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
    <Icon size={20} className={active ? 'text-blue-400' : 'text-slate-400'} />
    {!collapsed && <span className="flex-1 text-left text-sm font-medium">{label}</span>}
    {!collapsed && count && <span className="bg-rose-500/20 text-rose-300 text-xs py-0.5 px-2 rounded-full border border-rose-500/20">{count}</span>}
  </button>
);

export const StatCard = ({ label, value, trend, color, icon }) => (
  <GlassCard className="p-4 flex flex-col gap-1">
    <div className="flex justify-between items-start">
       <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
       <div className={`p-1.5 rounded-lg bg-${color}-500/10 text-${color}-400`}>{icon}</div>
    </div>
    <div className="flex items-end justify-between mt-2">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${color === 'rose' ? 'bg-rose-500/20 text-rose-300' : color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{trend}</span>
    </div>
  </GlassCard>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><ChevronRight className="rotate-90" size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- DATA ROWS ---
export const TicketRow = ({ ticket, onClick }) => (
  <GlassCard hover className="p-4 group flex items-center gap-4" onClick={onClick}>
    <div className={`p-3 rounded-xl ${ticket.category === 'Hardware' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
      {ticket.category === 'Hardware' ? <Monitor size={20} /> : <Cpu size={20} />}
    </div>
    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      <div className="md:col-span-5">
        <h4 className="font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
           {ticket.subject}
           <span className="opacity-50 group-hover:opacity-100 transition-opacity" title={`Source: ${ticket.source}`}><SourceIcon source={ticket.source} /></span>
        </h4>
        <p className="text-xs text-slate-500">#{ticket.id.slice(0,4)} • {ticket.location || 'Remote'}</p>
      </div>
      <div className="hidden md:block md:col-span-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 border border-white/10">
             {ticket.requester ? ticket.requester.charAt(0) : '?'}
          </div>
          <span className="text-sm text-slate-400 truncate">{ticket.requester}</span>
        </div>
      </div>
      <div className="md:col-span-4 flex items-center justify-end gap-3">
        <Badge status={ticket.status} />
        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-300" />
      </div>
    </div>
  </GlassCard>
);

// --- TICKET DETAIL VIEW (WITH UPDATES) ---
export const TicketDetailView = ({ ticket, onBack }) => {
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [loading, setLoading] = useState(false);

  // 1. Fetch History on Load
  useEffect(() => {
    fetchUpdates();
  }, [ticket.id]);

  const fetchUpdates = async () => {
    const { data } = await supabase
      .from('ticket_updates')
      .select('*, profile:profiles(full_name, avatar_initials)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    if (data) setUpdates(data);
  };

  // 2. Post Update
  const handlePostUpdate = async () => {
    if (!newUpdate.trim()) return;
    setLoading(true);

    // Get current user ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // A. Insert Comment
    await supabase.from('ticket_updates').insert({
      ticket_id: ticket.id,
      user_id: session.user.id,
      content: newUpdate
    });

    // B. Update Ticket Status (if changed)
    if (status !== ticket.status) {
      await supabase.from('tickets').update({ status }).eq('id', ticket.id);
    }

    setNewUpdate('');
    fetchUpdates();
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-right-4">
      
      {/* LEFT COL: TICKET INFO & STREAM */}
      <div className="lg:col-span-2 flex flex-col h-full gap-4 overflow-hidden">
        <div className="flex items-start gap-4 mb-2 shrink-0">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">{ticket.subject}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
               <span className="font-mono bg-white/5 px-1.5 rounded text-xs">#{ticket.id.slice(0,4)}</span>
               <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
               <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
               <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
               <span className="text-blue-400">{ticket.category}</span>
            </div>
          </div>
        </div>

        <GlassCard className="p-6 border-l-4 border-l-blue-500 shrink-0">
           <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-white/10 font-bold">
                  {ticket.requester ? ticket.requester.charAt(0) : 'U'}
               </div>
               <div>
                  <p className="text-sm font-semibold text-white">{ticket.requester}</p>
                  <p className="text-xs text-slate-500">Requester • {ticket.location || 'Remote'}</p>
               </div>
           </div>
           <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
        </GlassCard>

        {/* ACTIVITY STREAM */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mt-2">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Activity Log</div>
           
           {updates.length === 0 && (
             <div className="text-center py-8 text-slate-500 italic text-sm border border-white/5 rounded-xl border-dashed">No updates yet.</div>
           )}

           {updates.map(update => (
             <div key={update.id} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs text-slate-400 font-bold mt-1">
                      {update.profile?.avatar_initials || '?'}
                   </div>
                   <div className="w-px h-full bg-white/5 my-2 group-last:hidden"></div>
                </div>
                <div className="flex-1 pb-6">
                   <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-300">{update.profile?.full_name || 'Unknown'}</span>
                      <span className="text-xs text-slate-500">{new Date(update.created_at).toLocaleString()}</span>
                   </div>
                   <div className="text-slate-300 text-sm bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/5 shadow-sm">
                      {update.content}
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* RIGHT COL: ACTIONS BOX */}
      <div className="hidden lg:block space-y-4">
        <GlassCard className="p-5 space-y-6 sticky top-0">
           
           {/* STATUS SELECTOR */}
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Current Status</label>
              <select 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                 <option value="New">New</option>
                 <option value="In Progress">In Progress</option>
                 <option value="Pending Vendor">Pending Vendor</option>
                 <option value="Resolved">Resolved</option>
                 <option value="Closed">Closed</option>
              </select>
           </div>

           {/* UPDATE INPUT */}
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Add Update</label>
              <textarea 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-none"
                placeholder="Type your response here..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
              />
           </div>

           <button 
             onClick={handlePostUpdate}
             disabled={loading}
             className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
           >
             {loading ? <Clock size={16} className="animate-spin"/> : <Send size={16}/>}
             {loading ? 'Posting...' : 'Post Update'}
           </button>

           <div className="pt-4 border-t border-white/5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Assignee</label>
              <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                 <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs">AC</div>
                 <span className="text-sm text-slate-300">{ticket.assignee || 'Unassigned'}</span>
              </div>
           </div>
        </GlassCard>
      </div>
    </div>
  );
};
