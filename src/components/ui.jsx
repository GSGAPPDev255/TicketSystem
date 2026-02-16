import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, Clock, Send, Users, Paperclip,
  Briefcase, Monitor, Cpu, Wifi, ShieldAlert, Wrench, Zap, Globe, FileText, CheckCircle2,
  TrendingUp, TrendingDown, Activity, X
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
      transition-all duration-300 relative overflow-hidden
      /* DARK MODE (Glassy) */
      dark:bg-[#1e293b]/60 dark:backdrop-blur-md dark:border-white/5 dark:shadow-xl
      
      /* LIGHT MODE (Bento / Clean) */
      bg-white border border-slate-300 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]
      
      /* SHARED */
      rounded-xl
      
      /* HOVER EFFECTS */
      ${hover ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg dark:hover:bg-[#1e293b]/80 dark:hover:border-blue-500/30 hover:border-blue-400/50' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

// --- COMPONENT: STAT CARD ---
export const StatCard = ({ label, value, icon: Icon, trend, trendUp }) => (
  <GlassCard hover={true} className="p-6">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
      </div>
      <div className="p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 
        bg-blue-50 text-blue-600 
        dark:bg-white/5 dark:text-blue-400">
        <Icon size={24} />
      </div>
    </div>
    {trend && (
      <div className={`flex items-center gap-2 text-xs font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        <span>{trend}</span>
      </div>
    )}
  </GlassCard>
);

// --- COMPONENT: TICKET ROW ---
export const TicketRow = ({ ticket, onClick }) => (
  <div 
    onClick={onClick}
    className="group flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer border
      bg-white border-slate-300 shadow-sm hover:border-blue-400 hover:shadow-md
      dark:bg-[#1e293b]/40 dark:border-white/5 dark:hover:bg-[#1e293b]/80 dark:hover:border-blue-500/30"
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-full ${
        ticket.priority === 'Critical' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 
        ticket.priority === 'High' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 
        'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
      }`}>
        {getIcon(ticket.category, 20)}
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{ticket.subject}</h4>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="font-mono tracking-tight font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs border border-slate-200 dark:border-transparent">
            {ticket.ticket_number ? `${new Date(ticket.created_at).toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase()}-${ticket.ticket_number}` : `#${ticket.id.slice(0,4)}`}
          </span>
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
           ticket.priority === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 
           ticket.priority === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 
           'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
        }`}>
          {ticket.priority}
        </span>
      )}
      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
        ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 
        ticket.status === 'New' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : 
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-white/10'
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
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'}
      ${collapsed ? 'justify-center px-0' : ''}
    `}
    title={collapsed ? label : ''}
  >
    <div className={`relative ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
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
      <span className="ml-auto text-xs font-semibold bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
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
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- TICKET DETAIL VIEW ---
export const TicketDetailView = ({ ticket, onBack }) => {
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [status, setStatus] = useState(ticket.status);
  const [assigneeId, setAssigneeId] = useState(ticket.assignee_id || '');
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  
  // -- EMAIL CONTEXT DATA --
  const [requesterEmail, setRequesterEmail] = useState('');
  const [departmentEmail, setDepartmentEmail] = useState('');

  // -- RESOLUTION MODAL STATE --
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // 1. Init Data
  useEffect(() => {
    fetchUpdates();
    fetchStaff();
    getCurrentUser(); 
    fetchEmailContext();
  }, [ticket.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchEmailContext = async () => {
    if (ticket.requester_id) {
        const { data } = await supabase.from('profiles').select('email').eq('id', ticket.requester_id).single();
        if (data) setRequesterEmail(data.email);
    }
    if (ticket.department_id) {
        const { data } = await supabase.from('departments').select('team_email').eq('id', ticket.department_id).single();
        if (data) setDepartmentEmail(data.team_email);
    }
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

  // 2. HELPER: SEND EMAIL
  const sendUpdateEmail = async (subject, htmlBody, recipient) => {
      if (!recipient) return;
      console.log(`📧 Sending Email to ${recipient}`);
      await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: recipient, subject: subject, body: htmlBody })
      }).catch(e => console.error("Email fail", e));
  };

  // 3. LOG SYSTEM MESSAGE
  const logSystemMessage = async (message) => {
    if (!currentUser) return;
    await supabase.from('ticket_updates').insert({
      ticket_id: ticket.id,
      user_id: currentUser.id,
      content: message
    });
    fetchUpdates(); 
  };

  // 4. HANDLE ASSIGNMENT
  const handleAssign = async (newId) => {
    setAssigneeId(newId);
    await supabase.from('tickets').update({ assignee_id: newId || null }).eq('id', ticket.id);
    const assigneeName = staffMembers.find(s => s.id === newId)?.full_name || 'Unassigned';
    await logSystemMessage(`Changed assignee to: ${assigneeName}`);
    if (newId && status === 'New') {
      await updateStatusInDb('In Progress');
    }
  };

  // 5. HANDLE STATUS SELECT (INTERCEPT FOR RESOLUTION)
  const handleStatusSelect = (newStatus) => {
    if (newStatus === 'Resolved' || newStatus === 'Closed') {
        setPendingStatus(newStatus);
        setShowResolutionModal(true);
    } else {
        updateStatusInDb(newStatus);
    }
  };

  // 6. EXECUTE STATUS UPDATE (DB + EMAIL)
  const updateStatusInDb = async (newStatus, resolutionReason = null) => {
    setStatus(newStatus);
    
    const updates = { status: newStatus };
    if (newStatus === 'Resolved' || newStatus === 'Closed') {
      updates.resolved_at = new Date().toISOString();
    }
    
    await supabase.from('tickets').update(updates).eq('id', ticket.id);
    
    // Log the change (and the reason if provided)
    if (resolutionReason) {
        await logSystemMessage(`Marked as ${newStatus}. Resolution: ${resolutionReason}`);
    } else {
        await logSystemMessage(`Changed status to: ${newStatus}`);
    }

    // EMAIL NOTIFICATION
    if (newStatus === 'Resolved' || newStatus === 'Closed') {
        const friendlyId = ticket.ticket_number 
            ? `${new Date().toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase()}-${ticket.ticket_number}`
            : `#${ticket.id.slice(0,8)}`;

        const emailBody = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h3 style="color: #2563eb;">Ticket ${newStatus}</h3>
                <p>Ticket <b>${friendlyId}</b> ("${ticket.subject}") has been marked as <b>${newStatus}</b>.</p>
                
                ${resolutionReason ? `
                <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <strong>Resolution Notes:</strong><br/>
                    ${resolutionReason}
                </div>` : ''}

                <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
                <p>If you disagree with this, please reply to this ticket in the dashboard.</p>
                <br/>
                <a href="${window.location.origin}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Ticket</a>
            </div>
        `;
        
        if (requesterEmail) await sendUpdateEmail(`Ticket Updated: ${friendlyId} is ${newStatus}`, emailBody, requesterEmail);
        if (departmentEmail) await sendUpdateEmail(`[Team Alert] Ticket ${friendlyId} Closed`, emailBody, departmentEmail);
    }
  };

  // 7. CONFIRM RESOLUTION (FROM MODAL)
  const confirmResolution = async () => {
      if (!resolutionNote.trim()) return alert("Please provide a resolution reason.");
      await updateStatusInDb(pendingStatus, resolutionNote);
      setShowResolutionModal(false);
      setResolutionNote('');
  };

  // 8. TAKE OWNERSHIP
  const assignToMe = async () => {
    if (!currentUser) return;
    await handleAssign(currentUser.id);
  };

  // 9. POST UPDATE
  const handlePostUpdate = async () => {
    if (!newUpdate.trim()) return;
    setLoading(true);
    if (!currentUser) return;

    await supabase.from('ticket_updates').insert({
      ticket_id: ticket.id,
      user_id: currentUser.id,
      content: newUpdate
    });

    const isRequester = currentUser.id === ticket.requester_id;
    const recipient = isRequester ? departmentEmail : requesterEmail;
    
    if (recipient) {
        const friendlyId = ticket.ticket_number 
            ? `${new Date().toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase()}-${ticket.ticket_number}`
            : `#${ticket.id.slice(0,8)}`;
            
        const senderName = isRequester ? (ticket.requester || 'User') : 'IT Support';
        
        const emailBody = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h3 style="color: #2563eb;">New Reply on Ticket ${friendlyId}</h3>
                <p><b>${senderName} wrote:</b></p>
                <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    ${newUpdate}
                </div>
                <a href="${window.location.origin}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Conversation</a>
            </div>
        `;
        await sendUpdateEmail(`[Update] Ticket ${friendlyId}`, emailBody, recipient);
    }

    setNewUpdate('');
    fetchUpdates();
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-right-4">
      
      {/* RESOLUTION MODAL */}
      <Modal 
        isOpen={showResolutionModal} 
        onClose={() => setShowResolutionModal(false)} 
        title={`Mark as ${pendingStatus}`}
      >
         <div className="space-y-4">
            <p className="text-slate-500 dark:text-slate-300 text-sm">Please explain how this issue was resolved. This will be sent to the requester.</p>
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Resolution Notes</label>
               <textarea 
                  className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 outline-none mt-2 h-32 resize-none"
                  placeholder="e.g. Replaced HDMI cable in Room 3..."
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  autoFocus
               />
            </div>
            <button 
               onClick={confirmResolution}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all"
            >
               Confirm & Close Ticket
            </button>
         </div>
      </Modal>

      {/* LEFT COL: INFO (UNIFIED SCROLL) */}
      <div className="lg:col-span-2 h-full overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
        <div className="flex items-start gap-4 mb-2 shrink-0">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
             <div className="flex justify-between items-start">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{ticket.subject}</h1>
                {ticket.priority && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    ticket.priority === 'Critical' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' :
                    ticket.priority === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30' :
                    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                  }`}>
                    {ticket.priority} Priority
                  </span>
                )}
             </div>
             <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 dark:text-slate-400">
               <span className="font-mono bg-slate-100 dark:bg-white/5 px-1.5 rounded text-xs border border-slate-200 dark:border-transparent">
                 {ticket.ticket_number ? `${new Date(ticket.created_at).toLocaleString('default', { month: 'short', year: '2-digit' }).toUpperCase()}-${ticket.ticket_number}` : `#${ticket.id.slice(0,4)}`}
               </span>
               <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
               <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
               <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
               <span className="text-blue-600 dark:text-blue-400">{ticket.category}</span>
            </div>
          </div>
        </div>

        <GlassCard className="p-6 border-l-4 border-l-blue-500 shrink-0">
           <div className="flex items-center gap-3 mb-4 border-b border-slate-200 dark:border-white/5 pb-4">
               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs border border-slate-300 dark:border-white/10 font-bold text-slate-700 dark:text-white">
                  {ticket.requester ? ticket.requester.charAt(0) : 'U'}
               </div>
               <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.requester}</p>
                  <p className="text-xs text-slate-500">Requester • {ticket.location || 'Remote'}</p>
               </div>
           </div>
           <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
           
           {/* --- ATTACHMENT SECTION (CONSTRAINED) --- */}
           {ticket.attachment_url && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Paperclip size={14} /> Attachment
                </h4>
                
                {/\.(jpg|jpeg|png|gif|webp)$/i.test(ticket.attachment_url) ? (
                  <a 
                    href={ticket.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    // ADDED: max-w-sm and max-h-64 to prevent it from eating the screen
                    className="block w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-blue-500 transition-all shadow-sm group relative"
                  >
                    <img 
                      src={ticket.attachment_url} 
                      alt="Ticket Attachment" 
                      className="w-full h-48 object-cover bg-slate-100 dark:bg-black/20" 
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full border border-white/20">Click to Expand</span>
                    </div>
                  </a>
                ) : (
                  <a 
                    href={ticket.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 hover:border-blue-500 transition-all group max-w-md"
                  >
                    <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">View Attachment</p>
                      <p className="text-xs text-slate-500">Click to download file</p>
                    </div>
                  </a>
                )}
              </div>
           )}
        </GlassCard>

        {/* ACTIVITY LOG */}
        <div className="space-y-4 pb-4">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
             <Activity size={12} /> Activity Log
           </div>
           {updates.length === 0 && <div className="text-center py-8 text-slate-500 italic text-sm border border-dashed border-slate-300 dark:border-white/5 rounded-xl">No updates yet.</div>}
           {updates.map(update => (
             <div key={update.id} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                   <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 font-bold mt-1">
                      {update.profile?.avatar_initials || '?'}
                   </div>
                   <div className="w-px h-full bg-slate-200 dark:bg-white/5 my-2 group-last:hidden"></div>
                </div>
                <div className="flex-1 pb-6">
                   <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{update.profile?.full_name || 'System'}</span>
                      <span className="text-xs text-slate-500">{new Date(update.created_at).toLocaleString()}</span>
                   </div>
                   <div className="text-slate-700 dark:text-slate-300 text-sm bg-white dark:bg-white/5 p-3 rounded-lg rounded-tl-none border border-slate-200 dark:border-white/5 shadow-sm">
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
                className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50"
                value={status}
                onChange={(e) => handleStatusSelect(e.target.value)}
              >
                 {['New', 'In Progress', 'Pending Vendor', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>

           <div className="pt-4 border-t border-slate-200 dark:border-white/5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</label>
                {assigneeId !== currentUser?.id && (
                  <button onClick={assignToMe} className="text-[10px] bg-blue-100 dark:bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 px-2 py-1 rounded transition-colors uppercase font-bold">
                    Take Ownership
                  </button>
                )}
              </div>
              <div className="relative">
                <select 
                  className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 pl-9 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                  value={assigneeId}
                  onChange={(e) => handleAssign(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {staffMembers.map(staff => <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.role})</option>)}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Users size={14} /></div>
              </div>
           </div>

           <div className="pt-4 border-t border-slate-200 dark:border-white/5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Add Update</label>
              <textarea 
                className="w-full bg-slate-100 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-none"
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
