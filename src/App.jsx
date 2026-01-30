import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { 
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, School, 
  MoreHorizontal, Command, LogOut, Zap, Crown, ArrowRight
} from 'lucide-react';

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin, loading, error }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 animate-enter text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-6">
                    <Briefcase className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">CorpTicket</h1>
                <p className="text-zinc-500 text-sm mb-8">Internal Operations & Helpdesk Portal</p>
                {error && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2 justify-center">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}
                <button onClick={onLogin} disabled={loading} className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    {loading ? "Connecting..." : <>Sign In with SSO <ArrowRight size={16} /></>}
                </button>
                <p className="mt-6 text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Authorized Personnel Only</p>
            </div>
        </div>
    );
}

// --- BUSINESS LOGIC ENGINE ---
const TicketEngine = {
    getVisibleTickets: (tickets, currentUser, filters, keywords) => {
        if (!currentUser) return [];
        return tickets.filter(t => {
            if (filters.status === 'ACTIVE' && t.status === 'Resolved') return false;
            if (filters.status === 'RESOLVED' && t.status !== 'Resolved') return false;
            if (filters.category !== 'ALL_CATS' && t.category !== filters.category) return false;
            if (filters.school && filters.school !== 'ALL_SCHOOLS' && t.school !== filters.school) return false;

            if (currentUser.is_super_admin) return true;
            if (t.requester_email === currentUser.email) return true;

            const categoryConfig = keywords[t.category];
            const ticketOwnerDept = categoryConfig ? categoryConfig.owner : 'Unassigned';
            const userScopes = currentUser.access_scopes || [];
            const hasDeptAccess = (currentUser.department === ticketOwnerDept) || userScopes.includes(ticketOwnerDept);

            if (!hasDeptAccess) return false;

            const userSchools = currentUser.access_schools || [];
            if (userSchools.includes('ALL')) return true;
            return userSchools.includes(t.school);
        });
    },
    categorise: (text, keywordsMap) => {
        const lowerText = text.toLowerCase();
        let bestCategory = 'General Support';
        let maxScore = 0;
        Object.entries(keywordsMap).forEach(([cat, config]) => {
            let score = 0;
            config.keywords.forEach(word => { if (lowerText.includes(word.toLowerCase())) score += 1; });
            if (score > maxScore) { maxScore = score; bestCategory = cat; }
        });
        return { category: bestCategory, owner: keywordsMap[bestCategory]?.owner || 'Unassigned', isSensitive: keywordsMap[bestCategory]?.sensitive || false };
    }
};

const initialSchools = ['St. Marys', 'King Edwards', 'North High', 'South High'];
const initialDepartments = ['IT', 'Site', 'Teaching', 'Admin', 'HR'];
const initialKeywords = {
    'IT - AV': { owner: 'IT', sensitive: false, score: 0, keywords: ['iwb', 'screen', 'projector', 'display', 'hdmi', 'cable', 'audio', 'sound'] },
    'IT - Network': { owner: 'IT', sensitive: false, score: 0, keywords: ['wifi', 'internet', 'connect', 'slow', 'offline', 'network', 'vpn'] },
    'Facilities': { owner: 'Site', sensitive: false, score: 0, keywords: ['chair', 'desk', 'light', 'bulb', 'cold', 'hot', 'ac', 'leak', 'toilet', 'door', 'clean'] },
};
const initialKnowledgeBase = [{ id: 'kb1', triggers: ['wifi', 'internet', 'slow', 'connect'], title: 'Troubleshooting Slow Wifi', content: '1. Toggle your wifi adapter off/on.\n2. Restart your router.' }];

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [view, setView] = useState('chat');
    const [tickets, setTickets] = useState([]);
    const [notifications, setNotifications] = useState(0);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [keywords, setKeywords] = useState(initialKeywords);
    const [departments, setDepartments] = useState(initialDepartments);
    const [kbArticles, setKbArticles] = useState(initialKnowledgeBase);

    const handleLogin = async () => {
        setIsLoginLoading(true);
        setLoginError(null);
        try {
            const { data: userData, error: userError } = await supabase.from('users').select('*').order('full_name');
            if (userError) throw userError;
            if (!userData || userData.length === 0) throw new Error("No users found. Run SQL seed script.");

            const { data: ticketData, error: ticketError } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
            if (ticketError) throw ticketError;

            setUsers(userData);
            // Auto-select Super Admin for demo, or first user
            const adminUser = userData.find(u => u.is_super_admin) || userData[0];
            setCurrentUser(adminUser);
            setTickets(ticketData || []);
            setIsAuthenticated(true);
            
            // Realtime
            const channel = supabase.channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
                supabase.from('tickets').select('*').order('created_at', { ascending: false }).then(({ data }) => { if(data) setTickets(data) });
                if(payload.eventType === 'INSERT') setNotifications(prev => prev + 1);
            })
            .subscribe();
            
        } catch (err) {
            console.error(err);
            setLoginError(err.message);
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleNewTicket = async (ticket) => {
        setTickets(prev => [ticket, ...prev]); 
        await supabase.from('tickets').insert([{
            subject: ticket.subject, category: ticket.category, priority: ticket.priority, status: ticket.status, school: ticket.school, location: ticket.location, context_data: ticket.context, is_sensitive: ticket.isSensitive, requester_email: currentUser.email, assigned_to: ticket.assignedTo
        }]);
    };

    const updateTicket = async (updatedTicket) => {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        await supabase.from('tickets').update({ status: updatedTicket.status, assigned_to: updatedTicket.assignedTo }).eq('id', updatedTicket.id);
    };

    const handleAddUser = async (newUser) => {
        const { data } = await supabase.from('users').insert([{
            full_name: newUser.name, email: `${newUser.name.replace(/\s/g, '').toLowerCase()}@school.edu`, role: newUser.role, department: newUser.dept, school: newUser.school, is_super_admin: newUser.isSuperAdmin, access_schools: newUser.accessSchools, access_scopes: newUser.accessScopes, avatar_code: newUser.name.substring(0,2).toUpperCase()
        }]).select();
        if (data) setUsers([...users, data[0]]);
    };

    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} loading={isLoginLoading} error={loginError} />;
    if (!currentUser) return <div className="h-screen flex items-center justify-center">Loading Profile...</div>;

    return (
        <div className="min-h-screen flex flex-col font-sans text-zinc-900 bg-zinc-50">
            <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-bold text-sm tracking-tight block leading-none text-zinc-800">CorpTicket</span>
                        <span className="text-[10px] font-semibold text-zinc-400 tracking-wider">INTERNAL OPS</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-100/50 p-1 rounded-lg border border-zinc-200">
                        <button onClick={() => setView('chat')} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-semibold transition-all ${view === 'chat' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <MessageSquare size={14} /> Helpdesk
                        </button>
                        <button onClick={() => { setView('admin'); setNotifications(0); }} className={`px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-semibold transition-all ${view === 'admin' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <div className="relative">
                                <LayoutDashboard size={14} />
                                {notifications > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-3 h-3 flex items-center justify-center rounded-full animate-pulse">{notifications}</span>}
                            </div>
                            {currentUser.is_super_admin || currentUser.role === 'Super Admin' ? 'Admin Panel' : 'My Dashboard'}
                        </button>
                    </div>
                    <div className="h-6 w-px bg-zinc-200 mx-2"></div>
                    <div className="relative group">
                        <button className="flex items-center gap-3 hover:bg-white/50 p-1.5 rounded-lg transition-all border border-transparent hover:border-zinc-200">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white ${currentUser.is_super_admin ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                                {currentUser.avatar_code}
                            </div>
                            <div className="text-left hidden md:block">
                                <div className="text-xs font-bold leading-none text-zinc-800">{currentUser.full_name}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">{currentUser.role}</div>
                            </div>
                            <ChevronDown size={14} className="text-zinc-400" />
                        </button>
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-1 text-zinc-800 hidden group-hover:block border border-zinc-100 z-50">
                            <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-50 mb-1">Switch Persona</div>
                            {users.map(u => (
                                <button key={u.id} onClick={() => setCurrentUser(u)} className={`w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-zinc-50 ${currentUser.id === u.id ? 'bg-zinc-50 text-zinc-900 font-bold' : 'text-zinc-600'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${u.is_super_admin ? 'bg-purple-600' : 'bg-zinc-400'}`}>{u.avatar_code}</div>
                                    <div className="flex flex-col">
                                        <span>{u.full_name}</span>
                                    </div>
                                    {currentUser.id === u.id && <CheckCircle size={12} className="ml-auto text-zinc-900"/>}
                                </button>
                            ))}
                            <div className="border-t border-zinc-50 mt-1 pt-1">
                                <button onClick={() => setIsAuthenticated(false)} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 text-red-600 hover:bg-red-50">
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex-1 overflow-hidden relative max-w-[1600px] mx-auto w-full p-6 h-[calc(100vh-80px)]">
                {view === 'chat' ? (
                    <ChatInterface onTicketCreate={handleNewTicket} categorizer={(text) => TicketEngine.categorise(text, keywords)} currentUser={currentUser} kbArticles={kbArticles} />
                ) : (
                    <AdminDashboard tickets={tickets} onUpdateTicket={updateTicket} currentUser={currentUser} users={users} onAddUser={handleAddUser} keywords={keywords} setKeywords={() => {}} departments={departments} onAddDepartment={() => {}} onRemoveDepartment={() => {}} kbArticles={kbArticles} onAddKbArticle={() => {}} onRemoveKbArticle={() => {}} schools={initialSchools} />
                )}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function ChatInterface({ onTicketCreate, categorizer, currentUser, kbArticles }) {
    const [messages, setMessages] = useState([{ id: 1, sender: 'bot', text: 'How can I assist you today?' }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationStep, setConversationStep] = useState('ISSUE');
    const [draftTicket, setDraftTicket] = useState(null);
    const chatEndRef = useRef(null);

    const checkKnowledgeBase = (text) => kbArticles.find(kb => kb.triggers.some(t => text.toLowerCase().includes(t.toLowerCase())));

    const handleSend = (e, forceText = null, skipKb = false) => {
        if (e) e.preventDefault();
        const textToSend = forceText || input;
        if (!textToSend.trim()) return;
        
        if (!forceText) { 
            setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: textToSend }]); 
            setInput(''); 
        }
        
        setIsTyping(true);

        setTimeout(() => {
            if (conversationStep === 'ISSUE') {
                if (!skipKb) {
                    const kbMatch = checkKnowledgeBase(textToSend);
                    if (kbMatch) {
                        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `I found a solution article:`, isDeflection: true, kbData: kbMatch, originalText: textToSend }]);
                        setIsTyping(false); return;
                    }
                }
                const result = categorizer(textToSend);
                setDraftTicket({ subject: textToSend, category: result.category, owner: result.owner, isSensitive: result.isSensitive });
                setConversationStep('LOCATION');
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `I've categorized this as **${result.category}**. What is the location?` }]);
                setIsTyping(false);
            } else if (conversationStep === 'LOCATION') {
                setDraftTicket(prev => ({ ...prev, location: textToSend }));
                setConversationStep('PRIORITY');
                setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `Got it. What is the priority level?`, isPrioritySelect: true }]);
                setIsTyping(false);
            }
        }, 800);
    };

    const handlePrioritySelect = (priority) => {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: priority }]);
        setIsTyping(true);
        setTimeout(() => {
            onTicketCreate({
                user: currentUser.full_name,
                school: currentUser.school,
                subject: draftTicket.subject, 
                category: draftTicket.category, 
                isSensitive: draftTicket.isSensitive, 
                owner: draftTicket.owner, 
                status: "Open", 
                created: "Just now", 
                timestamp: Date.now(), 
                priority: priority, 
                context: draftTicket.isSensitive ? "CONFIDENTIAL" : "Mobile Request",
                location: draftTicket.location, 
                assignedTo: null
            });
            setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `Ticket created. Routed to ${draftTicket.owner}.` }]);
            setConversationStep('ISSUE'); 
            setDraftTicket(null); 
            setIsTyping(false);
        }, 1000);
    };

    const handleDeflectionResponse = (success, originalText) => {
        if (success) {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: "That worked!" }, { id: Date.now()+1, sender: 'bot', text: "Great!" }]);
        } else {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: "Still need help." }]); 
            handleSend(null, originalText, true);
        }
    };

    return (
        <div className="h-full flex flex-col justify-center items-center">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 h-[80vh] flex flex-col ring-1 ring-zinc-900/5">
                <div className="bg-zinc-900 p-4 flex items-center justify-between text-white shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Zap size={16} className="text-yellow-300 fill-current" />
                        </div>
                        <div>
                            <span className="font-bold text-sm block">Helpdesk Assistant</span>
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Online
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-zinc-300">AI Powered</span>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.isDeflection ? (
                                <div className="max-w-[70%] bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center gap-2">
                                        <Lightbulb size={14} className="text-amber-600" />
                                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Suggestion</span>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-semibold text-zinc-900 text-sm mb-2">{msg.kbData.title}</h4>
                                        <p className="text-xs text-zinc-600 whitespace-pre-wrap mb-4 leading-relaxed">{msg.kbData.content}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDeflectionResponse(true, msg.originalText)} className="flex-1 bg-zinc-900 text-white text-xs py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors">Solved</button>
                                            <button onClick={() => handleDeflectionResponse(false, msg.originalText)} className="flex-1 bg-white border border-zinc-200 text-zinc-600 text-xs py-2 rounded-lg font-medium hover:bg-zinc-50 transition-colors">Not Solved</button>
                                        </div>
                                    </div>
                                </div>
                            ) : msg.isPrioritySelect ? (
                                <div className="max-w-[60%] space-y-2">
                                    <div className="bg-white border border-zinc-200 text-zinc-700 p-4 rounded-2xl rounded-bl-none shadow-sm text-sm leading-relaxed">{msg.text}</div>
                                    <div className="flex gap-2">
                                        {['Low', 'Medium', 'High'].map(p => (
                                            <button key={p} onClick={() => handlePrioritySelect(p)} className="flex-1 px-3 py-3 text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition-all shadow-sm">{p}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={`max-w-[60%] rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${msg.sender === 'user' ? 'bg-zinc-900 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-700 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && <div className="text-xs text-zinc-400 ml-4 animate-pulse">Assistant is typing...</div>}
                    <div ref={chatEndRef}></div>
                </div>
                {conversationStep !== 'PRIORITY' && (
                    <form onSubmit={(e) => handleSend(e)} className="p-4 bg-white border-t border-zinc-200 flex gap-2">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={conversationStep === 'LOCATION' ? "Enter room..." : "Describe the issue..."} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all" />
                        <button type="submit" className="bg-zinc-900 text-white p-3 rounded-xl hover:bg-zinc-700 transition-colors shadow-sm"><Send size={18} /></button>
                    </form>
                )}
            </div>
        </div>
    );
}

function AdminDashboard({ tickets, onUpdateTicket, currentUser, users, onAddUser, keywords, setKeywords, departments, onAddDepartment, onRemoveDepartment, kbArticles, onAddKbArticle, onRemoveKbArticle, schools }) {
    const [activeTab, setActiveTab] = useState('tickets');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showLogicModal, setShowLogicModal] = useState(false);
    const [filters, setFilters] = useState({ status: 'ACTIVE', category: 'ALL_CATS', school: 'ALL_SCHOOLS' });

    const visibleTickets = useMemo(() => TicketEngine.getVisibleTickets(tickets, currentUser, filters, keywords), [tickets, currentUser, filters, keywords]);
    
    const isOverdue = (timestamp, status) => {
        if (!timestamp) return false;
        return status !== 'Resolved' && (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60) > 24;
    };
    
    const getTimeAgo = (timestamp) => {
        if (!timestamp) return 'Just now';
        const diff = Date.now() - new Date(timestamp).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return `${Math.floor(diff / (1000 * 60))} mins ago`;
        if (hours < 24) return `${hours} hrs ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="bg-white border-b border-zinc-200 px-6 py-2 flex items-center justify-between sticky top-0 z-40">
                <div className="flex gap-1">
                    {['tickets', 'users', 'kb', 'depts'].map(tab => {
                        if (tab === 'users' && !currentUser.is_super_admin) return null;
                        if (tab === 'kb' && !currentUser.is_super_admin) return null;
                        if (tab === 'depts' && !currentUser.is_super_admin) return null;
                        return (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>
                                {tab === 'tickets' ? 'Dashboard' : tab === 'users' ? 'Directory' : tab === 'kb' ? 'Knowledge' : 'Settings'}
                            </button>
                        );
                    })}
                </div>
                {currentUser.is_super_admin && (
                    <button onClick={() => setShowLogicModal(true)} className="text-xs flex items-center gap-1.5 text-zinc-500 hover:text-indigo-600 transition-colors font-medium border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">
                        <Settings size={14} /> Logic Config
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'users' ? <UserDirectory users={users} currentUser={currentUser} onAddUser={onAddUser} departments={departments} schools={schools} /> :
                 activeTab === 'depts' ? <DepartmentManager departments={departments} onAdd={onAddDepartment} onRemove={onRemoveDepartment} /> :
                 activeTab === 'kb' ? <KnowledgeBaseManager articles={kbArticles} onAdd={onAddKbArticle} onRemove={onRemoveKbArticle} /> :
                 (
                    <div className="h-full flex">
                        <div className="w-[400px] flex flex-col border-r border-zinc-200 bg-zinc-50/50">
                            <div className="p-4 border-b border-zinc-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2">
                                        <Layers size={14}/> Queue
                                    </h3>
                                    <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">{visibleTickets.length}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20">
                                        <option value="ACTIVE">Open</option><option value="RESOLVED">Closed</option><option value="ALL">All</option>
                                    </select>
                                    <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20">
                                        <option value="ALL_CATS">Category</option>{Object.keys(keywords).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select value={filters.school} onChange={e => setFilters({...filters, school: e.target.value})} className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg bg-white col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20">
                                        <option value="ALL_SCHOOLS">All Locations</option>
                                        {((currentUser.accessSchools || []).includes('ALL') ? schools : (currentUser.accessSchools || [])).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                                {visibleTickets.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
                                        <EyeOff size={32} className="mb-3 opacity-20"/>
                                        <span className="text-xs">No tickets found</span>
                                    </div>
                                ) : (
                                    visibleTickets.map(ticket => (
                                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`p-4 rounded-xl cursor-pointer transition-all border shadow-sm group ${selectedTicket?.id === ticket.id ? 'bg-white border-zinc-900 ring-1 ring-zinc-900 shadow-md z-10' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${ticket.priority === 'High' ? 'bg-red-500' : ticket.priority === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                                    <span className="text-[10px] font-bold text-zinc-400 font-mono">#{ticket.id}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-400">{getTimeAgo(ticket.created_at)}</span>
                                            </div>
                                            <h4 className={`text-sm font-bold mb-1 line-clamp-1 leading-tight ${ticket.is_sensitive ? 'text-red-700' : 'text-zinc-800'}`}>{ticket.is_sensitive ? 'Confidential Ticket' : ticket.subject}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">{ticket.category}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 text-zinc-400 flex items-center gap-1"><School size={10}/> {ticket.school}</span>
                                                </div>
                                                {isOverdue(ticket.created_at, ticket.status) && <AlertTriangle size={12} className="text-red-500" />}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="flex-1 bg-white relative">
                            {selectedTicket ? <TicketDetailView ticket={selectedTicket} onUpdateTicket={onUpdateTicket} currentUser={currentUser} /> : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-300 bg-zinc-50/30">
                                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
                                        <Command size={32} className="opacity-20" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-400">Select a ticket from the queue</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {showLogicModal && <LogicConfigModal keywords={keywords} setKeywords={setKeywords} departments={departments} onClose={() => setShowLogicModal(false)} />}
        </div>
    );
}

function TicketDetailView({ ticket, onUpdateTicket, currentUser }) {
    const [resolveNote, setResolveNote] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [updates, setUpdates] = useState([]);
    const chatRef = useRef(null);

    useEffect(() => {
        const fetchUpdates = async () => {
            const { data } = await supabase.from('ticket_updates').select('*').eq('ticket_id', ticket.id).order('created_at');
            if (data) setUpdates(data);
        };
        fetchUpdates();
    }, [ticket.id]);

    const handlePost = async (e) => {
        e.preventDefault(); 
        if(!newComment.trim()) return;
        
        const fakeUpdate = { 
            id: Date.now(), 
            user_name: currentUser.full_name, 
            text: newComment, 
            created_at: new Date().toISOString(), 
            is_admin: currentUser.is_super_admin, 
            type: 'COMMENT' 
        };
        
        setUpdates([...updates, fakeUpdate]);
        setNewComment('');

        await supabase.from('ticket_updates').insert([{
            ticket_id: ticket.id,
            user_name: currentUser.full_name,
            text: newComment,
            type: 'COMMENT',
            is_admin: currentUser.is_super_admin
        }]);
    };

    const handleResolve = async () => {
        onUpdateTicket({ ...ticket, status: 'Resolved' });
        setIsResolving(false);
        await supabase.from('ticket_updates').insert([{ 
            ticket_id: ticket.id, 
            user_name: 'System', 
            text: `Resolved: ${resolveNote}`, 
            type: 'SYSTEM' 
        }]);
    };

    if (ticket.is_sensitive && !currentUser.is_super_admin) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-red-800">
                <Lock size={32} className="mb-3"/>
                <h2 className="font-bold">Restricted Access</h2>
            </div>
        );
    }

    const ticketDate = new Date(ticket.created_at);

    return (
        <div className="h-full flex flex-col relative">
            {isResolving && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-enter">
                    <div className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-4 text-zinc-900">Resolve Ticket #{ticket.id}</h3>
                        <textarea className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 h-32 mb-4 resize-none" placeholder="Resolution details..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} autoFocus/>
                        <div className="flex gap-3">
                            <button onClick={() => setIsResolving(false)} className="flex-1 px-4 py-2 rounded-lg text-sm bg-white border border-zinc-200 hover:bg-zinc-50 font-medium">Cancel</button>
                            <button onClick={handleResolve} className="flex-1 px-4 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 font-bold shadow-sm">Confirm Resolution</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-zinc-100 flex justify-between items-start bg-white z-10 shadow-sm">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${ticket.status === 'Resolved' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{ticket.status}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">#{ticket.id}</span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Clock size={10}/> {ticketDate.toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 leading-tight">{ticket.subject}</h2>
                </div>
                {currentUser.is_super_admin && ticket.status !== 'Resolved' && (
                    <div className="flex gap-2">
                        {!ticket.assigned_to && <button onClick={() => onUpdateTicket({ ...ticket, assignedTo: currentUser.full_name })} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors">Assign to Me</button>}
                        <button onClick={() => setIsResolving(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 shadow-sm transition-colors"><CheckCircle size={14}/> Resolve</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30" ref={chatRef}>
                 <div className="flex gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 text-xs shadow-inner shrink-0">?</div>
                    <div className="flex-1 max-w-3xl">
                        <div className="flex items-baseline gap-2 mb-1"><span className="font-bold text-sm text-zinc-900">{ticket.requester_email}</span><span className="text-xs text-zinc-400">opened this ticket</span></div>
                        <div className="mt-3 flex gap-4 text-xs text-zinc-500 pl-1">
                            <span className="flex items-center gap-1.5"><MapPin size={12} className="text-red-500"/> {ticket.location}</span>
                            <span className="flex items-center gap-1.5"><Layers size={12} className="text-indigo-500"/> {ticket.category}</span>
                            <span className="flex items-center gap-1.5"><Monitor size={12} className="text-zinc-400"/> {ticket.context_data}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 relative max-w-3xl">
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 -z-10"></div>
                    {updates.map(u => (
                        <div key={u.id} className={`flex gap-4 ${u.type === 'SYSTEM' ? 'justify-center pl-0' : ''}`}>
                            {u.type === 'SYSTEM' ? (
                                <div className="bg-zinc-100 border border-zinc-200 rounded-full px-3 py-1 text-[10px] font-bold text-zinc-500 flex items-center gap-2 z-10 shadow-sm"><Activity size={10}/> {u.text}</div>
                            ) : (
                                <>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm z-10 border-4 border-zinc-50 shrink-0 ${u.is_admin ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>{u.user_name?.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2 mb-1"><span className="font-bold text-sm text-zinc-800">{u.user_name}</span><span className="text-xs text-zinc-400">{new Date(u.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                        <div className={`p-3.5 rounded-xl border text-sm shadow-sm leading-relaxed ${u.is_admin ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-white border-zinc-200'}`}>{u.text}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {ticket.status !== 'Resolved' && (
                <div className="p-4 bg-white border-t border-zinc-200 z-10">
                    <form onSubmit={handlePost} className="relative max-w-4xl mx-auto">
                        <input type="text" className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-sm" placeholder="Type your reply..." value={newComment} onChange={e => setNewComment(e.target.value)} />
                        <button type="submit" className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"><Send size={16}/></button>
                    </form>
                </div>
            )}
        </div>
    );
}

function UserDirectory({ users, currentUser, onAddUser, departments, schools }) {
    const [editingUser, setEditingUser] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Staff Directory</h2>
                        <p className="text-sm text-zinc-500 mt-1">Manage user access & roles</p>
                    </div>
                    {currentUser.is_super_admin && (
                        <button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
                            <UserPlus size={16}/> Add User
                        </button>
                    )}
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50/80 text-xs uppercase text-zinc-500 font-bold border-b border-zinc-200">
                            <tr>
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Role & Dept</th>
                                <th className="px-6 py-4">Location Access</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${u.is_super_admin ? 'bg-purple-600' : 'bg-zinc-400'}`}>
                                                {u.avatar_code}
                                            </div>
                                            <div>
                                                <div className="font-bold text-zinc-900">{u.full_name}</div>
                                                <div className="text-xs text-zinc-400 font-mono">ID: {u.id.substring(0,8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-zinc-700">{u.role}</div>
                                        <div className="text-xs text-zinc-400">{u.department} Department</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.access_schools?.includes('ALL') ? (
                                                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100 flex items-center gap-1">
                                                    <Globe size={10}/> GLOBAL ACCESS
                                                </span>
                                            ) : (
                                                u.access_schools?.map(s => (
                                                    <span key={s} className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded border border-zinc-200">{s}</span>
                                                ))
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {currentUser.is_super_admin && (
                                            <button onClick={() => setEditingUser(u)} className="text-zinc-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded transition-all">
                                                <Edit3 size={16}/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {(editingUser || isAdding) && (
                    <UserEditModal 
                        user={editingUser} 
                        isAdding={isAdding} 
                        departments={departments} 
                        schools={schools} 
                        onClose={() => {setEditingUser(null); setIsAdding(false)}} 
                        onSave={(u) => { 
                            isAdding ? onAddUser(u) : console.log("Edit logic placeholder"); 
                            setEditingUser(null); 
                            setIsAdding(false); 
                        }} 
                    />
                )}
            </div>
        </div>
    );
}

function UserEditModal({ user, isAdding, onClose, onSave, departments, schools }) {
    const [formData, setFormData] = useState(user ? { ...user, accessSchools: user.access_schools || [user.school], isSuperAdmin: user.is_super_admin } : { name: '', role: 'Staff', dept: departments[0], school: schools[0], isAdmin: false, isSuperAdmin: false, avatar: 'NU', accessScopes: [], accessSchools: [schools[0]] });
    
    const toggleScope = (dept) => {
        const current = formData.accessScopes || [];
        if (current.includes(dept)) setFormData({ ...formData, accessScopes: current.filter(d => d !== dept) });
        else setFormData({ ...formData, accessScopes: [...current, dept] });
    };

    const toggleSchoolAccess = (s) => {
        if (formData.isSuperAdmin) return;
        const current = formData.accessSchools || [];
        if (s === 'ALL') setFormData({ ...formData, accessSchools: current.includes('ALL') ? [formData.school] : ['ALL'] });
        else {
            let newS = current.includes('ALL') ? [] : [...current];
            if (newS.includes(s)) { if (s !== formData.school) newS = newS.filter(x => x !== s); } else newS.push(s);
            setFormData({ ...formData, accessSchools: newS });
        }
    };

    const toggleSuperAdmin = (e) => {
        const isSuper = e.target.checked;
        if (isSuper) {
            setFormData({ ...formData, isSuperAdmin: true, isAdmin: true, accessSchools: ['ALL'] });
        } else {
            setFormData({ ...formData, isSuperAdmin: false, accessSchools: [formData.school] });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-enter">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-0 border border-zinc-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div>
                        <h3 className="font-bold text-zinc-900 text-lg">{isAdding ? 'Onboard New User' : 'Edit User Profile'}</h3>
                        <p className="text-xs text-zinc-500">Configure Identity, Role & Access Matrix</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                
                <div className="p-6 flex gap-6 max-h-[70vh] overflow-y-auto">
                    <div className="flex-1 space-y-4">
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Full Name</label><input type="text" className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/10" value={formData.name || formData.full_name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Role Title</label><input type="text" className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/10" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Department</label><select className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white" value={formData.dept || formData.department} onChange={e => setFormData({...formData, dept: e.target.value})}>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div className="pt-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Primary Campus</label>
                            <select className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white" value={formData.school} onChange={e => {
                                const newPrimary = e.target.value;
                                const currentAccess = formData.accessSchools.filter(s => s !== 'ALL');
                                if (!currentAccess.includes(newPrimary)) currentAccess.push(newPrimary);
                                setFormData({...formData, school: newPrimary, accessSchools: currentAccess});
                            }}>
                                {schools.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="HQ">HQ (Head Office)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 space-y-5 border-l border-zinc-100 pl-6">
                        <div className={`p-4 rounded-xl border transition-all ${formData.isSuperAdmin ? 'bg-purple-50 border-purple-200' : 'bg-zinc-50 border-zinc-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.isSuperAdmin} onChange={toggleSuperAdmin} className="rounded text-purple-600 focus:ring-purple-600" />
                                    <span className={`text-sm font-bold ${formData.isSuperAdmin ? 'text-purple-900' : 'text-zinc-700'}`}>Super Admin</span>
                                </label>
                                {formData.isSuperAdmin && <Crown size={16} className="text-purple-600"/>}
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-tight">Super Admins automatically inherit global access to all schools and departments.</p>
                        </div>

                        <div className={formData.isSuperAdmin ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Additional View Access (Dept)</label>
                            <p className="text-[10px] text-zinc-400 mb-2">Allow viewing tickets from other departments.</p>
                            <div className="flex flex-wrap gap-2">
                                {departments.filter(d => d !== (formData.dept || formData.department)).map(dept => (
                                    <button key={dept} onClick={() => toggleScope(dept)}
                                        className={`px-2 py-1 text-[10px] rounded border transition-all ${
                                            (formData.accessScopes || []).includes(dept) 
                                            ? 'bg-zinc-800 text-white border-zinc-800' 
                                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                                        }`}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={formData.isSuperAdmin ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Geographic Access</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => toggleSchoolAccess('ALL')} className={`p-2 rounded text-[10px] font-bold border transition-all flex items-center justify-between ${formData.accessSchools?.includes('ALL') ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}>Global {formData.accessSchools?.includes('ALL') && <CheckCircle size={10}/>}</button>
                                {schools.map(s => <button key={s} onClick={() => toggleSchoolAccess(s)} disabled={formData.accessSchools?.includes('ALL') || s === formData.school} className={`p-2 rounded text-[10px] font-bold border transition-all text-left truncate ${s === formData.school ? 'bg-zinc-100 text-zinc-400 border-zinc-200' : (formData.accessSchools?.includes(s) ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400')}`}>{s}</button>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-zinc-600 hover:bg-zinc-200 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-700 shadow-sm transition-colors">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

function DepartmentManager({ departments, onAdd, onRemove }) {
    const [newDept, setNewDept] = useState('');
    return (
        <div className="h-full p-8 flex flex-col items-center">
            <div className="w-full max-w-2xl">
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">Departments</h2>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
                    <form onSubmit={(e) => { e.preventDefault(); if(newDept.trim()) { onAdd(newDept.trim()); setNewDept(''); } }} className="flex gap-2 mb-6">
                        <input type="text" className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/10" placeholder="New Department Name..." value={newDept} onChange={e => setNewDept(e.target.value)} />
                        <button type="submit" className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-zinc-700 flex items-center gap-2"><Plus size={18}/> Add</button>
                    </form>
                    <div className="grid grid-cols-2 gap-3">
                        {departments.map(d => (
                            <div key={d} className="flex justify-between items-center p-3 bg-zinc-50 border border-zinc-200 rounded-lg group hover:border-zinc-300 transition-colors">
                                <span className="font-medium text-sm text-zinc-700">{d}</span>
                                <button onClick={() => onRemove(d)} className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KnowledgeBaseManager({ articles, onAdd, onRemove }) {
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', triggers: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({ title: form.title, content: form.content, triggers: form.triggers.split(',').map(t=>t.trim()) });
        setIsAdding(false); setForm({ title: '', content: '', triggers: '' });
    };

    return (
        <div className="h-full p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div><h2 className="text-2xl font-bold text-zinc-900">Knowledge Base</h2><p className="text-sm text-zinc-500">Automated deflection answers</p></div>
                    <button onClick={() => setIsAdding(true)} className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-700 flex items-center gap-2 shadow-sm"><Plus size={16}/> Add Article</button>
                </div>
                
                {isAdding && (
                    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-lg mb-8 animate-enter ring-1 ring-zinc-500/10">
                        <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2"><Lightbulb size={18}/> New Article</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Title</label><input type="text" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/10" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. How to restart printer"/></div>
                            <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Solution</label><textarea className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/10 h-24" value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Step 1..."/></div>
                            <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Triggers</label><input type="text" className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/10" value={form.triggers} onChange={e => setForm({...form, triggers: e.target.value})} placeholder="printer, jam, error (comma separated)"/></div>
                            <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-lg text-sm font-medium">Cancel</button><button type="submit" className="px-6 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-700">Save Article</button></div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    {articles.map(a => (
                        <div key={a.id} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 relative group">
                            <button onClick={() => onRemove(a.id)} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"><Trash2 size={16}/></button>
                            <h3 className="font-bold text-zinc-900 mb-2 text-lg">{a.title}</h3>
                            <p className="text-sm text-zinc-600 line-clamp-3 mb-4 leading-relaxed">{a.content}</p>
                            <div className="flex gap-2 flex-wrap">{a.triggers.map(t => <span key={t} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-1 rounded border border-zinc-200 font-medium">{t}</span>)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function LogicConfigModal({ keywords, setKeywords, departments, onClose }) {
    const [newKeywordInputs, setNewKeywordInputs] = useState({});
    const [isCreating, setIsCreating] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatOwner, setNewCatOwner] = useState(departments[0] || 'IT');
    const [newCatSensitive, setNewCatSensitive] = useState(false);

    const handleAddKeyword = (cat, e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            const word = e.target.value.trim().toLowerCase();
            const newKeywords = { ...keywords };
            if (!newKeywords[cat].keywords.includes(word)) { newKeywords[cat].keywords.push(word); setKeywords(newKeywords); }
            setNewKeywordInputs({ ...newKeywordInputs, [cat]: '' });
        }
    };
    const handleRemoveKeyword = (cat, word) => {
        const newKeywords = { ...keywords };
        newKeywords[cat].keywords = newKeywords[cat].keywords.filter(w => w !== word);
        setKeywords(newKeywords);
    };
    const handleCreateCategory = () => {
        if (!newCatName.trim()) return alert("Please enter a category name.");
        const updatedKeywords = { [newCatName]: { owner: newCatOwner, sensitive: newCatSensitive, score: 0, keywords: [] }, ...keywords };
        setKeywords(updatedKeywords); setIsCreating(false); setNewCatName('');
    };
    const handleDeleteCategory = (catName) => {
        if (confirm(`Delete ${catName}?`)) { const n = {...keywords}; delete n[catName]; setKeywords(n); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-enter">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/80">
                    <div><h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><Settings size={20} className="text-zinc-600" /> Routing Logic</h3><p className="text-sm text-zinc-500">Auto-assign tickets based on keywords</p></div>
                    <button onClick={onClose}><X size={24} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                <div className="p-8 overflow-y-auto bg-white flex-1 space-y-8">
                    {/* Add Category */}
                    <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-200">
                        {isCreating ? (
                            <div className="flex gap-4 items-end">
                                <div className="flex-1"><label className="text-xs font-bold text-zinc-900 uppercase mb-1 block">Category Name</label><input type="text" className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-500 focus:outline-none" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Finance"/></div>
                                <div className="w-48"><label className="text-xs font-bold text-zinc-900 uppercase mb-1 block">Route To</label><select className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-white" value={newCatOwner} onChange={e => setNewCatOwner(e.target.value)}>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                                <button onClick={handleCreateCategory} className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-bold shadow-sm hover:bg-zinc-700">Save</button>
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-100 rounded-lg">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreating(true)} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 hover:border-zinc-500 hover:text-zinc-600 hover:bg-zinc-50 transition-all text-sm font-bold flex items-center justify-center gap-2">
                                <Plus size={20} /> Add New Routing Rule
                            </button>
                        )}
                    </div>

                    <div className="grid gap-6">
                        {Object.entries(keywords).map(([cat, data]) => (
                            <div key={cat} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-zinc-300 transition-colors">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-zinc-100 p-3 rounded-xl"><Layers size={20} className="text-zinc-600"/></div>
                                        <div><h4 className="text-lg font-bold text-zinc-900">{cat}</h4><span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-1 rounded">Routed to: {data.owner}</span></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleDeleteCategory(cat)} className="text-zinc-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-3 block">Trigger Keywords</label>
                                    <div className="flex flex-wrap gap-2">
                                        {data.keywords.map(kw => (
                                            <span key={kw} className="text-xs bg-zinc-50 text-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-200 flex items-center gap-2 font-medium">
                                                {kw} <button onClick={() => handleRemoveKeyword(cat, kw)} className="text-zinc-400 hover:text-red-500"><X size={12}/></button>
                                            </span>
                                        ))}
                                        <input type="text" placeholder="+ add keyword" className="text-xs bg-transparent border-b border-dashed border-zinc-300 focus:border-zinc-600 focus:outline-none w-24 px-1 py-1" 
                                            value={newKeywordInputs[cat] || ''} onChange={e => setNewKeywordInputs({...newKeywordInputs, [cat]: e.target.value})} onKeyDown={e => handleAddKeyword(cat, e)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
