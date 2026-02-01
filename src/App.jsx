import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Search, 
  Bell, 
  Settings, 
  LogOut, 
  Wifi, 
  Monitor, 
  Cpu, 
  ShieldAlert, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Filter,
  MoreVertical,
  Paperclip,
  Send,
  Building2,
  Users,
  Mail,
  MessageCircle,
  Globe,
  Zap,
  Eye,
  Book,
  FileText,
  ThumbsUp,
  Share2,
  MoreHorizontal,
  Trash2,
  ArrowLeft,
  Circle,
  Hash,
  Shield,
  Activity,
  Key,
  Server,
  HelpCircle,
  Wrench,
  ShoppingBag,
  Edit2,
  Save,
  Palette,
  Briefcase,
  ChevronDown,
  ChevronUp,
  UserPlus
} from 'lucide-react';

// --- Mock Data & Constants ---

const INITIAL_TENANTS = [
  { id: 't1', name: "St. Mary's High", code: 'SMH', domain: 'stmarys.edu', status: 'active', users: 1240, type: 'School' },
  { id: 't2', name: "Northfield Primary", code: 'NFP', domain: 'northfield.edu', status: 'active', users: 850, type: 'School' },
  { id: 't3', name: "Trust HQ", code: 'HQ', domain: 'trust.edu', status: 'active', users: 45, type: 'Headquarters' },
  { id: 't4', name: "Westside Academy", code: 'WSA', domain: 'westside.edu', status: 'active', users: 1100, type: 'School' }
];

const MOCK_USER = {
  id: 'u1',
  name: 'Sarah Jenkins',
  role: 'staff',
  avatar: 'SJ',
  email: 'sarah.j@school.edu',
  department: 'Science Faculty',
  tenantId: 't1',
  allowedTenants: ['t1']
};

const MOCK_TECH = {
  id: 't1',
  name: 'Alex Chen',
  role: 'tech',
  avatar: 'AC',
  email: 'alex.c@school.edu',
  department: 'IT Services',
  tenantId: 't1', 
  allowedTenants: ['t1', 't2', 't3', 't4'] 
};

const MOCK_SUPER_ADMIN = {
  id: 'sa1',
  name: 'Director Fury',
  role: 'super_admin',
  avatar: 'DF',
  email: 'director@trust.edu',
  department: 'Global Ops',
  tenantId: 't3',
  allowedTenants: ['t1', 't2', 't3', 't4'] 
};

const INITIAL_CATEGORIES = [
  { id: 'hardware', label: 'Hardware', icon: 'Monitor', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'software', label: 'Software', icon: 'Cpu', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'network', label: 'Network/Wi-Fi', icon: 'Wifi', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'security', label: 'Security', icon: 'ShieldAlert', color: 'text-rose-400', bg: 'bg-rose-500/10' },
];

const MOCK_DEPARTMENTS = [
  { id: 'd1', name: 'IT Services', head: 'Alex Chen', members: 8, activeTickets: 42, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-500/10', entralGroup: 'SG-Staff-IT' },
  { id: 'd2', name: 'Estates & Facilities', head: 'Dave Miller', members: 12, activeTickets: 15, icon: Building2, color: 'text-orange-400', bg: 'bg-orange-500/10', entralGroup: 'SG-Staff-Estates' },
  { id: 'd3', name: 'HR & Payroll', head: 'Susan Wojcicki', members: 4, activeTickets: 8, icon: Users, color: 'text-rose-400', bg: 'bg-rose-500/10', entralGroup: 'SG-Trust-HR' },
];

const MOCK_TEAM_MEMBERS = {
  'd1': [
    { id: 'tm1', name: 'Alex Chen', role: 'Head of IT', status: 'online', email: 'alex.c@school.edu', avatar: 'AC' },
    { id: 'tm2', name: 'Jamie Smith', role: 'Network Engineer', status: 'busy', email: 'j.smith@school.edu', avatar: 'JS' },
    { id: 'tm3', name: 'Priya Patel', role: 'Support Technician', status: 'offline', email: 'p.patel@school.edu', avatar: 'PP' },
    { id: 'tm4', name: 'Bot-O-Matic', role: 'Automation', status: 'online', email: 'bot@school.edu', avatar: '🤖' },
  ],
  'd2': [
    { id: 'tm5', name: 'Dave Miller', role: 'Facilities Manager', status: 'online', email: 'd.miller@school.edu', avatar: 'DM' },
    { id: 'tm6', name: 'Bob Builder', role: 'Caretaker', status: 'offline', email: 'b.builder@school.edu', avatar: 'BB' },
  ],
  'd3': [
     { id: 'tm7', name: 'Susan Wojcicki', role: 'Head of HR', status: 'busy', email: 's.woj@school.edu', avatar: 'SW' },
  ]
};

const INITIAL_KB_ARTICLES = [
  { id: 1, title: 'Connecting to Student Wi-Fi (BYOD)', category: 'Network', views: 1250, author: 'Alex Chen', lastUpdated: '2 days ago', helpful: 142, content: 'To connect, select "Student-WiFi" and enter your school email...' },
  { id: 2, title: 'Kyocera Printer: Clearing Paper Jam C-404', category: 'Hardware', views: 890, author: 'Sarah Jenkins', lastUpdated: '1 week ago', helpful: 56, content: 'Open Tray 1, remove crumpled paper, reset gear A...' },
  { id: 3, title: 'Requesting Adobe Creative Cloud License', category: 'Software', views: 650, author: 'Alex Chen', lastUpdated: '3 weeks ago', helpful: 89, content: 'Adobe licenses require Head of Dept approval. Fill out form...' },
  { id: 4, title: 'Setting up Multi-Factor Authentication (MFA)', category: 'Security', views: 2100, author: 'System', lastUpdated: '1 month ago', helpful: 560, content: 'Install MS Authenticator app...' },
  { id: 5, title: 'Classroom Projector Troubleshooting Guide', category: 'Hardware', views: 430, author: 'Dave Miller', lastUpdated: '2 days ago', helpful: 34, content: 'Ensure HDMI cable is firmly seated...' },
];

const INITIAL_TICKETS = [
  {
    id: 'T-2026-001',
    subject: 'Projector HDMI port loose',
    status: 'In Progress',
    priority: 'High',
    category: 'Hardware',
    location: 'Room 302',
    requester: 'Sarah Jenkins',
    assignee: 'Alex Chen',
    lastUpdate: '2m ago',
    source: 'portal',
    sla: '4h 20m',
    slaStatus: 'warning', // ok, warning, breached
    viewers: ['AC'],
    description: 'The HDMI cable keeps falling out of the wall port. Cannot teach Year 9 Physics.',
    comments: [
      { id: 1, author: 'System', text: 'Ticket automatically routed to Field Services based on "Room 302" location.', time: '10:00 AM', type: 'log' },
      { id: 2, author: 'Alex Chen', text: 'I have a spare wall plate. Heading there in 10 mins.', time: '10:05 AM', type: 'chat' }
    ]
  },
  {
    id: 'T-2026-002',
    subject: 'Wi-Fi dead in Library',
    status: 'New',
    priority: 'Critical',
    category: 'Network',
    location: 'Library',
    requester: 'Mark Webber',
    assignee: null,
    lastUpdate: '15m ago',
    source: 'teams',
    sla: '45m',
    slaStatus: 'breached',
    viewers: ['MW', 'DF'],
    description: 'No students can connect to "Student-WiFi". Staff network works fine.',
    comments: []
  },
  {
    id: 'T-2026-003',
    subject: 'New Laptop Request',
    status: 'Pending Approval',
    priority: 'Low',
    category: 'Hardware',
    location: 'HR Office',
    requester: 'Emily Blunt',
    assignee: 'Procurement Bot',
    lastUpdate: '1h ago',
    source: 'email',
    sla: '2d',
    slaStatus: 'ok',
    viewers: [],
    description: 'New starter joining next Monday. Need standard Dell Latitude setup.',
    comments: []
  },
];

// --- Utilities ---

const getIcon = (iconName, size = 20, className) => {
  const icons = { Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe };
  const IconComponent = icons[iconName] || HelpCircle;
  return <IconComponent size={size} className={className} />;
};

// --- Components ---

const GlassCard = ({ children, className = '', hover = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`
    relative overflow-hidden
    bg-white/5 backdrop-blur-xl 
    border border-white/10 
    rounded-2xl 
    shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
    ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:scale-[1.01] hover:border-white/20 cursor-pointer' : ''}
    ${className}
  `}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Critical': 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
    'High': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Low': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    'Pending Approval': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Active': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };
   
  const defaultStyle = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};

const SourceIcon = ({ source }) => {
  switch (source) {
    case 'email': return <Mail size={14} className="text-purple-400" />;
    case 'teams': return <MessageCircle size={14} className="text-indigo-400" />;
    default: return <Globe size={14} className="text-cyan-400" />;
  }
};

const SlaBadge = ({ time, status }) => {
  const colors = {
    ok: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    breached: 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse'
  };
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${colors[status]}`}>
      <Clock size={10} />
      {status === 'breached' ? `-${time}` : time}
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [kbArticles, setKbArticles] = useState(INITIAL_KB_ARTICLES);
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTenant, setCurrentTenant] = useState(INITIAL_TENANTS[0]);

  const handleLogin = (role) => {
    if (role === 'super_admin') setCurrentUser(MOCK_SUPER_ADMIN);
    else setCurrentUser(role === 'tech' ? MOCK_TECH : MOCK_USER);
  };

  const handleCreateTicket = (newTicket) => {
    setTickets([newTicket, ...tickets]);
    setActiveTab('dashboard');
  };

  const handleAddTenant = (newTenant) => {
    setTenants([...tenants, newTenant]);
  };

  const handleAddArticle = (article) => {
    setKbArticles([article, ...kbArticles]);
  };
  const handleDeleteArticle = (id) => {
    setKbArticles(kbArticles.filter(a => a.id !== id));
  };

  const handleUpdateCategories = (newCategories) => {
    setCategories(newCategories);
  };

  const handleSwitchTenant = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
        setCurrentTenant(tenant);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] relative overflow-hidden flex items-center justify-center font-sans text-slate-200">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        
        <GlassCard className="w-full max-w-md p-8 flex flex-col items-center gap-6 z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Nexus Helpdesk
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Enterprise Service Management</p>
          </div>

          <div className="w-full space-y-3 mt-4">
            <button 
              onClick={() => handleLogin('staff')}
              className="w-full group relative px-4 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-lg flex items-center justify-center gap-3 transition-all border border-white/5"
            >
               <img src="https://img.icons8.com/color/48/000000/microsoft.png" className="w-5 h-5" alt="MS"/>
               <span>Sign in with Microsoft (Staff)</span>
            </button>
            
            <button 
              onClick={() => handleLogin('tech')}
              className="w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-lg text-sm transition-all border border-blue-500/20"
            >
              Simulate Technician (Multi-Tenant)
            </button>
            <button 
              onClick={() => handleLogin('super_admin')}
              className="w-full px-4 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 rounded-lg text-sm transition-all border border-rose-500/20"
            >
              Simulate Super Admin (Global)
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-4">Protected by Microsoft Entra ID</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex overflow-hidden relative selection:bg-blue-500/30">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-20 h-full transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-20 md:w-20 -translate-x-full md:translate-x-0'}
        border-r border-white/5 bg-[#0f172a]/80 backdrop-blur-xl flex flex-col
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shrink-0">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-lg tracking-tight">Nexus</span>}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tenant Switcher */}
        {currentUser.allowedTenants && currentUser.allowedTenants.length > 1 && sidebarOpen && (
          <div className="px-4 pt-4">
             <div className="bg-white/5 rounded-lg border border-white/10 p-2">
                <label className="text-[10px] text-slate-500 uppercase font-semibold pl-1 mb-1 block">Context</label>
                <div className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer hover:text-blue-400 transition-colors">
                  <Building2 size={16} />
                  <select 
                    className="bg-transparent border-none outline-none w-full cursor-pointer text-ellipsis"
                    value={currentTenant.id}
                    onChange={(e) => handleSwitchTenant(e.target.value)}
                  >
                    {tenants
                        .filter(t => currentUser.allowedTenants.includes(t.id))
                        .map(t => <option key={t.id} value={t.id} className="bg-slate-800">{t.name}</option>)
                    }
                  </select>
                </div>
             </div>
          </div>
        )}

        <nav className="flex-1 py-6 px-2 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSelectedTicket(null); }} collapsed={!sidebarOpen} />
          {(currentUser.role === 'tech' || currentUser.role === 'super_admin') && (
            <>
              <NavItem icon={AlertCircle} label="My Queue" count={3} collapsed={!sidebarOpen} />
              <NavItem icon={Users} label="Teams" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} collapsed={!sidebarOpen} />
              {currentUser.role === 'super_admin' && (
                <NavItem icon={Building2} label="Tenants" active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} collapsed={!sidebarOpen} />
              )}
            </>
          )}
          <NavItem icon={Plus} label="New Ticket" active={activeTab === 'new'} onClick={() => setActiveTab('new')} collapsed={!sidebarOpen} />
          <NavItem icon={Book} label="Knowledge Base" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} collapsed={!sidebarOpen} />
          
          {(currentUser.role === 'super_admin') && (
             <NavItem icon={Settings} label="System Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={!sidebarOpen} />
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold shadow-lg cursor-pointer hover:ring-2 ring-white/20 transition-all ${currentUser.role === 'super_admin' ? 'from-rose-500 to-red-600 shadow-rose-900/50' : 'from-emerald-500 to-teal-600 shadow-emerald-900/50'}`}>
              {currentUser.avatar}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{currentUser.role.replace('_', ' ')}</p>
              </div>
            )}
            {sidebarOpen && (
              <button 
                onClick={() => setCurrentUser(null)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative z-10 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400">
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-semibold text-white/90">
              {activeTab === 'new' ? 'New Ticket' : 
               activeTab === 'teams' ? 'Department Management' :
               activeTab === 'knowledge' ? 'Knowledge Base' :
               activeTab === 'tenants' ? 'Tenant Management' :
               activeTab === 'settings' ? 'System Settings' :
               selectedTicket ? `Ticket #${selectedTicket.id}` : 
               `Dashboard • ${currentTenant.name}`}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className="bg-black/20 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-slate-200 placeholder-slate-600"
              />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          
          {/* VIEW: New Ticket (Chatbot Interface) */}
          {activeTab === 'new' && (
            <NewTicketChatView 
              kbArticles={kbArticles}
              categories={categories}
              onSubmit={handleCreateTicket} 
              onCancel={() => setActiveTab('dashboard')} 
              currentUser={currentUser}
            />
          )}

          {/* VIEW: Teams */}
          {activeTab === 'teams' && (
             <TeamsView departments={MOCK_DEPARTMENTS} members={MOCK_TEAM_MEMBERS} />
          )}

          {/* VIEW: Knowledge Base */}
          {activeTab === 'knowledge' && (
             <KnowledgeBaseView 
               articles={kbArticles} 
               categories={categories} 
               currentUser={currentUser}
               onAdd={handleAddArticle}
               onDelete={handleDeleteArticle}
             />
          )}

          {/* VIEW: Tenant Manager */}
          {activeTab === 'tenants' && currentUser.role === 'super_admin' && (
             <TenantManagerView tenants={tenants} onAdd={handleAddTenant} />
          )}

          {/* VIEW: System Settings (Categories & Cross-Tenant Access) */}
          {activeTab === 'settings' && currentUser.role === 'super_admin' && (
             <SystemSettingsView categories={categories} onUpdateCategories={handleUpdateCategories} tenants={tenants} />
          )}

          {/* VIEW: Dashboard / List */}
          {activeTab === 'dashboard' && !selectedTicket && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Quick Actions for Techs/Admins */}
              {(currentUser.role !== 'staff') && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard label="My Open Tickets" value="12" trend="+2" color="blue" />
                  <StatCard label="SLA Breaches" value="1" trend="-1" color="rose" />
                  <StatCard label="Avg Response" value="14m" trend="stable" color="emerald" />
                  <StatCard label="Pending Vendor" value="3" trend="+1" color="purple" />
                </div>
              )}

              {/* Ticket List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-slate-300">
                    {currentUser.role !== 'staff' ? 'Active Queue' : 'My Requests'}
                  </h3>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/5">
                      <Filter size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {tickets.map((ticket) => (
                    <TicketRow 
                      key={ticket.id} 
                      ticket={ticket} 
                      onClick={() => setSelectedTicket(ticket)} 
                      showMeta={currentUser.role !== 'staff'}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Ticket Detail */}
          {selectedTicket && (
            <TicketDetailView 
              ticket={selectedTicket} 
              onBack={() => setSelectedTicket(null)} 
              currentUser={currentUser}
            />
          )}

        </div>
      </main>
    </div>
  );
}

// --- Sub-Components ---

const NavItem = ({ icon: Icon, label, active, count, onClick, collapsed }) => (
  <button 
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200
      ${active 
        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}
      ${collapsed ? 'justify-center' : ''}
    `}
  >
    <Icon size={20} className={active ? 'text-blue-400' : 'text-slate-400'} />
    {!collapsed && (
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
    )}
    {!collapsed && count && (
      <span className="bg-rose-500/20 text-rose-300 text-xs py-0.5 px-2 rounded-full border border-rose-500/20">
        {count}
      </span>
    )}
  </button>
);

const StatCard = ({ label, value, trend, color }) => (
  <GlassCard className="p-4 flex flex-col gap-1">
    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        color === 'rose' ? 'bg-rose-500/20 text-rose-300' : 
        color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
      }`}>
        {trend}
      </span>
    </div>
  </GlassCard>
);

const SystemSettingsView = ({ categories, onUpdateCategories, tenants }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Briefcase');
  const [userSearch, setUserSearch] = useState('');
  const [privilegedUsers, setPrivilegedUsers] = useState([
    { id: 'u1', name: 'Alex Chen', role: 'IT Lead', tenants: ['t1', 't2', 't3', 't4'], avatar: 'AC', color: 'bg-indigo-500' },
    { id: 'u2', name: 'Susan Wojcicki', role: 'Head of HR', tenants: ['t1', 't2', 't3'], avatar: 'SW', color: 'bg-rose-500' },
    { id: 'u3', name: 'Dave Miller', role: 'Estates Mgr', tenants: ['t1', 't2'], avatar: 'DM', color: 'bg-amber-500' }
  ]);
  const [expandedUser, setExpandedUser] = useState(null);

  const handleAddCategory = () => {
    if (!newCatName) return;
    const newCat = {
      id: newCatName.toLowerCase().replace(' ', '-'),
      label: newCatName,
      icon: newCatIcon,
      color: 'text-slate-400', // Default
      bg: 'bg-slate-500/10'
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
  };

  const handleDeleteCategory = (id) => {
    onUpdateCategories(categories.filter(c => c.id !== id));
  };

  const handleAddUser = () => {
    if (!userSearch) return;
    const newUser = {
        id: `u${Date.now()}`,
        name: userSearch,
        role: 'Staff',
        tenants: ['t1'], 
        avatar: userSearch.charAt(0).toUpperCase(),
        color: 'bg-emerald-500'
    };
    setPrivilegedUsers([...privilegedUsers, newUser]);
    setUserSearch('');
  };

  const toggleTenantForUser = (userId, tenantId) => {
    setPrivilegedUsers(users => users.map(u => {
        if (u.id !== userId) return u;
        const hasTenant = u.tenants.includes(tenantId);
        return {
            ...u,
            tenants: hasTenant 
                ? u.tenants.filter(t => t !== tenantId)
                : [...u.tenants, tenantId]
        };
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Settings</h2>
          <p className="text-slate-400">Configure global parameters and data structures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hash size={20} /></div>
              <div>
                <h3 className="font-semibold text-white">Issue Categories</h3>
                <p className="text-xs text-slate-400">Define the classification for tickets</p>
              </div>
           </div>

           <div className="space-y-3">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cat.bg} ${cat.color}`}>
                         {getIcon(cat.icon, 16)}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                   </div>
                   <button 
                     onClick={() => handleDeleteCategory(cat.id)}
                     className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              ))}
           </div>

           <div className="flex gap-2 pt-4 border-t border-white/10">
              <input 
                type="text" 
                placeholder="New Category Name" 
                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <select 
                className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none"
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
              >
                <option value="Briefcase">Generic</option>
                <option value="Globe">Web</option>
                <option value="Zap">Power</option>
                <option value="Monitor">Hardware</option>
              </select>
              <button 
                onClick={handleAddCategory}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                <Plus size={16} />
              </button>
           </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-6 h-fit">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Shield size={20} /></div>
              <div>
                <h3 className="font-semibold text-white">Cross-Tenant Access</h3>
                <p className="text-xs text-slate-400">Manage users with multi-school permissions</p>
              </div>
           </div>

           <div className="flex gap-2">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                 <input 
                    type="text" 
                    placeholder="Search directory to grant access..." 
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                 />
              </div>
              <button 
                 onClick={handleAddUser}
                 disabled={!userSearch}
                 className="px-3 py-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-lg text-sm transition-colors border border-indigo-500/20"
              >
                 <UserPlus size={16} />
              </button>
           </div>

           <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Privileged Users ({privilegedUsers.length})</label>
              {privilegedUsers.map(user => (
                 <div key={user.id} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden transition-all">
                    <div 
                       className="p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5"
                       onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    >
                       <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
                          {user.avatar}
                       </div>
                       <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">{user.name}</h4>
                          <p className="text-xs text-slate-400">{user.role} • {user.tenants.length} Tenants</p>
                       </div>
                       {expandedUser === user.id ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                    </div>

                    {expandedUser === user.id && (
                       <div className="bg-black/20 p-3 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Authorized Scopes</p>
                          {tenants.map(t => (
                             <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${user.tenants.includes(t.id) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 bg-transparent'}`}>
                                   {user.tenants.includes(t.id) && <CheckCircle2 size={12} className="text-white" />}
                                </div>
                                <input 
                                   type="checkbox" 
                                   className="hidden" 
                                   checked={user.tenants.includes(t.id)}
                                   onChange={() => toggleTenantForUser(user.id, t.id)}
                                />
                                <span className={`text-sm ${user.tenants.includes(t.id) ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>{t.name}</span>
                                <span className="ml-auto text-[10px] text-slate-600 font-mono bg-white/5 px-1.5 py-0.5 rounded">{t.code}</span>
                             </label>
                          ))}
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </GlassCard>
      </div>
    </div>
  );
};

const TenantManagerView = ({ tenants, onAdd }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({ 
    name: '', code: '', domain: '', type: 'School',
    azureTenantId: '', appId: '', appSecret: '', slaTimezone: 'UTC'
  });

  const handleSubmit = () => {
    onAdd({
      id: `t${Date.now()}`,
      status: 'active',
      users: 0,
      ...formData
    });
    setIsModalOpen(false);
    setFormData({ name: '', code: '', domain: '', type: 'School', azureTenantId: '', appId: '', appSecret: '', slaTimezone: 'UTC' });
    setActiveTab('general');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-center">
         <div>
           <h3 className="text-lg font-medium text-slate-200">Tenant Management</h3>
           <p className="text-sm text-slate-400">Provision and manage school instances</p>
         </div>
         <button 
           onClick={() => setIsModalOpen(true)}
           className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20"
         >
           <Plus size={16} />
           Provision New Tenant
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map(tenant => (
            <GlassCard key={tenant.id} hover className="p-6 space-y-4 group">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                     <div className={`p-3 rounded-xl ${tenant.type === 'Headquarters' ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <Building2 size={24} />
                     </div>
                     <div>
                        <h4 className="font-semibold text-white">{tenant.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                           <Globe size={10} /> {tenant.domain}
                        </div>
                     </div>
                  </div>
                  <Badge status="Active" />
               </div>
               
               <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                  <div className="bg-black/20 rounded-lg p-3">
                     <span className="text-xs text-slate-500 block mb-1">Tenant Code</span>
                     <span className="text-lg font-mono font-bold text-white tracking-wider">{tenant.code}</span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                     <span className="text-xs text-slate-500 block mb-1">Total Users</span>
                     <span className="text-lg font-bold text-white">{tenant.users}</span>
                  </div>
               </div>
            </GlassCard>
          ))}
       </div>

       {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="text-xl font-bold text-white">Provision New Tenant</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                     <X size={24} />
                  </button>
               </div>

               <div className="flex border-b border-white/10">
                 <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-slate-400 hover:text-white'}`}
                 >
                    General Info
                 </button>
                 <button 
                    onClick={() => setActiveTab('config')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'config' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-slate-400 hover:text-white'}`}
                 >
                    Technical Config
                 </button>
               </div>

               <div className="p-6 overflow-y-auto space-y-6">
                  {activeTab === 'general' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Organization Name</label>
                          <input 
                             type="text"
                             className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                             placeholder="e.g. St. Jude's Academy"
                             value={formData.name}
                             onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-sm font-medium text-slate-400 mb-1">Tenant Code</label>
                             <input 
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500/50"
                                placeholder="STJ"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                             />
                          </div>
                          <div>
                             <label className="block text-sm font-medium text-slate-400 mb-1">Primary Domain</label>
                             <input 
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                                placeholder="school.edu"
                                value={formData.domain}
                                onChange={e => setFormData({...formData, domain: e.target.value})}
                             />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Tenant Type</label>
                          <select 
                             className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                             value={formData.type}
                             onChange={e => setFormData({...formData, type: e.target.value})}
                          >
                             <option>School</option>
                             <option>Headquarters</option>
                             <option>Partner Agency</option>
                          </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                       <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3">
                          <div className="mt-0.5 text-amber-400"><Key size={16} /></div>
                          <div className="text-xs text-amber-200/80">
                             <strong className="text-amber-200 block mb-0.5">Critical Configuration</strong>
                             These credentials allow the system to read emails and sync users from this tenant's Azure AD.
                          </div>
                       </div>
                       
                       <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Azure Tenant ID</label>
                          <div className="relative">
                             <Server size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                             <input 
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                value={formData.azureTenantId}
                                onChange={e => setFormData({...formData, azureTenantId: e.target.value})}
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-sm font-medium text-slate-400 mb-1">App Client ID</label>
                             <input 
                                type="text"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50"
                                placeholder="GUID"
                                value={formData.appId}
                                onChange={e => setFormData({...formData, appId: e.target.value})}
                             />
                          </div>
                          <div>
                             <label className="block text-sm font-medium text-slate-400 mb-1">Client Secret</label>
                             <input 
                                type="password"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50"
                                placeholder="Value"
                                value={formData.appSecret}
                                onChange={e => setFormData({...formData, appSecret: e.target.value})}
                             />
                          </div>
                       </div>

                       <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">SLA Timezone</label>
                          <select 
                             className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                             value={formData.slaTimezone}
                             onChange={e => setFormData({...formData, slaTimezone: e.target.value})}
                          >
                             <option value="UTC">UTC (Universal)</option>
                             <option value="GMT">London (GMT/BST)</option>
                             <option value="EST">New York (EST)</option>
                          </select>
                       </div>
                    </div>
                  )}
               </div>

               <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                  <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                      Provision Tenant
                  </button>
               </div>
            </GlassCard>
         </div>
       )}
    </div>
  );
};

const NewTicketChatView = ({ kbArticles, categories, onSubmit, onCancel, currentUser }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: 'Hello! I can help you fix issues or get new equipment. What do you need help with today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [formType, setFormType] = useState('incident'); // incident or request
  const [prefillSubject, setPrefillSubject] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock "No AI" KB Search
    setTimeout(() => {
      const keywords = input.toLowerCase().split(' ');
      const matches = kbArticles.filter(art => 
        keywords.some(k => art.title.toLowerCase().includes(k) && k.length > 3)
      );

      if (matches.length > 0) {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          type: 'bot', 
          text: `I found ${matches.length} article(s) that might help:`,
          articles: matches
        }]);
      } else {
        // No matches found, offer triage
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'bot',
          text: "I couldn't find a matching guide in our Knowledge Base.",
          isTriage: true
        }]);
      }
    }, 1000);
  };

  const handleArticleFeedback = (helpful) => {
    if (helpful) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: "Great! Glad I could help. Closing this session." }]);
    } else {
      setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: "Sorry about that. Let's get a human involved.", isTriage: true }]);
    }
  };

  const startTicketProcess = (type) => {
    const originalQuery = messages.find(m => m.type === 'user')?.text || '';
    setPrefillSubject(originalQuery);
    setFormType(type);
    setShowTicketForm(true);
  };

  if (showTicketForm) {
    return (
      <TicketForm 
        type={formType} 
        categories={categories}
        initialSubject={prefillSubject} 
        onSubmit={onSubmit} 
        onCancel={() => setShowTicketForm(false)} 
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-[600px] flex flex-col">
       <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin scrollbar-thumb-white/10">
         {messages.map(msg => (
           <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`max-w-[80%] p-4 rounded-2xl ${
               msg.type === 'user' 
                 ? 'bg-blue-600 text-white rounded-br-none' 
                 : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'
             }`}>
               <p>{msg.text}</p>
               
               {/* Article Suggestions */}
               {msg.articles && (
                 <div className="mt-3 space-y-2">
                   {msg.articles.map(art => (
                     <div key={art.id} className="bg-black/20 p-3 rounded-lg border border-white/5 hover:border-blue-500/30 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold mb-1">
                           <FileText size={14} /> {art.title}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">{art.content}</p>
                     </div>
                   ))}
                   <div className="pt-2 flex gap-2">
                     <button onClick={() => handleArticleFeedback(true)} className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30">That worked</button>
                     <button onClick={() => handleArticleFeedback(false)} className="flex-1 py-2 bg-white/5 text-slate-400 rounded-lg text-xs font-medium hover:bg-white/10">Didn't help</button>
                   </div>
                 </div>
               )}

               {/* Triage Options */}
               {msg.isTriage && (
                 <div className="mt-4 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => startTicketProcess('incident')}
                      className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 text-left transition-all group"
                    >
                       <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><AlertCircle size={16}/></div>
                       <div className="font-semibold text-rose-200 text-sm">Something is Broken</div>
                       <div className="text-[10px] text-rose-200/60 mt-1">Error, Failure, Bug</div>
                    </button>
                    <button 
                      onClick={() => startTicketProcess('request')}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 text-left transition-all group"
                    >
                       <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"><ShoppingBag size={16}/></div>
                       <div className="font-semibold text-emerald-200 text-sm">I Need Something</div>
                       <div className="text-[10px] text-emerald-200/60 mt-1">Access, Equipment, Data</div>
                    </button>
                 </div>
               )}
             </div>
           </div>
         ))}
         {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none border border-white/5 flex gap-1">
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
               <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
             </div>
           </div>
         )}
         <div ref={messagesEndRef} />
       </div>

       <div className="p-4 bg-white/5 border-t border-white/10 rounded-b-2xl">
         <div className="relative">
           <input 
             type="text" 
             value={input}
             onChange={e => setInput(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
             placeholder="Describe your issue..." 
             className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
             autoFocus
           />
           <button 
             onClick={handleSendMessage}
             className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
           >
             <Send size={16} />
           </button>
         </div>
       </div>
    </div>
  );
};

const TicketForm = ({ type, initialSubject, onSubmit, onCancel, currentUser, categories }) => {
  const [formData, setFormData] = useState({ 
    subject: initialSubject, 
    description: '', 
    category: categories[0]?.label || 'General',
    location: ''
  });

  const handleSubmit = () => {
    onSubmit({
      id: `T-${Date.now()}`,
      status: 'New',
      priority: 'Medium',
      requester: currentUser.name,
      assignee: null,
      lastUpdate: 'Just now',
      source: 'portal',
      sla: '4h',
      slaStatus: 'ok',
      viewers: [],
      comments: [],
      ...formData
    });
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <GlassCard className="p-8 space-y-6">
         <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
            <div className={`p-3 rounded-xl ${type === 'incident' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
               {type === 'incident' ? <Wrench size={24} /> : <ShoppingBag size={24} />}
            </div>
            <div>
               <h2 className="text-xl font-bold text-white">
                 {type === 'incident' ? 'Report an Incident' : 'Submit a Request'}
               </h2>
               <p className="text-sm text-slate-400">
                 {type === 'incident' ? 'Something is broken or not working' : 'Request for new equipment or access'}
               </p>
            </div>
         </div>

         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
             <input 
               type="text" 
               value={formData.subject}
               onChange={e => setFormData({...formData, subject: e.target.value})}
               className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
             />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.label}>{cat.label}</option>
                  ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                <select 
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  onChange={e => setFormData({...formData, location: e.target.value})}
                >
                  <option value="">Detecting location...</option>
                  <option value="Room 101">Room 101 (Your Calendar)</option>
                  <option value="Staff Room">Staff Room</option>
                  <option value="Home">Home / Remote</option>
                </select>
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
             <textarea 
               rows={4}
               value={formData.description}
               onChange={e => setFormData({...formData, description: e.target.value})}
               className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50 resize-none"
               placeholder="Please provide more details..."
             />
           </div>
         </div>

         <div className="flex gap-3 pt-4">
           <button onClick={onCancel} className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
           <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98]">
             Submit Ticket
           </button>
         </div>
      </GlassCard>
    </div>
  );
};

const TeamsView = ({ departments, members }) => {
  const [selectedDept, setSelectedDept] = useState(null);

  if (selectedDept) {
    const deptMembers = members[selectedDept.id] || [];
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <button 
          onClick={() => setSelectedDept(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Departments
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl ${selectedDept.bg} ${selectedDept.color}`}>
                 <selectedDept.icon size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-bold text-white">{selectedDept.name}</h2>
               <p className="text-slate-400 text-sm">Managing {deptMembers.length} staff members</p>
             </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Add Member
          </button>
        </div>

        <div className="grid gap-3">
           {deptMembers.map(member => (
             <GlassCard key={member.id} className="p-4 flex items-center justify-between group">
               <div className="flex items-center gap-4">
                 <div className="relative">
                   <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold border border-white/10">
                     {member.avatar}
                   </div>
                   <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e293b] 
                     ${member.status === 'online' ? 'bg-emerald-500' : member.status === 'busy' ? 'bg-rose-500' : 'bg-slate-500'}`} 
                   />
                 </div>
                 <div>
                   <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">{member.name}</h4>
                   <p className="text-xs text-slate-400">{member.role} • {member.email}</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-3">
                 <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/5
                   ${member.status === 'online' ? 'text-emerald-400' : 'text-slate-400'}
                 `}>
                   {member.status}
                 </span>
                 <button className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                   <MoreHorizontal size={16} />
                 </button>
               </div>
             </GlassCard>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-200">Department Status</h3>
          <p className="text-sm text-slate-400">Real-time workload and Entra ID group mappings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors border border-blue-500/20">
          <Users size={16} />
          Manage Groups
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {departments.map(dept => (
           <GlassCard 
             key={dept.id} 
             hover 
             className="p-6 space-y-4 group cursor-pointer"
             onClick={() => setSelectedDept(dept)}
           >
              <div className="flex justify-between items-start">
                 <div className={`p-3 rounded-xl ${dept.bg} ${dept.color}`}>
                   <dept.icon size={24} />
                 </div>
                 <div className="flex -space-x-2">
                   {[...Array(3)].map((_, i) => (
                     <div key={i} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#1e293b] flex items-center justify-center text-xs text-white">
                        {String.fromCharCode(65+i)}
                     </div>
                   ))}
                   <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#1e293b] flex items-center justify-center text-xs text-slate-400">
                     +{dept.members - 3}
                   </div>
                 </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">{dept.name}</h4>
                <p className="text-xs text-slate-500 mt-1">Lead: {dept.head}</p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Active Load</span>
                  <span className="text-white font-medium">{dept.activeTickets} tickets</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${dept.color.replace('text-', 'bg-').replace('-400', '-500')}`} 
                    style={{ width: `${Math.min((dept.activeTickets / 50) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/20 p-2 rounded-lg">
                  <ShieldAlert size={12} />
                  Mapped to: <span className="font-mono text-slate-300">{dept.entralGroup}</span>
                </div>
              </div>
           </GlassCard>
         ))}
      </div>
    </div>
  );
};

const KnowledgeBaseView = ({ articles, categories, currentUser, onAdd, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newArticle, setNewArticle] = useState({ title: '', category: 'Hardware' });

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    onAdd({
      id: Date.now(),
      title: newArticle.title,
      category: newArticle.category,
      views: 0,
      author: currentUser.name,
      lastUpdated: 'Just now',
      helpful: 0
    });
    setIsAdding(false);
    setNewArticle({ title: '', category: 'Hardware' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Search */}
      <div className="relative py-12 px-6 rounded-3xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/5 text-center space-y-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
           <div className="flex justify-between items-center">
             <div className="w-10"></div> {/* Spacer */}
             <h2 className="text-3xl font-bold text-white">How can we help you today?</h2>
             <div className="w-10">
               {currentUser.role !== 'staff' && (
                 <button 
                   onClick={() => setIsAdding(!isAdding)}
                   className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                   title="Add Article"
                 >
                   <Plus size={20} />
                 </button>
               )}
             </div>
           </div>
           
           {isAdding && (
             <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left space-y-3 animate-in fade-in zoom-in-95">
               <input 
                 type="text" 
                 placeholder="Article Title..." 
                 className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                 value={newArticle.title}
                 onChange={e => setNewArticle({...newArticle, title: e.target.value})}
               />
               <div className="flex gap-2">
                 <select 
                   className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                   value={newArticle.category}
                   onChange={e => setNewArticle({...newArticle, category: e.target.value})}
                 >
                   {categories.map(c => <option key={c.id} value={c.label} className="bg-slate-800">{c.label}</option>)}
                 </select>
                 <button 
                   onClick={handleCreate}
                   disabled={!newArticle.title}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                 >
                   Create Draft
                 </button>
               </div>
             </div>
           )}

           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for answers, error codes, or guides..." 
                className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-slate-500 shadow-xl"
              />
           </div>
        </div>
      </div>

      {/* Categories Grid */}
      {!searchTerm && !isAdding && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(cat => (
            <button key={cat.id} className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex flex-col items-center gap-3 transition-all hover:scale-[1.02] group">
              <div className={`p-3 rounded-full ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}>
                {getIcon(cat.icon, 20)}
              </div>
              <span className="text-sm font-medium text-slate-300">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          {searchTerm ? 'Search Results' : 'Popular Articles'}
          {searchTerm && <span className="text-sm font-normal text-slate-500">({filteredArticles.length} found)</span>}
        </h3>
        
        <div className="grid gap-3">
          {filteredArticles.map(article => (
            <GlassCard key={article.id} hover className="p-5 flex items-center gap-4 group">
              <div className="p-3 bg-white/5 rounded-lg text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                <FileText size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-medium text-slate-200 group-hover:text-blue-400 transition-colors mb-1">
                  {article.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">{article.category}</span>
                  <span>Updated {article.lastUpdated}</span>
                  <span className="flex items-center gap-1"><Eye size={12}/> {article.views}</span>
                  <span className="flex items-center gap-1"><ThumbsUp size={12}/> {article.helpful}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <button className="p-2 text-slate-500 hover:text-white transition-colors">
                   <ChevronRight size={20} />
                 </button>
                 {currentUser.role !== 'staff' && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDelete(article.id); }}
                     className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 size={16} />
                   </button>
                 )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};

const TicketRow = ({ ticket, onClick, showMeta }) => (
  <GlassCard hover className="p-4 group flex items-center gap-4" onClick={onClick}>
    <div className={`p-3 rounded-xl ${
      ticket.category === 'Hardware' ? 'bg-blue-500/10 text-blue-400' : 
      ticket.category === 'Network' ? 'bg-emerald-500/10 text-emerald-400' : 
      'bg-purple-500/10 text-purple-400'
    }`}>
      {ticket.category === 'Hardware' ? <Monitor size={20} /> : 
       ticket.category === 'Network' ? <Wifi size={20} /> : <Cpu size={20} />}
    </div>
    
    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      <div className="md:col-span-5">
        <h4 className="font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
           {ticket.subject}
           {/* Omnichannel Indicator */}
           <span className="opacity-50 group-hover:opacity-100 transition-opacity" title={`Source: ${ticket.source}`}>
             <SourceIcon source={ticket.source} />
           </span>
        </h4>
        <p className="text-xs text-slate-500 flex items-center gap-2">
          {ticket.id} • {ticket.location} • {ticket.lastUpdate}
        </p>
      </div>
      
      <div className="hidden md:block md:col-span-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 border border-white/10">
            {ticket.requester.charAt(0)}
          </div>
          <span className="text-sm text-slate-400 truncate">{ticket.requester}</span>
        </div>
      </div>

      <div className="md:col-span-4 flex items-center justify-end gap-3">
        {showMeta && <SlaBadge time={ticket.sla} status={ticket.slaStatus} />}
        <Badge status={ticket.priority} />
        <Badge status={ticket.status} />
        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-300 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  </GlassCard>
);

const TicketDetailView = ({ ticket, onBack, currentUser }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left Col: Conversation */}
      <div className="lg:col-span-2 flex flex-col h-full gap-4">
        <div className="flex items-start gap-4 mb-2 justify-between">
          <div className="flex items-start gap-4">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full">
              <X size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">{ticket.subject}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                <span>{ticket.id}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span className="flex items-center gap-1"><SourceIcon source={ticket.source} /> via {ticket.source}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span className="flex items-center gap-1"><Clock size={12} /> {ticket.lastUpdate}</span>
              </div>
            </div>
          </div>

          {/* Collision Detection Avatars */}
          {ticket.viewers && ticket.viewers.length > 0 && (
             <div className="flex -space-x-2">
                {ticket.viewers.map((v, i) => (
                   <div key={i} className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-[#0f172a] flex items-center justify-center text-xs text-white font-bold" title="Also viewing">
                      {v}
                   </div>
                ))}
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {/* Original Request */}
          <GlassCard className="p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
               <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs border border-white/10">
                 {ticket.requester.charAt(0)}
               </div>
               <div>
                 <p className="text-sm font-semibold text-white">{ticket.requester}</p>
                 <p className="text-xs text-slate-500">Staff Member</p>
               </div>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {ticket.description}
            </p>
          </GlassCard>

          {/* Timeline / Comments */}
          {ticket.comments.map(comment => (
            <div key={comment.id} className="flex gap-4">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/10 text-xs font-bold
                 ${comment.type === 'log' ? 'bg-slate-700 text-slate-400' : 
                   comment.author === 'System' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/20 text-indigo-300'}
               `}>
                 {comment.author.charAt(0)}
               </div>
               <div className="space-y-1 w-full">
                 <div className="flex items-baseline gap-2">
                   <span className="text-sm font-semibold text-slate-200">{comment.author}</span>
                   <span className="text-xs text-slate-500">{comment.time}</span>
                 </div>
                 
                 {comment.type === 'log' ? (
                   <div className="text-xs text-slate-500 bg-white/5 px-3 py-2 rounded-lg border border-dashed border-white/10 font-mono">
                     {comment.text}
                   </div>
                 ) : (
                   <div className="text-slate-400 text-sm bg-white/5 px-4 py-2 rounded-lg rounded-tl-none inline-block">
                     {comment.text}
                   </div>
                 )}
               </div>
            </div>
          ))}
        </div>

        {/* Reply Box */}
        <div className="mt-auto">
          <GlassCard className="p-2">
            <textarea 
              className="w-full bg-transparent border-none text-slate-200 focus:ring-0 resize-none p-3 placeholder-slate-600"
              placeholder="Type your reply... (Markdown supported)"
              rows={2}
            />
            <div className="flex items-center justify-between px-2 pb-2 pt-2 border-t border-white/5">
              <div className="flex gap-2 text-slate-400">
                <button className="p-1.5 hover:text-white hover:bg-white/5 rounded"><Paperclip size={18}/></button>
              </div>
              <div className="flex items-center gap-3">
                 {currentUser.role !== 'staff' && (
                    <label className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer">
                      <input type="checkbox" className="rounded border-white/10 bg-black/20 text-amber-500 focus:ring-0" />
                      Internal Note
                    </label>
                 )}
                 <button className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors">
                   <Send size={18} />
                 </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Right Col: Meta Data (Sticky) */}
      <div className="hidden lg:block space-y-4">
        <GlassCard className="p-5 space-y-6">
           <div>
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Status</label>
             <select className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50">
               <option>New</option>
               <option>In Progress</option>
               <option>Waiting for User</option>
               <option>Resolved</option>
             </select>
           </div>
           
           <div>
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Assignee</label>
             <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
               <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs">AC</div>
               <span className="text-sm text-slate-300">{ticket.assignee || 'Unassigned'}</span>
             </div>
           </div>

           {/* SLA Timer */}
           {currentUser.role !== 'staff' && (
              <div className="p-3 bg-white/5 border border-white/5 rounded-lg">
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-500">SLA Target</span>
                    <span className={`text-xs font-mono font-bold ${ticket.slaStatus === 'breached' ? 'text-rose-400' : 'text-emerald-400'}`}>
                       {ticket.slaStatus === 'breached' ? `-${ticket.sla}` : ticket.sla}
                    </span>
                 </div>
                 <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ticket.slaStatus === 'breached' ? 'bg-rose-500 w-full' : 'bg-emerald-500 w-[60%]'}`}></div>
                 </div>
              </div>
           )}

           <div>
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Context</label>
             <div className="space-y-2">
                <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-1">
                   <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                     <Monitor size={14} className="text-slate-500"/> Dell Latitude 5420
                   </div>
                   <div className="text-xs text-slate-500 ml-6">Serial: 8H2K92 • Warranty: Active</div>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-1">
                   <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                     <User size={14} className="text-slate-500"/> {ticket.requester}
                   </div>
                   <div className="text-xs text-slate-500 ml-6">Science Dept • Room 302</div>
                </div>
             </div>
           </div>
        </GlassCard>
      </div>
    </div>
  );
};
