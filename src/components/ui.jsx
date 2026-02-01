import React from 'react';
import { 
  Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe, HelpCircle,
  Mail, MessageCircle, ChevronRight, ArrowLeft, Trash2, Users, FileText
} from 'lucide-react';

// --- ICONS ---
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
    className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:scale-[1.01] hover:border-white/20 cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Badge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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

export const StatCard = ({ label, value, trend, color }) => (
  <GlassCard className="p-4 flex flex-col gap-1">
    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
    <div className="flex items-end justify-between">
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

// --- VIEW COMPONENTS ---

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
        <p className="text-xs text-slate-500">#{ticket.friendly_id || '?'} • {ticket.location}</p>
      </div>
      <div className="hidden md:block md:col-span-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 border border-white/10">{ticket.requester.charAt(0)}</div>
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

export const TicketDetailView = ({ ticket, onBack }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] animate-in fade-in slide-in-from-right-4">
    <div className="lg:col-span-2 flex flex-col h-full gap-4">
      <div className="flex items-start gap-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">{ticket.subject}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
             <span>#{ticket.friendly_id}</span>
             <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
             <span>{ticket.lastUpdate}</span>
          </div>
        </div>
      </div>
      <GlassCard className="p-6 border-l-4 border-l-blue-500">
         <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-white/10">U</div>
             <div><p className="text-sm font-semibold text-white">{ticket.requester}</p><p className="text-xs text-slate-500">Requester</p></div>
         </div>
         <p className="text-slate-300 leading-relaxed">{ticket.description || 'No description provided.'}</p>
      </GlassCard>
    </div>
    <div className="hidden lg:block space-y-4">
      <GlassCard className="p-5 space-y-6">
         <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Status</label><Badge status={ticket.status} /></div>
         <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Assignee</label><div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5"><div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs">AC</div><span className="text-sm text-slate-300">{ticket.assignee}</span></div></div>
      </GlassCard>
    </div>
  </div>
);

export const TicketForm = ({ categories, initialSubject, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({ subject: initialSubject || '', description: '', category: 'Hardware', location: '' });
  // Make state import work if not imported at top
  const React = require('react');
  const useState = React.useState; 
  return (
    <GlassCard className="p-8 space-y-6 animate-in fade-in zoom-in-95">
       <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Wrench size={24} /></div>
          <div><h2 className="text-xl font-bold text-white">New Ticket</h2><p className="text-sm text-slate-400">Submit a request to IT</p></div>
       </div>
       <div className="space-y-4">
         <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Subject" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none" />
         <div className="grid grid-cols-2 gap-4">
            <select className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              {categories.map(cat => <option key={cat.id} value={cat.label}>{cat.label}</option>)}
            </select>
            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Location (e.g. Room 101)" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none" />
         </div>
         <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none resize-none" />
       </div>
       <div className="flex gap-3 pt-4">
         <button onClick={onCancel} className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5">Cancel</button>
         <button onClick={() => onSubmit(formData)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg shadow-lg">Submit Ticket</button>
       </div>
    </GlassCard>
  );
};

export const KnowledgeBaseView = ({ articles, categories, onDelete }) => (
  <div className="space-y-6">
    <div className="relative py-8 px-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 text-center"><h2 className="text-2xl font-bold text-white">Knowledge Base</h2><p className="text-slate-400">Search guides and documentation</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{categories.map(cat => <GlassCard key={cat.id} className="p-4 flex flex-col items-center gap-2 hover:bg-white/5"><div className={`p-3 rounded-full ${cat.bg} ${cat.color}`}>{getIcon(cat.icon)}</div><span className="text-sm font-medium text-slate-300">{cat.label}</span></GlassCard>)}</div>
    <div className="space-y-4">
      {articles.map(a => (
        <GlassCard key={a.id} className="p-5 flex items-start justify-between group">
          <div>
            <h4 className="font-medium text-slate-200">{a.title}</h4>
            <p className="text-xs text-slate-500 mt-1">{a.category} • {a.views} views</p>
          </div>
          {/* DELETE BUTTON ADDED HERE */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
        </GlassCard>
      ))}
    </div>
  </div>
);
