import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, School, 
  MoreHorizontal, Command, LogOut, Zap, Crown, ArrowRight, Loader2, Mail
} from 'lucide-react';

// --- HELPER: PERSIST VIEW STATE ---
const usePersistedState = (key, defaultValue) => {
    const [state, setState] = useState(() => {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    });
    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);
    return [state, setState];
};

// --- SECURITY GATE: TICKET VISIBILITY ENGINE ---
const TicketEngine = {
    getVisibleTickets: (tickets, currentUser) => {
        if (!currentUser) return [];
        
        // 1. PRIME ADMIN: See Everything
        if (currentUser.is_super_admin) return tickets;

        // 2. STAFF: See Only Own Tickets
        if (currentUser.role === 'Staff') {
            return tickets.filter(t => t.requester_email === currentUser.email);
        }

        // 3. DELEGATED ADMIN: Scope Check
        // Must match School AND Department
        return tickets.filter(t => {
            const hasSchoolAccess = currentUser.access_schools?.includes('ALL') || currentUser.access_schools?.includes(t.school);
            // Default to IT if no department assigned, or check if user has access to that department ticket
            // Note: In a real app, tickets need a 'department' field. We infer from Category owner.
            const hasDeptAccess = true; // Simplified for now, add granular dept logic if ticket has owner_dept column
            return hasSchoolAccess && hasDeptAccess;
        });
    }
};

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin, loading, error }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50">
            <div className="w-full max-w-md bg-white border border-zinc-200 shadow-xl rounded-3xl p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg mb-6">
                    <Briefcase className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">CorpTicket</h1>
                <p className="text-zinc-500 text-sm mb-8">Secure Enterprise Login</p>
                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2 justify-center">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button onClick={onLogin} disabled={loading} className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <>Sign In with Azure AD <ArrowRight size={16} /></>}
                </button>
            </div>
        </div>
    );
}

// --- MAIN APP ---
export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [view, setView] = usePersistedState('app_view', 'chat');
    
    // Data States
    const [tickets, setTickets] = useState([]);
    const [notifications, setNotifications] = useState(0);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [schools, setSchools] = useState([]);
    const [departments, setDepartments] = useState([]); // Array of objects {name, config}
    
    // Knowledge & Logic (Restored)
    const [kbArticles, setKbArticles] = useState([]);
    const [keywords, setKeywords] = useState({
        'IT - AV': { owner: 'IT', sensitive: false, keywords: ['projector', 'hdmi', 'screen'] },
        'Facilities': { owner: 'Site', sensitive: false, keywords: ['chair', 'desk', 'leak'] }
    });

    // --- FETCH DATA ---
    const fetchSystemData = async () => {
        const { data: settings } = await supabase.from('organization_settings').select('*');
        if (settings) {
            setSchools(settings.filter(s => s.type === 'SCHOOL').map(s => s.name));
            // Store full object for departments to access 'config' (email)
            setDepartments(settings.filter(s => s.type === 'DEPARTMENT'));
        }
        
        // Fetch Users (Only if admin, but we fetch all to be safe and filter in UI)
        const { data: allUsers } = await supabase.from('users').select('*').order('full_name');
        setUsers(allUsers || []);

        const { data: allTickets } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        setTickets(allTickets || []);
    };

    // --- AUTH & JIT ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) handleUserAuth(session.user);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) handleUserAuth(session.user);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleUserAuth = async (azureUser) => {
        setIsLoginLoading(true);
        const email = azureUser.email.toLowerCase();
        try {
            let { data: userData } = await supabase.from('users').select('*').ilike('email', email).single();
            
            // JIT Provisioning
            if (!userData) {
                const domain = email.split('@')[1];
                let assignedSchool = 'HQ';
                if (domain.includes('kgps')) assignedSchool = 'KGPS';

                const { data: newUser } = await supabase.from('users').insert([{
                    full_name: azureUser.user_metadata.full_name || email.split('@')[0],
                    email: email,
                    role: 'Staff', 
                    department: 'General', 
                    school: assignedSchool,
                    access_schools: [assignedSchool],
                    avatar_code: (azureUser.user_metadata.full_name || 'U').charAt(0).toUpperCase()
                }]).select().single();
                userData = newUser;
            }

            await fetchSystemData();
            setCurrentUser(userData);
            setIsAuthenticated(true);
            
            // Realtime
            supabase.channel('main-db-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                    fetchSystemData(); // Brute force refresh to ensure consistency
                    setNotifications(prev => prev + 1);
                })
                .subscribe();

        } catch (err) {
            console.error(err);
            setIsAuthenticated(false);
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleLogin = async () => {
        setIsLoginLoading(true);
        await supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: window.location.origin } });
    };

    // --- ACTIONS ---
    const handleNewTicket = async (ticket) => {
        // 1. Optimistic UI
        const optimisticTicket = { ...ticket, id: `temp-${Date.now()}`, created_at: new Date().toISOString(), status: 'Open', requester_email: currentUser.email };
        setTickets(prev => [optimisticTicket, ...prev]);

        // 2. Insert to DB
        const { data, error } = await supabase.from('tickets').insert([{
            subject: ticket.subject, category: ticket.category, priority: ticket.priority, status: ticket.status, 
            school: ticket.school, location: ticket.location, context_data: ticket.context, 
            is_sensitive: ticket.isSensitive, requester_email: currentUser.email
        }]).select();

        // 3. Trigger Email Notification (Simulation)
        if (!error && data) {
            console.log("TRIGGER EMAIL TO:", ticket.owner); 
            // In production, Supabase Edge Function listens to 'INSERT' on tickets table and sends email
        }
    };

    const handleUpdateUser = async (updatedUser) => {
        await supabase.from('users').update({
            role: updatedUser.role,
            department: updatedUser.department,
            school: updatedUser.school,
            access_schools: updatedUser.access_schools,
            access_scopes: updatedUser.access_scopes, // Added Dept Scope
            is_super_admin: updatedUser.is_super_admin
        }).eq('id', updatedUser.id);
        fetchSystemData();
    };

    const handleAddUserManual = async (newUser) => {
        // Backup Manual Add
        const { error } = await supabase.from('users').insert([{
            full_name: newUser.name, email: newUser.email, role: newUser.role, department: newUser.dept, 
            school: newUser.school, is_super_admin: newUser.isSuperAdmin, access_schools: newUser.accessSchools,
            avatar_code: newUser.name.substring(0,2).toUpperCase()
        }]);
        if(error) alert(error.message);
        else fetchSystemData();
    };

    const handleAddSetting = async (type, name, config = {}) => {
        await supabase.from('organization_settings').insert([{ type, name, config }]);
        fetchSystemData();
    };

    const handleRemoveSetting = async (name) => {
        await supabase.from('organization_settings').delete().eq('name', name);
        fetchSystemData();
    };

    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} loading={isLoginLoading} />;
    if (!currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

    return (
        <div className="min-h-screen flex flex-col font-sans text-zinc-900 bg-zinc-50">
            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg"><Briefcase className="w-5 h-5" /></div>
                    <div><span className="font-bold text-sm tracking-tight block text-zinc-800">CorpTicket</span><span className="text-[10px] font-semibold text-zinc-400 tracking-wider">ENTERPRISE</span></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                        <button onClick={() => setView('chat')} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <MessageSquare size={14} /> Helpdesk
                        </button>
                        {currentUser.role !== 'Staff' && (
                            <button onClick={() => { setView('admin'); setNotifications(0); }} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                                <div className="relative">
                                    <LayoutDashboard size={14} />
                                    {notifications > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-3 h-3 flex items-center justify-center rounded-full">{notifications}</span>}
                                </div>
                                Admin Console
                            </button>
                        )}
                    </div>
                    <div className="h-6 w-px bg-zinc-200 mx-2"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block"><div className="text-xs font-bold text-zinc-800">{currentUser.full_name}</div><div className="text-[10px] text-zinc-500">{currentUser.school} • {currentUser.role}</div></div>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentUser.is_super_admin ? 'bg-purple-600' : 'bg-zinc-800'}`}>{currentUser.avatar_code}</div>
                        <button onClick={() => { setIsAuthenticated(false); supabase.auth.signOut(); }} className="text-zinc-400 hover:text-red-600 transition-colors"><LogOut size={18} /></button>
                    </div>
                </div>
            </nav>

            <div className="flex-1 overflow-hidden relative max-w-[1600px] mx-auto w-full p-6 h-[calc(100vh-80px)]">
                {view === 'chat' ? (
                    <ChatInterface 
                        onTicketCreate={handleNewTicket} 
                        // Logic Engine Hook
                        categorizer={(text) => {
                            let best = 'General Support';
                            let max = 0;
                            Object.entries(keywords).forEach(([cat, cfg]) => {
                                let score = 0;
                                cfg.keywords.forEach(k => { if(text.toLowerCase().includes(k)) score++; });
                                if(score > max) { max = score; best = cat; }
                            });
                            return { category: best, owner: keywords[best]?.owner || 'IT' };
                        }}
                        currentUser={currentUser} 
                    />
                ) : (
                    <AdminDashboard 
                        tickets={TicketEngine.getVisibleTickets(tickets, currentUser)} 
                        users={users} 
                        currentUser={currentUser} 
                        schools={schools}
                        departments={departments}
                        onUpdateUser={handleUpdateUser}
                        onAddUser={handleAddUserManual}
                        onAddSetting={handleAddSetting}
                        onRemoveSetting={handleRemoveSetting}
                        onRefresh={fetchSystemData}
                        onUpdateTicket={async (t) => { await supabase.from('tickets').update({ status: t.status, assigned_to: t.assigned_to }).eq('id', t.id); }}
                        kbArticles={kbArticles}
                        keywords={keywords}
                    />
                )}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

// 1. CHAT INTERFACE
function ChatInterface({ onTicketCreate, categorizer, currentUser }) {
    const [messages, setMessages] = useState([{ id: 1, sender: 'bot', text: `Hello ${currentUser.full_name.split(' ')[0]}. Describe your issue.` }]);
    const [input, setInput] = useState('');
    const [step, setStep] = useState('ISSUE'); 
    const [ticketDraft, setTicketDraft] = useState({});
    const chatEndRef = useRef(null);

    useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

    const handleSend = (text) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
        
        setTimeout(() => {
            if (step === 'ISSUE') {
                const cat = categorizer(text);
                setTicketDraft({ subject: text, ...cat });
                setStep('DETAILS');
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `Category: **${cat.category}**. Please provide the Room Number/Device ID.` }]);
            } else if (step === 'DETAILS') {
                const finalTicket = { ...ticketDraft, location: text, priority: 'Medium', status: 'Open', school: currentUser.school };
                onTicketCreate(finalTicket);
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "Ticket created. Reference #" + Math.floor(Math.random()*10000) }]);
                setStep('DONE');
            }
        }, 500);
        setInput('');
    };

    return (
        <div className="h-full flex flex-col justify-center items-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-zinc-200 h-[80vh] flex flex-col overflow-hidden">
                <div className="bg-white border-b border-zinc-100 p-4 flex items-center gap-3 shadow-sm z-10">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white"><Zap size={20} fill="currentColor"/></div>
                    <div><h3 className="font-bold text-zinc-900">IT Assistant</h3><p className="text-xs text-zinc-500">Always online</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                {step !== 'DONE' && (
                    <div className="p-4 bg-white border-t border-zinc-200">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
                            <input className="flex-1 bg-zinc-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="Type response..." value={input} onChange={e => setInput(e.target.value)} autoFocus />
                            <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700"><Send size={18}/></button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

// 2. ADMIN DASHBOARD
function AdminDashboard({ tickets, users, currentUser, schools, departments, onUpdateUser, onAddUser, onAddSetting, onRemoveSetting, onUpdateTicket, onRefresh, keywords }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');

    useEffect(() => { if (onRefresh) onRefresh(); }, []);

    const tabs = [{ id: 'queue', label: 'Dashboard' }];
    // Only Delegated Admins (Admin) and Prime Admins (Super Admin) see these
    if (currentUser.role !== 'Staff') {
        tabs.push({ id: 'directory', label: 'Directory' });
        tabs.push({ id: 'settings', label: 'Settings' });
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-200 px-6 py-0 flex gap-6 bg-white sticky top-0 z-20">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`text-xs font-bold uppercase tracking-wider py-4 border-b-2 transition-colors ${activeTab === t.id ? 'text-indigo-600 border-indigo-600' : 'text-zinc-400 border-transparent hover:text-zinc-600'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden relative bg-zinc-50/30">
                {activeTab === 'queue' && (
                    <div className="h-full flex">
                        <div className="w-[380px] border-r border-zinc-200 overflow-y-auto bg-white flex flex-col">
                            {tickets.length === 0 ? <div className="p-10 text-center text-zinc-400 text-sm">No tickets found.</div> : tickets.map(t => (
                                <div key={t.id} onClick={() => setSelectedTicket(t)} className={`p-4 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-all ${selectedTicket?.id === t.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-bold line-clamp-1 ${selectedTicket?.id === t.id ? 'text-indigo-900' : 'text-zinc-800'}`}>{t.subject}</h4>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${t.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-zinc-200'}`}>{t.status}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{t.context_data}</p>
                                    <div className="flex items-center justify-between"><span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-medium">{t.school}</span><span className="text-[10px] text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 bg-zinc-50/50">
                            {selectedTicket ? <TicketDetailView ticket={selectedTicket} currentUser={currentUser} onUpdateTicket={onUpdateTicket} /> : <div className="h-full flex items-center justify-center text-zinc-300">Select a ticket</div>}
                        </div>
                    </div>
                )}
                
                {activeTab === 'directory' && (
                    <UserDirectory users={users} currentUser={currentUser} schools={schools} departments={departments} onUpdateUser={onUpdateUser} onAddUser={onAddUser} />
                )}

                {activeTab === 'settings' && (
                    <SettingsManager schools={schools} departments={departments} onAdd={onAddSetting} onRemove={onRemoveSetting} keywords={keywords} />
                )}
            </div>
        </div>
    );
}

// 3. TICKET DETAIL VIEW
function TicketDetailView({ ticket, currentUser, onUpdateTicket }) {
    const [updates, setUpdates] = useState([]);
    const [input, setInput] = useState('');
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveNote, setResolveNote] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase.from('ticket_updates').select('*').eq('ticket_id', ticket.id).order('created_at');
            setUpdates(data || []);
        };
        fetchMessages();
        const channel = supabase.channel(`ticket-${ticket.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_updates', filter: `ticket_id=eq.${ticket.id}` }, (payload) => {
            setUpdates(prev => [...prev, payload.new]);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }).subscribe();
        return () => supabase.removeChannel(channel);
    }, [ticket.id]);

    const sendMessage = async (text, type = 'COMMENT') => {
        if (!text) return;
        await supabase.from('ticket_updates').insert([{ ticket_id: ticket.id, user_name: currentUser.full_name, text, type, is_admin: currentUser.is_super_admin }]);
        setInput('');
    };

    return (
        <div className="h-full flex flex-col bg-white relative">
            {showResolveModal && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-8">
                    <div className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-2">Resolve Ticket</h3>
                        <textarea className="w-full px-3 py-2 text-sm border rounded-lg h-32 mb-4" placeholder="Resolution notes..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
                        <div className="flex gap-3"><button onClick={() => setShowResolveModal(false)} className="flex-1 px-4 py-2 rounded-lg border">Cancel</button><button onClick={() => { onUpdateTicket({ ...ticket, status: 'Resolved' }); sendMessage(`Resolved: ${resolveNote}`, "SYSTEM"); setShowResolveModal(false); }} className="flex-1 px-4 py-2 rounded-lg bg-zinc-900 text-white">Confirm</button></div>
                    </div>
                </div>
            )}
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-start bg-white z-10">
                <div><h1 className="text-xl font-bold mb-2">{ticket.subject}</h1><div className="flex items-center gap-4 text-xs text-zinc-500"><User size={14}/> {ticket.requester_email} <MapPin size={14} className="ml-2"/> {ticket.location}</div></div>
                <div className="flex gap-2">
                    {ticket.status === 'Resolved' ? <button onClick={() => { onUpdateTicket({ ...ticket, status: 'Open' }); sendMessage("Reopened", "SYSTEM"); }} className="px-4 py-2 border rounded-lg text-xs font-bold">Reopen</button> : <><button onClick={() => { onUpdateTicket({ ...ticket, assigned_to: currentUser.full_name, status: 'In Progress' }); sendMessage(`Assigned to ${currentUser.full_name}`, "SYSTEM"); }} className="px-4 py-2 border rounded-lg text-xs font-bold">Assign Me</button><button onClick={() => setShowResolveModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold">Resolve</button></>}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50">
                {updates.map(u => (
                    <div key={u.id} className={`flex w-full ${u.type === 'SYSTEM' ? 'justify-center' : ''}`}>
                        {u.type === 'SYSTEM' ? <div className="bg-zinc-200 text-zinc-600 px-3 py-1 rounded-full text-[10px] font-bold">{u.text}</div> : 
                        <div className={`flex gap-4 max-w-2xl ${u.is_admin ? 'ml-auto flex-row-reverse' : ''}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.is_admin ? 'bg-zinc-900' : 'bg-indigo-600'}`}>{u.user_name.charAt(0)}</div><div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${u.is_admin ? 'bg-white' : 'bg-white'}`}>{u.text}</div></div>}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            {ticket.status !== 'Resolved' && <div className="p-4 bg-white border-t"><form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-zinc-50 border rounded-xl px-4 py-3 text-sm" placeholder="Reply..." /><button type="submit" className="p-3 bg-zinc-900 text-white rounded-xl"><Send size={18}/></button></form></div>}
        </div>
    );
}

// 4. USER DIRECTORY (With Backup Add)
function UserDirectory({ users, currentUser, schools, departments, onUpdateUser, onAddUser }) {
    const [editingUser, setEditingUser] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newUser, setNewUser] = useState({});

    return (
        <div className="p-8 h-full overflow-y-auto bg-white">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Account Management</h2>
                <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Add Backup User</button>
            </div>
            
            {/* ADD USER MODAL */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96">
                        <h3 className="font-bold mb-4">Add User (Manual)</h3>
                        <input className="w-full border p-2 rounded mb-2" placeholder="Full Name" onChange={e => setNewUser({...newUser, name: e.target.value})} />
                        <input className="w-full border p-2 rounded mb-2" placeholder="Email" onChange={e => setNewUser({...newUser, email: e.target.value})} />
                        <select className="w-full border p-2 rounded mb-4" onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="Staff">Staff</option><option value="Admin">Delegated Admin</option></select>
                        <div className="flex gap-2"><button onClick={() => setIsAdding(false)} className="flex-1 border p-2 rounded">Cancel</button><button onClick={() => { onAddUser(newUser); setIsAdding(false); }} className="flex-1 bg-indigo-600 text-white p-2 rounded">Add</button></div>
                    </div>
                </div>
            )}

            <table className="w-full text-left text-sm border rounded-lg">
                <thead className="bg-zinc-50 border-b"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">School</th><th className="px-6 py-3 text-right">Edit</th></tr></thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-zinc-50 border-b">
                            <td className="px-6 py-4 font-bold">{u.full_name}<div className="text-xs font-normal text-zinc-500">{u.email}</div></td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.is_super_admin ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100'}`}>{u.is_super_admin ? 'Prime Admin' : u.role}</span></td>
                            <td className="px-6 py-4">{u.school}</td>
                            <td className="px-6 py-4 text-right"><button onClick={() => setEditingUser(u)} className="text-zinc-400 hover:text-black"><Edit3 size={16}/></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {editingUser && <UserEditModal user={editingUser} schools={schools} departments={departments} onClose={() => setEditingUser(null)} onSave={(u) => { onUpdateUser(u); setEditingUser(null); }} />}
        </div>
    );
}

// 5. RESTORED COMPLEX EDIT MODAL (Geographics + Scopes)
function UserEditModal({ user, schools, departments, onClose, onSave }) {
    const [formData, setFormData] = useState({ ...user, access_schools: user.access_schools || [user.school], access_scopes: user.access_scopes || [] });

    const toggleArray = (field, value) => {
        let current = formData[field] || [];
        if (value === 'ALL') current = current.includes('ALL') ? [] : ['ALL'];
        else {
            if (current.includes(value)) current = current.filter(x => x !== value);
            else current = [...current, value];
        }
        setFormData({ ...formData, [field]: current });
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between"><h3 className="font-bold">Edit Permissions</h3><button onClick={onClose}><X size={18}/></button></div>
                <div className="p-6 flex gap-8">
                    <div className="flex-1 space-y-4">
                        <div><label className="text-xs font-bold text-zinc-500">Name</label><input disabled value={formData.full_name} className="w-full border p-2 rounded bg-zinc-50"/></div>
                        <div><label className="text-xs font-bold text-zinc-500">Role</label><select value={formData.is_super_admin ? 'Super Admin' : formData.role} onChange={e => setFormData({...formData, role: e.target.value, is_super_admin: e.target.value === 'Super Admin'})} className="w-full border p-2 rounded"><option value="Staff">Staff (Read Only)</option><option value="Admin">Delegated Admin</option><option value="Super Admin">Prime Admin</option></select></div>
                    </div>
                    <div className="flex-1 space-y-4 border-l pl-8">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 block mb-2">Geographic Access (Schools)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => toggleArray('access_schools', 'ALL')} className={`text-xs border p-2 rounded ${formData.access_schools.includes('ALL') ? 'bg-zinc-800 text-white' : ''}`}>Global</button>
                                {schools.map(s => <button key={s} onClick={() => toggleArray('access_schools', s)} className={`text-xs border p-2 rounded ${formData.access_schools.includes(s) ? 'bg-zinc-800 text-white' : ''}`}>{s}</button>)}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 block mb-2">Department Scope</label>
                            <div className="flex flex-wrap gap-2">
                                {departments.map(d => <button key={d.name} onClick={() => toggleArray('access_scopes', d.name)} className={`text-xs border p-2 rounded ${formData.access_scopes?.includes(d.name) ? 'bg-zinc-800 text-white' : ''}`}>{d.name}</button>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button><button onClick={() => onSave(formData)} className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button></div>
            </div>
        </div>
    );
}

// 6. SETTINGS MANAGER (With Email Routing)
function SettingsManager({ schools, departments, onAdd, onRemove, keywords }) {
    const [input, setInput] = useState('');
    const [email, setEmail] = useState('');
    const [type, setType] = useState('SCHOOL');

    return (
        <div className="p-8 bg-zinc-50 min-h-full">
            <h2 className="text-2xl font-bold mb-6">System Configuration</h2>
            <div className="grid grid-cols-2 gap-8">
                <div className="col-span-2 bg-white p-6 rounded-xl border flex gap-4 items-end">
                    <div className="flex-1"><label className="text-xs font-bold text-zinc-500">Type</label><select value={type} onChange={e => setType(e.target.value)} className="w-full border p-2 rounded"><option value="SCHOOL">School</option><option value="DEPARTMENT">Department</option></select></div>
                    <div className="flex-1"><label className="text-xs font-bold text-zinc-500">Name</label><input value={input} onChange={e => setInput(e.target.value)} className="w-full border p-2 rounded" placeholder="Name..." /></div>
                    {type === 'DEPARTMENT' && <div className="flex-1"><label className="text-xs font-bold text-zinc-500">Notification Email</label><input value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" placeholder="dept@school.edu" /></div>}
                    <button onClick={() => { onAdd(type, input, { email }); setInput(''); setEmail(''); }} className="bg-zinc-900 text-white px-6 py-2 rounded font-bold">Add</button>
                </div>
                {/* Lists */}
                <div className="bg-white rounded-xl border p-4">
                    <h4 className="font-bold mb-4">Schools</h4>
                    {schools.map(s => <div key={s} className="flex justify-between p-2 border-b">{s} <button onClick={() => onRemove(s)}><Trash2 size={14}/></button></div>)}
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <h4 className="font-bold mb-4">Departments & Emails</h4>
                    {departments.map(d => (
                        <div key={d.name} className="flex justify-between p-2 border-b">
                            <div><span className="font-bold block">{d.name}</span><span className="text-xs text-zinc-500">{d.config?.email || 'No email set'}</span></div>
                            <button onClick={() => onRemove(d.name)}><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
                <div className="col-span-2 bg-white rounded-xl border p-4">
                    <h4 className="font-bold mb-4">Routing Logic (Keyword Engine)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(keywords).map(([cat, cfg]) => (
                            <div key={cat} className="border p-3 rounded bg-zinc-50">
                                <div className="font-bold text-sm mb-1">{cat}</div>
                                <div className="text-xs text-zinc-500 mb-2">Routes to: {cfg.owner}</div>
                                <div className="flex flex-wrap gap-1">{cfg.keywords.map(k => <span key={k} className="bg-white border px-1 rounded text-[10px]">{k}</span>)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
