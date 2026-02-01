import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
// IMPORT VIEWS
import DashboardView from './views/Dashboard';
import TeamsView from './views/Teams';
import TenantsView from './views/Tenants';
// IMPORT UI
import { GlassCard, NavItem } from './components/ui';
import { 
  LayoutDashboard, Plus, Search, Bell, Settings, LogOut, Monitor, Menu, X, 
  Building2, Users, Book, ChevronDown
} from 'lucide-react';

// --- MOCK DATA (For Static Views) ---
const INITIAL_TENANTS = [
  { id: 't1', name: "St. Mary's High", code: 'SMH', domain: 'stmarys.edu', status: 'active', users: 1240 },
  { id: 't2', name: "Northfield Primary", code: 'NFP', domain: 'northfield.edu', status: 'active', users: 850 }
];
const MOCK_DEPARTMENTS = [
  { id: 'd1', name: 'IT Services', head: 'Alex Chen', members: 8, activeTickets: 42, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-500/10', entralGroup: 'SG-Staff-IT' },
  { id: 'd2', name: 'Estates & Facilities', head: 'Dave Miller', members: 12, activeTickets: 15, icon: Building2, color: 'text-orange-400', bg: 'bg-orange-500/10', entralGroup: 'SG-Staff-Estates' },
];
const MOCK_MEMBERS = {
  'd1': [{ id: 'tm1', name: 'Alex Chen', role: 'Head of IT', status: 'online', avatar: 'AC' }],
  'd2': [{ id: 'tm5', name: 'Dave Miller', role: 'Facilities Manager', status: 'online', avatar: 'DM' }]
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- AUTHENTICATION ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    // 2. Listen for changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    // Fetch role from public.profiles
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  }

  const handleLogin = async () => {
    // REAL SSO LOGIN
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email',
        redirectTo: window.location.origin, // Returns to your Azure Static App URL
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    if (session) fetchTickets();
  }, [session]);

  async function fetchTickets() {
    setLoading(true);
    const { data } = await supabase.from('tickets').select('*, requester:profiles!requester_id(full_name)').order('created_at', { ascending: false });
    if (data) setTickets(data.map(t => ({ ...t, requester: t.requester?.full_name || 'Unknown' })));
    setLoading(false);
  }

  // --- RENDER LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center font-sans text-slate-200">
        <GlassCard className="w-full max-w-md p-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-200">Nexus ESM</h1>
            <p className="text-slate-400 mt-2 text-sm">Enterprise Service Management</p>
          </div>
          <button 
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-lg border border-white/5 flex items-center justify-center gap-3"
          >
            <img src="https://img.icons8.com/color/48/000000/microsoft.png" className="w-5 h-5" alt="MS"/>
            <span>Sign in with Microsoft</span>
          </button>
        </GlassCard>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex overflow-hidden relative selection:bg-blue-500/30">
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]"></div>
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
             <div className="bg-white/5 rounded-lg border border-white/10 p-2 flex items-center gap-2 text-sm font-medium text-white">
                <Building2 size={16} />
                <span className="truncate">St. Mary's High</span>
                <ChevronDown size={14} className="ml-auto text-slate-500" />
             </div>
          </div>
        )}

        <nav className="flex-1 py-6 px-2 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} collapsed={!sidebarOpen} />
          {/* MY QUEUE TAB RESTORED */}
          <NavItem icon={Clock} label="My Queue" count={tickets.filter(t => t.status === 'New').length} collapsed={!sidebarOpen} />
          <NavItem icon={Plus} label="New Ticket" active={activeTab === 'new'} onClick={() => setActiveTab('new')} collapsed={!sidebarOpen} />
          <NavItem icon={Users} label="Teams" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} collapsed={!sidebarOpen} />
          {/* TENANTS TAB RESTORED (Super Admin Only) */}
          {isSuperAdmin && <NavItem icon={Building2} label="Tenants" active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} collapsed={!sidebarOpen} />}
          <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={!sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold shadow-lg">{profile?.avatar_initials || 'U'}</div>
            {sidebarOpen && <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate text-white">{profile?.full_name || 'User'}</p><p className="text-xs text-slate-400 truncate capitalize">{profile?.role || 'Staff'}</p></div>}
            {sidebarOpen && <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"><LogOut size={16} /></button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 flex flex-col">
        <header className="h-16 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400"><Menu size={20} /></button>
            <h2 className="text-xl font-semibold text-white/90 capitalize">{activeTab}</h2>
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
          {activeTab === 'dashboard' && <DashboardView tickets={tickets} loading={loading} role={profile?.role} onNewTicket={() => setActiveTab('new')} />}
          {activeTab === 'teams' && <TeamsView departments={MOCK_DEPARTMENTS} members={MOCK_MEMBERS} />}
          {activeTab === 'tenants' && <TenantsView tenants={INITIAL_TENANTS} />}
          {/* Add other views (Settings/NewTicket) similarly */}
        </div>
      </main>
    </div>
  );
}
