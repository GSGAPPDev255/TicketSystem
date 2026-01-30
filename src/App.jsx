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

function ChatInterface({ onTicketCreate, categorizer, currentUser }) {
    const [messages, setMessages] = useState([{ id: 1, sender: 'bot', text: `Hello ${currentUser.full_name.split(' ')[0]}. Describe your issue, and I'll route it correctly.` }]);
    const [input, setInput] = useState('');
    const [step, setStep] = useState('ISSUE'); // ISSUE -> DETAILS -> CONFIRM
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
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `I've flagged this as a **${cat.category}** issue. Please provide the Room Number or specific device.` }]);
            } else if (step === 'DETAILS') {
                setTicketDraft(prev => ({ ...prev, location: text }));
                // Auto-submit
                const finalTicket = { ...ticketDraft, location: text, priority: 'Medium', status: 'Open', school: currentUser.school };
                onTicketCreate(finalTicket);
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "Ticket created successfully! Ref #T-" + Math.floor(Math.random()*1000) }]);
                setStep('ISSUE');
            }
        }, 600);
        setInput('');
    };

    return (
        <div className="h-full flex flex-col justify-center items-center">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-zinc-200 h-[80vh] flex flex-col overflow-hidden">
                <div className="bg-zinc-900 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="font-bold">IT Support Assistant</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none shadow-sm'}`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                <div className="p-4 bg-white border-t border-zinc-200">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
                        <input className="flex-1 bg-zinc-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-600" placeholder="Type here..." value={input} onChange={e => setInput(e.target.value)} autoFocus />
                        <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700"><Send size={18}/></button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function AdminDashboard({ tickets, users, currentUser, schools, departments, onUpdateUser, onAddSetting, onRemoveSetting, onUpdateTicket }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-200 px-6 py-3 flex gap-4">
                {['queue', 'directory', 'settings'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`text-xs font-bold uppercase tracking-wider px-2 py-1 ${activeTab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-500'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'queue' && (
                    <div className="h-full flex">
                        <div className="w-[350px] border-r border-zinc-200 overflow-y-auto bg-zinc-50">
                            {tickets.map(t => (
                                <div key={t.id} onClick={() => setSelectedTicket(t)} className={`p-4 border-b border-zinc-100 cursor-pointer hover:bg-white transition-colors ${selectedTicket?.id === t.id ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm' : ''}`}>
                                    <div className="flex justify-between mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}>{t.status}</span>
                                        <span className="text-[10px] text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-zinc-800 line-clamp-1">{t.subject}</h4>
                                    <div className="text-xs text-zinc-500 mt-1">{t.requester_email}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1">
                            {selectedTicket ? (
                                <TicketDetailView ticket={selectedTicket} currentUser={currentUser} onUpdateTicket={onUpdateTicket} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-400">Select a ticket</div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'directory' && (
                    <UserDirectory users={users} currentUser={currentUser} schools={schools} departments={departments} onUpdateUser={onUpdateUser} />
                )}

                {activeTab === 'settings' && currentUser.is_super_admin && (
                    <SettingsManager schools={schools} departments={departments} onAdd={onAddSetting} onRemove={onRemoveSetting} />
                )}
            </div>
        </div>
    );
}

// --- TICKET DETAIL WITH REALTIME CHAT & QUICK ACTIONS ---
function TicketDetailView({ ticket, currentUser, onUpdateTicket }) {
    const [updates, setUpdates] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false); // Placeholder for typing logic
    const messagesEndRef = useRef(null);

    // REALTIME: Fetch & Subscribe to messages for THIS ticket
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

    const quickActions = [
        { label: "Take Ownership", action: () => onUpdateTicket({ ...ticket, assigned_to: currentUser.full_name, status: 'In Progress' }) },
        { label: "Mark In Progress", action: () => { onUpdateTicket({ ...ticket, status: 'In Progress' }); sendMessage("Status changed to: In Progress", "SYSTEM"); } },
        { label: "Close Ticket", action: () => { onUpdateTicket({ ...ticket, status: 'Resolved' }); sendMessage("Ticket Resolved", "SYSTEM"); } },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 bg-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900">{ticket.subject}</h2>
                        <div className="flex gap-4 mt-2 text-sm text-zinc-500">
                            <span className="flex items-center gap-1"><User size={14}/> {ticket.requester_email}</span>
                            <span className="flex items-center gap-1"><MapPin size={14}/> {ticket.location}</span>
                            <span className="bg-zinc-100 px-2 rounded text-zinc-700 text-xs font-bold border border-zinc-200">{ticket.status}</span>
                        </div>
                    </div>
                    {/* QUICK ACTIONS BAR */}
                    <div className="flex gap-2">
                        {quickActions.map((qa, i) => (
                            <button key={i} onClick={qa.action} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-200 transition-colors">
                                {qa.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 space-y-4">
                {updates.map(u => (
                    <div key={u.id} className={`flex gap-3 ${u.type === 'SYSTEM' ? 'justify-center' : ''}`}>
                        {u.type === 'SYSTEM' ? (
                            <span className="text-[10px] bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">{u.text}</span>
                        ) : (
                            <>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${u.is_admin ? 'bg-zinc-900' : 'bg-indigo-600'}`}>{u.user_name.charAt(0)}</div>
                                <div>
                                    <div className="text-xs font-bold text-zinc-700 mb-1">{u.user_name} <span className="text-zinc-400 font-normal ml-2">{new Date(u.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                    <div className="bg-white border border-zinc-200 p-3 rounded-lg text-sm text-zinc-800 shadow-sm max-w-lg">{u.text}</div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-zinc-200">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2 relative">
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Reply to ticket..." className="flex-1 pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none" />
                    <button type="submit" className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Send size={16}/></button>
                </form>
            </div>
        </div>
    );
}

function UserDirectory({ users, currentUser, schools, departments, onUpdateUser }) {
    const [editingUser, setEditingUser] = useState(null);

    const handleSave = () => {
        onUpdateUser(editingUser);
        setEditingUser(null);
    };

    return (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">User Directory</h2>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-xs">
                        <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">School</th><th className="px-6 py-4 text-right">Edit</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-zinc-50">
                                <td className="px-6 py-4 font-bold text-zinc-800">{u.full_name}<div className="text-xs font-normal text-zinc-500">{u.email}</div></td>
                                <td className="px-6 py-4">{u.role}</td>
                                <td className="px-6 py-4"><span className="bg-zinc-100 px-2 py-1 rounded text-xs font-bold border border-zinc-200">{u.school}</span></td>
                                <td className="px-6 py-4 text-right">
                                    {currentUser.is_super_admin && <button onClick={() => setEditingUser(u)} className="text-zinc-400 hover:text-indigo-600"><Edit3 size={16}/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4">Edit User</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-zinc-500">Role</label><select className="w-full border p-2 rounded" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}><option>Staff</option><option>Admin</option><option>Super Admin</option></select></div>
                            <div><label className="text-xs font-bold text-zinc-500">School</label><select className="w-full border p-2 rounded" value={editingUser.school} onChange={e => setEditingUser({...editingUser, school: e.target.value})}>{schools.map(s => <option key={s}>{s}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-zinc-500">Department</label><select className="w-full border p-2 rounded" value={editingUser.department} onChange={e => setEditingUser({...editingUser, department: e.target.value})}>{departments.map(d => <option key={d}>{d}</option>)}</select></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-zinc-500 hover:bg-zinc-100 rounded">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SettingsManager({ schools, departments, onAdd, onRemove }) {
    const [input, setInput] = useState('');
    const [type, setType] = useState('SCHOOL');

    return (
        <div className="p-8">
            <h2 className="text-xl font-bold mb-6">System Settings</h2>
            <div className="bg-white p-6 rounded-xl border border-zinc-200 max-w-2xl">
                <div className="flex gap-2 mb-6">
                    <select value={type} onChange={e => setType(e.target.value)} className="border border-zinc-300 rounded-lg px-3 py-2 text-sm"><option value="SCHOOL">School</option><option value="DEPARTMENT">Department</option></select>
                    <input value={input} onChange={e => setInput(e.target.value)} placeholder="Name..." className="flex-1 border border-zinc-300 rounded-lg px-3 py-2 text-sm" />
                    <button onClick={() => { onAdd(type, input); setInput(''); }} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Schools</h4>
                        <div className="space-y-2">{schools.map(s => <div key={s} className="flex justify-between items-center p-2 bg-zinc-50 rounded border border-zinc-200 text-sm">{s} <button onClick={() => onRemove(s)} className="text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button></div>)}</div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3">Departments</h4>
                        <div className="space-y-2">{departments.map(d => <div key={d} className="flex justify-between items-center p-2 bg-zinc-50 rounded border border-zinc-200 text-sm">{d} <button onClick={() => onRemove(d)} className="text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button></div>)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
