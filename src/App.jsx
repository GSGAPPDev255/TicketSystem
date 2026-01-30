import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, School, 
  MoreHorizontal, Command, LogOut, Zap, Crown, ArrowRight, Loader2
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

// --- MAIN APPLICATION LOGIC ---
export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);
    
    // View Persistence
    const [view, setView] = usePersistedState('app_view', 'chat');
    
    const [tickets, setTickets] = useState([]);
    const [notifications, setNotifications] = useState(0);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    
    // Dynamic Settings
    const [schools, setSchools] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [kbArticles, setKbArticles] = useState([]);

    // --- DATA FETCHING ---
    const fetchSystemData = async () => {
        // 1. Settings
        const { data: settings } = await supabase.from('organization_settings').select('*');
        if (settings) {
            setSchools(settings.filter(s => s.type === 'SCHOOL').map(s => s.name));
            setDepartments(settings.filter(s => s.type === 'DEPARTMENT').map(s => s.name));
        }
        // 2. Users & Tickets
        const { data: allUsers } = await supabase.from('users').select('*').order('full_name');
        const { data: allTickets } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        
        setUsers(allUsers || []);
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
            
            if (!userData) {
                // JIT Creation
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
            setupRealtimeSubscriptions();

        } catch (err) {
            console.error("Auth Failed:", err);
            setLoginError("Login failed. Check permissions.");
            await supabase.auth.signOut();
        } finally {
            setIsLoginLoading(false);
        }
    };

    const setupRealtimeSubscriptions = () => {
        supabase.channel('main-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                supabase.from('tickets').select('*').order('created_at', { ascending: false }).then(({ data }) => setTickets(data));
                setNotifications(prev => prev + 1);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                supabase.from('users').select('*').order('full_name').then(({ data }) => setUsers(data));
            })
            .subscribe();
    };

    const handleLogin = async () => {
        setIsLoginLoading(true);
        await supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: window.location.origin } });
    };

    // --- TICKET LOGIC (Optimistic UI) ---
    const handleNewTicket = async (ticket) => {
        // Show immediately in local state
        const optimisticTicket = { 
            ...ticket, 
            id: `temp-${Date.now()}`, 
            created_at: new Date().toISOString(),
            status: 'Open',
            requester_email: currentUser.email
        };
        setTickets(prev => [optimisticTicket, ...prev]);

        // Persist to DB
        await supabase.from('tickets').insert([{
            subject: ticket.subject, category: ticket.category, priority: ticket.priority, status: ticket.status, 
            school: ticket.school, location: ticket.location, context_data: ticket.context, 
            is_sensitive: ticket.isSensitive, requester_email: currentUser.email
        }]);
    };

    const handleUpdateUser = async (updatedUser) => {
        const { error } = await supabase.from('users').update({
            role: updatedUser.role,
            department: updatedUser.department,
            school: updatedUser.school,
            access_schools: updatedUser.access_schools,
            is_super_admin: updatedUser.is_super_admin
        }).eq('id', updatedUser.id);
        
        if (error) alert("Update failed: " + error.message);
        else fetchSystemData();
    };

    const handleAddSetting = async (type, name) => {
        await supabase.from('organization_settings').insert([{ type, name }]);
        fetchSystemData();
    };

    const handleRemoveSetting = async (name) => {
        await supabase.from('organization_settings').delete().eq('name', name);
        fetchSystemData();
    };

    const handleUpdateTicket = async (t) => {
        // Optimistic local update
        setTickets(prev => prev.map(tick => tick.id === t.id ? t : tick));
        // DB Update
        await supabase.from('tickets').update({ 
            status: t.status, 
            assigned_to: t.assigned_to 
        }).eq('id', t.id);
    };

    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} loading={isLoginLoading} error={loginError} />;
    if (!currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

    return (
        <div className="min-h-screen flex flex-col font-sans text-zinc-900 bg-zinc-50">
            {/* NAVBAR */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-bold text-sm tracking-tight block text-zinc-800">CorpTicket</span>
                        <span className="text-[10px] font-semibold text-zinc-400 tracking-wider">ENTERPRISE</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                        <button onClick={() => setView('chat')} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <MessageSquare size={14} /> Helpdesk
                        </button>
                        <button onClick={() => { setView('admin'); setNotifications(0); }} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <div className="relative">
                                <LayoutDashboard size={14} />
                                {notifications > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-3 h-3 flex items-center justify-center rounded-full">{notifications}</span>}
                            </div>
                            {currentUser.is_super_admin ? 'Admin Console' : 'My Dashboard'}
                        </button>
                    </div>
                    <div className="h-6 w-px bg-zinc-200 mx-2"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <div className="text-xs font-bold text-zinc-800">{currentUser.full_name}</div>
                            <div className="text-[10px] text-zinc-500">{currentUser.school} • {currentUser.role}</div>
                        </div>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentUser.is_super_admin ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                            {currentUser.avatar_code}
                        </div>
                        <button onClick={() => { setIsAuthenticated(false); supabase.auth.signOut(); }} className="text-zinc-400 hover:text-red-600 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="flex-1 overflow-hidden relative max-w-[1600px] mx-auto w-full p-6 h-[calc(100vh-80px)]">
                {view === 'chat' ? (
                    <ChatInterface 
                        onTicketCreate={handleNewTicket} 
                        // Simple Keyword Categorizer
                        categorizer={(text) => {
                            const t = text.toLowerCase();
                            if (t.includes('wifi') || t.includes('internet')) return { category: 'IT - Network', owner: 'IT' };
                            if (t.includes('projector') || t.includes('screen')) return { category: 'IT - AV', owner: 'IT' };
                            if (t.includes('chair') || t.includes('leak')) return { category: 'Facilities', owner: 'Site' };
                            return { category: 'General Support', owner: 'IT' };
                        }} 
                        currentUser={currentUser} 
                    />
                ) : (
                    <AdminDashboard 
                        tickets={tickets} 
                        users={users} 
                        currentUser={currentUser} 
                        schools={schools}
                        departments={departments}
                        onUpdateUser={handleUpdateUser}
                        onAddSetting={handleAddSetting}
                        onRemoveSetting={handleRemoveSetting}
                        onRefresh={fetchSystemData} // Triggers refresh on click
                        onUpdateTicket={handleUpdateTicket}
                    />
                )}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS (UI LAYER) ---

// 1. CHAT INTERFACE
function ChatInterface({ onTicketCreate, categorizer, currentUser }) {
    const [messages, setMessages] = useState([{ id: 1, sender: 'bot', text: `Hello ${currentUser.full_name.split(' ')[0]}. What seems to be the problem?` }]);
    const [input, setInput] = useState('');
    const [step, setStep] = useState('ISSUE'); 
    const [ticketDraft, setTicketDraft] = useState({});
    const chatEndRef = useRef(null);

    const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    const handleSend = (text) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
        
        setTimeout(() => {
            if (step === 'ISSUE') {
                const cat = categorizer(text);
                setTicketDraft({ subject: text, ...cat });
                setStep('DETAILS');
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `I've categorized this as **${cat.category}**. Which room or device is this for?` }]);
            } else if (step === 'DETAILS') {
                const finalTicket = { ...ticketDraft, location: text, priority: 'Medium', status: 'Open', school: currentUser.school };
                onTicketCreate(finalTicket);
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "Ticket created! Redirecting to dashboard..." }]);
                setStep('DONE');
            }
        }, 600);
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
                            <input className="flex-1 bg-zinc-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none transition-all" placeholder="Type your message..." value={input} onChange={e => setInput(e.target.value)} autoFocus />
                            <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-transform active:scale-95"><Send size={18}/></button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

// 2. ADMIN DASHBOARD
function AdminDashboard({ tickets, users, currentUser, schools, departments, onUpdateUser, onAddSetting, onRemoveSetting, onUpdateTicket, onRefresh }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');

    // AUTO-REFRESH on View Load
    useEffect(() => {
        if (onRefresh) onRefresh();
    }, []);

    const tabs = [{ id: 'queue', label: 'Dashboard' }];
    if (currentUser.is_super_admin) {
        tabs.push({ id: 'directory', label: 'Users & Privileges' });
        tabs.push({ id: 'settings', label: 'System Config' });
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
                            {tickets.length === 0 ? (
                                <div className="p-10 text-center text-zinc-400 text-sm">No tickets found.</div>
                            ) : (
                                tickets.map(t => (
                                    <div key={t.id} onClick={() => setSelectedTicket(t)} className={`p-4 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-all ${selectedTicket?.id === t.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-bold line-clamp-1 ${selectedTicket?.id === t.id ? 'text-indigo-900' : 'text-zinc-800'}`}>{t.subject}</h4>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${t.status === 'Open' ? 'bg-green-100 text-green-700' : t.status === 'Resolved' ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-100 text-blue-700'}`}>{t.status}</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{t.context_data || 'No details provided'}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-medium">{t.school}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex-1 bg-zinc-50/50">
                            {selectedTicket ? (
                                <TicketDetailView ticket={selectedTicket} currentUser={currentUser} onUpdateTicket={onUpdateTicket} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4"><MessageSquare size={24} className="opacity-20"/></div>
                                    <p className="text-sm font-medium">Select a ticket to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'directory' && currentUser.is_super_admin && (
                    <UserDirectory users={users} currentUser={currentUser} schools={schools} departments={departments} onUpdateUser={onUpdateUser} />
                )}

                {activeTab === 'settings' && currentUser.is_super_admin && (
                    <SettingsManager schools={schools} departments={departments} onAdd={onAddSetting} onRemove={onRemoveSetting} />
                )}
            </div>
        </div>
    );
}

// 3. TICKET DETAIL (Now with Reopen & Resolve Modal)
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
        const channel = supabase.channel(`ticket-${ticket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_updates', filter: `ticket_id=eq.${ticket.id}` }, (payload) => {
                setUpdates(prev => [...prev, payload.new]);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [ticket.id]);

    const sendMessage = async (text, type = 'COMMENT') => {
        if (!text) return;
        await supabase.from('ticket_updates').insert([{
            ticket_id: ticket.id, user_name: currentUser.full_name, text, type, is_admin: currentUser.is_super_admin
        }]);
        setInput('');
    };

    const confirmResolve = async () => {
        await onUpdateTicket({ ...ticket, status: 'Resolved' });
        await sendMessage(`Ticket Resolved: ${resolveNote || 'No remarks provided.'}`, "SYSTEM");
        setShowResolveModal(false);
        setResolveNote('');
    };

    const handleReopen = async () => {
        await onUpdateTicket({ ...ticket, status: 'Open' });
        await sendMessage("Ticket Reopened", "SYSTEM");
    };

    return (
        <div className="h-full flex flex-col bg-white relative">
            {/* RESOLVE MODAL */}
            {showResolveModal && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-enter">
                    <div className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-2 text-zinc-900">Resolve Ticket</h3>
                        <p className="text-xs text-zinc-500 mb-4">Add a closing note or solution summary.</p>
                        <textarea className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 h-32 mb-4 resize-none" 
                            placeholder="Solution details..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} autoFocus/>
                        <div className="flex gap-3">
                            <button onClick={() => setShowResolveModal(false)} className="flex-1 px-4 py-2 rounded-lg text-sm bg-white border border-zinc-200 hover:bg-zinc-50 font-medium">Cancel</button>
                            <button onClick={confirmResolve} className="flex-1 px-4 py-2 rounded-lg text-sm bg-zinc-900 text-white hover:bg-black font-bold shadow-sm">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-start bg-white z-10">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 mb-2">{ticket.subject}</h1>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                        <span className="flex items-center gap-1.5"><User size={14} className="text-zinc-400"/> {ticket.requester_email}</span>
                        <span className="w-px h-3 bg-zinc-200"></span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} className="text-zinc-400"/> {ticket.location}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {ticket.status === 'Resolved' ? (
                        <button onClick={handleReopen} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-200 flex items-center gap-2">
                            <History size={14}/> Reopen Ticket
                        </button>
                    ) : (
                        <>
                            {!ticket.assigned_to && (
                                <button onClick={() => { onUpdateTicket({ ...ticket, assigned_to: currentUser.full_name, status: 'In Progress' }); sendMessage(`Ticket assigned to ${currentUser.full_name}`, "SYSTEM"); }} className="px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2">
                                    <UserPlus size={14}/> Assign Me
                                </button>
                            )}
                            <button onClick={() => setShowResolveModal(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2">
                                <CheckCircle size={14}/> Resolve
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50">
                {updates.map(u => (
                    <div key={u.id} className={`flex w-full ${u.type === 'SYSTEM' ? 'justify-center my-4' : ''}`}>
                        {u.type === 'SYSTEM' ? (
                            <div className="bg-zinc-200/50 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-bold border border-zinc-200 flex items-center gap-2">
                                <Activity size={10}/> {u.text}
                            </div>
                        ) : (
                            <div className={`flex gap-4 max-w-2xl ${u.is_admin ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm ring-2 ring-white ${u.is_admin ? 'bg-zinc-900' : 'bg-indigo-600'}`}>
                                    {u.user_name.charAt(0)}
                                </div>
                                <div className={`flex flex-col ${u.is_admin ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1 px-1">
                                        <span className="text-xs font-bold text-zinc-900">{u.user_name}</span>
                                        <span className="text-[10px] text-zinc-400">{new Date(u.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed ${u.is_admin ? 'bg-white border border-zinc-200 text-zinc-800 rounded-tr-none' : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none'}`}>
                                        {u.text}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {ticket.status !== 'Resolved' && (
                <div className="p-4 bg-white border-t border-zinc-200">
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="max-w-4xl mx-auto relative flex items-center gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type an internal note or reply..." className="flex-1 bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-indigo-600 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none" />
                        <button type="submit" className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-black transition-transform active:scale-95 shadow-sm"><Send size={18}/></button>
                    </form>
                </div>
            )}
        </div>
    );
}

// 4. RUCKUS-STYLE USER DIRECTORY
function UserDirectory({ users, currentUser, schools, departments, onUpdateUser }) {
    const [editingUser, setEditingUser] = useState(null);

    const handleSave = (updatedData) => {
        onUpdateUser(updatedData);
        setEditingUser(null);
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900">Account Management</h2>
                    <p className="text-sm text-zinc-500 mt-1">Manage delegated admins and staff access</p>
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">Add User</button>
            </div>
            
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold text-xs">
                        <tr>
                            <th className="px-6 py-3 w-10"><input type="checkbox" className="rounded border-zinc-300"/></th>
                            <th className="px-6 py-3">Name / Email</th>
                            <th className="px-6 py-3">Authentication Type</th>
                            <th className="px-6 py-3">Privilege Group</th>
                            <th className="px-6 py-3 text-right">Settings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-zinc-50 group transition-colors">
                                <td className="px-6 py-4"><input type="checkbox" className="rounded border-zinc-300"/></td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-zinc-900">{u.full_name}</div>
                                    <div className="text-xs text-zinc-400">{u.email}</div>
                                </td>
                                <td className="px-6 py-4"><span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded">AZURE AD</span></td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${u.is_super_admin ? 'bg-orange-50 text-orange-700' : u.role === 'Admin' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600'}`}>
                                        {u.is_super_admin ? 'Prime Admin' : u.role === 'Admin' ? 'Delegated Admin' : 'Read Only'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setEditingUser(u)} className="text-zinc-400 hover:text-zinc-900"><Settings size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <UserEditModal 
                    user={editingUser} 
                    schools={schools} 
                    departments={departments} 
                    onClose={() => setEditingUser(null)} 
                    onSave={handleSave} 
                />
            )}
        </div>
    );
}

// 5. SETTINGS MANAGER (Pro Cards)
function SettingsManager({ schools, departments, onAdd, onRemove }) {
    const [input, setInput] = useState('');
    const [type, setType] = useState('SCHOOL');

    return (
        <div className="p-8 bg-zinc-50 min-h-full">
            <h2 className="text-2xl font-bold mb-6 text-zinc-900">System Configuration</h2>
            
            <div className="grid grid-cols-2 gap-8 max-w-5xl">
                {/* Input Card */}
                <div className="col-span-2 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-end gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Configuration Type</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm font-medium"><option value="SCHOOL">Campus / School</option><option value="DEPARTMENT">Operational Department</option></select>
                    </div>
                    <div className="flex-[2]">
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Display Name</label>
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="e.g. North High Campus..." className="w-full border border-zinc-300 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <button onClick={() => { onAdd(type, input); setInput(''); }} className="bg-zinc-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-black transition-transform active:scale-95">Add Entry</button>
                </div>

                {/* Schools List */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200 flex justify-between items-center">
                        <h4 className="font-bold text-zinc-700 text-sm flex items-center gap-2"><School size={16}/> Active Campuses</h4>
                        <span className="text-xs bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full font-bold">{schools.length}</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {schools.map(s => (
                            <div key={s} className="px-6 py-3 flex justify-between items-center hover:bg-zinc-50 group">
                                <span className="text-sm font-medium text-zinc-800">{s}</span>
                                <button onClick={() => onRemove(s)} className="text-zinc-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Departments List */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200 flex justify-between items-center">
                        <h4 className="font-bold text-zinc-700 text-sm flex items-center gap-2"><Layers size={16}/> Operational Units</h4>
                        <span className="text-xs bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full font-bold">{departments.length}</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {departments.map(d => (
                            <div key={d} className="px-6 py-3 flex justify-between items-center hover:bg-zinc-50 group">
                                <span className="text-sm font-medium text-zinc-800">{d}</span>
                                <button onClick={() => onRemove(d)} className="text-zinc-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 6. EDIT USER MODAL
function UserEditModal({ user, schools, departments, onClose, onSave }) {
    const [formData, setFormData] = useState({ ...user, access_schools: user.access_schools || [user.school] });

    const toggleSchoolAccess = (s) => {
        if (formData.is_super_admin) return;
        let current = formData.access_schools || [];
        if (s === 'ALL') {
             current = current.includes('ALL') ? [formData.school] : ['ALL'];
        } else {
            if (current.includes(s)) {
                if (s !== formData.school) current = current.filter(x => x !== s);
            } else {
                current = [...current, s];
            }
        }
        setFormData({ ...formData, access_schools: current });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-enter">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-zinc-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                    <h3 className="font-bold text-zinc-900">Edit User Privileges</h3>
                    <button onClick={onClose}><X size={20} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Privilege Group</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={formData.is_super_admin ? 'Super Admin' : formData.role} onChange={e => setFormData({...formData, role: e.target.value, is_super_admin: e.target.value === 'Super Admin'})}><option value="Staff">Read Only (Staff)</option><option value="Admin">Delegated Admin</option><option value="Super Admin">Prime Admin</option></select></div>
                    <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Primary Campus</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})}>{schools.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Department</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>{departments.map(d => <option key={d}>{d}</option>)}</select></div>
                </div>
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-zinc-600 hover:bg-zinc-200 rounded-lg text-sm font-medium">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Save Changes</button>
                </div>
            </div>
        </div>
    );
}
