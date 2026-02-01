import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase'; // <--- REAL DATABASE CONNECTION
import { 
  LayoutDashboard, Plus, Search, Bell, Settings, LogOut, Wifi, Monitor, Cpu, ShieldAlert, 
  User, MessageSquare, CheckCircle2, Clock, AlertCircle, Menu, X, ChevronRight, Filter, 
  MoreVertical, Paperclip, Send, Building2, Users, Mail, MessageCircle, Globe, Zap, Eye, 
  Book, FileText, ThumbsUp, Share2, MoreHorizontal, Trash2, ArrowLeft, Circle, Hash, Shield, 
  Activity, Key, Server, HelpCircle, Wrench, ShoppingBag, Edit2, Save, Palette, Briefcase, 
  ChevronDown, ChevronUp, UserPlus
} from 'lucide-react';

// --- NO MORE MOCK DATA ARRAYS ---
// We start with empty states and let the database fill them.

// --- Utilities ---
const getIcon = (iconName, size = 20, className) => {
  const icons = { Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe };
  const IconComponent = icons[iconName] || HelpCircle;
  return <IconComponent size={size} className={className} />;
};

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [tickets, setTickets] = useState([]); // Empty by default
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 1. Initial Data Fetch on Load
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    
    // A. Fetch Tenants
    const { data: tenantData } = await supabase.from('tenants').select('*');
    if (tenantData) setTenants(tenantData);

    // B. Fetch Tickets
    await fetchTickets();
    
    setLoading(false);
  }

  async function fetchTickets() {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        requester:profiles!requester_id(full_name),
        assignee:profiles!assignee_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      // Transform DB data to UI format
      const formatted = data.map(t => ({
        ...t,
        requester: t.requester?.full_name || 'Unknown',
        assignee: t.assignee?.full_name || 'Unassigned',
        lastUpdate: new Date(t.created_at).toLocaleDateString(),
        sla: '4h', // Hardcoded for now until we build SLA engine
        slaStatus: 'ok',
        comments: [] // We can fetch these on detail view later
      }));
      setTickets(formatted);
    }
  }

  // 2. Real Auth Simulation (Fetching a real profile)
  const handleLogin = async (role) => {
    // For now, we just grab the first user in the DB to simulate login
    const { data } = await supabase.from('profiles').select('*').limit(1).single();
    if (data) {
      setCurrentUser({
        ...data,
        name: data.full_name, // Map DB field to UI field
        role: role, // Force the selected role for UI testing
        avatar: data.avatar_initials,
        allowedTenants: tenants.map(t => t.id) // Give access to all for test
      });
    } else {
      // Fallback if DB is empty
      setCurrentUser({ name: 'Test User', role: 'staff', avatar: 'TU' });
    }
  };

  const handleCreateTicket = async (newTicketData) => {
    // INSERT into Supabase
    const { error } = await supabase.from('tickets').insert({
      subject: newTicketData.subject,
      description: newTicketData.description,
      category: newTicketData.category,
      location: newTicketData.location,
      status: 'New',
      priority: 'Medium',
      // We hardcode the requester for now since we aren't using real Auth yet
      // In production, this comes from auth.uid()
    });

    if (!error) {
      await fetchTickets(); // Refresh list
      setActiveTab('dashboard');
    } else {
      alert("Error creating ticket: " + error.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center font-sans text-slate-200">
        <GlassCard className="w-full max-w-md p-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-200">Nexus ESM</h1>
            <p className="text-slate-400 mt-2 text-sm">Database Connected</p>
          </div>
          <div className="w-full space-y-3 mt-4">
            <button onClick={() => handleLogin('staff')} className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg">
               Sign in as Staff
            </button>
            <button onClick={() => handleLogin('tech')} className="w-full px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 rounded-lg">
               Sign in as Tech
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`fixed md:relative z-20 h-full ${sidebarOpen ? 'w-64' : 'w-20'} border-r border-white/5 bg-[#0f172a]/80 backdrop-blur-xl flex flex-col transition-all`}>
        <div className="h-16 flex items-center justify-center border-b border-white/5 font-bold tracking-tight">
          {sidebarOpen ? 'Nexus' : 'N'}
        </div>
        <nav className="flex-1 py-6 px-2 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={!sidebarOpen} />
          <NavItem icon={Plus} label="New Ticket" active={activeTab === 'new'} onClick={() => setActiveTab('new')} collapsed={!sidebarOpen} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative z-10 flex flex-col">
        <header className="h-16 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold text-white/90 capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{currentUser.name} ({currentUser.role})</span>
            <button onClick={() => setCurrentUser(null)}><LogOut size={18} /></button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {loading && <div className="text-center text-blue-400">Loading data from Supabase...</div>}

          {/* VIEW: New Ticket */}
          {activeTab === 'new' && (
            <TicketForm 
              categories={[{id: 'gen', label: 'General'}, {id: 'hw', label: 'Hardware'}]} // minimal categories for now
              onSubmit={handleCreateTicket} 
              onCancel={() => setActiveTab('dashboard')} 
              currentUser={currentUser}
            />
          )}

          {/* VIEW: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-medium text-slate-300">Active Tickets ({tickets.length})</h3>
                 <button onClick={fetchTickets} className="p-2 bg-white/5 rounded hover:bg-white/10"><Clock size={16}/></button>
               </div>
               
               {tickets.length === 0 && !loading && (
                 <div className="p-8 text-center text-slate-500 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                    No tickets found in database. Create one!
                 </div>
               )}

               <div className="grid gap-3">
                  {tickets.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} onClick={() => {}} showMeta={true} />
                  ))}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- KEEPING YOUR UI COMPONENTS (Minimal Changes) ---

const GlassCard = ({ children, className = '', hover = false, onClick }) => (
  <div onClick={onClick} className={`relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl ${hover ? 'hover:bg-white/10 cursor-pointer' : ''} ${className}`}>
    {children}
  </div>
);

const NavItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 ${active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:text-slate-100'} ${collapsed ? 'justify-center' : ''}`}>
    <Icon size={20} />
    {!collapsed && <span className="text-sm font-medium">{label}</span>}
  </button>
);

const Badge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
    status === 'New' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-gray-500/20 text-gray-300'
  }`}>{status}</span>
);

const TicketRow = ({ ticket, onClick }) => (
  <GlassCard hover className="p-4 flex items-center gap-4" onClick={onClick}>
    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400"><Monitor size={20} /></div>
    <div className="flex-1">
      <h4 className="font-medium text-slate-200">{ticket.subject}</h4>
      <p className="text-xs text-slate-500">#{ticket.friendly_id} • {ticket.requester}</p>
    </div>
    <Badge status={ticket.status} />
  </GlassCard>
);

const TicketForm = ({ onSubmit, onCancel }) => {
  const [subject, setSubject] = useState('');
  const [desc, setDesc] = useState('');
  
  return (
    <GlassCard className="p-8 space-y-4">
       <h2 className="text-xl font-bold text-white">New Ticket</h2>
       <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white" />
       <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" rows={3} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white" />
       <div className="flex gap-3">
         <button onClick={onCancel} className="px-6 py-2 text-slate-400">Cancel</button>
         <button onClick={() => onSubmit({ subject, description: desc, category: 'General', location: 'Office' })} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Submit</button>
       </div>
    </GlassCard>
  );
};
