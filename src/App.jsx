import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  MessageSquare, LayoutDashboard, User, Send, Briefcase, 
  X, Settings, Plus, Trash2, Edit3, CheckCircle, 
  MapPin, School, LogOut, Zap, ArrowRight, Loader2, 
  Mail, Bell, History, Activity, Lock
} from 'lucide-react';

// --- HELPER: MICROSOFT GRAPH EMAIL ---
const sendGraphEmail = async (providerToken, toEmail, subject, bodyContent) => {
    if (!providerToken) {
        console.error("No Microsoft Token found. Cannot send email.");
        return false;
    }

    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${providerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    subject: subject,
                    body: {
                        contentType: "HTML",
                        content: bodyContent
                    },
                    toRecipients: [
                        { emailAddress: { address: toEmail } }
                    ]
                },
                saveToSentItems: "true"
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Graph API Error:", error);
            throw new Error("Failed to send email via Microsoft Graph");
        }
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
};

// --- HELPER: PERSIST VIEW ---
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
                <p className="text-zinc-500 text-sm mb-8">Internal Operations Portal</p>
                {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center justify-center gap-2">{error}</div>}
                <button onClick={onLogin} disabled={loading} className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <>Sign In via SSO <ArrowRight size={16}/></>}
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
    
    // Data
    const [tickets, setTickets] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [sessionToken, setSessionToken] = useState(null); // STORE MICROSOFT TOKEN
    
    // Settings & Routing
    const [schools, setSchools] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [routingRules, setRoutingRules] = useState([]);
    const [toast, setToast] = useState(null);

    // --- FETCH SYSTEM DATA ---
    const fetchSystemData = async () => {
        // Settings
        const { data: settings } = await supabase.from('organization_settings').select('*');
        if (settings) {
            setSchools(settings.filter(s => s.type === 'SCHOOL').map(s => s.name));
            setDepartments(settings.filter(s => s.type === 'DEPARTMENT'));
        }
        // Routing Rules
        const { data: rules } = await supabase.from('routing_rules').select('*');
        setRoutingRules(rules || []);

        // Tickets & Users
        const { data: allUsers } = await supabase.from('users').select('*').order('full_name');
        const { data: allTickets } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
        
        setUsers(allUsers || []);
        setTickets(allTickets || []);
    };

    // --- AUTH ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => { 
            if (session?.user) handleUserAuth(session); 
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { 
            if (session?.user) handleUserAuth(session); 
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleUserAuth = async (session) => {
        setIsLoginLoading(true);
        const user = session.user;
        const email = user.email.toLowerCase();
        
        // SAVE TOKEN FOR GRAPH API
        if (session.provider_token) {
            setSessionToken(session.provider_token);
        }

        try {
            let { data: userData } = await supabase.from('users').select('*').ilike('email', email).single();
            if (!userData) {
                // JIT Auto-Create
                const domain = email.split('@')[1];
                let assignedSchool = 'HQ';
                if (domain.includes('kgps')) assignedSchool = 'KGPS';
                
                const { data: newUser } = await supabase.from('users').insert([{
                    full_name: user.user_metadata.full_name || email.split('@')[0],
                    email: email, role: 'Staff', department: 'General', school: assignedSchool, 
                    access_schools: [assignedSchool], avatar_code: (user.user_metadata.full_name || 'U').charAt(0).toUpperCase()
                }]).select().single();
                userData = newUser;
            }
            await fetchSystemData();
            setCurrentUser(userData);
            setIsAuthenticated(true);
            
            supabase.channel('app-db-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => { fetchSystemData(); })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'routing_rules' }, () => fetchSystemData())
                .subscribe();
        } catch (err) { console.error(err); setIsAuthenticated(false); } 
        finally { setIsLoginLoading(false); }
    };

    const handleLogin = async () => {
        setIsLoginLoading(true);
        // CRITICAL: Request 'Mail.Send' scope for Graph API
        await supabase.auth.signInWithOAuth({ 
            provider: 'azure', 
            options: { 
                scopes: 'email Mail.Send', 
                redirectTo: window.location.origin 
            } 
        });
    };

    // --- ACTIONS ---
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleNewTicket = async (ticket) => {
        // 1. Determine Routing
        const dept = departments.find(d => d.name === ticket.owner);
        const deptEmail = dept?.config?.email;

        // 2. Insert DB
        const { error } = await supabase.from('tickets').insert([{
            subject: ticket.subject, category: ticket.category, priority: 'Medium', status: 'Open',
            school: ticket.school, location: ticket.location, requester_email: currentUser.email
        }]);

        if (!error) {
            setView('admin');
            // 3. SEND REAL EMAIL VIA GRAPH
            if (deptEmail && sessionToken) {
                showToast(`Sending email to ${deptEmail}...`, 'info');
                await sendGraphEmail(
                    sessionToken, 
                    deptEmail, 
                    `[New Ticket] ${ticket.subject}`,
                    `<h3>New Ticket Created</h3><p><strong>Reporter:</strong> ${currentUser.full_name}</p><p><strong>Location:</strong> ${ticket.location}</p><p><strong>Category:</strong> ${ticket.category}</p><hr/><p>${ticket.subject}</p>`
                );
                showToast(`Email sent to ${deptEmail}`, 'success');
            } else {
                showToast("Ticket created (No email sent - check config)", "warning");
            }
        }
    };

    const handleUpdateTicket = async (t, comment = "") => {
        await supabase.from('tickets').update({ status: t.status, assigned_to: t.assigned_to }).eq('id', t.id);
        
        // SEND REAL EMAIL ON RESOLVE/ASSIGN
        if (sessionToken) {
            let subject = `[Ticket Update] ${t.subject}`;
            let body = `<p>Status changed to: <strong>${t.status}</strong></p>`;
            if (comment) body += `<p><strong>Note:</strong> ${comment}</p>`;

            // If resolved, email the requester. If assigned, maybe email the assignee (omitted for brevity)
            if (t.status === 'Resolved' || t.status === 'In Progress') {
                showToast(`Emailing ${t.requester_email}...`, 'info');
                await sendGraphEmail(sessionToken, t.requester_email, subject, body);
                showToast("Notification email sent", "success");
            }
        }
        fetchSystemData();
    };

    // --- SUB-HANDLERS ---
    const handleAddRule = async (rule) => { await supabase.from('routing_rules').insert([rule]); fetchSystemData(); };
    const handleRemoveRule = async (id) => { await supabase.from('routing_rules').delete().eq('id', id); fetchSystemData(); };
    const handleAddSetting = async (type, name, config) => { await supabase.from('organization_settings').insert([{ type, name, config }]); fetchSystemData(); };
    const handleRemoveSetting = async (name) => { await supabase.from('organization_settings').delete().eq('name', name); fetchSystemData(); };
    const handleUpdateUser = async (u) => { await supabase.from('users').update({ role: u.role, department: u.department, school: u.school, access_schools: u.access_schools, is_super_admin: u.is_super_admin }).eq('id', u.id); fetchSystemData(); };

    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} loading={isLoginLoading} />;
    if (!currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

    return (
        <div className="min-h-screen flex flex-col font-sans text-zinc-900 bg-zinc-50 relative">
            {toast && (
                <div className="fixed bottom-6 right-6 z-[100] bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-enter">
                    {toast.type === 'success' ? <CheckCircle size={18} className="text-green-400"/> : <Mail size={18} className="text-blue-400"/>}
                    <span className="text-sm font-bold">{toast.msg}</span>
                </div>
            )}

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
                        <button onClick={() => setView('admin')} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${view === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <div className="relative"><LayoutDashboard size={14} /></div>
                            {currentUser.role === 'Staff' ? 'My Tickets' : 'Admin Console'}
                        </button>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
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
                        categorizer={(text) => {
                            let best = 'General Support';
                            let max = 0;
                            routingRules.forEach(rule => {
                                let score = 0;
                                rule.keywords.forEach(k => { if(text.toLowerCase().includes(k.toLowerCase())) score++; });
                                if(score > max) { max = score; best = rule.category; }
                            });
                            const matchedRule = routingRules.find(r => r.category === best);
                            return { category: best, owner: matchedRule?.department || 'IT' };
                        }}
                        currentUser={currentUser} 
                    />
                ) : (
                    <AdminDashboard 
                        tickets={tickets.filter(t => {
                            if (currentUser.is_super_admin) return true;
                            if (currentUser.role === 'Staff') return t.requester_email === currentUser.email; 
                            return (currentUser.access_schools?.includes('ALL') || currentUser.access_schools?.includes(t.school));
                        })}
                        users={users} 
                        currentUser={currentUser} 
                        schools={schools}
                        departments={departments}
                        routingRules={routingRules}
                        onUpdateUser={handleUpdateUser}
                        onAddSetting={handleAddSetting}
                        onRemoveSetting={handleRemoveSetting}
                        onAddRule={handleAddRule}
                        onRemoveRule={handleRemoveRule}
                        onUpdateTicket={handleUpdateTicket}
                    />
                )}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function ChatInterface({ onTicketCreate, categorizer, currentUser }) {
    const [messages, setMessages] = useState([{ id: 1, sender: 'bot', text: `Hi ${currentUser.full_name.split(' ')[0]}. How can I help?` }]);
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
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `I've routed this to **${cat.owner}** (${cat.category}). Which room is this?` }]);
            } else if (step === 'DETAILS') {
                onTicketCreate({ ...ticketDraft, location: text, school: currentUser.school });
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: "Ticket created! You will receive an email confirmation shortly." }]);
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
                    <div><h3 className="font-bold text-zinc-900">IT Assistant</h3><p className="text-xs text-zinc-500">AI Powered</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/50">
                    {messages.map(m => (
                        <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${m.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none'}`}>{m.text}</div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                {step !== 'DONE' && <div className="p-4 bg-white border-t border-zinc-200"><form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2"><input className="flex-1 bg-zinc-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="Type here..." value={input} onChange={e => setInput(e.target.value)} autoFocus /><button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700"><Send size={18}/></button></form></div>}
            </div>
        </div>
    );
}

function AdminDashboard({ tickets, users, currentUser, schools, departments, routingRules, onUpdateUser, onAddSetting, onRemoveSetting, onUpdateTicket, onAddRule, onRemoveRule }) {
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeTab, setActiveTab] = useState('queue');
    
    // Ensure fresh data on load
    useEffect(() => { setSelectedTicket(null); }, [tickets]);

    const tabs = [{ id: 'queue', label: currentUser.role === 'Staff' ? 'My History' : 'Ticket Queue' }];
    if (currentUser.role !== 'Staff') {
        tabs.push({ id: 'directory', label: 'Directory' });
        tabs.push({ id: 'settings', label: 'Settings' });
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-200 px-6 py-0 flex gap-6 bg-white sticky top-0 z-20">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`text-xs font-bold uppercase tracking-wider py-4 border-b-2 transition-colors ${activeTab === t.id ? 'text-indigo-600 border-indigo-600' : 'text-zinc-400 border-transparent hover:text-zinc-600'}`}>{t.label}</button>
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
                                    <div className="flex items-center justify-between mt-2"><span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200 font-medium">{t.category}</span><span className="text-[10px] text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 bg-zinc-50/50">
                            {selectedTicket ? <TicketDetailView ticket={selectedTicket} currentUser={currentUser} onUpdateTicket={onUpdateTicket} /> : <div className="h-full flex items-center justify-center text-zinc-300">Select a ticket</div>}
                        </div>
                    </div>
                )}
                {activeTab === 'directory' && <UserDirectory users={users} schools={schools} departments={departments} onUpdateUser={onUpdateUser} />}
                {activeTab === 'settings' && <SettingsManager schools={schools} departments={departments} routingRules={routingRules} onAdd={onAddSetting} onRemove={onRemoveSetting} onAddRule={onAddRule} onRemoveRule={onRemoveRule} />}
            </div>
        </div>
    );
}

// 3. TICKET DETAIL (With Guaranteed Resolve Modal)
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
            {/* RESOLVE MODAL - HARD CODED ON TOP */}
            {showResolveModal && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
                    <div className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6 ring-1 ring-zinc-100">
                        <h3 className="font-bold text-lg mb-2 text-zinc-900">Resolve Ticket</h3>
                        <p className="text-xs text-zinc-500 mb-4">This will send a closing email to {ticket.requester_email}</p>
                        <textarea className="w-full px-3 py-2 text-sm border rounded-lg h-32 mb-4 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Resolution notes..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
                        <div className="flex gap-3"><button onClick={() => setShowResolveModal(false)} className="flex-1 px-4 py-2 rounded-lg border hover:bg-zinc-50">Cancel</button><button onClick={() => { onUpdateTicket({ ...ticket, status: 'Resolved' }, resolveNote); setShowResolveModal(false); setResolveNote(''); }} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700">Confirm & Send Email</button></div>
                    </div>
                </div>
            )}

            <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-start bg-white z-10">
                <div><h1 className="text-xl font-bold mb-2 text-zinc-900">{ticket.subject}</h1><div className="flex items-center gap-4 text-xs text-zinc-500"><User size={14}/> {ticket.requester_email} <MapPin size={14} className="ml-2"/> {ticket.location}</div></div>
                <div className="flex gap-2">
                    {ticket.status === 'Resolved' ? (
                         <button onClick={() => { onUpdateTicket({ ...ticket, status: 'Open' }, "Ticket Reopened"); }} className="px-4 py-2 bg-zinc-100 border rounded-lg text-xs font-bold text-zinc-600">Reopen</button>
                    ) : (
                        <>
                            {!ticket.assigned_to && currentUser.role !== 'Staff' && <button onClick={() => { onUpdateTicket({ ...ticket, assigned_to: currentUser.full_name, status: 'In Progress' }, "Assigned"); }} className="px-4 py-2 border rounded-lg text-xs font-bold">Assign Me</button>}
                            {currentUser.role !== 'Staff' && <button onClick={() => setShowResolveModal(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold">Resolve</button>}
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50">
                {updates.map(u => (
                    <div key={u.id} className={`flex w-full ${u.type === 'SYSTEM' ? 'justify-center' : ''}`}>
                        {u.type === 'SYSTEM' ? <div className="bg-zinc-200 text-zinc-600 px-3 py-1 rounded-full text-[10px] font-bold">{u.text}</div> : 
                        <div className={`flex gap-4 max-w-2xl ${u.is_admin ? 'ml-auto flex-row-reverse' : ''}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.is_admin ? 'bg-zinc-900' : 'bg-indigo-600'}`}>{u.user_name.charAt(0)}</div><div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${u.is_admin ? 'bg-white border' : 'bg-white border'}`}>{u.text}</div></div>}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            {ticket.status !== 'Resolved' && <div className="p-4 bg-white border-t"><form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-zinc-50 border rounded-xl px-4 py-3 text-sm" placeholder="Reply..." /><button type="submit" className="p-3 bg-zinc-900 text-white rounded-xl"><Send size={18}/></button></form></div>}
        </div>
    );
}

// 4. SETTINGS & ROUTING MANAGER
function SettingsManager({ schools, departments, routingRules, onAdd, onRemove, onAddRule, onRemoveRule }) {
    const [input, setInput] = useState('');
    const [email, setEmail] = useState('');
    const [type, setType] = useState('SCHOOL');
    const [newRule, setNewRule] = useState({ category: '', department: 'IT', keywords: '' });

    return (
        <div className="p-8 bg-zinc-50 min-h-full">
            <h2 className="text-2xl font-bold mb-6">System Configuration</h2>
            <div className="grid grid-cols-2 gap-8">
                {/* SETTINGS CARD */}
                <div className="col-span-2 bg-white p-6 rounded-xl border flex gap-4 items-end">
                    <div className="flex-1"><label className="text-xs font-bold text-zinc-500">Type</label><select value={type} onChange={e => setType(e.target.value)} className="w-full border p-2 rounded"><option value="SCHOOL">School</option><option value="DEPARTMENT">Department</option></select></div>
                    <div className="flex-1"><label className="text-xs font-bold text-zinc-500">Name</label><input value={input} onChange={e => setInput(e.target.value)} className="w-full border p-2 rounded" placeholder="Name..." /></div>
                    {type === 'DEPARTMENT' && <div className="flex-1"><label className="text-xs font-bold text-zinc-500">Notification Email</label><input value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" placeholder="dept@school.edu" /></div>}
                    <button onClick={() => { onAdd(type, input, { email }); setInput(''); setEmail(''); }} className="bg-zinc-900 text-white px-6 py-2 rounded font-bold">Add</button>
                </div>
                
                {/* ROUTING CARD */}
                <div className="col-span-2 bg-white p-6 rounded-xl border">
                    <h4 className="font-bold mb-4 flex items-center gap-2"><Zap size={16}/> Routing Logic</h4>
                    <div className="flex gap-4 mb-4">
                        <input className="border p-2 rounded flex-1 text-sm" placeholder="Category (e.g. IT - AV)" onChange={e => setNewRule({...newRule, category: e.target.value})} />
                        <select className="border p-2 rounded text-sm" onChange={e => setNewRule({...newRule, department: e.target.value})}>{departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}</select>
                        <input className="border p-2 rounded flex-[2] text-sm" placeholder="Keywords (comma separated)" onChange={e => setNewRule({...newRule, keywords: e.target.value})} />
                        <button onClick={() => onAddRule({...newRule, keywords: newRule.keywords.split(',').map(s=>s.trim())})} className="bg-zinc-900 text-white px-4 py-2 rounded text-sm font-bold">Add Rule</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {routingRules.map(r => (
                            <div key={r.id} className="border p-3 rounded bg-zinc-50 relative group">
                                <div className="font-bold text-sm mb-1">{r.category} <span className="text-[10px] font-normal text-zinc-500">→ {r.department}</span></div>
                                <div className="flex flex-wrap gap-1">{r.keywords.map(k => <span key={k} className="bg-white border px-1 rounded text-[10px]">{k}</span>)}</div>
                                <button onClick={() => onRemoveRule(r.id)} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LISTS */}
                <div className="bg-white rounded-xl border p-4">
                    <h4 className="font-bold mb-4">Active Schools</h4>
                    {schools.map(s => <div key={s} className="flex justify-between p-2 border-b text-sm">{s} <button onClick={() => onRemove(s)}><Trash2 size={14}/></button></div>)}
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <h4 className="font-bold mb-4">Department Emails</h4>
                    {departments.map(d => (
                        <div key={d.name} className="flex justify-between p-2 border-b text-sm">
                            <div><span className="font-bold block">{d.name}</span><span className="text-xs text-zinc-500">{d.config?.email || 'No email set'}</span></div>
                            <button onClick={() => onRemove(d.name)}><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function UserDirectory({ users, schools, departments, onUpdateUser }) {
    const [editingUser, setEditingUser] = useState(null);
    return (
        <div className="p-8 h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-bold mb-6">User Directory</h2>
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
            {editingUser && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg border overflow-hidden p-6 space-y-4">
                        <h3 className="font-bold">Edit User</h3>
                        <div><label className="text-xs font-bold text-zinc-500">Role</label><select className="w-full border p-2 rounded" value={editingUser.is_super_admin ? 'Super Admin' : editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value, is_super_admin: e.target.value === 'Super Admin'})}><option value="Staff">Staff</option><option value="Admin">Delegated Admin</option><option value="Super Admin">Prime Admin</option></select></div>
                        <div><label className="text-xs font-bold text-zinc-500">School</label><select className="w-full border p-2 rounded" value={editingUser.school} onChange={e => setEditingUser({...editingUser, school: e.target.value})}>{schools.map(s => <option key={s}>{s}</option>)}</select></div>
                        <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditingUser(null)} className="px-4 py-2 border rounded">Cancel</button><button onClick={() => { onUpdateUser(editingUser); setEditingUser(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
