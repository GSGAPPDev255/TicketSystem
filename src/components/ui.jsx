import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Clock, Send, Users, 
  Briefcase, Monitor, Cpu, Wifi, ShieldAlert, Wrench, Zap, Globe, FileText, CheckCircle2,
  TrendingUp, TrendingDown, Activity
} from 'lucide-react';

// --- HELPER: ICON MAPPER ---
export const getIcon = (name, size = 18, className = "") => {
  const icons = {
    Briefcase, Monitor, Cpu, Wifi, ShieldAlert, Wrench, Zap, Globe, FileText
  };
  const IconComponent = icons[name] || Briefcase;
  return <IconComponent size={size} className={className} />;
};

// --- COMPONENT: GLASS CARD ---
export const GlassCard = ({ children, className = "", hover = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`
      bg-[#1e293b]/60 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl
      ${hover ? 'hover:bg-[#1e293b]/80 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

// --- COMPONENT: STAT CARD ---
export const StatCard = ({ label, value, icon: Icon, trend, trendUp }) => (
  <div className="bg-[#1e293b]/60 backdrop-blur-md border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <div className="p-3 bg-white/5 rounded-xl text-blue-400 group-hover:scale-110 transition-transform duration-300">
        <Icon size={24} />
      </div>
    </div>
    {trend && (
      <div className={`flex items-center gap-2 text-xs font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        <span>{trend}</span>
      </div>
    )}
  </div>
);

// --- COMPONENT: TICKET ROW ---
export const TicketRow = ({ ticket, onClick }) => (
  <div 
    onClick={onClick}
    className="group flex items-center justify-between p-4 bg-[#1e293b]/40 border border-white/5 rounded-xl hover:bg-[#1e293b]/80 hover:border-blue-500/30 transition-all cursor-pointer"
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-full ${
        ticket.priority === 'Critical' ? 'bg-rose-500/10 text-rose-400' : 
        ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-400' : 
        'bg-blue-500/10 text-blue-400'
      }`}>
        {getIcon(ticket.category, 20)}
      </div>
      <div>
        <h4 className="font-semibold text-slate-200 group-hover:text-white transition-colors">{ticket.subject}</h4>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="font-mono">#{ticket.id.slice(0,4)}</span>
          <span>•</span>
          <span>{ticket.requester}</span>
          <span>•</span>
          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {ticket.priority && (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
           ticket.priority === 'Critical' ? 'bg-rose-500/20 text-rose-300' : 
           ticket.priority === 'High' ? 'bg-orange-500/20 text-orange-300' : 
           'bg-blue-500/10 text-blue-300'
        }`}>
          {ticket.priority}
        </span>
      )}
      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
        ticket.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
        ticket.status === 'New' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
        'bg-slate-700/50 text-slate-300 border-white/10'
      }`}>
        {ticket.status}
      </div>
    </div>
  </div>
);

// --- COMPONENT: NAV ITEM ---
export const NavItem = ({ icon: Icon, label, active, onClick, count, collapsed }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 group
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
      ${collapsed ? 'justify-center px-0' : ''}
    `}
    title={collapsed ? label : ''}
  >
    <div className={`relative ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0f172a]">
          {count}
        </span>
      )}
    </div>
    {!collapsed && (
      <span className={`text-sm font-medium ${active ? 'text-white' : ''}`}>
        {label}
      </span>
    )}
    {!collapsed && count > 0 && !active && (
      <span className="ml-auto text-xs font-semibold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
        {count}
      </span>
    )}
  </button>
);

// --- COMPONENT: MODAL ---
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- TICKET DETAIL VIEW (FIXED AUDIT LOGGING) ---
export const TicketDetailView = ({ ticket, onBack }) => {
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [assigneeId, setAssigneeId] = useState(ticket.assignee_id || '');
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 

  // 1. Init Data
  useEffect(() => {
    fetchUpdates();
    fetchStaff();
    getCurrentUser(); 
  }, [ticket.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchUpdates = async () => {
    const { data } = await supabase
      .from('ticket_updates')
      .select('*, profile:profiles(full_name, avatar_initials)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    if (data) setUpdates(data);
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'user') 
      .order('full_name');
    if (data) setStaffMembers(data);
  };

  // 2. HELPER: LOG SYSTEM MESSAGE
  const logSystemMessage = async (message) => {
    if (!currentUser) return;
    await supabase.from('ticket_updates').insert({
      ticket_id: ticket.id,
      user_id: currentUser.id,
      content: message
    });
    fetchUpdates(); // Refresh log immediately
  };

  // 3. HANDLE ASSIGNMENT (AUTO-SAVE & LOG)
  const handleAssign = async (newId) => {
    setAssigneeId(newId);
    
    // DB Update
    await supabase.from('tickets').update({ assignee_id: newId || null }).eq('id', ticket.id);
    
    // Log it
    const assigneeName = staffMembers.find(s => s.id === newId)?.full_name || 'Unassigned';
    await logSystemMessage(`Changed assignee to: ${assigneeName}`);

    // Auto-Status Logic
    if (newId && status === 'New') {
      await handleStatusChange('In Progress'); // Re-use status logic
    }
  };

  // 4. HANDLE STATUS CHANGE (AUTO-SAVE & LOG)
  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    
    // DB Update
    await supabase.from('tickets').update({ status: newStatus }).eq('id', ticket.id);
    
    // Log it
    await logSystemMessage(`Changed status to: ${newStatus}`);
  };

  // 5. "TAKE OWNERSHIP" SHORTCUT
  const assignToMe = async () => {
    if (!currentUser) return;
    await handleAssign(currentUser.id);
  };

  // 6. POST COMMENT (USER TYPED)
  const handlePostUpdate = async () => {
    if (!newUpdate.trim()) return;
    setLoading(true);

    if (!currentUser) return;

    await supabase.from('ticket_updates').insert({
      ticket_id: ticket.id,
      user_id: currentUser.id,
      content: newUpdate
    });

    setNewUpdate('');
    fetchUpdates();
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-right-4">
      {/* LEFT COL: INFO */}
      <div className="lg:col-span-2 flex flex-col h-full gap-4 overflow-hidden">
        <div className="flex items-start gap-4 mb-2 shrink-0">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
             <div className="flex justify-between items-start">
                <h1 className="text-2xl font-bold text-white leading-tight">{ticket.subject}</h1>
                {ticket.priority && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    ticket.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                    ticket.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {ticket.priority} Priority
                  </span>
                )}
             </div>
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mt-2">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
             <Activity size={12} /> Activity Log
           </div>
           {updates.length === 0 && <div className="text-center py-8 text-slate-500 italic text-sm border border-white/5 rounded-xl border-dashed">No updates yet.</div>}
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
                      <span className="text-sm font-semibold text-slate-300">{update.profile?.full_name || 'System'}</span>
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

      {/* RIGHT COL: CONTROLS */}
      <div className="hidden lg:block space-y-4">
        <GlassCard className="p-5 space-y-6 sticky top-0">
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Current Status</label>
              <select 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                 {['New', 'In Progress', 'Pending Vendor', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>

           <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</label>
                {assigneeId !== currentUser?.id && (
                  <button onClick={assignToMe} className="text-[10px] bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 px-2 py-1 rounded transition-colors uppercase font-bold">
                    Take Ownership
                  </button>
                )}
              </div>
              <div className="relative">
                <select 
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 pl-9 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                  value={assigneeId}
                  onChange={(e) => handleAssign(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffMembers.map(staff => <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.role})</option>)}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Users size={14} /></div>
              </div>
           </div>

           <div className="pt-4 border-t border-white/5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Add Update</label>
              <textarea 
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-none"
                placeholder="Type your response here..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
              />
           </div>

           <button onClick={handlePostUpdate} disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
             {loading ? <Clock size={16} className="animate-spin"/> : <Send size={16}/>}
             {loading ? 'Posting...' : 'Post Update'}
           </button>
        </GlassCard>
      </div>
    </div>
  );
};
