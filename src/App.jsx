import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Ticket, PlusCircle, Users, Settings, Book, Building, 
  LogOut, Bell, Menu, X, Search, Sun, Moon 
} from 'lucide-react';
import { supabase } from './lib/supabase';
import DashboardView from './views/Dashboard';
import NewTicketView from './views/NewTicket';
import TeamsView from './views/Teams';
import KnowledgeBaseView from './views/Knowledge';
import SettingsView from './views/Settings';
import TenantsView from './views/Tenants';
import { TicketDetailView } from './components/ui'; 
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// --- SIDEBAR COMPONENT ---
function Sidebar({ activeView, onNavigate, session, profile, myTicketCount, isMobile, isOpen, setIsOpen }) {
  const { currentTenant, tenants, setCurrentTenant } = useTenant();
  const { theme, toggleTheme } = useTheme();

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
    ? `fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : 'w-64 bg-white dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 transition-colors duration-300';

  return (
    <div className={sidebarClasses}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            N
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Nexus</span>
        </div>
        {isMobile && <button onClick={() => setIsOpen(false)} className="text-slate-400"><X size={24} /></button>}
      </div>

      <div className="px-4 mb-6">
        <select 
          className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
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
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={activeView === item.id ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'} />
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

      <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
           <div className="flex items-center gap-2">
             {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
             <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
           </div>
           <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 ${theme === 'dark' ? 'left-[18px]' : 'left-0.5'}`} />
           </div>
        </button>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-slate-600 dark:text-white font-bold text-xs">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               (profile?.full_name || 'US').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
             )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{profile?.role || 'Staff'}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN CONTENT LOGIC (WITH REWRITTEN BULLETPROOF PROVISIONING) ---
function AppContent({ session }) {
  const { currentTenant, tenants, setCurrentTenant } = useTenant();
  const [profile, setProfile] = useState(null); 
  const [activeView, setActiveView] = useState('dashboard');
  const [myTicketCount, setMyTicketCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [users, setUsers] = useState([]);

  // --- 🎯 NEW: AUTO-PROVISIONING ENGINE (FIXED FOR 406 ERRORS) ---
  const checkAndProvisionAccess = async (user) => {
    if (!user?.email || tenants.length === 0) return;

    // 1. Force check if access exists (Ignore 406 by using a simple count check)
    const { count } = await supabase
      .from('tenant_access')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count > 0) return; // User already mapped

    // 2. Extract domain
    const domain = user.email.split('@')[1]?.toLowerCase();
    if (!domain) return;

    console.log(`🔍 New User Detection: ${user.email} from ${domain}`);

    // 3. Special Case: Gardener Schools (Group Admin)
    if (domain === 'gardenerschools.com') {
      const accessRows = tenants.map(t => ({ user_id: user.id, tenant_id: t.id }));
      await supabase.from('tenant_access').upsert(accessRows);
      await supabase.from('profiles').upsert({ 
        id: user.id, 
        email: user.email, 
        full_name: user.user_metadata?.full_name || 'Group Admin',
        role: 'admin' 
      });
      return;
    }

    // 4. Standard Case: Match domain to Tenant (e.g. kewhouseschool.com)
    const matchingTenant = tenants.find(t => t.domain?.toLowerCase() === domain);
    
    if (matchingTenant) {
      console.log(`✨ JIT Provisioning: Mapping user to ${matchingTenant.name}`);
      
      // A. Provision Access
      await supabase.from('tenant_access').insert({ 
        user_id: user.id, 
        tenant_id: matchingTenant.id 
      });

      // B. Create/Update Profile (Eliminates 406 Error)
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'New User',
        role: 'user',
        avatar_initials: (user.user_metadata?.full_name || 'US').substring(0,2).toUpperCase()
      });
      
      // C. Set Context & Reset state
      setCurrentTenant(matchingTenant);
      window.location.reload(); // Reset to clear Supabase cache
    }
  };

  const handleNavigation = (viewName) => {
    setActiveView(viewName);
    setSelectedTicket(null);
    if (isMobile) setSidebarOpen(false);
  };

  // 1. FETCH PROFILE + TRIGGER PROVISIONING
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const initUser = async () => {
      // Step A: Provision FIRST (Don't wait for profile fetch)
      if (tenants.length > 0) {
        await checkAndProvisionAccess(session.user);
      }

      // Step B: Load Profile SECOND
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (data) setProfile(data);
    };

    initUser();
  }, [session, tenants]);

  // 2. MOBILE CHECK
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 3. FETCH GLOBAL DATA
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

  useEffect(() => {
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
  }, [currentTenant, activeView]); 

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

  // 6. HANDLE TICKET CREATION
  const handleCreateTicket = async (formData) => {
    const requesterId = session?.user?.id;
    const requesterName = profile?.full_name || session?.user?.user_metadata?.full_name || 'User'; 
    const requesterEmail = profile?.email || session?.user?.email;
    const tenantName = currentTenant?.name || 'Nexus Portal';

    const priority = formData.priority || 'Medium';
    const now = new Date();
    
    const formattedDate = now.toLocaleString('en-GB', { 
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    
    const monthYear = now.toLocaleString('en-GB', { month: 'short', year: '2-digit' }).toUpperCase().replace(' ','');
    const hours = priority === 'Critical' ? 4 : priority === 'High' ? 8 : priority === 'Low' ? 72 : 24; 
    now.setHours(now.getHours() + hours);

    const selectedCategory = categories.find(c => c.label === formData.category);
    const autoDeptId = selectedCategory?.default_department_id || null;

    const { data: newTicket, error } = await supabase.from('tickets').insert({ 
      ...formData, 
      requester_id: requesterId,
      tenant_id: currentTenant?.id, 
      priority: priority,
      sla_due_at: now.toISOString(),
      department_id: autoDeptId 
    }).select().single();
    
    if (error) { 
      alert(error.message);
      return;
    }

    const friendlyId = newTicket.ticket_number 
        ? `${monthYear}-${newTicket.ticket_number}` 
        : `#${newTicket.id.slice(0,8)}`;

    const emailPromises = [];
    const htmlStyle = `font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;`;
    const labelStyle = `font-weight: bold; width: 120px; padding: 4px 0; color: #555;`;
    const boxStyle = `background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin-bottom: 20px; color: #333;`;

    if (autoDeptId) {
        const targetDept = departments.find(d => d.id === autoDeptId);
        if (targetDept?.team_email) {
            emailPromises.push(fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: targetDept.team_email,
                    subject: `[${priority}] ${formData.subject} (${friendlyId})`,
                    body: `
                        <div style="${htmlStyle}">
                           <p style="font-size: 16px;">A new issue has been assigned to you by <strong>${requesterName}</strong> from <strong>${tenantName}</strong>.</p>
                           <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
                           <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                             <tr><td style="${labelStyle}">Issue ID:</td><td>${friendlyId}</td></tr>
                             <tr><td style="${labelStyle}">Title:</td><td>${formData.subject}</td></tr>
                             <tr><td style="${labelStyle}">Priority:</td><td style="font-weight:bold; color:${priority === 'Critical' ? '#e11d48' : '#333'}">${priority}</td></tr>
                             <tr><td style="${labelStyle}">Logged:</td><td>${formattedDate}</td></tr>
                           </table>
                           <div style="${boxStyle}">
                             <strong>Description:</strong><br/><span style="white-space: pre-wrap;">${formData.description}</span>
                           </div>
                           <a href="${window.location.origin}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 14px;">Respond to Issue</a>
                           <p style="margin-top: 30px; font-size: 12px; color: #999;">Nexus ESM Automation</p>
                        </div>
                    `
                })
            }));
        }
    }

    if (requesterEmail) {
        emailPromises.push(fetch('/api/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: requesterEmail,
                subject: `Ticket Logged: ${friendlyId}`,
                body: `
                    <div style="${htmlStyle}">
                       <h3 style="color: #2563eb; margin-bottom: 10px;">Request Received</h3>
                       <p>Hello ${requesterName},</p>
                       <p>Your ticket <strong>${friendlyId}</strong> regarding "<strong>${formData.subject}</strong>" has been logged with ${tenantName} IT Support.</p>
                       <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
                       <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                         <tr><td style="${labelStyle}">Issue ID:</td><td>${friendlyId}</td></tr>
                         <tr><td style="${labelStyle}">Date:</td><td>${formattedDate}</td></tr>
                         <tr><td style="${labelStyle}">Status:</td><td>New</td></tr>
                       </table>
                       <div style="${boxStyle}">
                         <strong>Your Description:</strong><br/><span style="white-space: pre-wrap;">${formData.description}</span>
                       </div>
                       <p>Our team will review it shortly. You will be notified of any updates.</p>
                       <a href="${window.location.origin}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Check Status Online</a>
                       <p style="margin-top: 30px; font-size: 12px; color: #999;">Nexus ESM Automation</p>
                    </div>
                `
            })
        }));
    }

    Promise.allSettled(emailPromises).then(() => console.log("Emails processed"));
    await fetchTickets(); 
    setActiveView('dashboard'); 
  };

  const role = profile?.role || 'user'; 

  const renderView = () => {
    if (selectedTicket) {
      return <TicketDetailView ticket={selectedTicket} onBack={() => { setSelectedTicket(null); fetchTickets(); }} />;
    }

    switch (activeView) {
      case 'dashboard': 
        return <DashboardView tickets={tickets} loading={loading} role={role} onRefresh={fetchTickets} onSelectTicket={setSelectedTicket} onNewTicket={() => handleNavigation('new-ticket')} />;
      case 'my-queue': 
        return <DashboardView title="My Active Tickets" tickets={tickets.filter(t => t.assignee_id === session.user.id && t.status !== 'Resolved' && t.status !== 'Closed')} loading={loading} role={role} onRefresh={fetchTickets} onSelectTicket={setSelectedTicket} />; 
      case 'new-ticket': 
        return <NewTicketView categories={categories} kbArticles={kbArticles} onSubmit={handleCreateTicket} />;
      case 'teams': 
        return <TeamsView departments={departments} role={role} onUpdate={fetchGlobals} />;
      case 'knowledge': 
        return <KnowledgeBaseView articles={kbArticles} categories={categories} onUpdate={fetchGlobals} />;
      case 'settings': 
        return <SettingsView categories={categories} tenants={tenants} departments={departments} users={users} onUpdate={fetchGlobals} />;
      case 'tenants': 
        return <TenantsView tenants={tenants} onUpdate={fetchGlobals} />;
      default: return <DashboardView tickets={tickets} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-300 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]">
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigation} 
        session={session} 
        profile={profile} 
        myTicketCount={myTicketCount}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {isMobile && (
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 transition-colors">
            <span className="font-bold text-slate-900 dark:text-white">Nexus</span>
            <button onClick={() => setSidebarOpen(true)} className="text-slate-500 dark:text-white"><Menu size={24} /></button>
          </div>
        )}
        
        <header className="h-16 border-b border-slate-200 dark:border-white/5 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 transition-colors">
           <h2 className="text-xl font-semibold text-slate-900 dark:text-white/90 capitalize">{activeView.replace('-', ' ')}</h2>
           <div className="flex items-center gap-4">
             <div className="relative hidden md:block">
               <Search className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 w-4 h-4" />
               <input type="text" placeholder="Search..." className="bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-full pl-9 pr-4 py-1.5 text-sm w-64 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors" />
             </div>
             <button className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors"><Bell size={20} /></button>
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
      <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center font-sans text-slate-900 dark:text-slate-200 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]">
        <div className="w-full max-w-md p-8 flex flex-col items-center gap-6 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-200">Nexus ESM</h1>
          <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: window.location.origin } })} className="w-full px-4 py-3 bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white rounded-lg border border-white/5 flex items-center justify-center gap-3 shadow-md transition-all">
            <img src="https://img.icons8.com/color/48/000000/microsoft.png" className="w-5 h-5" alt="MS"/>
            <span>Sign in with Microsoft</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <TenantProvider>
        <AppContent session={session} />
      </TenantProvider>
    </ThemeProvider>
  );
}
