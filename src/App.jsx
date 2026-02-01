import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, Plus, Search, Bell, Settings, LogOut, Wifi, Monitor, Cpu, ShieldAlert, 
  User, MessageSquare, CheckCircle2, Clock, AlertCircle, Menu, X, ChevronRight, Filter, 
  MoreVertical, Paperclip, Send, Building2, Users, Mail, MessageCircle, Globe, Zap, Eye, 
  Book, FileText, ThumbsUp, Share2, MoreHorizontal, Trash2, ArrowLeft, Key, Server, HelpCircle, Wrench, ShoppingBag, UserPlus, ChevronDown, ChevronUp
} from 'lucide-react';

// --- MOCK DATA (Restored for non-DB features) ---
const INITIAL_TENANTS = [
  { id: 't1', name: "St. Mary's High", code: 'SMH', domain: 'stmarys.edu', status: 'active', users: 1240, type: 'School' },
  { id: 't2', name: "Northfield Primary", code: 'NFP', domain: 'northfield.edu', status: 'active', users: 850, type: 'School' }
];

const MOCK_CATEGORIES = [
  { id: 'hardware', label: 'Hardware', icon: 'Monitor', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'software', label: 'Software', icon: 'Cpu', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'network', label: 'Network', icon: 'Wifi', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

const MOCK_KB_ARTICLES = [
  { id: 1, title: 'Connecting to Student Wi-Fi', category: 'Network', views: 1250, author: 'Alex Chen', lastUpdated: '2 days ago', helpful: 142, content: 'To connect, select Student-WiFi...' },
  { id: 2, title: 'Kyocera Printer: Paper Jam', category: 'Hardware', views: 890, author: 'Sarah Jenkins', lastUpdated: '1 week ago', helpful: 56, content: 'Open Tray 1...' },
];

// --- UTILITIES ---
const getIcon = (iconName, size = 20, className) => {
  const icons = { Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe };
  const IconComponent = icons[iconName] || HelpCircle;
  return <IconComponent size={size} className={className} />;
};

// --- APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [tickets, setTickets] = useState([]); // REAL DB DATA
  const [kbArticles, setKbArticles] = useState(MOCK_KB_ARTICLES);
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTenant, setCurrentTenant] = useState(INITIAL_TENANTS[0]);
  const [loading, setLoading] = useState(false);

  // --- 1. SUPABASE FETCH ---
  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:profiles!requester_id(full_name),
        assignee:profiles!assignee_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map(t => ({
        ...t,
        requester: t.requester?.full_name || 'Unknown',
        assignee: t.assignee?.full_name || 'Unassigned',
        lastUpdate: new Date(t.created_at).toLocaleDateString(),
        // Defaults for UI fields not yet in DB
        sla: '4h', 
        slaStatus: 'ok',
        comments: [],
        source: t.source || 'portal'
      }));
      setTickets(formatted);
    }
    setLoading(false);
  }

  const handleLogin = (role) => {
    // Simulating login
    setCurrentUser({
      id: 'u1', name: 'Sarah Jenkins', role: role, avatar: 'SJ',
      allowedTenants: ['t1', 't2']
    });
  };

  const handleCreateTicket = async (newTicketData) => {
    // REAL DB INSERT
    const { error } = await supabase.from('tickets').insert({
      subject: newTicketData.subject,
      description: newTicketData.description || newTicketData.subject, // Fallback
      category: newTicketData.category,
      location: newTicketData.location || 'Unknown',
      status: 'New',
      priority: 'Medium'
    });

    if (!error) {
      await fetchTickets();
      setActiveTab('dashboard');
    } else {
      alert("Error creating ticket: " + error.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] relative overflow-hidden flex items-center justify-center font-sans text-slate-200">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <GlassCard className="w-full max-w-md p-8 flex flex-col items-center gap-6 z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20"><Monitor className="w-8 h-8 text-white" /></div>
          <div className="text-center"><h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">Nexus ESM</h1><p className="text-slate-400 mt-2 text-sm">Database Connected</p></div>
          <div className="w-full space-y-3 mt-4">
            <button onClick={() => handleLogin('staff')} className="w-full px-4 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-lg border border-white/5">Sign in as Staff</button>
            <button onClick={() => handleLogin('tech')} className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg border border-blue-500/20">Sign in as Tech</button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex overflow-hidden relative selection:bg-blue-500/30">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"></div>
      </div>

      <aside className={`fixed md:relative z-20 h-full transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64 translate-x-0' : 'w-20 md:w-20 -translate-x-full md:translate-x-0'} border-r border-white/5 bg-[#0f172a]/80 backdrop-blur-xl flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0"><Monitor className="w-5 h-5 text-white" /></div>
            {sidebarOpen && <span className="font-bold text-lg tracking-tight">Nexus</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {sidebarOpen && (
          <div className="px-4 pt-4">
             <div className="bg-white/5 rounded-lg border border-white/10 p-2">
                <label className="text-[10px] text-slate-500 uppercase font-semibold pl-1 mb-1 block">Context</label>
                <div className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer hover:text-blue-400 transition-colors">
                  <Building2 size={16} />
                  <span className="truncate">{currentTenant.name}</span>
                </div>
             </div>
          </div>
        )}

        <nav className="flex-1 py-6 px-2 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSelectedTicket(null); }} collapsed={!sidebarOpen} />
          <NavItem icon={Plus} label="New Ticket" active={activeTab === 'new'} onClick={() => setActiveTab('new')} collapsed={!sidebarOpen} />
          <NavItem icon={Book} label="Knowledge Base" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} collapsed={!sidebarOpen} />
          {currentUser.role !== 'staff' && <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={!sidebarOpen} />}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold shadow-lg">{currentUser.avatar}</div>
            {sidebarOpen && <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate text-white">{currentUser.name}</p><p className="text-xs text-slate-400 truncate">{currentUser.role}</p></div>}
            {sidebarOpen && <button onClick={() => setCurrentUser(null)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"><LogOut size={16} /></button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 flex flex-col">
        <header className="h-16 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400"><Menu size={20} /></button>
            <h2 className="text-xl font-semibold text-white/90">{activeTab === 'new' ? 'New Ticket' : selectedTicket ? `Ticket #${selectedTicket.friendly_id || '...'}` : `Dashboard • ${currentTenant.name}`}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative hidden md:block group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input type="text" placeholder="Search..." className="bg-black/20 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-200" />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full"><Bell size={20} /></button>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {/* VIEW: Chatbot */}
          {activeTab === 'new' && (
            <NewTicketChatView 
              kbArticles={kbArticles} categories={MOCK_CATEGORIES}
              onSubmit={handleCreateTicket} onCancel={() => setActiveTab('dashboard')} currentUser={currentUser}
            />
          )}

          {/* VIEW: Knowledge Base */}
          {activeTab === 'knowledge' && (
             <KnowledgeBaseView articles={kbArticles} categories={MOCK_CATEGORIES} />
          )}

          {/* VIEW: Dashboard */}
          {activeTab === 'dashboard' && !selectedTicket && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* RESTORED STAT CARDS */}
              {currentUser.role !== 'staff' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard label="My Open Tickets" value={tickets.length} trend="+2" color="blue" />
                  <StatCard label="SLA Breaches" value="0" trend="stable" color="rose" />
                  <StatCard label="Avg Response" value="14m" trend="stable" color="emerald" />
                  <StatCard label="Pending Vendor" value="3" trend="+1" color="purple" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-300">Active Queue</h3>
                <div className="flex gap-2">
                   <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5"><Clock size={16} /></button>
                </div>
              </div>

              {loading ? (
                 <div className="text-center py-10 text-slate-500">Loading from Supabase...</div>
              ) : tickets.length === 0 ? (
                 <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                    <p className="text-slate-400 mb-2">No tickets found in database.</p>
                    <button onClick={() => setActiveTab('new')} className="text-blue-400 hover:underline">Create your first ticket</button>
                 </div>
              ) : (
                <div className="grid gap-3">
                  {tickets.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} onClick={() => setSelectedTicket(ticket)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: Detail */}
          {selectedTicket && (
            <TicketDetailView ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
          )}
        </div>
      </main>
    </div>
  );
// --- SUB COMPONENTS ---

const GlassCard = ({ children, className = '', hover = false, onClick }) => (
  <div onClick={onClick} className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:scale-[1.01] hover:border-white/20 cursor-pointer' : ''} ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Critical': 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>{status}</span>;
};

const NavItem = ({ icon: Icon, label, active, count, onClick, collapsed }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
    <Icon size={20} className={active ? 'text-blue-400' : 'text-slate-400'} />
    {!collapsed && <span className="flex-1 text-left text-sm font-medium">{label}</span>}
    {!collapsed && count && <span className="bg-rose-500/20 text-rose-300 text-xs py-0.5 px-2 rounded-full border border-rose-500/20">{count}</span>}
  </button>
);

const StatCard = ({ label, value, trend, color }) => (
  <GlassCard className="p-4 flex flex-col gap-1">
    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${color === 'rose' ? 'bg-rose-500/20 text-rose-300' : color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{trend}</span>
    </div>
  </GlassCard>
);

const TicketRow = ({ ticket, onClick }) => (
  <GlassCard hover className="p-4 group flex items-center gap-4" onClick={onClick}>
    <div className={`p-3 rounded-xl ${ticket.category === 'Hardware' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
      {ticket.category === 'Hardware' ? <Monitor size={20} /> : <Cpu size={20} />}
    </div>
    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      <div className="md:col-span-5">
        <h4 className="font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">{ticket.subject}</h4>
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

const NewTicketChatView = ({ kbArticles, categories, onSubmit, onCancel, currentUser }) => {
  const [messages, setMessages] = useState([{ id: 1, type: 'bot', text: 'Hello! What do you need help with today?' }]);
  const [input, setInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSend = () => {
    if(!input.trim()) return;
    setMessages(p => [...p, {id: Date.now(), type:'user', text: input}]);
    setInput('');
    setTimeout(() => {
       setMessages(p => [...p, {id: Date.now()+1, type:'bot', text: "I can't find a solution in the KB. Let's raise a ticket."}]);
       setShowForm(true);
    }, 800);
  };

  if(showForm) return <TicketForm categories={categories} initialSubject={messages[1]?.text} onSubmit={onSubmit} onCancel={onCancel} />;

  return (
    <div className="max-w-3xl mx-auto h-[600px] flex flex-col">
       <div className="flex-1 overflow-y-auto space-y-4 p-4">
         {messages.map(msg => (
           <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[80%] p-4 rounded-2xl ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>{msg.text}</div>
           </div>
         ))}
       </div>
       <div className="p-4 bg-white/5 border-t border-white/10 rounded-b-2xl relative">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Describe your issue..." className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-slate-200 focus:outline-none" />
          <button onClick={handleSend} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg"><Send size={16} /></button>
       </div>
    </div>
  );
};

const TicketForm = ({ categories, initialSubject, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({ subject: initialSubject || '', description: '', category: 'Hardware', location: '' });
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

const TicketDetailView = ({ ticket, onBack }) => (
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

const KnowledgeBaseView = ({ articles, categories }) => (
  <div className="space-y-6">
    <div className="relative py-8 px-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 text-center"><h2 className="text-2xl font-bold text-white">Knowledge Base</h2><p className="text-slate-400">Search guides and documentation</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{categories.map(cat => <GlassCard key={cat.id} className="p-4 flex flex-col items-center gap-2 hover:bg-white/5"><div className={`p-3 rounded-full ${cat.bg} ${cat.color}`}>{getIcon(cat.icon)}</div><span className="text-sm font-medium text-slate-300">{cat.label}</span></GlassCard>)}</div>
    <div className="space-y-4">{articles.map(a => <GlassCard key={a.id} className="p-5"><h4 className="font-medium text-slate-200">{a.title}</h4><p className="text-xs text-slate-500 mt-1">{a.category} • {a.views} views</p></GlassCard>)}</div>
  </div>
);
}
// --- SUB COMPONENTS (PASTE BELOW APP COMPONENT) ---

const GlassCard = ({ children, className = '', hover = false, onClick }) => (
  <div onClick={onClick} className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:scale-[1.01] hover:border-white/20 cursor-pointer' : ''} ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Critical': 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>{status}</span>;
};

const NavItem = ({ icon: Icon, label, active, count, onClick, collapsed }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'} ${collapsed ? 'justify-center' : ''}`}>
    <Icon size={20} className={active ? 'text-blue-400' : 'text-slate-400'} />
    {!collapsed && <span className="flex-1 text-left text-sm font-medium">{label}</span>}
    {!collapsed && count && <span className="bg-rose-500/20 text-rose-300 text-xs py-0.5 px-2 rounded-full border border-rose-500/20">{count}</span>}
  </button>
);

const StatCard = ({ label, value, trend, color }) => (
  <GlassCard className="p-4 flex flex-col gap-1">
    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${color === 'rose' ? 'bg-rose-500/20 text-rose-300' : color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>{trend}</span>
    </div>
  </GlassCard>
);

const TicketRow = ({ ticket, onClick }) => (
  <GlassCard hover className="p-4 group flex items-center gap-4" onClick={onClick}>
    <div className={`p-3 rounded-xl ${ticket.category === 'Hardware' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
      {ticket.category === 'Hardware' ? <Monitor size={20} /> : <Cpu size={20} />}
    </div>
    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      <div className="md:col-span-5">
        <h4 className="font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">{ticket.subject}</h4>
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

const NewTicketChatView = ({ kbArticles, categories, onSubmit, onCancel, currentUser }) => {
  const [messages, setMessages] = useState([{ id: 1, type: 'bot', text: 'Hello! What do you need help with today?' }]);
  const [input, setInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSend = () => {
    if(!input.trim()) return;
    setMessages(p => [...p, {id: Date.now(), type:'user', text: input}]);
    setInput('');
    setTimeout(() => {
       setMessages(p => [...p, {id: Date.now()+1, type:'bot', text: "I can't find a solution in the KB. Let's raise a ticket."}]);
       setShowForm(true);
    }, 800);
  };

  if(showForm) return <TicketForm categories={categories} initialSubject={messages[1]?.text} onSubmit={onSubmit} onCancel={onCancel} />;

  return (
    <div className="max-w-3xl mx-auto h-[600px] flex flex-col">
       <div className="flex-1 overflow-y-auto space-y-4 p-4">
         {messages.map(msg => (
           <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[80%] p-4 rounded-2xl ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200'}`}>{msg.text}</div>
           </div>
         ))}
       </div>
       <div className="p-4 bg-white/5 border-t border-white/10 rounded-b-2xl relative">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Describe your issue..." className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-slate-200 focus:outline-none" />
          <button onClick={handleSend} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg"><Send size={16} /></button>
       </div>
    </div>
  );
};

const TicketForm = ({ categories, initialSubject, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({ subject: initialSubject || '', description: '', category: 'Hardware', location: '' });
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

const TicketDetailView = ({ ticket, onBack }) => (
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

const KnowledgeBaseView = ({ articles, categories }) => (
  <div className="space-y-6">
    <div className="relative py-8 px-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 text-center"><h2 className="text-2xl font-bold text-white">Knowledge Base</h2><p className="text-slate-400">Search guides and documentation</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{categories.map(cat => <GlassCard key={cat.id} className="p-4 flex flex-col items-center gap-2 hover:bg-white/5"><div className={`p-3 rounded-full ${cat.bg} ${cat.color}`}>{getIcon(cat.icon)}</div><span className="text-sm font-medium text-slate-300">{cat.label}</span></GlassCard>)}</div>
    <div className="space-y-4">{articles.map(a => <GlassCard key={a.id} className="p-5"><h4 className="font-medium text-slate-200">{a.title}</h4><p className="text-xs text-slate-500 mt-1">{a.category} • {a.views} views</p></GlassCard>)}</div>
  </div>
);
