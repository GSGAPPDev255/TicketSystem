import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// VIEWS
import DashboardView from './views/Dashboard';
import TeamsView from './views/Teams';
import TenantsView from './views/Tenants';
import SettingsView from './views/Settings';
import KnowledgeView from './views/Knowledge';
import NewTicketView from './views/NewTicket';

// UI
import { GlassCard, NavItem, TicketDetailView } from './components/ui';
import { 
  LayoutDashboard, Plus, Search, Bell, Settings, LogOut, Monitor, Menu, X, 
  Building2, Users, Book, ChevronDown, Clock, Check
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // DATA
  const [tickets, setTickets] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [users, setUsers] = useState([]);
  
  // TENANT STATE
  const [currentTenant, setCurrentTenant] = useState(null);
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initializeApp(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initializeApp(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function initializeApp(userId) {
    setLoading(true);
    await fetchProfile(userId);
    await fetchAllData();
    setLoading(false);
  }

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  }

  async function fetchAllData() {
    const [cats, tens, depts, kb, tix] = await Promise.all([
      supabase.from('categories').select('*').order('label'),
      supabase.from('tenants').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('kb_articles').select('*').order('title'),
      supabase.from('tickets').select('*, requester:profiles!requester_id(full_name)').order('created_at', { ascending: false })
    ]);

    if (cats.data) setCategories(cats.data);
    
    // Set Tenants & Default
    if (tens.data) {
      setTenants(tens.data);
      if (!currentTenant && tens.data.length > 0) setCurrentTenant(tens.data[0]);
    }

    if (depts.data) setDepartments(depts.data);
    if (kb.data) setKbArticles(kb.data);
    if (tix.data) setTickets(tix.data.map(t => ({ ...t, requester: t.requester?.full_name || 'Unknown', status: t.status || 'New' })));

    // Fetch Users (For Settings)
    const { data: userData } = await supabase.from('profiles').select('*').order('full_name');
    const { data: accessData } = await supabase.from('tenant_access').select('*');
    if (userData && accessData) {
      setUsers(userData.map(u => ({ ...u, access_list: accessData.filter(a => a.user_id === u.id).map(a => a.tenant_id) })));
    }
  }

  const handleCreateTicket = async (formData) => {
    const requesterId = session?.user?.id;
    const { error } = await supabase.from('tickets').insert({ ...formData, requester_id: requesterId });
    if (!error) { await fetchAllData(); setActiveTab('dashboard'); } else { alert(error.message); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };

  // --- PERMISSION CHECKER ---
  // Returns true if the current user has the required role level
  const hasRole = (requiredRoles) => {
    if (!profile?.role) return false;
    return requiredRoles.includes(profile.role); // e.g. ['admin', 'manager']
  };

  const isAdmin = hasRole(['super_admin', 'admin']);
  const isTech = hasRole(['super_admin', 'admin', 'manager', 'technician']);
  // Staff falls through if they don't meet these checks

  if (!session) return <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center font-sans text-slate-200"><GlassCard className="w-full max-w-md p-8 flex flex-col items-center gap-6"><h1 className="text-3xl font-bold text-blue-200">Nexus ESM</h1><button onClick={async () => await supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: window.location.origin } })} className="w-full px-4 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-lg border border-white/5 flex items-center justify-center gap-3"><img src="https://img.icons8.com/color/48/000000/microsoft.png" className="w-5 h-5"/><span>Sign in with Microsoft</span></button></GlassCard></div>;

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 font-sans flex overflow-hidden relative selection:bg-blue-500/30">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"><div className="absolute top-[-20%] left-[20%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]"></div><div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"></div></div>

      <aside className={`fixed md:relative z-20 h-full transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64 translate-x-0' : 'w-20 md:w-20 -translate-x-full md:translate-x-0'} border-r border-white/5 bg-[#0f172a]/80 backdrop-blur-xl flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5"><div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center w-full'}`}><Monitor className="w-5 h-5 text-white" />{sidebarOpen && <span className="font-bold text-lg tracking-tight">Nexus</span>}</div><button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400"><X size={20} /></button></div>
        
        {/* TENANT SWITCHER (Visible to ALL, but limited context for staff usually) */}
        {sidebarOpen && currentTenant && (
          <div className="px-4 pt-4 relative">
             <button onClick={() => setTenantMenuOpen(!tenantMenuOpen)} className="w-full bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 p-2 flex items-center gap-2 text-sm font-medium text-white transition-colors">
                <Building2 size={16} />
                <span className="truncate flex-1 text-left">{currentTenant.name}</span>
                <ChevronDown size={14} className="text-slate-500" />
             </button>
             {tenantMenuOpen && (
               <div className="absolute top-full left-4 right-4 mt-2 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                 {tenants.map(t => (
                   <div key={t.id} onClick={() => { setCurrentTenant(t); setTenantMenuOpen(false); }} className="px-3 py-2 text-sm hover:bg-blue-600 hover:text-white cursor-pointer flex items-center justify-between group">
                      <span className={t.id === currentTenant.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}>{t.name}</span>
                      {t.id === currentTenant.id && <Check size={14} className="text-blue-400 group-hover:text-white"/>}
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        <nav className="flex-1 py-6 px-2 space-y-1">
          {/* COMMON TABS (Everyone) */}
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setSelectedTicket(null);}} collapsed={!sidebarOpen} />
          <NavItem 
            icon={Clock} 
            label="My Queue" 
            count={tickets.filter(t => t.status !== 'Resolved' && (t.requester === profile?.full_name)).length} 
            active={activeTab === 'queue'}
            onClick={() => {setActiveTab('queue'); setSelectedTicket(null);}} 
            collapsed={!sidebarOpen} 
          />
          <NavItem icon={Plus} label="New Ticket" active={activeTab === 'new'} onClick={() => setActiveTab('new')} collapsed={!sidebarOpen} />
          
          {/* TECHNICAL TABS (Technician, Manager, Admin) */}
          {isTech && (
            <>
              <NavItem icon={Users} label="Teams" active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} collapsed={!sidebarOpen} />
              <NavItem icon={Book} label="Knowledge Base" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} collapsed={!sidebarOpen} />
            </>
          )}

          {/* ADMIN TABS (Admin Only) */}
          {isAdmin && (
            <>
               {profile?.role === 'super_admin' && <NavItem icon={Building2} label="Tenants" active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} collapsed={!sidebarOpen} />}
               <NavItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} collapsed={!sidebarOpen} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/5"><div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}><div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">{profile?.avatar_initials}</div>{sidebarOpen && <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{profile?.full_name}</p><p className="text-xs text-slate-400 truncate capitalize">{profile?.role}</p></div>}{sidebarOpen && <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-white"><LogOut size={16} /></button>}</div></div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 flex flex-col">
        <header className="h-16 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
           <div className="flex items-center gap-4"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-400"><Menu size={20} /></button><h2 className="text-xl font-semibold text-white/90 capitalize">{activeTab === 'queue' ? 'My Queue' : activeTab}</h2></div>
           <div className="flex items-center gap-4"><div className="relative hidden md:block"><Search className="absolute left-3 top-2 text-slate-500 w-4 h-4" /><input type="text" placeholder="Search..." className="bg-black/20 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-sm w-64 text-slate-200" /></div><button className="p-2 text-slate-400"><Bell size={20} /></button></div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'new' && <NewTicketView categories={categories} kbArticles={kbArticles} onSubmit={handleCreateTicket} />}
          {activeTab === 'dashboard' && !selectedTicket && <DashboardView tickets={tickets} loading={loading} role={profile?.role} onRefresh={fetchAllData} onSelectTicket={setSelectedTicket} onNewTicket={() => setActiveTab('new')} />}
          {activeTab === 'queue' && !selectedTicket && (
             <DashboardView 
               tickets={tickets.filter(t => t.requester === profile?.full_name || t.assignee === profile?.full_name)} 
               loading={loading} 
               role={profile?.role} 
               onRefresh={fetchAllData} 
               onSelectTicket={setSelectedTicket} 
               onNewTicket={() => setActiveTab('new')}
               title="My Active Tickets"
             />
          )}
          {selectedTicket && <TicketDetailView ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />}
          
          {/* PROTECTED ROUTES (Check again before rendering to prevent URL hacking) */}
          {activeTab === 'teams' && isTech && <TeamsView departments={departments} />}
          {activeTab === 'tenants' && isAdmin && <TenantsView tenants={tenants} />}
          {activeTab === 'knowledge' && isTech && <KnowledgeView articles={kbArticles} categories={categories} onUpdate={fetchAllData} />}
          {activeTab === 'settings' && isAdmin && <SettingsView categories={categories} tenants={tenants} users={users} onUpdate={fetchAllData} />}
        </div>
      </main>
    </div>
  );
}
