import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Ticket, PlusCircle, Users, Settings, Book, Building, LogOut, Bell, Menu, X, Search } from 'lucide-react';
import { supabase } from './lib/supabase';
import DashboardView from './views/Dashboard';
import NewTicketView from './views/NewTicket';
import TeamsView from './views/Teams';
import KnowledgeBaseView from './views/Knowledge';
import SettingsView from './views/Settings';
import TenantsView from './views/Tenants';
import { TicketDetailView } from './components/ui'; 
import { TenantProvider, useTenant } from './contexts/TenantContext';

// --- SIDEBAR COMPONENT ---
function Sidebar({ activeView, setActiveView, session, profile, myTicketCount, isMobile, isOpen, setIsOpen }) {
  const { currentTenant, tenants, setCurrentTenant } = useTenant();

  // FIX: Use profile.role instead of session metadata
  const role = profile?.role || 'user'; 
  const isAdmin = role === 'super_admin' || role === 'admin';
  const isTech = ['super_admin', 'admin', 'manager', 'technician'].includes(role);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-queue', label: 'My Queue', icon: Ticket, badge: myTicketCount },
    { id: 'new-ticket', label: 'New Ticket', icon: PlusCircle },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'knowledge', label: 'Knowledge Base', icon: Book },
    { id: 'tenants', label: 'Tenants', icon: Building, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ];

  const sidebarClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : 'w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col shrink-0';

  return (
    <div className={sidebarClasses}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            N
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Nexus</span>
        </div>
        {isMobile && <button onClick={() => setIsOpen(false)} className="text-slate-400"><X size={24} /></button>}
      </div>

      <div className="px-4 mb-6">
        <select 
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          value={currentTenant?.id || ''}
          onChange={(e) => {
            const t = tenants.find(t => t.id === e.target.value);
            if (t) setCurrentTenant(t);
          }}
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          if ((item.id === 'teams' || item.id === 'knowledge') && !isTech) return null;

          return (
            <button
              key={item.id}
              onClick={() => { setActiveView(item.id); if (isMobile) setIsOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={activeView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-white font-bold text-xs">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               (profile?.full_name || 'US').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
             )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{profile?.role || 'Staff'}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN CONTENT LOGIC ---
function AppContent({ session }) {
  const { currentTenant, tenants } = useTenant();
  const [profile, setProfile] = useState(null); 
  const [activeView, setActiveView] = useState('dashboard');
  const [myTicketCount, setMyTicketCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [users, setUsers] = useState([]);

  // 1. FETCH REAL PROFILE FROM DB
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (data) {
        setProfile(data);
      }
    };
    fetchProfile();
  }, [session]);

  // 2. MOBILE CHECK
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 3. FETCH GLOBAL DATA
  useEffect(() => {
    const fetchGlobals = async () => {
      const [cats, depts, kb, allUsers, allAccess] = await Promise.all([
        supabase.from('categories').select('*').order('label'),
        supabase.from('departments').select('*').order('name'),
        supabase.from('kb_articles').select('*').order('title'),
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('tenant_access').select('*')
      ]);
      
      if (cats.data) setCategories(cats.data);
      if (depts.data) setDepartments(depts.data);
      if (kb.data) setKbArticles(kb.data);
      
      if (allUsers.data && allAccess.data) {
          const processedUsers = allUsers.data.map(u => ({
              ...u,
              access_list: allAccess.data.filter(a => a.user_id === u.id).map(a => a.tenant_id)
          }));
          setUsers(processedUsers);
      }
    };
    fetchGlobals();
  }, []);

  // 4. FETCH TICKETS
  const fetchTickets = async () => {
    if (!currentTenant) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('tickets')
      .select('*, requester:profiles!requester_id(full_name), assignee_profile:profiles!assignee_id(full_name)')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = data.map(t => ({ 
        ...t, 
        requester: t.requester?.full_name || 'Unknown', 
        assignee: t.assignee_profile?.full_name || null 
      }));
      setTickets(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [currentTenant]); 

  // 5. BADGE COUNTER
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchBadge = async () => {
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', session.user.id)
        .neq('status', 'Resolved') 
        .neq('status', 'Closed');  
      setMyTicketCount(count || 0);
    };
    fetchBadge();
    const sub = supabase.channel('badge').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchBadge).subscribe();
    return () => supabase.removeChannel(sub);
  }, [session]);

  // 6. HANDLE TICKET CREATION (WITH EMAIL NOTIFICATION)
  const handleCreateTicket = async (formData) => {
    const requesterId = session?.user?.id;
    const priority = formData.priority || 'Medium';
    
    const now = new Date();
    const hours = priority === 'Critical' ? 4 : priority === 'High' ? 8 : priority === 'Low' ? 72 : 24; 
    now.setHours(now.getHours() + hours);

    const selectedCategory = categories.find(c => c.label === formData.category);
    const autoDeptId = selectedCategory?.default_department_id || null;

    // 1. Insert Ticket
    const { data: newTicket, error } = await supabase.from('tickets').insert({ 
      ...formData, 
      requester_id: requesterId,
      tenant_id: currentTenant?.id, 
      priority: priority,
      sla_due_at: now.toISOString(),
      department_id: autoDeptId 
    }).select().single(); // <--- Important: Get ID back
    
    if (error) { 
      alert(error.message);
      return;
    }

    // 2. Email Logic
    if (autoDeptId) {
        const targetDept = departments.find(d => d.id === autoDeptId);
        if (targetDept?.team_email) {
            console.log(`Sending email to ${targetDept.team_email}`);
            fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: targetDept.team_email,
                    subject: `[New Ticket] #${newTicket.id} - ${formData.subject}`,
                    body: `
                        <h3>New Ticket Received</h3>
                        <p><b>Requester:</b> ${session?.user?.user_metadata?.full_name}</p>
                        <p><b>Priority:</b> ${priority}</p>
                        <hr/>
                        <p>${formData.description}</p>
                        <br/>
                        <a href="${window.location.origin}">View Ticket</a>
                    `
                })
            }).catch(e => console.error("Email failed", e));
        }
    }

    await fetchTickets(); 
    setActiveView('dashboard'); 
  };

  const role = profile?.role || 'user'; 

  const renderView = () => {
    if (selectedTicket) return <TicketDetailView ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />;

    switch (activeView) {
      case 'dashboard': 
        return <DashboardView tickets={tickets} loading={loading} role={role} onRefresh={fetchTickets} onSelectTicket={setSelectedTicket} onNewTicket={() => setActiveView('new-ticket')} />;
      case 'my-queue': 
        return <DashboardView title="My Active Tickets" tickets={tickets.filter(t => t.assignee_id === session.user.id && t.status !== 'Resolved' && t.status !== 'Closed')} loading={loading} role={role} onRefresh={fetchTickets} onSelectTicket={setSelectedTicket} />; 
      case 'new-ticket': 
        return <NewTicketView categories={categories} kbArticles={kbArticles} onSubmit={handleCreateTicket} />;
      case 'teams': 
        return <TeamsView departments={departments} />;
      case 'knowledge': 
        return <KnowledgeBaseView articles={kbArticles} categories={categories} onUpdate={fetchTickets} />;
      case 'settings': 
        return <SettingsView categories={categories} tenants={tenants} departments={departments} users={users} onUpdate={fetchTickets} />;
      case 'tenants': 
        return <TenantsView tenants={tenants} />;
      default: return <DashboardView tickets={tickets} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        session={session} 
        profile={profile} 
        myTicketCount={myTicketCount}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {isMobile && (
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-white/5">
            <span className="font-bold text-white">Nexus</span>
            <button onClick={() => setSidebarOpen(true)} className="text-white"><Menu size={24} /></button>
          </div>
        )}
        
        <header className="h-16 border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
           <h2 className="text-xl font-semibold text-white/90 capitalize">{activeView.replace('-', ' ')}</h2>
           <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search className="absolute left-3 top-2 text-slate-500 w-4 h-4" />
               <input type="text" placeholder="Search..." className="bg-black/20 border border-white/5 rounded-full pl-9 pr-4 py-1.5 text-sm w-64 text-slate-200 focus:outline-none focus:border-blue-500/50" />
             </div>
             <button className="p-2 text-slate-400 hover:text-white"><Bell size={20} /></button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 relative">
           {renderView()}
        </main>
      </div>
      
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

// --- ROOT APP ---
export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a] flex items-center justify-center font-sans text-slate-200">
        <div className="w-full max-w-md p-8 flex flex-col items-center gap-6 bg-slate-900/50 border border-white/10 rounded-2xl backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-blue-200">Nexus ESM</h1>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: window.location.origin } })} className="w-full px-4 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-lg border border-white/5 flex items-center justify-center gap-3">
            <img src="https://img.icons8.com/color/48/000000/microsoft.png" className="w-5 h-5" alt="MS"/>
            <span>Sign in with Microsoft</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <TenantProvider>
      <AppContent session={session} />
    </TenantProvider>
  );
}
