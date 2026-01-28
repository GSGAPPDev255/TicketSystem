import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, School 
} from 'lucide-react';

// --- ICONS MAPPING ---
// We map these to keep your dynamic icon rendering logic intact
const Icons = {
    MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle,
    Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter,
    ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock,
    Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers,
    Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, School
};

// --- BUSINESS LOGIC ENGINE (THE IRON DOME V6) ---
const TicketEngine = {
    getVisibleTickets: (tickets, currentUser, filters, keywords) => {
        return tickets.filter(t => {
            // 1. Global Filters
            if (filters.status === 'ACTIVE' && t.status === 'Resolved') return false;
            if (filters.status === 'RESOLVED' && t.status !== 'Resolved') return false;
            if (filters.category !== 'ALL_CATS' && t.category !== filters.category) return false;
            if (filters.school && filters.school !== 'ALL_SCHOOLS' && t.school !== filters.school) return false;

            // 2. Super Admin (God Mode)
            if (currentUser.isSuperAdmin) return true;

            // 3. The "Own Ticket" Fallback (I can always see what I requested)
            if (t.user === currentUser.name) return true;

            // 4. Access Matrix Logic
            
            // A. Vertical Access (Department)
            const categoryConfig = keywords[t.category];
            const ticketOwnerDept = categoryConfig ? categoryConfig.owner : 'Unassigned';
            
            // Do I belong to this dept OR have an override scope for it?
            const userScopes = currentUser.accessScopes || [];
            const hasDeptAccess = (currentUser.dept === ticketOwnerDept) || userScopes.includes(ticketOwnerDept);

            if (!hasDeptAccess) return false;

            // B. Horizontal Access (Geography/School)
            const userSchools = currentUser.accessSchools || [];
            
            // "ALL" Wildcard (For HQ/IT Staff)
            if (userSchools.includes('ALL')) return true;

            // Specific School Match
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
    { 
        id: 901, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "Printer jam in Staff Room", category: "Facilities", isSensitive: false, status: "Open", timestamp: now - (10 * mins), priority: "Low", context: "Printer Area B", location: "Staff Room", assignedTo: null, 
        updates: [ { id: 1, type: 'comment', user: 'Mike Ross', text: 'I tried opening tray 2 but it is stuck.', timestamp: now - (9 * mins) } ] 
    },
    { 
        id: 902, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "VPN keeps disconnecting", category: "IT - Network", isSensitive: false, status: "In Progress", timestamp: now - (2 * hours), priority: "High", context: "Asset: MacBook Pro M2", location: "Remote", assignedTo: 'John Doe', 
        updates: [ { id: 1, type: 'system', user: 'System', text: 'Ticket created', timestamp: now - (2 * hours) } ] 
    },
    { 
        id: 903, user: "Sarah Jenkins", role: "Teacher", school: "St. Marys", subject: "Classroom 3B lights flickering", category: "Facilities", isSensitive: false, status: "Vendor Pending", timestamp: now - (26 * hours), priority: "Medium", context: "Electrician Called", location: "Room 3B", assignedTo: 'Paulo Birch', 
        updates: [] 
    },
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

// --- COMPONENTS ---

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

    const handleNewTicket = (ticket) => {
        setTickets([ticket, ...tickets]);
        setNotifications(prev => prev + 1);
    };

    const updateTicket = (updatedTicket) => {
        setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    };

    const handleAddUser = (newUser) => {
        const userWithAccess = { 
            ...newUser, 
            id: `u${Date.now()}`,
            accessSchools: newUser.accessSchools && newUser.accessSchools.length > 0 ? newUser.accessSchools : [newUser.school]
        };
        setUsers([...users, userWithAccess]);
    };

    const handleUpdateUser = (updatedUser) => {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    };

    const handleAddDepartment = (newDept) => {
        if (departments.includes(newDept)) return alert("Department already exists");
        setDepartments([...departments, newDept]);
    };

    const handleRemoveDepartment = (deptToRemove) => {
        if (confirm(`Delete ${deptToRemove}?`)) {
            setDepartments(departments.filter(d => d !== deptToRemove));
        }
    };

    const handleAddKbArticle = (article) => {
        setKbArticles([...kbArticles, { ...article, id: `kb${Date.now()}` }]);
    };

    const handleRemoveKbArticle = (id) => {
        if (confirm('Delete this knowledge base article?')) {
            setKbArticles(kbArticles.filter(kb => kb.id !== id));
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans text-slate-800">
            <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                    <span className="font-bold text-lg tracking-tight">CorpTicket <span className="text-xs font-normal text-slate-400">Internal</span></span>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setView('chat')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'chat' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <MessageSquare size={16} /> Slack View
                        </button>
                        <button onClick={() => { setView('admin'); setNotifications(0); }} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <div className="relative">
                                <LayoutDashboard size={16} />
                                {notifications > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">{notifications}</span>}
                            </div>
                            {currentUser.isAdmin ? 'Admin View' : 'My Dashboard'}
                        </button>
                    </div>

                    <div className="border-l border-slate-700 pl-6 flex items-center gap-3">
                        <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Logged in as:</span>
                        <div className="relative group">
                            <button className="flex items-center gap-2 hover:bg-slate-800 p-2 rounded transition-colors">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentUser.isSuperAdmin ? 'bg-purple-600' : currentUser.dept === 'IT' ? 'bg-indigo-500' : 'bg-orange-500'}`}>
                                    {currentUser.avatar}
                                </div>
                                <div className="text-left hidden md:block">
                                    <div className="text-sm font-medium leading-none">{currentUser.name}</div>
                                    <div className="text-[10px] text-slate-400">{currentUser.role} • {currentUser.school}</div>
                                </div>
                                <ChevronDown size={14} className="text-slate-500" />
                            </button>
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-1 text-slate-800 hidden group-hover:block border border-slate-200 z-50">
                                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Persona (Mock)</div>
                                {users.map(u => (
                                    <button key={u.id} onClick={() => setCurrentUser(u)} className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${currentUser.id === u.id ? 'bg-blue-50 text-blue-600' : ''}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${u.isSuperAdmin ? 'bg-purple-600' : u.dept === 'IT' ? 'bg-indigo-500' : 'bg-orange-500'}`}>{u.avatar}</div>
                                        <div className="flex flex-col">
                                            <span className="leading-none">{u.name}</span>
                                            <span className="text-[10px] text-slate-400">{u.school}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex-1 overflow-hidden relative">
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

// --- SUB COMPONENTS (ChatInterface, AdminDashboard, etc.) ---

function ChatInterface({ onTicketCreate, categorizer, currentUser, kbArticles }) {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'bot', text: 'Hi! I am the Helpdesk Bot. Describe your issue and I will route it for you.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationStep, setConversationStep] = useState('ISSUE');
    const [draftTicket, setDraftTicket] = useState(null);
    const chatEndRef = useRef(null);

    const checkKnowledgeBase = (text) => {
        const lower = text.toLowerCase();
        return kbArticles.find(kb => kb.triggers.some(t => lower.includes(t.toLowerCase())));
    };

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
                        setMessages(prev => [...prev, { 
                            id: Date.now(), sender: 'bot', 
                            text: `Wait! I found a Knowledge Base article:`,
                            isDeflection: true, kbData: kbMatch, originalText: textToSend 
                        }]);
                        setIsTyping(false);
                        return;
                    }
                }

                const result = categorizer(textToSend);
                setDraftTicket({
                    subject: textToSend,
                    category: result.category,
                    owner: result.owner,
                    isSensitive: result.isSensitive
                });

                setConversationStep('LOCATION');
                setMessages(prev => [...prev, { 
                    id: Date.now(), 
                    sender: 'bot', 
                    text: `I see this is a ${result.category} issue. **Please tell me your location** (e.g., Room 3B, Staff Room).` 
                }]);
                setIsTyping(false);

            } else if (conversationStep === 'LOCATION') {
                setDraftTicket(prev => ({ ...prev, location: textToSend }));
                setConversationStep('PRIORITY');
                setMessages(prev => [...prev, { 
                    id: Date.now(), 
                    sender: 'bot', 
                    text: `Got it. And what is the priority level for this issue?`,
                    isPrioritySelect: true 
                }]);
                setIsTyping(false);
            }
        }, 1000);
    };

    const handlePrioritySelect = (priority) => {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: priority }]);
        setIsTyping(true);

        setTimeout(() => {
            const ticketId = Math.floor(Math.random() * 1000) + 1000;
            
            onTicketCreate({
                id: ticketId,
                user: currentUser.name,
                role: currentUser.role,
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
                assignedTo: null,
                updates: []
            });

            let replyText = `Ticket #${ticketId} created for ${draftTicket.location}. Routed to ${draftTicket.owner} team. Someone from the Team will contact you.`;
            
            setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: replyText }]);
            
            setConversationStep('ISSUE');
            setDraftTicket(null);
            setIsTyping(false);
        }, 1000);
    }

    const handleDeflectionResponse = (success, originalText) => {
        if (success) {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: "That worked! Thanks." }, { id: Date.now()+1, sender: 'bot', text: "Great! No ticket was created. Have a nice day! 🎉" }]);
        } else {
            setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: "Didn't work. Create ticket." }]);
            handleSend(null, originalText, true);
        }
    };

    return (
        <div className="h-full flex flex-col justify-center items-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 h-[600px] flex flex-col">
                <div className="bg-[#4A154B] p-4 flex items-center gap-3 text-white">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="font-bold">Helpdesk Bot</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.isDeflection ? (
                                <div className="max-w-[85%] bg-white border border-yellow-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100 flex items-center gap-2">
                                        <Lightbulb size={16} className="text-yellow-600" />
                                        <span className="text-xs font-bold text-yellow-700">Smart Suggestion</span>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-800 text-sm mb-2">{msg.kbData.title}</h4>
                                        <p className="text-xs text-slate-600 whitespace-pre-wrap mb-4">{msg.kbData.content}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDeflectionResponse(true, msg.originalText)} className="flex-1 bg-green-100 text-green-700 text-xs py-2 rounded-lg font-bold hover:bg-green-200 flex items-center justify-center gap-1">
                                                <ThumbsUp size={12}/> It Worked
                                            </button>
                                            <button onClick={() => handleDeflectionResponse(false, msg.originalText)} className="flex-1 bg-slate-100 text-slate-600 text-xs py-2 rounded-lg font-bold hover:bg-slate-200">
                                                Still Broken
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : msg.isPrioritySelect ? (
                                <div className="max-w-[80%] flex flex-col gap-2">
                                    <div className="bg-white border border-slate-200 text-slate-800 p-3 rounded-lg rounded-bl-none shadow-sm text-sm">
                                        {msg.text}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handlePrioritySelect('Low')} className="bg-green-100 text-green-700 text-xs px-3 py-2 rounded-lg font-bold hover:bg-green-200">Low</button>
                                        <button onClick={() => handlePrioritySelect('Medium')} className="bg-yellow-100 text-yellow-700 text-xs px-3 py-2 rounded-lg font-bold hover:bg-yellow-200">Medium</button>
                                        <button onClick={() => handlePrioritySelect('High')} className="bg-red-100 text-red-700 text-xs px-3 py-2 rounded-lg font-bold hover:bg-red-200">High</button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                                    <p>{msg.text}</p>
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && <div className="text-xs text-gray-400 ml-4">Bot is typing...</div>}
                    <div ref={chatEndRef}></div>
                </div>
                {conversationStep !== 'PRIORITY' && (
                    <form onSubmit={(e) => handleSend(e)} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            placeholder={conversationStep === 'LOCATION' ? "Enter room/location..." : "Describe issue..."}
                            className="flex-1 bg-gray-100 border-0 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                        <button type="submit" className="bg-green-700 text-white p-2 rounded-md hover:bg-green-800"><Send size={18} /></button>
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
    const [categoryFilter, setCategoryFilter] = useState('ALL_CATS');
    const [statusFilter, setStatusFilter] = useState('ACTIVE'); 
    const [schoolFilter, setSchoolFilter] = useState('ALL_SCHOOLS');

    const visibleTickets = useMemo(() => {
        return TicketEngine.getVisibleTickets(
            tickets, 
            currentUser, 
            { status: statusFilter, category: categoryFilter, school: schoolFilter }, 
            keywords
        );
    }, [tickets, currentUser, keywords, categoryFilter, statusFilter, schoolFilter]);

    const getTimeAgo = (timestamp) => {
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return `${Math.floor(diff / (1000 * 60))} mins ago`;
        if (hours < 24) return `${hours} hrs ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    const isOverdue = (timestamp, status) => {
        const hours = (Date.now() - timestamp) / (1000 * 60 * 60);
        return status !== 'Resolved' && hours > 24;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
                <div className="flex gap-6">
                    <button onClick={() => setActiveTab('tickets')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {currentUser.isAdmin ? 'Ticket Dashboard' : 'My Request History'}
                    </button>
                    
                    {currentUser.isAdmin && (
                        <button onClick={() => setActiveTab('users')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>User Directory</button>
                    )}
                    {currentUser.isAdmin && (
                        <button onClick={() => setActiveTab('kb')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kb' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Knowledge Base</button>
                    )}
                    {currentUser.isSuperAdmin && (
                        <button onClick={() => setActiveTab('depts')} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'depts' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Departments</button>
                    )}
                </div>
                
                {currentUser.isSuperAdmin && (
                    <button onClick={() => setShowLogicModal(true)} className="text-xs flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors border border-slate-200 font-medium">
                        <Settings size={14} /> Logic Config
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === 'users' && currentUser.isAdmin ? (
                    <UserDirectory users={users} currentUser={currentUser} onAddUser={onAddUser} onUpdateUser={onUpdateUser} departments={departments} schools={schools} />
                ) : activeTab === 'depts' && currentUser.isSuperAdmin ? (
                    <DepartmentManager departments={departments} onAdd={onAddDepartment} onRemove={onRemoveDepartment} />
                ) : activeTab === 'kb' && currentUser.isAdmin ? (
                    <KnowledgeBaseManager articles={kbArticles} onAdd={onAddKbArticle} onRemove={onRemoveKbArticle} />
                ) : (
                    <div className="h-full p-6 flex gap-6">
                        <div className="w-2/5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    {currentUser.isAdmin ? <Layers size={18}/> : <History size={18}/>}
                                    {currentUser.isSuperAdmin ? "Global Ticket Queue" : currentUser.isAdmin ? `${currentUser.dept} Work Queue` : "My Requests"}
                                </h3>
                                <span className="text-xs text-slate-400">{visibleTickets.length} tickets</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <select 
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 rounded text-sm bg-white font-medium text-slate-700"
                                    >
                                        <option value="ACTIVE">Active Tickets</option>
                                        <option value="RESOLVED">Resolved History</option>
                                        <option value="ALL">All Tickets</option>
                                    </select>

                                    <select 
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="flex-1 p-2 border border-slate-300 rounded text-sm bg-white"
                                    >
                                        <option value="ALL_CATS">All Categories</option>
                                        {Object.keys(keywords).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <select 
                                    value={schoolFilter}
                                    onChange={(e) => setSchoolFilter(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded text-sm bg-white font-medium text-slate-700"
                                >
                                    <option value="ALL_SCHOOLS">All Locations</option>
                                    {((currentUser.accessSchools || []).includes('ALL') ? schools : (currentUser.accessSchools || [])).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                                <div className="overflow-y-auto flex-1">
                                    {visibleTickets.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <div className="mb-2"><EyeOff size={24} className="mx-auto opacity-50"/></div>
                                            {currentUser.isAdmin ? "No tickets found in this view." : "You haven't raised any tickets yet."}
                                        </div>
                                    ) : (
                                        visibleTickets.map(ticket => (
                                            <div 
                                                key={ticket.id} 
                                                onClick={() => setSelectedTicket(ticket)}
                                                className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'} ${ticket.isSensitive ? 'bg-red-50 hover:bg-red-100' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex gap-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${ticket.category.includes('Facilities') ? 'bg-orange-100 text-orange-700' : ticket.isSensitive ? 'bg-red-800 text-white' : 'bg-purple-100 text-purple-700'}`}>
                                                            {ticket.category}
                                                        </span>
                                                        <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                                                            <School size={10} /> {ticket.school}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isOverdue(ticket.timestamp, ticket.status) && (
                                                            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-200 animate-pulse">OVERDUE</span>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-mono">{getTimeAgo(ticket.timestamp)}</span>
                                                    </div>
                                                </div>
                                                <h3 className="font-medium text-slate-800 text-sm mb-1 truncate">
                                                    {ticket.isSensitive ? "CONFIDENTIAL ISSUE" : ticket.subject}
                                                </h3>
                                                <div className="flex justify-between items-center mt-2">
                                                    <div className="flex items-center gap-2 text-xs text-slate-500"><User size={12} /> {ticket.user}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                            ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-700' : 
                                                            ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                            {ticket.priority}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{ticket.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-3/5">
                            {selectedTicket ? <TicketDetailView ticket={selectedTicket} onUpdateTicket={onUpdateTicket} currentUser={currentUser} /> : <div className="h-full bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400"><Search size={48} className="mb-4 opacity-50" /><p>Select a ticket to view details</p></div>}
                        </div>
                    </div>
                )}
            </div>

            {showLogicModal && (
                <LogicConfigModal 
                    keywords={keywords} 
                    setKeywords={setKeywords} 
                    departments={departments}
                    onClose={() => setShowLogicModal(false)} 
                />
            )}
        </div>
    );
}

function KnowledgeBaseManager({ articles, onAdd, onRemove }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newTriggers, setNewTriggers] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!newTitle.trim() || !newContent.trim() || !newTriggers.trim()) return alert("Fill all fields");
        
        onAdd({
            title: newTitle,
            content: newContent,
            triggers: newTriggers.split(',').map(t => t.trim()).filter(Boolean)
        });
        
        setIsAdding(false);
        setNewTitle('');
        setNewContent('');
        setNewTriggers('');
    };

    return (
        <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full pb-20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BookOpen size={24}/> Knowledge Base</h2>
                    <p className="text-sm text-slate-500">Manage automated deflection articles.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
                    <Plus size={16} /> Add Article
                </button>
            </div>

            {isAdding && (
                <div className="bg-white border border-indigo-200 rounded-xl p-6 mb-6 shadow-sm animate-pulse-once">
                    <h3 className="font-bold text-indigo-900 mb-4">New Troubleshooting Article</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. How to fix a paper jam" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Content (The solution)</label>
                            <textarea className="w-full p-2 border border-slate-300 rounded text-sm h-24" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Step 1: Open tray..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trigger Keywords (Comma separated)</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" value={newTriggers} onChange={e => setNewTriggers(e.target.value)} placeholder="printer, jam, paper, tray" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded text-sm font-medium hover:bg-slate-200">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700">Save Article</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.map(kb => (
                    <div key={kb.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                        <button onClick={() => onRemove(kb.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={16} /></button>
                        <h4 className="font-bold text-slate-800 mb-2 pr-6">{kb.title}</h4>
                        <p className="text-xs text-slate-600 line-clamp-3 mb-3">{kb.content}</p>
                        <div className="flex flex-wrap gap-1">
                            {kb.triggers.map((t, i) => (
                                <span key={i} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">{t}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DepartmentManager({ departments, onAdd, onRemove }) {
    const [newDept, setNewDept] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!newDept.trim()) return;
        onAdd(newDept.trim());
        setNewDept('');
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden mb-6">
                <div className="bg-purple-600 px-6 py-4 flex items-center justify-between text-white">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2"><Layers size={24}/> Department Management</h2>
                        <p className="text-purple-200 text-sm">Super Admin Access Only</p>
                    </div>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={newDept}
                            onChange={e => setNewDept(e.target.value)}
                            placeholder="Enter new department name (e.g. Legal, Logistics)"
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-2">
                            <Plus size={16} /> Add
                        </button>
                    </form>

                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Active Departments</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {departments.map(dept => (
                            <div key={dept} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 group hover:border-red-200 transition-colors">
                                <span className="font-medium text-slate-700">{dept}</span>
                                <button onClick={() => onRemove(dept)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-all shadow-sm">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
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
            if (!newKeywords[cat].keywords.includes(word)) {
                newKeywords[cat].keywords.push(word);
                setKeywords(newKeywords);
            }
            setNewKeywordInputs({ ...newKeywordInputs, [cat]: '' });
        }
    };

    const handleRemoveKeyword = (cat, word) => {
        const newKeywords = { ...keywords };
        newKeywords[cat].keywords = newKeywords[cat].keywords.filter(w => w !== word);
        setKeywords(newKeywords);
    };

    const handleChangeOwner = (cat, newOwner) => {
        const newKeywords = { ...keywords, [cat]: { ...keywords[cat], owner: newOwner } };
        setKeywords(newKeywords);
    };

    const toggleSensitive = (cat) => {
        const newKeywords = { ...keywords, [cat]: { ...keywords[cat], sensitive: !keywords[cat].sensitive } };
        setKeywords(newKeywords);
    };

    const handleCreateCategory = () => {
        if (!newCatName.trim()) return alert("Please enter a category name.");
        if (keywords[newCatName]) return alert("This category already exists.");

        const updatedKeywords = {
            [newCatName]: {
                owner: newCatOwner,
                sensitive: newCatSensitive,
                score: 0,
                keywords: []
            },
            ...keywords
        };
        setKeywords(updatedKeywords);
        setIsCreating(false);
        setNewCatName('');
        setNewCatOwner(departments[0]);
        setNewCatSensitive(false);
    };

    const handleDeleteCategory = (catName) => {
        if (confirm(`Are you sure you want to delete the category "${catName}"?`)) {
            const updatedKeywords = { ...keywords };
            delete updatedKeywords[catName];
            setKeywords(updatedKeywords);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center modal-overlay p-4">
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col slide-in">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Settings size={18} /> Routing Matrix & Logic Brain
                        </h3>
                        <p className="text-xs text-slate-500">Map categories to departments and set confidentiality rules.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded"><X size={24}/></button>
                </div>
                
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    {isCreating ? (
                        <div className="flex flex-col md:flex-row gap-3 items-end md:items-center animate-pulse-once bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                            <div className="flex-1 w-full">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Category Name</label>
                                <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Finance - Payroll" className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Owner Dept</label>
                                <select value={newCatOwner} onChange={(e) => setNewCatOwner(e.target.value)} className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 bg-white">
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pb-2">
                                <input type="checkbox" id="newSens" checked={newCatSensitive} onChange={(e) => setNewCatSensitive(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="newSens" className="text-xs font-medium text-slate-700">Confidential?</label>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">Cancel</button>
                                <button onClick={handleCreateCategory} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm flex items-center gap-1"><Save size={14} /> Save</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreating(true)} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-sm font-medium flex items-center justify-center gap-2">
                            <Plus size={16} /> New Category
                        </button>
                    )}
                </div>

                <div className="p-6 overflow-y-auto bg-slate-50/50">
                    <div className="grid grid-cols-1 gap-6">
                        {Object.entries(keywords).map(([cat, data]) => (
                            <div key={cat} className={`bg-white border rounded-lg p-4 shadow-sm transition-all ${data.sensitive ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold uppercase text-slate-800">{cat}</h4>
                                            <button onClick={() => handleDeleteCategory(cat)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select value={data.owner} onChange={(e) => handleChangeOwner(cat, e.target.value)} className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 font-medium">
                                                {departments.map(dept => <option key={dept} value={dept}>{dept} Dept</option>)}
                                            </select>
                                            <button onClick={() => toggleSensitive(cat)} className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 transition-all ${data.sensitive ? 'bg-red-600 text-white border-red-700' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'}`}>
                                                {data.sensitive ? <><Lock size={10}/> CONFIDENTIAL</> : <><Globe size={10}/> PUBLIC</>}
                                            </button>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{data.keywords.length} keywords</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {data.keywords.map(kw => (
                                        <div key={kw} className="keyword-pill group relative px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200 flex items-center gap-1 transition-all cursor-default">
                                            {kw}
                                            <button onClick={() => handleRemoveKeyword(cat, kw)} className="text-red-400 hover:text-red-600 flex items-center justify-center bg-white rounded-full w-4 h-4 shadow-sm border border-red-100 ml-1"><X size={10} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Plus size={14} className="absolute left-3 top-2.5 text-slate-400"/>
                                    <input type="text" placeholder={`Add keyword to ${cat}... (Press Enter)`} className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" 
                                        value={newKeywordInputs[cat] || ''} onChange={(e) => setNewKeywordInputs({ ...newKeywordInputs, [cat]: e.target.value })} onKeyDown={(e) => handleAddKeyword(cat, e)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl text-right flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 shadow-lg">Close Configuration</button>
                </div>
            </div>
        </div>
    );
}

function UserDirectory({ users, currentUser, onAddUser, onUpdateUser, departments, schools }) {
    const [editingUser, setEditingUser] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const UserRow = ({ user }) => (
        <div className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 group">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${user.isSuperAdmin ? 'bg-purple-600' : user.dept === 'IT' ? 'bg-indigo-500' : user.dept === 'Site' ? 'bg-orange-500' : 'bg-slate-400'}`}>
                    {user.avatar}
                </div>
                <div>
                    <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                        {user.name}
                        {user.isSuperAdmin && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold">SUPER ADMIN</span>}
                    </div>
                    <div className="text-xs text-slate-500 flex gap-2">
                        <span>{user.role}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1"><School size={10}/> {user.school}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex gap-1">
                     {(user.accessSchools && user.accessSchools.includes('ALL')) && (
                        <span className="text-[8px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded border border-purple-200">GLOBAL</span>
                     )}
                     {(user.accessSchools && !user.accessSchools.includes('ALL') && user.accessSchools.length > 1) && (
                        <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200">MULTI-SITE</span>
                     )}
                </div>

                {user.accessScopes && user.accessScopes.length > 0 && (
                    <div className="flex -space-x-1 mr-2">
                        {user.accessScopes.map(scope => (
                            <div key={scope} className="w-5 h-5 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[8px] font-bold text-blue-600" title={`Has access to ${scope}`}>
                                {scope.substring(0,2)}
                            </div>
                        ))}
                    </div>
                )}
                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded w-20 text-center">{user.dept}</span>
                {currentUser.isSuperAdmin && (
                    <button onClick={() => setEditingUser(user)} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 px-3 py-1 rounded-md text-xs font-medium transition-all shadow-sm">
                        <Edit3 size={12} /> Edit
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full pb-20">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-700">Staff Directory</h2>
                {currentUser.isSuperAdmin && (
                    <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
                        <UserPlus size={16} /> Add New Hire
                    </button>
                )}
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                 <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wider">All Users</div>
                 {users.map(u => <UserRow key={u.id} user={u} />)}
            </div>

            {(editingUser || isAdding) && (
                <UserEditModal 
                    user={editingUser} 
                    isAdding={isAdding}
                    departments={departments}
                    schools={schools}
                    onClose={() => { setEditingUser(null); setIsAdding(false); }}
                    onSave={(u) => { 
                        isAdding ? onAddUser(u) : onUpdateUser(u); 
                        setEditingUser(null); 
                        setIsAdding(false); 
                    }}
                />
            )}
        </div>
    );
}

function UserEditModal({ user, isAdding, onClose, onSave, departments, schools }) {
    const [formData, setFormData] = useState(
        user ? { ...user, accessSchools: user.accessSchools || [user.school] } 
             : { name: '', role: 'Staff', dept: departments[0], school: schools[0], isAdmin: false, isSuperAdmin: false, avatar: 'NU', accessScopes: [], accessSchools: [schools[0]] }
    );

    const toggleScope = (dept) => {
        const current = formData.accessScopes || [];
        if (current.includes(dept)) {
            setFormData({ ...formData, accessScopes: current.filter(d => d !== dept) });
        } else {
            setFormData({ ...formData, accessScopes: [...current, dept] });
        }
    };

    const toggleSchoolAccess = (schoolName) => {
        const current = formData.accessSchools || [];
        
        if (schoolName === 'ALL') {
            if (current.includes('ALL')) {
                setFormData({ ...formData, accessSchools: [formData.school] });
            } else {
                setFormData({ ...formData, accessSchools: ['ALL'] });
            }
            return;
        }

        let newSchools = current.includes('ALL') ? [] : [...current];

        if (newSchools.includes(schoolName)) {
            if (schoolName === formData.school) {
                alert("Cannot remove access to the user's Primary Campus.");
                return;
            }
            newSchools = newSchools.filter(s => s !== schoolName);
        } else {
            newSchools.push(schoolName);
        }
        
        setFormData({ ...formData, accessSchools: newSchools });
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center modal-overlay p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 slide-in border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{isAdding ? 'Onboard New Hire' : 'Edit User Profile'}</h3>
                        <p className="text-xs text-slate-500">Configure Identity & Access Matrix</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <div className="space-y-5 overflow-y-auto flex-1 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                            <input type="text" className="w-full p-2 border border-slate-300 rounded text-sm" 
                                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Primary Dept</label>
                            <select className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                                value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-2">
                            <MapPin size={14} /> Geographic Access (Schools)
                        </label>
                        
                        <div className="mb-3">
                            <label className="text-[10px] text-slate-500 uppercase font-bold">Home Campus (Primary)</label>
                            <select className="w-full p-2 mt-1 border border-slate-300 rounded text-sm bg-white"
                                value={formData.school} 
                                onChange={e => {
                                    const newPrimary = e.target.value;
                                    const currentAccess = formData.accessSchools.filter(s => s !== 'ALL');
                                    if (!currentAccess.includes(newPrimary)) currentAccess.push(newPrimary);
                                    setFormData({...formData, school: newPrimary, accessSchools: currentAccess});
                                }}>
                                {schools.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="HQ">HQ (Head Office)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Authorized Locations</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => toggleSchoolAccess('ALL')}
                                    className={`px-3 py-2 text-xs font-bold rounded border flex items-center justify-between group transition-all ${
                                        (formData.accessSchools || []).includes('ALL') 
                                        ? 'bg-purple-600 text-white border-purple-700' 
                                        : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                                    }`}
                                >
                                    <span>Global Access (All Sites)</span>
                                    {(formData.accessSchools || []).includes('ALL') && <CheckCircle size={14}/>}
                                </button>

                                {schools.map(school => {
                                    const isSelected = (formData.accessSchools || []).includes(school) || (formData.accessSchools || []).includes('ALL');
                                    const isPrimary = school === formData.school;
                                    
                                    return (
                                        <button 
                                            key={school}
                                            onClick={() => !isPrimary && toggleSchoolAccess(school)}
                                            disabled={(formData.accessSchools || []).includes('ALL') || isPrimary}
                                            className={`px-3 py-2 text-xs font-medium rounded border flex items-center justify-between transition-all ${
                                                isPrimary 
                                                    ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed' 
                                                    : isSelected
                                                        ? 'bg-blue-600 text-white border-blue-700'
                                                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                                            } ${(formData.accessSchools || []).includes('ALL') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="truncate">{school}</span>
                                            {isPrimary && <span className="text-[9px] bg-slate-300 px-1 rounded text-slate-600">HOME</span>}
                                            {!isPrimary && isSelected && <CheckCircle size={14}/>}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                {(formData.accessSchools || []).includes('ALL') 
                                    ? "User can view and manage tickets from ALL locations." 
                                    : "User can only view tickets from selected locations."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                         <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                             <span className="text-sm font-medium text-slate-700">Administrator Privileges</span>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                         </div>

                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Departmental Overrides</label>
                            <div className="flex flex-wrap gap-2">
                                {departments.filter(d => d !== formData.dept).map(dept => (
                                    <button key={dept} onClick={() => toggleScope(dept)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-all flex items-center gap-1 ${
                                            (formData.accessScopes || []).includes(dept) 
                                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-bold' 
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                        }`}
                                    >
                                        {dept}
                                        {(formData.accessScopes || []).includes(dept) && <X size={12}/>}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded text-sm font-medium">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700 shadow-sm">
                        {isAdding ? 'Create User' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TicketDetailView({ ticket, onUpdateTicket, currentUser }) {
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [resolveNote, setResolveNote] = useState('');
    const [newComment, setNewComment] = useState('');
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if(chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [ticket.updates]);

    const handleAssignToMe = () => {
        const update = { id: Date.now(), type: 'system', user: currentUser.name, text: `Assigned to ${currentUser.name}`, timestamp: Date.now() };
        onUpdateTicket({ ...ticket, status: 'In Progress', assignedTo: currentUser.name, updates: [...ticket.updates, update] });
    };

    const handleResolveConfirm = () => {
        if (!resolveNote.trim()) return alert("Please enter a resolution note.");
        const update = { id: Date.now(), type: 'system', user: currentUser.name, text: `Ticket Resolved: ${resolveNote}`, timestamp: Date.now() };
        onUpdateTicket({ ...ticket, status: 'Resolved', updates: [...ticket.updates, update] });
        setShowResolveModal(false);
        setResolveNote('');
    };

    const handlePostComment = (e) => {
        e.preventDefault();
        if(!newComment.trim()) return;
        const update = { 
            id: Date.now(), 
            type: 'comment', 
            user: currentUser.name, 
            text: newComment, 
            timestamp: Date.now(),
            isAdmin: currentUser.isAdmin
        };
        onUpdateTicket({ ...ticket, updates: [...ticket.updates, update] });
        setNewComment('');
    };

    const ticketDate = new Date(ticket.timestamp);

    if (ticket.isSensitive && !currentUser.isSuperAdmin) {
         return <div className="h-full bg-red-50 flex flex-col items-center justify-center text-red-800 p-8 text-center rounded-xl border border-red-200"><AlertTriangle size={48} className="mb-4"/><h2 className="text-xl font-bold mb-2">ACCESS DENIED</h2><p>This ticket is flagged as CONFIDENTIAL.</p></div>
    }

    return (
        <div className={`bg-white rounded-xl shadow-lg border h-full flex flex-col slide-in relative ${ticket.isSensitive ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200'}`}>
            {ticket.isSensitive && (
                <div className="bg-red-600 text-white text-xs font-bold text-center py-1">
                    CONFIDENTIAL - SUPER ADMIN EYES ONLY
                </div>
            )}
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl font-bold text-slate-800">#{ticket.id}</h1>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ticket.status}</span>
                    </div>
                    <h2 className="text-lg text-slate-700">{ticket.isSensitive ? ticket.category : ticket.subject}</h2>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Calendar size={12} /> Created</span>
                    <span className="text-sm font-bold text-slate-700">{ticketDate.toLocaleDateString()}</span>
                    <span className="text-xs text-slate-500">{ticketDate.toLocaleTimeString()}</span>
                </div>
            </div>

            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500">Assigned Agent: {ticket.assignedTo ? <span className="ml-2 font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">{ticket.assignedTo}</span> : <span className="ml-2 italic text-slate-400">Unassigned</span>}</div>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                    <School size={10} /> {ticket.school}
                </span>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6" ref={chatContainerRef}>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ticket Context</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-slate-500 block text-xs">Category</span> <span className="font-medium">{ticket.category}</span></div>
                            <div><span className="text-slate-500 block text-xs">Location</span> <span className="font-medium flex items-center gap-1"><MapPin size={12} className="text-red-500"/> {ticket.location}</span></div>
                            <div className="col-span-2"><span className="text-slate-500 block text-xs">Context Data</span> <span className="font-medium">{ticket.context}</span></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-center text-xs text-slate-300 uppercase tracking-widest font-bold my-4">Activity & Discussion</div>
                        
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                                {ticket.user.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-700">{ticket.user}</span>
                                    <span className="text-[10px] text-slate-400">reported issue</span>
                                </div>
                                <div className="bg-white border border-slate-200 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-sm text-slate-800 shadow-sm">
                                    {ticket.subject}
                                </div>
                            </div>
                        </div>

                        {ticket.updates && ticket.updates.map((update, idx) => (
                            <div key={update.id} className={`flex gap-3 ${update.type === 'system' ? 'justify-center' : update.user === currentUser.name ? 'justify-end' : 'justify-start'}`}>
                                
                                {update.type === 'system' ? (
                                    <div className="text-xs text-slate-400 italic bg-slate-50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1">
                                        <Activity size={10} /> {update.text} <span className="opacity-50 mx-1">•</span> {new Date(update.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                ) : (
                                    <>
                                        {update.user !== currentUser.name && (
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${update.isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {update.user.charAt(0)}
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] ${update.user === currentUser.name ? 'items-end' : 'items-start'} flex flex-col`}>
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-700">{update.user}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(update.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className={`p-3 rounded-xl text-sm shadow-sm ${
                                                update.user === currentUser.name 
                                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                    : update.isAdmin 
                                                        ? 'bg-indigo-55 border border-indigo-100 text-indigo-900 rounded-tl-none' 
                                                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                            }`}>
                                                {update.text}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {ticket.status !== 'Resolved' && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <form onSubmit={handlePostComment} className="flex gap-2">
                            <input 
                                type="text" 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Type an update or reply..." 
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            />
                            <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
            
            {currentUser.isAdmin && (
                <div className="p-6 mt-auto border-t border-slate-200 bg-white">
                    {ticket.status === 'Resolved' ? (
                        <div className="text-center py-2 text-green-600 font-medium bg-green-50 rounded-lg border border-green-100">Ticket Closed</div>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => setShowResolveModal(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
                                <CheckCircle size={18} /> Resolve
                            </button>
                            {!ticket.assignedTo && (
                                <button onClick={handleAssignToMe} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
                                    <UserCheck size={18} /> Assign to Me
                                </button>
                            )}
                            <button className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all">
                                <Briefcase size={18} /> Vendor
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showResolveModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 slide-in border border-slate-200">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800">Close Ticket</h3><button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button></div>
                        <div className="mb-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resolution Details</label><textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" placeholder="What was the fix?"></textarea></div>
                        <div className="flex gap-3"><button onClick={() => setShowResolveModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button><button onClick={handleResolveConfirm} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm">Confirm Closure</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
