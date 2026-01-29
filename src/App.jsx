import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, School, 
  MoreHorizontal, Command, LogOut
} from 'lucide-react';

// --- BUSINESS LOGIC ENGINE (UNCHANGED) ---
const TicketEngine = {
    getVisibleTickets: (tickets, currentUser, filters, keywords) => {
        return tickets.filter(t => {
            if (filters.status === 'ACTIVE' && t.status === 'Resolved') return false;
            if (filters.status === 'RESOLVED' && t.status !== 'Resolved') return false;
            if (filters.category !== 'ALL_CATS' && t.category !== filters.category) return false;
            if (filters.school && filters.school !== 'ALL_SCHOOLS' && t.school !== filters.school) return false;
            if (currentUser.isSuperAdmin) return true;
            if (t.user === currentUser.name) return true;
            
            const categoryConfig = keywords[t.category];
            const ticketOwnerDept = categoryConfig ? categoryConfig.owner : 'Unassigned';
            const userScopes = currentUser.accessScopes || [];
            const hasDeptAccess = (currentUser.dept === ticketOwnerDept) || userScopes.includes(ticketOwnerDept);

            if (!hasDeptAccess) return false;

            const userSchools = currentUser.accessSchools || [];
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
            config.keywords.forEach(word => {
                if (lowerText.includes(word.toLowerCase())) score += 1;
            });
            if (score > maxScore) {
                maxScore = score;
                bestCategory = cat;
            }
        });

        return {
            category: bestCategory,
            owner: keywordsMap[bestCategory]?.owner || 'Unassigned',
            isSensitive: keywordsMap[bestCategory]?.sensitive || false
        };
    }
};

// --- MOCK DATA ---
const initialSchools = ['St. Marys', 'King Edwards', 'North High', 'South High'];
const initialDirectoryUsers = [
    { id: 'u0', name: 'The CTO', role: 'Super Admin', dept: 'Executive', school: 'HQ', isAdmin: true, isSuperAdmin: true, avatar: 'BOSS', accessScopes: [], accessSchools: ['ALL'] },
    { id: 'u1', name: 'John Doe', role: 'Support Engineer', dept: 'IT', school: 'HQ', isAdmin: true, isSuperAdmin: false, avatar: 'JD', accessScopes: [], accessSchools: ['ALL'] },
    { id: 'u4', name: 'Paulo Birch', role: 'Site Manager', dept: 'Site', school: 'St. Marys', isAdmin: true, isSuperAdmin: false, avatar: 'PB', accessScopes: [], accessSchools: ['St. Marys', 'North High'] },
    { id: 'u6', name: 'Sarah Jenkins', role: 'Teacher', dept: 'Teaching', school: 'St. Marys', isAdmin: false, isSuperAdmin: false, avatar: 'SJ', accessScopes: [], accessSchools: ['St. Marys'] },
    { id: 'u7', name: 'Mike Ross', role: 'Teacher', dept: 'Teaching', school: 'King Edwards', isAdmin: false, isSuperAdmin: false, avatar: 'MR', accessScopes: [], accessSchools: ['King Edwards'] },
    { id: 'u8', name: 'Harry Site', role: 'Site Staff', dept: 'Site', school: 'King Edwards', isAdmin: true, isSuperAdmin: false, avatar: 'HS', accessScopes: [], accessSchools: ['King Edwards'] },
];
const now = Date.now();
const mins = 60 * 1000;
const hours = 60 * mins;
const initialTickets = [
    { id: 901, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "Printer jam in Staff Room", category: "Facilities", isSensitive: false, status: "Open", timestamp: now - (10 * mins), priority: "Low", context: "Printer Area B", location: "Staff Room", assignedTo: null, updates: [ { id: 1, type: 'comment', user: 'Mike Ross', text: 'I tried opening tray 2 but it is stuck.', timestamp: now - (9 * mins) } ] },
    { id: 902, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "VPN keeps disconnecting", category: "IT - Network", isSensitive: false, status: "In Progress", timestamp: now - (2 * hours), priority: "High", context: "Asset: MacBook Pro M2", location: "Remote", assignedTo: 'John Doe', updates: [ { id: 1, type: 'system', user: 'System', text: 'Ticket created', timestamp: now - (2 * hours) } ] },
    { id: 903, user: "Sarah Jenkins", role: "Teacher", school: "St. Marys", subject: "Classroom 3B lights flickering", category: "Facilities", isSensitive: false, status: "Vendor Pending", timestamp: now - (26 * hours), priority: "Medium", context: "Electrician Called", location: "Room 3B", assignedTo: 'Paulo Birch', updates: [] },
];
const initialKeywords = {
    'IT - AV': { owner: 'IT', sensitive: false, score: 0, keywords: ['iwb', 'screen', 'projector', 'display', 'hdmi', 'cable', 'audio', 'sound'] },
    'IT - Network': { owner: 'IT', sensitive: false, score: 0, keywords: ['wifi', 'internet', 'connect', 'slow', 'offline', 'network', 'vpn'] },
    'Facilities': { owner: 'Site', sensitive: false, score: 0, keywords: ['chair', 'desk', 'light', 'bulb', 'cold', 'hot', 'ac', 'leak', 'toilet', 'door', 'clean'] },
};
const initialKnowledgeBase = [
    { id: 'kb1', triggers: ['wifi', 'internet', 'slow', 'connect'], title: 'Troubleshooting Slow Wifi', content: '1. Toggle your wifi adapter off/on.\n2. Restart your router.' },
];
const initialDepartments = ['IT', 'Site', 'Teaching', 'Admin', 'HR'];

// --- APP COMPONENT ---
export default function App() {
    const [view, setView] = useState('chat');
    const [tickets, setTickets] = useState(initialTickets);
    const [notifications, setNotifications] = useState(0);
    const [users, setUsers] = useState(initialDirectoryUsers);
    const [keywords, setKeywords] = useState(initialKeywords);
    const [departments, setDepartments] = useState(initialDepartments);
    const [kbArticles, setKbArticles] = useState(initialKnowledgeBase); 
    const [currentUser, setCurrentUser] = useState(users[0]);

    useEffect(() => {
        const updatedUser = users.find(u => u.id === currentUser.id);
        if (updatedUser) setCurrentUser(updatedUser);
    }, [users, currentUser.id]);

    const handleNewTicket = (ticket) => { setTickets([ticket, ...tickets]); setNotifications(prev => prev + 1); };
    const updateTicket = (updatedTicket) => { setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)); };
    const handleAddUser = (newUser) => { const userWithAccess = { ...newUser, id: `u${Date.now()}`, accessSchools: newUser.accessSchools && newUser.accessSchools.length > 0 ? newUser.accessSchools : [newUser.school] }; setUsers([...users, userWithAccess]); };
    const handleUpdateUser = (updatedUser) => { setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u)); };
    const handleAddDepartment = (newDept) => { if (departments.includes(newDept)) return alert("Department already exists"); setDepartments([...departments, newDept]); };
    const handleRemoveDepartment = (deptToRemove) => { if (confirm(`Delete ${deptToRemove}?`)) { setDepartments(departments.filter(d => d !== deptToRemove)); } };
    const handleAddKbArticle = (article) => { setKbArticles([...kbArticles, { ...article, id: `kb${Date.now()}` }]); };
    const handleRemoveKbArticle = (id) => { if (confirm('Delete this knowledge base article?')) { setKbArticles(kbArticles.filter(kb => kb.id !== id)); } };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50/50 font-sans text-zinc-900">
            {/* MODERN GLASS HEADER */}
            <nav className="glass px-6 py-3 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-brand-800 text-white p-1.5 rounded-lg">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-bold text-sm tracking-tight block leading-none">CorpTicket</span>
                        <span className="text-[10px] font-medium text-zinc-400 tracking-wider">INTERNAL OPS</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/50">
                        <button onClick={() => setView('chat')} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${view === 'chat' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <MessageSquare size={14} /> Helpdesk
                        </button>
                        <button onClick={() => { setView('admin'); setNotifications(0); }} className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${view === 'admin' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}>
                            <div className="relative">
                                <LayoutDashboard size={14} />
                                {notifications > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">{notifications}</span>}
                            </div>
                            {currentUser.isAdmin ? 'Command Center' : 'My Dashboard'}
                        </button>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 mx-2"></div>

                    <div className="relative group">
                        <button className="flex items-center gap-3 hover:bg-zinc-100 p-1.5 rounded-lg transition-colors border border-transparent hover:border-zinc-200">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white ${currentUser.isSuperAdmin ? 'bg-purple-600' : 'bg-brand-800'}`}>
                                {currentUser.avatar}
                            </div>
                            <div className="text-left hidden md:block">
                                <div className="text-xs font-semibold leading-none">{currentUser.name}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">{currentUser.role}</div>
                            </div>
                            <ChevronDown size={14} className="text-zinc-400" />
                        </button>
                        {/* Persona Switcher */}
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-1 text-zinc-800 hidden group-hover:block border border-zinc-200 z-50 animate-fade-in">
                            <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-50 mb-1">Switch Persona</div>
                            {users.map(u => (
                                <button key={u.id} onClick={() => setCurrentUser(u)} className={`w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-zinc-50 ${currentUser.id === u.id ? 'bg-zinc-50 text-brand-800 font-medium' : 'text-zinc-600'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${u.isSuperAdmin ? 'bg-purple-600' : 'bg-zinc-400'}`}>{u.avatar}</div>
                                    <div className="flex flex-col">
                                        <span>{u.name}</span>
                                    </div>
                                    {currentUser.id === u.id && <CheckCircle size={12} className="ml-auto text-brand-800"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex-1 overflow-hidden relative max-w-[1600px] mx-auto w-full">
                {view === 'chat' ? (
                    <ChatInterface 
                        onTicketCreate={handleNewTicket} 
                        categorizer={(text) => TicketEngine.categorise(text, keywords)} 
                        currentUser={currentUser}
                        kbArticles={kbArticles}
                    />
                ) : (
                    <AdminDashboard 
                        tickets={tickets} 
                        onUpdateTicket={updateTicket} 
                        currentUser={currentUser}
                        users={users}
                        onAddUser={handleAddUser}
                        onUpdateUser={handleUpdateUser}
                        keywords={keywords}
                        setKeywords={setKeywords}
                        departments={departments}
                        onAddDepartment={handleAddDepartment}
                        onRemoveDepartment={handleRemoveDepartment}
                        kbArticles={kbArticles}
                        onAddKbArticle={handleAddKbArticle}
                        onRemoveKbArticle={handleRemoveKbArticle}
                        schools={initialSchools}
                    />
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
        if (!forceText) { setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: textToSend }]); setInput(''); }
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
            const ticketId = Math.floor(Math.random() * 1000) + 1000;
            onTicketCreate({
                id: ticketId, user: currentUser.name, role: currentUser.role, school: currentUser.school,
                subject: draftTicket.subject, category: draftTicket.category, isSensitive: draftTicket.isSensitive, owner: draftTicket.owner, 
                status: "Open", created: "Just now", timestamp: Date.now(), priority: priority, context: draftTicket.isSensitive ? "CONFIDENTIAL" : "Mobile Request",
                location: draftTicket.location, assignedTo: null, updates: []
            });
            setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `Ticket #${ticketId} created. Routed to ${draftTicket.owner}.` }]);
            setConversationStep('ISSUE'); setDraftTicket(null); setIsTyping(false);
        }, 1000);
    };

    const handleDeflectionResponse = (success, originalText) => {
        if (success) setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: "That worked!" }, { id: Date.now()+1, sender: 'bot', text: "Great!" }]);
        else { setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: "Still need help." }]); handleSend(null, originalText, true); }
    };

    return (
        <div className="h-full flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-zinc-200 h-[650px] flex flex-col animate-slide-up">
                <div className="bg-brand-800 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                        <span className="font-semibold text-sm">Helpdesk Assistant</span>
                    </div>
                    <MoreHorizontal size={16} className="text-white/60"/>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-zinc-50/50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.isDeflection ? (
                                <div className="max-w-[90%] bg-white border border-amber-200/60 rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-amber-50/50 px-4 py-2 border-b border-amber-100 flex items-center gap-2">
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
                                <div className="max-w-[85%] space-y-2">
                                    <div className="bg-white border border-zinc-200 text-zinc-700 p-3 rounded-2xl rounded-bl-none shadow-sm text-sm leading-relaxed">{msg.text}</div>
                                    <div className="flex gap-2">
                                        {['Low', 'Medium', 'High'].map(p => (
                                            <button key={p} onClick={() => handlePrioritySelect(p)} className="flex-1 px-3 py-2 text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition-all">{p}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={`max-w-[80%] rounded-2xl p-3.5 text-sm shadow-sm leading-relaxed ${msg.sender === 'user' ? 'bg-brand-800 text-white rounded-br-none' : 'bg-white border border-zinc-200 text-zinc-700 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && <div className="text-xs text-zinc-400 ml-4 animate-pulse">Assistant is typing...</div>}
                    <div ref={chatEndRef}></div>
                </div>
                {conversationStep !== 'PRIORITY' && (
                    <form onSubmit={(e) => handleSend(e)} className="p-3 bg-white border-t border-zinc-100 flex gap-2">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={conversationStep === 'LOCATION' ? "Enter room..." : "Describe the issue..."} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 transition-all" />
                        <button type="submit" className="bg-brand-800 text-white p-2.5 rounded-xl hover:bg-brand-900 transition-colors shadow-sm"><Send size={18} /></button>
                    </form>
                )}
            </div>
        </div>
    );
}

function AdminDashboard({ tickets, onUpdateTicket, currentUser, users, onAddUser, onUpdateUser, keywords, setKeywords, departments, onAddDepartment, onRemoveDepartment, kbArticles, onAddKbArticle, onRemoveKbArticle, schools }) {
    const [activeTab, setActiveTab] = useState('tickets');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showLogicModal, setShowLogicModal] = useState(false);
    const [filters, setFilters] = useState({ status: 'ACTIVE', category: 'ALL_CATS', school: 'ALL_SCHOOLS' });

    const visibleTickets = useMemo(() => TicketEngine.getVisibleTickets(tickets, currentUser, filters, keywords), [tickets, currentUser, filters, keywords]);
    const isOverdue = (timestamp, status) => status !== 'Resolved' && (Date.now() - timestamp) / (1000 * 60 * 60) > 24;

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white border-b border-zinc-200 px-8 py-0 flex items-center justify-between sticky top-[60px] z-40 shadow-sm">
                <div className="flex gap-8">
                    {['tickets', 'users', 'kb', 'depts'].map(tab => {
                        if (tab === 'users' && !currentUser.isAdmin) return null;
                        if (tab === 'kb' && !currentUser.isAdmin) return null;
                        if (tab === 'depts' && !currentUser.isSuperAdmin) return null;
                        return (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 text-xs font-medium border-b-2 transition-all ${activeTab === tab ? 'border-brand-800 text-brand-800' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>
                                {tab === 'tickets' ? 'Dashboard' : tab === 'users' ? 'Directory' : tab === 'kb' ? 'Knowledge' : 'Settings'}
                            </button>
                        );
                    })}
                </div>
                {currentUser.isSuperAdmin && (
                    <button onClick={() => setShowLogicModal(true)} className="text-xs flex items-center gap-1.5 text-zinc-600 hover:text-brand-800 transition-colors font-medium">
                        <Settings size={14} /> Logic Config
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden p-8">
                {activeTab === 'users' ? <UserDirectory users={users} currentUser={currentUser} onAddUser={onAddUser} onUpdateUser={onUpdateUser} departments={departments} schools={schools} /> :
                 activeTab === 'depts' ? <DepartmentManager departments={departments} onAdd={onAddDepartment} onRemove={onRemoveDepartment} /> :
                 activeTab === 'kb' ? <KnowledgeBaseManager articles={kbArticles} onAdd={onAddKbArticle} onRemove={onRemoveKbArticle} /> :
                 (
                    <div className="h-full flex gap-8">
                        <div className="w-[380px] flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
                                    <Layers size={16} className="text-zinc-400"/> Ticket Queue
                                </h3>
                                <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{visibleTickets.length}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="input-base text-xs">
                                    <option value="ACTIVE">Open</option><option value="RESOLVED">Closed</option><option value="ALL">All</option>
                                </select>
                                <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="input-base text-xs">
                                    <option value="ALL_CATS">Category</option>{Object.keys(keywords).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={filters.school} onChange={e => setFilters({...filters, school: e.target.value})} className="input-base text-xs col-span-2">
                                    <option value="ALL_SCHOOLS">Location</option>
                                    {((currentUser.accessSchools || []).includes('ALL') ? schools : (currentUser.accessSchools || [])).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="panel flex-1 overflow-hidden flex flex-col bg-white">
                                <div className="overflow-y-auto flex-1 divide-y divide-zinc-50">
                                    {visibleTickets.length === 0 ? (
                                        <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
                                            <EyeOff size={32} className="mb-3 opacity-20"/>
                                            <span className="text-xs">No tickets found</span>
                                        </div>
                                    ) : (
                                        visibleTickets.map(ticket => (
                                            <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`p-4 cursor-pointer transition-all hover:bg-zinc-50/50 group ${selectedTicket?.id === ticket.id ? 'bg-brand-50/50 border-l-2 border-brand-800' : 'border-l-2 border-transparent'}`}>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${ticket.priority === 'High' ? 'bg-red-500' : ticket.priority === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                                                        <span className="text-[10px] font-bold text-zinc-400">#{ticket.id}</span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-400">{new Date(ticket.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className={`text-sm font-medium mb-1 line-clamp-1 ${ticket.isSensitive ? 'text-red-700' : 'text-zinc-800'}`}>{ticket.isSensitive ? 'Confidential Ticket' : ticket.subject}</h4>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">{ticket.category}</span>
                                                    {isOverdue(ticket.timestamp, ticket.status) && <AlertTriangle size={12} className="text-red-500" />}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 panel overflow-hidden bg-white relative">
                            {selectedTicket ? <TicketDetailView ticket={selectedTicket} onUpdateTicket={onUpdateTicket} currentUser={currentUser} /> : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                                    <Command size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-medium">Select a ticket from the queue</p>
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
    const chatRef = useRef(null);

    useEffect(() => { if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [ticket.updates]);

    const handlePost = (e) => {
        e.preventDefault(); if(!newComment.trim()) return;
        onUpdateTicket({ ...ticket, updates: [...ticket.updates, { id: Date.now(), type: 'comment', user: currentUser.name, text: newComment, timestamp: Date.now(), isAdmin: currentUser.isAdmin }] });
        setNewComment('');
    };

    if (ticket.isSensitive && !currentUser.isSuperAdmin) return <div className="h-full flex flex-col items-center justify-center text-red-800"><Lock size={32} className="mb-3"/><h2 className="font-bold">Restricted Access</h2></div>;

    return (
        <div className="h-full flex flex-col relative">
            {isResolving && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in">
                    <div className="w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4 text-zinc-900">Resolve Ticket #{ticket.id}</h3>
                        <textarea className="input-base h-32 mb-4 resize-none" placeholder="Resolution details..." value={resolveNote} onChange={e => setResolveNote(e.target.value)} autoFocus/>
                        <div className="flex gap-3">
                            <button onClick={() => setIsResolving(false)} className="btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
                            <button onClick={() => { onUpdateTicket({ ...ticket, status: 'Resolved', updates: [...ticket.updates, { id: Date.now(), type: 'system', user: 'System', text: `Resolved: ${resolveNote}`, timestamp: Date.now() }] }); setIsResolving(false); }} className="btn-primary px-4 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700">Confirm Resolution</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-zinc-100 flex justify-between items-start bg-white">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${ticket.status === 'Resolved' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{ticket.status}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">#{ticket.id}</span>
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 leading-tight">{ticket.subject}</h2>
                </div>
                {currentUser.isAdmin && ticket.status !== 'Resolved' && (
                    <div className="flex gap-2">
                        {!ticket.assignedTo && <button onClick={() => onUpdateTicket({ ...ticket, assignedTo: currentUser.name, updates: [...ticket.updates, { id: Date.now(), type: 'system', user: 'System', text: `Assigned to ${currentUser.name}`, timestamp: Date.now() }] })} className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium">Assign to Me</button>}
                        <button onClick={() => setIsResolving(true)} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2"><CheckCircle size={14}/> Resolve</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/30" ref={chatRef}>
                <div className="flex gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 text-xs shadow-inner">{ticket.user.charAt(0)}</div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1"><span className="font-semibold text-sm">{ticket.user}</span><span className="text-xs text-zinc-400">opened this ticket</span></div>
                        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-sm text-zinc-800 leading-relaxed">{ticket.subject}</div>
                        <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {ticket.location}</span>
                            <span className="flex items-center gap-1"><Layers size={12}/> {ticket.category}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 relative before:absolute before:left-5 before:top-0 before:bottom-0 before:w-px before:bg-zinc-200 before:-z-10">
                    {ticket.updates.map(u => (
                        <div key={u.id} className={`flex gap-4 ${u.type === 'system' ? 'justify-center pl-0' : ''}`}>
                            {u.type === 'system' ? (
                                <div className="bg-zinc-100 border border-zinc-200 rounded-full px-3 py-1 text-[10px] font-medium text-zinc-500 flex items-center gap-2 z-10"><Activity size={10}/> {u.text}</div>
                            ) : (
                                <>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm z-10 border-2 border-white ${u.isAdmin ? 'bg-brand-800 text-white' : 'bg-zinc-200 text-zinc-600'}`}>{u.user.charAt(0)}</div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2 mb-1"><span className="font-semibold text-sm">{u.user}</span><span className="text-xs text-zinc-400">{new Date(u.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                        <div className={`p-3 rounded-xl border text-sm shadow-sm leading-relaxed ${u.isAdmin ? 'bg-brand-50 border-brand-100 text-brand-900' : 'bg-white border-zinc-200'}`}>{u.text}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {ticket.status !== 'Resolved' && (
                <div className="p-4 bg-white border-t border-zinc-100">
                    <form onSubmit={handlePost} className="relative">
                        <input type="text" className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-800/10 focus:border-brand-800 transition-all text-sm" placeholder="Reply..." value={newComment} onChange={e => setNewComment(e.target.value)} />
                        <button type="submit" className="absolute right-2 top-2 p-1.5 bg-brand-800 text-white rounded-lg hover:bg-brand-900 transition-colors shadow-sm"><Send size={14}/></button>
                    </form>
                </div>
            )}
        </div>
    );
}

function UserDirectory({ users, currentUser, onAddUser, onUpdateUser, departments, schools }) {
    const [editingUser, setEditingUser] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    
    return (
        <div className="h-full flex flex-col max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-xl font-bold text-zinc-900">Directory</h2><p className="text-sm text-zinc-500">Manage access & roles</p></div>
                {currentUser.isSuperAdmin && <button onClick={() => setIsAdding(true)} className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"><UserPlus size={16}/> Add User</button>}
            </div>
            <div className="panel overflow-hidden bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 font-semibold border-b border-zinc-100">
                        <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Access</th><th className="px-6 py-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                                <td className="px-6 py-3 font-medium text-zinc-900 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.isSuperAdmin ? 'bg-purple-600' : 'bg-zinc-400'}`}>{u.avatar}</div>
                                    {u.name}
                                </td>
                                <td className="px-6 py-3 text-zinc-500">{u.role} <span className="text-zinc-300">•</span> {u.dept}</td>
                                <td className="px-6 py-3">
                                    <div className="flex gap-1">
                                        {u.accessSchools?.includes('ALL') ? <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100">GLOBAL</span> : <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded border border-zinc-200">{u.school}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    {currentUser.isSuperAdmin && <button onClick={() => setEditingUser(u)} className="text-zinc-400 hover:text-brand-800"><Edit3 size={16}/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {(editingUser || isAdding) && <UserEditModal user={editingUser} isAdding={isAdding} departments={departments} schools={schools} onClose={() => {setEditingUser(null); setIsAdding(false)}} onSave={(u) => { isAdding ? onAddUser(u) : onUpdateUser(u); setEditingUser(null); setIsAdding(false); }} />}
        </div>
    );
}

function UserEditModal({ user, isAdding, onClose, onSave, departments, schools }) {
    const [formData, setFormData] = useState(user ? { ...user, accessSchools: user.accessSchools || [user.school] } : { name: '', role: 'Staff', dept: departments[0], school: schools[0], isAdmin: false, isSuperAdmin: false, avatar: 'NU', accessScopes: [], accessSchools: [schools[0]] });
    const toggleSchoolAccess = (s) => {
        const current = formData.accessSchools || [];
        if (s === 'ALL') setFormData({ ...formData, accessSchools: current.includes('ALL') ? [formData.school] : ['ALL'] });
        else {
            let newS = current.includes('ALL') ? [] : [...current];
            if (newS.includes(s)) { if (s !== formData.school) newS = newS.filter(x => x !== s); } else newS.push(s);
            setFormData({ ...formData, accessSchools: newS });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-slide-up border border-zinc-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-zinc-900">{isAdding ? 'New User' : 'Edit Profile'}</h3>
                    <button onClick={onClose}><X size={20} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Name</label><input type="text" className="input-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Role</label><input type="text" className="input-base" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Dept</label><select className="input-base" value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Access Matrix</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => toggleSchoolAccess('ALL')} className={`p-2 rounded border text-xs font-medium transition-all ${formData.accessSchools?.includes('ALL') ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-zinc-600 border-zinc-200'}`}>Global Access</button>
                            {schools.map(s => <button key={s} onClick={() => toggleSchoolAccess(s)} disabled={formData.accessSchools?.includes('ALL') || s === formData.school} className={`p-2 rounded border text-xs font-medium transition-all ${s === formData.school ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : (formData.accessSchools?.includes(s) ? 'bg-brand-800 text-white border-brand-800' : 'bg-white text-zinc-600 border-zinc-200')}`}>{s}</button>)}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <input type="checkbox" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} className="rounded text-brand-800 focus:ring-brand-800" />
                        <span className="text-sm font-medium text-zinc-700">Grant Admin Privileges</span>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-100">
                    <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button>
                    <button onClick={() => onSave(formData)} className="btn-primary px-4 py-2 rounded-lg text-sm">Save Changes</button>
                </div>
            </div>
        </div>
    );
}

function DepartmentManager({ departments, onAdd, onRemove }) {
    const [newDept, setNewDept] = useState('');
    return (
        <div className="max-w-3xl mx-auto mt-8">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                    <div><h2 className="text-lg font-bold text-zinc-900">Departments</h2><p className="text-xs text-zinc-500">Organizational structure</p></div>
                </div>
                <div className="p-6">
                    <form onSubmit={(e) => { e.preventDefault(); if(newDept.trim()) { onAdd(newDept.trim()); setNewDept(''); } }} className="flex gap-2 mb-6">
                        <input type="text" className="input-base" placeholder="New Department Name..." value={newDept} onChange={e => setNewDept(e.target.value)} />
                        <button type="submit" className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={16}/> Add</button>
                    </form>
                    <div className="grid grid-cols-3 gap-3">
                        {departments.map(d => (
                            <div key={d} className="flex justify-between items-center p-3 bg-zinc-50 border border-zinc-200 rounded-lg group">
                                <span className="font-medium text-sm text-zinc-700">{d}</span>
                                <button onClick={() => onRemove(d)} className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
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
        <div className="max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-xl font-bold text-zinc-900">Knowledge Base</h2><p className="text-sm text-zinc-500">Deflection articles</p></div>
                <button onClick={() => setIsAdding(true)} className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus size={16}/> Add Article</button>
            </div>
            
            {isAdding && (
                <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm mb-6 animate-slide-up">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Title</label><input type="text" className="input-base" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Solution</label><textarea className="input-base h-24" value={form.content} onChange={e => setForm({...form, content: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Triggers</label><input type="text" className="input-base" value={form.triggers} onChange={e => setForm({...form, triggers: e.target.value})} placeholder="wifi, slow, connect"/></div>
                        <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAdding(false)} className="btn-secondary px-4 py-2 rounded-lg text-sm">Cancel</button><button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm">Save</button></div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                {articles.map(a => (
                    <div key={a.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow relative group">
                        <button onClick={() => onRemove(a.id)} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                        <h3 className="font-bold text-zinc-900 mb-2">{a.title}</h3>
                        <p className="text-sm text-zinc-600 line-clamp-3 mb-4">{a.content}</p>
                        <div className="flex gap-2 flex-wrap">{a.triggers.map(t => <span key={t} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-1 rounded border border-zinc-200">{t}</span>)}</div>
                    </div>
                ))}
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col animate-slide-up border border-zinc-200">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                    <div><h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Settings size={18} /> Routing Logic</h3><p className="text-xs text-zinc-500">Configure automated ticket distribution</p></div>
                    <button onClick={onClose}><X size={20} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                <div className="p-6 overflow-y-auto bg-zinc-50/50 flex-1 space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                        {isCreating ? (
                            <div className="flex gap-4 items-end">
                                <div className="flex-1"><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Category</label><input type="text" className="input-base" value={newCatName} onChange={e => setNewCatName(e.target.value)} /></div>
                                <div><label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Dept</label><select className="input-base" value={newCatOwner} onChange={e => setNewCatOwner(e.target.value)}>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                                <button onClick={handleCreateCategory} className="btn-primary px-4 py-2 rounded-lg text-sm h-[38px]">Save</button>
                                <button onClick={() => setIsCreating(false)} className="btn-secondary px-4 py-2 rounded-lg text-sm h-[38px]">Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreating(true)} className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:border-brand-800 hover:text-brand-800 hover:bg-brand-50 transition-all text-sm font-medium flex items-center justify-center gap-2">
                                <Plus size={16} /> Add New Routing Rule
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {Object.entries(keywords).map(([cat, data]) => (
                            <div key={cat} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-zinc-100 p-2 rounded-lg"><Layers size={16} className="text-zinc-500"/></div>
                                        <div><h4 className="text-sm font-bold text-zinc-900">{cat}</h4><span className="text-xs text-zinc-500">Routed to: {data.owner}</span></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${data.sensitive ? 'bg-red-50 text-red-600 border-red-100' : 'bg-zinc-50 text-zinc-500 border-zinc-100'}`}>{data.sensitive ? 'CONFIDENTIAL' : 'PUBLIC'}</span>
                                        <button onClick={() => {const n = {...keywords}; delete n[cat]; setKeywords(n);}} className="text-zinc-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {data.keywords.map(kw => (
                                        <span key={kw} className="text-xs bg-zinc-50 text-zinc-600 px-3 py-1 rounded-full border border-zinc-200 flex items-center gap-1">
                                            {kw} <button onClick={() => handleRemoveKeyword(cat, kw)} className="hover:text-red-500"><X size={10}/></button>
                                        </span>
                                    ))}
                                    <input type="text" placeholder="+ keyword" className="text-xs bg-transparent border-b border-dashed border-zinc-300 focus:border-brand-800 focus:outline-none w-20 px-1" 
                                        value={newKeywordInputs[cat] || ''} onChange={e => setNewKeywordInputs({...newKeywordInputs, [cat]: e.target.value})} onKeyDown={e => handleAddKeyword(cat, e)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
