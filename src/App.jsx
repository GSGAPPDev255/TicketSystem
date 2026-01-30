import { useState, useEffect, useRef, useMemo } from 'react';
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
// Keeps you on the same tab after refresh
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

// --- MAIN APPLICATION ---
export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);
    
    // PERSISTENCE: Remember where the user was
    const [view, setView] = usePersistedState('app_view', 'chat');
    
    const [tickets, setTickets] = useState([]);
    const [notifications, setNotifications] = useState(0);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    
    // DYNAMIC SETTINGS (No more mock data)
    const [schools, setSchools] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [keywords, setKeywords] = useState({}); 
    const [kbArticles, setKbArticles] = useState([]);

    // --- INITIAL DATA FETCH ---
    const fetchSystemData = async () => {
        // 1. Fetch Organization Settings (Schools/Depts)
        const { data: settings } = await supabase.from('organization_settings').select('*');
        if (settings) {
            setSchools(settings.filter(s => s.type === 'SCHOOL').map(s => s.name));
            setDepartments(settings.filter(s => s.type === 'DEPARTMENT').map(s => s.name));
        }

        // 2. Fetch Users & Tickets
        const { data: allUsers } = await supabase.from('users').select('*').order('full_name');
        const { data: allTickets } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        
        setUsers(allUsers || []);
        setTickets(allTickets || []);
    };

    // --- AUTH & JIT LOGIC ---
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
                // JIT: Auto-create trusted Azure users
                const domain = email.split('@')[1];
                let assignedSchool = 'HQ'; // Default fallback
                
                // Simple domain matching (Expand as needed)
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

            // Load App Data
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
        const channel = supabase.channel('main-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                supabase.from('tickets').select('*').order('created_at', { ascending: false }).then(({ data }) => setTickets(data));
                setNotifications(prev => prev + 1);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                supabase.from('users').select('*').order('full_name').then(({ data }) => setUsers(data));
            })
            .subscribe();
    };

    // --- ACTIONS ---
    const handleLogin = async () => {
        setIsLoginLoading(true);
        await supabase.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: window.location.origin } });
    };

    const handleNewTicket = async (ticket) => {
        await supabase.from('tickets').insert([{
            subject: ticket.subject, category: ticket.category, priority: ticket.priority, status: ticket.status, 
            school: ticket.school, location: ticket.location, context_data: ticket.context, 
            is_sensitive: ticket.isSensitive, requester_email: currentUser.email
        }]);
    };

    const handleUpdateUser = async (updatedUser) => {
        // FIX: Actually update the database
        const { error } = await supabase.from('users').update({
            role: updatedUser.role,
            department: updatedUser.department,
            school: updatedUser.school,
            access_schools: updatedUser.access_schools,
            is_super_admin: updatedUser.is_super_admin
        }).eq('id', updatedUser.id);
        
        if (error) alert("Failed to update user: " + error.message);
        else fetchSystemData(); // Refresh local state
    };

    const handleAddSetting = async (type, name) => {
        await supabase.from('organization_settings').insert([{ type, name }]);
        fetchSystemData();
    };

    const handleRemoveSetting = async (name) => {
        await supabase.from('organization_settings').delete().eq('name', name);
        fetchSystemData();
    };

    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} loading={isLoginLoading} error={loginError} />;
    if (!currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

    return (
        <div className="min-h-screen flex flex-col font-sans text-zinc-900 bg-zinc-50">
            {/* NAVBAR: Cleaned up - No more Persona Switcher */}
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
                        // Mock categorizer for now, replace with AI logic later if needed
                        categorizer={(text) => ({ category: 'General', owner: 'IT', isSensitive: false })} 
                        currentUser={currentUser} 
                        kbArticles={kbArticles} 
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
                        // Pass update handler for tickets
                        onUpdateTicket={async (t) => {
                             await supabase.from('tickets').update({ status: t.status, assigned_to: t.assigned_to }).eq('id', t.id);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

// 1. CHAT INTERFACE (The "User" view when creating tickets)
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
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "Ticket created! An agent will be with you shortly." }]);
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

// 2. ADMIN DASHBOARD (The "Agent" view)
function AdminDashboard({ tickets, users, currentUser, schools, departments, onUpdateUser, onAddSetting, onRemoveSetting, onUpdateTicket }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');

    // SECURITY: Only Super Admins see Directory & Settings
    const tabs = [{ id: 'queue', label: 'Queue' }];
    if (currentUser.is_super_admin) {
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

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'queue' && (
                    <div className="h-full flex">
                        {/* Ticket List (Left Sidebar) */}
                        <div className="w-[380px] border-r border-zinc-200 overflow-y-auto bg-white flex flex-col">
                            {tickets.length === 0 ? (
                                <div className="p-10 text-center text-zinc-400 text-sm">No tickets found.</div>
                            ) : (
                                tickets.map(t => (
                                    <div key={t.id} onClick={() => setSelectedTicket(t)} className={`p-4 border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-all ${selectedTicket?.id === t.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-bold line-clamp-1 ${selectedTicket?.id === t.id ? 'text-indigo-900' : 'text-zinc-800'}`}>{t.subject}</h4>
                                            {t.status === 'Open' && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5"></span>}
                                        </div>
                                        <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{t.context_data || 'No details provided'}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-medium">{t.school}</span>
                                                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-medium">{t.category}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Ticket Detail (Right Main) */}
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

// 3. POLISHED TICKET DETAIL (Modern Chat UI)
function TicketDetailView({ ticket, currentUser, onUpdateTicket }) {
    const [updates, setUpdates] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Realtime fetch logic (Same as before, just kept for completeness)
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

    const handleAssignMe = async () => {
        const updated = { ...ticket, assigned_to: currentUser.full_name, status: 'In Progress' };
        await onUpdateTicket(updated); // Sync to parent/DB
        sendMessage(`Ticket assigned to ${currentUser.full_name}`, "SYSTEM");
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header: Meta Data */}
            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-start bg-white z-10">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 mb-2">{ticket.subject}</h1>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 font-medium">
                        <span className="flex items-center gap-1.5"><User size={14} className="text-zinc-400"/> {ticket.requester_email}</span>
                        <span className="w-px h-3 bg-zinc-200"></span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} className="text-zinc-400"/> {ticket.location}</span>
                        <span className="w-px h-3 bg-zinc-200"></span>
                        <span className={`px-2 py-0.5 rounded-full ${ticket.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{ticket.priority} Priority</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {ticket.status !== 'Resolved' && (
                        <>
                            {!ticket.assigned_to && (
                                <button onClick={handleAssignMe} className="px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2">
                                    <UserPlus size={14}/> Assign Me
                                </button>
                            )}
                            <button onClick={() => { onUpdateTicket({ ...ticket, status: 'Resolved' }); sendMessage("Ticket Resolved", "SYSTEM"); }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2">
                                <CheckCircle size={14}/> Resolve
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Chat Stream */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50">
                <div className="flex justify-center"><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Start of Ticket</span></div>
                {updates.map(u => (
                    <div key={u.id} className={`flex w-full ${u.type === 'SYSTEM' ? 'justify-center my-4' : ''}`}>
                        {u.type === 'SYSTEM' ? (
                            <div className="bg-zinc-200/50 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-bold border border-zinc-200 flex items-center gap-2">
                                <Activity size={10}/> {u.text} <span className="font-normal opacity-50">• {new Date(u.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
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
            {ticket.status !== 'Resolved' ? (
                <div className="p-4 bg-white border-t border-zinc-200">
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="max-w-4xl mx-auto relative flex items-center gap-2">
                        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type an internal note or reply..." className="flex-1 bg-zinc-50 hover:bg-zinc-100 focus:bg-white border border-zinc-200 focus:border-indigo-600 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none" />
                        <button type="submit" className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-black transition-transform active:scale-95 shadow-sm"><Send size={18}/></button>
                    </form>
                </div>
            ) : (
                <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    This ticket is resolved
                </div>
            )}
        </div>
    );
}

// 4. USER DIRECTORY & COMPLEX EDIT MODAL (Restored)
function UserDirectory({ users, currentUser, schools, departments, onUpdateUser }) {
    const [editingUser, setEditingUser] = useState(null);

    const handleSave = (updatedData) => {
        onUpdateUser(updatedData);
        setEditingUser(null);
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-zinc-900">User Directory</h2>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50/50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-xs">
                        <tr><th className="px-6 py-4">Identity</th><th className="px-6 py-4">Access Level</th><th className="px-6 py-4">Location</th><th className="px-6 py-4 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-zinc-900">{u.full_name}</div>
                                    <div className="text-xs text-zinc-500">{u.email}</div>
                                </td>
                                <td className="px-6 py-4"><span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${u.is_super_admin ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>{u.is_super_admin ? 'Super Admin' : u.role}</span></td>
                                <td className="px-6 py-4">{u.school}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setEditingUser(u)} className="text-zinc-400 hover:text-indigo-600 p-2 rounded hover:bg-indigo-50 transition-all"><Edit3 size={16}/></button>
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

// 5. THE RESTORED "COMPLEX" MODAL
function UserEditModal({ user, schools, departments, onClose, onSave }) {
    const [formData, setFormData] = useState({ 
        ...user, 
        access_schools: user.access_schools || [user.school], 
        // access_scopes logic can be added here if needed
    });

    const toggleSchoolAccess = (s) => {
        if (formData.is_super_admin) return; // Super admin has all access
        let current = formData.access_schools || [];
        if (s === 'ALL') {
             // Toggle Global
             current = current.includes('ALL') ? [formData.school] : ['ALL'];
        } else {
            // Toggle Specific
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-zinc-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <h3 className="font-bold text-zinc-900 text-lg">Edit User Profile</h3>
                    <button onClick={onClose}><X size={20} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                
                <div className="p-6 flex gap-8">
                    {/* Left Column: Basics */}
                    <div className="flex-1 space-y-4">
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Full Name</label><input disabled className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-500 cursor-not-allowed" value={formData.full_name} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Role Title</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option>Staff</option><option>Admin</option><option>Manager</option></select></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Department</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>{departments.map(d => <option key={d}>{d}</option>)}</select></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Primary Campus</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value, access_schools: [e.target.value]})}>{schools.map(s => <option key={s}>{s}</option>)}</select></div>
                    </div>

                    {/* Right Column: Advanced Access */}
                    <div className="flex-1 space-y-6 border-l border-zinc-100 pl-8">
                        <div className={`p-4 rounded-xl border transition-all ${formData.is_super_admin ? 'bg-purple-50 border-purple-200' : 'bg-zinc-50 border-zinc-200'}`}>
                            <label className="flex items-center gap-2 cursor-pointer mb-1">
                                <input type="checkbox" checked={formData.is_super_admin} onChange={e => setFormData({...formData, is_super_admin: e.target.checked, access_schools: e.target.checked ? ['ALL'] : [formData.school]})} className="rounded text-purple-600 focus:ring-purple-600" />
                                <span className={`text-sm font-bold ${formData.is_super_admin ? 'text-purple-900' : 'text-zinc-700'}`}>Super Admin</span>
                            </label>
                            <p className="text-[10px] text-zinc-500 leading-tight">Full access to all schools, settings, and the entire user directory.</p>
                        </div>

                        <div className={formData.is_super_admin ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Geographic Access</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => toggleSchoolAccess('ALL')} className={`p-2 rounded text-[10px] font-bold border transition-all flex justify-between items-center ${formData.access_schools?.includes('ALL') ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}>
                                    Global {formData.access_schools?.includes('ALL') && <CheckCircle size={10}/>}
                                </button>
                                {schools.map(s => (
                                    <button key={s} onClick={() => toggleSchoolAccess(s)} disabled={formData.access_schools?.includes('ALL')} className={`p-2 rounded text-[10px] font-bold border transition-all text-left truncate ${s === formData.school ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : (formData.access_schools?.includes(s) ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400')}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-zinc-600 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 shadow-sm transition-colors">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

// 6. SETTINGS MANAGER (Simple List)
function SettingsManager({ schools, departments, onAdd, onRemove }) {
    const [input, setInput] = useState('');
    const [type, setType] = useState('SCHOOL');

    return (
        <div className="p-8">
            <h2 className="text-xl font-bold mb-6 text-zinc-900">System Settings</h2>
            <div className="bg-white p-6 rounded-xl border border-zinc-200 max-w-2xl shadow-sm">
                <div className="flex gap-2 mb-8">
                    <select value={type} onChange={e => setType(e.target.value)} className="border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-zinc-50 font-bold text-zinc-700"><option value="SCHOOL">School</option><option value="DEPARTMENT">Department</option></select>
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter name..." className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => { onAdd(type, input); setInput(''); }} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Add</button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2"><School size={14}/> Schools</h4>
                        <div className="space-y-2">{schools.map(s => <div key={s} className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 group">{s} <button onClick={() => onRemove(s)} className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button></div>)}</div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2"><Layers size={14}/> Departments</h4>
                        <div className="space-y-2">{departments.map(d => <div key={d} className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 group">{d} <button onClick={() => onRemove(d)} className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button></div>)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
