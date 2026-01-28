import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, 
  School, HardDrive 
} from 'lucide-react';

// --- ICON SYSTEM MAP ---
// We map them here to keep the code below clean and identical to your prototype logic
const Icons = {
  MessageSquare, LayoutDashboard, Monitor, Wifi, AlertCircle, CheckCircle, 
  Clock, Search, Laptop, User, Users, Building, Send, Briefcase, Filter, 
  ChevronDown, X, UserCheck, Shield, Settings, ArrowUpCircle, Plus, Lock, 
  Globe, Trash2, EyeOff, AlertTriangle, Edit3, UserPlus, Save, Layers, 
  Calendar, History, Activity, Lightbulb, BookOpen, ThumbsUp, MapPin, 
  School, HardDrive 
};

// --- BUSINESS LOGIC ENGINE ---
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

            // 4. Access Matrix Logic (Only for Admins)
            if (!currentUser.isAdmin) return false; 
            
            // A. Vertical Access (Department)
            const categoryConfig = keywords[t.category];
            const ticketOwnerDept = categoryConfig ? categoryConfig.owner : 'Unassigned';
            
            const userScopes = currentUser.accessScopes || [];
            const hasDeptAccess = (currentUser.dept === ticketOwnerDept) || userScopes.includes(ticketOwnerDept);

            if (!hasDeptAccess) return false;

            // B. Horizontal Access (Geography/School)
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
    { id: 'u9', name: 'Jessica Pearson', role: 'Manager', dept: 'Management', school: 'St. Marys', isAdmin: true, isSuperAdmin: false, avatar: 'JP', accessScopes: [], accessSchools: ['St. Marys'] },
];

const userAssets = {
    'Sarah Jenkins': { type: 'Laptop', model: 'MacBook Air M2', tag: 'AS-9920' },
    'Mike Ross': { type: 'Laptop', model: 'Dell Latitude 5420', tag: 'AS-1029' },
    'John Doe': { type: 'Desktop', model: 'Custom Build PC', tag: 'IT-001' },
    'Paulo Birch': { type: 'Tablet', model: 'iPad Pro 12.9', tag: 'AS-4402' },
    'Jessica Pearson': { type: 'Laptop', model: 'Surface Laptop 4', tag: 'AS-3321' }
};

const now = Date.now();
const mins = 60 * 1000;
const hours = 60 * mins;
const days = 24 * hours;

const initialTickets = [
    { 
        id: 900, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "Password Reset Required", category: "IT - Access", isSensitive: false, status: "Resolved", timestamp: now - (5 * days), priority: "High", context: "User Locked Out", location: "Remote", assignedTo: "John Doe", 
        updates: [
            { id: 1, type: 'system', user: 'System', text: 'Ticket created', timestamp: now - (5 * days) },
            { id: 2, type: 'system', user: 'John Doe', text: 'Resolved: Password reset via AD.', timestamp: now - (5 * days) + hours }
        ] 
    },
    { 
        id: 901, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "Printer jam in Staff Room", category: "Facilities", isSensitive: false, status: "Open", timestamp: now - (10 * mins), priority: "Low", context: "Printer Area B", location: "Staff Room", assignedTo: null, 
        updates: [ { id: 1, type: 'comment', user: 'Mike Ross', text: 'I tried opening tray 2 but it is stuck.', timestamp: now - (9 * mins) } ] 
    },
    { 
        id: 902, user: "Mike Ross", role: "Teacher", school: "King Edwards", subject: "VPN keeps disconnecting", category: "IT - Network", isSensitive: false, status: "In Progress", timestamp: now - (2 * hours), priority: "High", context: "Asset: MacBook Pro M2", location: "Remote", assignedTo: 'John Doe', 
        updates: [ { id: 1, type: 'system', user: 'System', text: 'Ticket created', timestamp: now - (2 * hours) } ] 
    },
    { 
        id: 903, user: "Jessica Pearson", role: "Manager", school: "St. Marys", subject: "Classroom 3B lights flickering", category: "Facilities", isSensitive: false, status: "Vendor Pending", timestamp: now - (26 * hours), priority: "Medium", context: "Electrician Called", location: "Room 3B", assignedTo: 'Paulo Birch', 
        updates: [] 
    },
    { 
        id: 904, user: "Anonymous", role: "HR", school: "HQ", subject: "Confidential salary report leak", category: "HR - Confidential", isSensitive: true, status: "Open", timestamp: now - (5 * hours), priority: "Critical", context: "N/A", location: "HR Office", assignedTo: null, 
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

// --- SUB-COMPONENTS ---

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
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 slide-in border border-zinc-100 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-zinc-100 pb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-900">{isAdding ? 'Onboard New Hire' : 'Edit User Profile'}</h3>
                        <p className="text-xs text-zinc-500 mt-1">Configure Identity & Access Matrix</p>
                    </div>
                    <button onClick={onClose}><Icons.X size={20} className="text-zinc-400 hover:text-zinc-900" /></button>
                </div>
                
                <div className="space-y-6 overflow-y-auto flex-1 pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5">Full Name</label>
                            <input type="text" className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition-all" 
                                   value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5">Job Title</label>
                            <input type="text" className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm" 
                                   value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1.5">Primary Dept</label>
                            <select className="w-full p-2.5 border border-zinc-200 rounded-lg text-sm bg-white"
                                    value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                        <label className="block text-xs font-bold text-zinc-700 uppercase mb-3 flex items-center gap-2">
                            <Icons.MapPin size={14} /> Geographic Access
                        </label>
                        
                        <div className="mb-4">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Home Campus</label>
                            <select className="w-full p-2.5 mt-1 border border-zinc-300 rounded-lg text-sm bg-white"
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
                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-2 block">Authorized Locations</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => toggleSchoolAccess('ALL')}
                                    className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center justify-between group transition-all ${
                                        (formData.accessSchools || []).includes('ALL') 
                                        ? 'bg-zinc-900 text-white border-black' 
                                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                    }`}
                                >
                                    <span>Global Access</span>
                                    {(formData.accessSchools || []).includes('ALL') && <Icons.CheckCircle size={14}/>}
                                </button>

                                {schools.map(school => {
                                    const isSelected = (formData.accessSchools || []).includes(school) || (formData.accessSchools || []).includes('ALL');
                                    const isPrimary = school === formData.school;
                                    
                                    return (
                                        <button 
                                            key={school}
                                            onClick={() => !isPrimary && toggleSchoolAccess(school)}
                                            disabled={(formData.accessSchools || []).includes('ALL') || isPrimary}
                                            className={`px-3 py-2 text-xs font-medium rounded-lg border flex items-center justify-between transition-all ${
                                                isPrimary 
                                                    ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' 
                                                    : isSelected
                                                        ? 'bg-zinc-800 text-white border-zinc-900'
                                                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                            } ${(formData.accessSchools || []).includes('ALL') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="truncate">{school}</span>
                                            {isPrimary && <span className="text-[9px] bg-zinc-200 px-1.5 rounded text-zinc-500 font-bold">HOME</span>}
                                            {!isPrimary && isSelected && <Icons.CheckCircle size={14}/>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                         <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                             <span className="text-sm font-semibold text-zinc-700">Administrator Privileges</span>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={formData.isAdmin} onChange={e => setFormData({...formData, isAdmin: e.target.checked})} />
                                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900"></div>
                            </label>
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Departmental Overrides</label>
                            <div className="flex flex-wrap gap-2">
                                {departments.filter(d => d !== formData.dept).map(dept => (
                                    <button key={dept} onClick={() => toggleScope(dept)}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1 ${
                                            (formData.accessScopes || []).includes(dept) 
                                            ? 'bg-zinc-100 text-zinc-900 border-zinc-300 font-bold' 
                                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        {dept}
                                        {(formData.accessScopes || []).includes(dept) && <Icons.X size={12}/>}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-zinc-600 hover:bg-zinc-50 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-5 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-black shadow-lg transition-all transform hover:-translate-y-0.5">
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
            id: Date.now(), type: 'comment', user: currentUser.name, text: newComment, timestamp: Date.now(), isAdmin: currentUser.isAdmin
        };
        onUpdateTicket({ ...ticket, updates: [...ticket.updates, update] });
        setNewComment('');
    };

    const ticketDate = new Date(ticket.timestamp);
    const device = userAssets[ticket.user]; 

    if (ticket.isSensitive && !currentUser.isSuperAdmin) {
         return <div className="h-full bg-red-50 flex flex-col items-center justify-center text-red-800 p-8 text-center rounded-xl border border-red-200"><Icons.AlertTriangle size={48} className="mb-4"/><h2 className="text-xl font-bold mb-2">ACCESS DENIED</h2><p>This ticket is flagged as CONFIDENTIAL.</p></div>
    }

    return (
        <div className={`bg-white rounded-xl shadow-lg border h-full flex flex-col slide-in relative ${ticket.isSensitive ? 'border-red-200 ring-2 ring-red-100' : 'border-slate-200'}`}>
            {ticket.isSensitive && <div className="bg-red-600 text-white text-xs font-bold text-center py-1">CONFIDENTIAL - SUPER ADMIN EYES ONLY</div>}
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-2xl font-bold text-slate-800">#{ticket.id}</h1>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ticket.status}</span>
                    </div>
                    <h2 className="text-lg text-slate-700">{ticket.isSensitive ? ticket.category : ticket.subject}</h2>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-xs text-slate-400 flex items-center gap-1 mb-1"><Icons.Calendar size={12} /> Created</span>
                    <span className="text-sm font-bold text-slate-700">{ticketDate.toLocaleDateString()}</span>
                    <span className="text-xs text-slate-500">{ticketDate.toLocaleTimeString()}</span>
                </div>
            </div>

            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-500">Assigned Agent: {ticket.assignedTo ? <span className="ml-2 font-bold text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded shadow-sm">{ticket.assignedTo}</span> : <span className="ml-2 italic text-slate-400">Unassigned</span>}</div>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1"><Icons.School size={10} /> {ticket.school}</span>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6" ref={chatContainerRef}>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ticket Context</h4>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                                <div><span className="text-slate-500 block text-xs">Category</span> <span className="font-medium">{ticket.category}</span></div>
                                <div><span className="text-slate-500 block text-xs">Location</span> <span className="font-medium flex items-center gap-1"><Icons.MapPin size={12} className="text-red-500"/> {ticket.location}</span></div>
                                <div><span className="text-slate-500 block text-xs">Context</span> <span className="font-medium">{ticket.context}</span></div>
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-1"><Icons.HardDrive size={12}/> Asset Info (Graph API)</h4>
                            {device ? (
                                <div className="text-sm">
                                    <div className="font-bold text-blue-900">{device.model}</div>
                                    <div className="text-xs text-blue-700 mt-1">Type: {device.type}</div>
                                    <div className="text-[10px] bg-white border border-blue-200 inline-block px-2 py-0.5 rounded mt-2 text-slate-500">Asset Tag: {device.tag}</div>
                                </div>
                            ) : <div className="text-xs text-blue-400 italic">No device data found for user.</div>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-center text-xs text-slate-300 uppercase tracking-widest font-bold my-4">Activity & Discussion</div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">{ticket.user.charAt(0)}</div>
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-xs font-bold text-slate-700">{ticket.user}</span>
                                    <span className="text-[10px] text-slate-400">reported issue</span>
                                </div>
                                <div className="bg-white border border-slate-200 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-sm text-slate-800 shadow-sm">{ticket.subject}</div>
                            </div>
                        </div>
                        {ticket.updates && ticket.updates.map((update, idx) => (
                            <div key={update.id} className={`flex gap-3 ${update.type === 'system' ? 'justify-center' : update.user === currentUser.name ? 'justify-end' : 'justify-start'}`}>
                                {update.type === 'system' ? (
                                    <div className="text-xs text-slate-400 italic bg-slate-50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1"><Icons.Activity size={10} /> {update.text} <span className="opacity-50 mx-1">•</span> {new Date(update.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                ) : (
                                    <>
                                        {update.user !== currentUser.name && <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${update.isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>{update.user.charAt(0)}</div>}
                                        <div className={`max-w-[80%] ${update.user === currentUser.name ? 'items-end' : 'items-start'} flex flex-col`}>
                                            <div className="flex items-baseline gap-2 mb-1"><span className="text-xs font-bold text-slate-700">{update.user}</span><span className="text-[10px] text-slate-400">{new Date(update.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                                            <div className={`p-3 rounded-xl text-sm shadow-sm ${update.user === currentUser.name ? 'bg-indigo-600 text-white rounded-tr-none' : update.isAdmin ? 'bg-indigo-55 border border-indigo-100 text-indigo-900 rounded-tl-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>{update.text}</div>
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
                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Type an update or reply..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                            <button type="submit" className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"><Icons.Send size={18} /></button>
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
                            <button onClick={() => setShowResolveModal(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all"><Icons.CheckCircle size={18} /> Resolve</button>
                            {!ticket.assignedTo && <button onClick={handleAssignToMe} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all"><Icons.UserCheck size={18} /> Assign to Me</button>}
                            <button className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all"><Icons.Briefcase size={18} /> Vendor</button>
                        </div>
                    )}
                </div>
            )}

            {showResolveModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center modal-overlay p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 slide-in border border-slate-200">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800">Close Ticket</h3><button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600"><Icons.X size={20}/></button></div>
                        <div className="mb-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resolution Details</label><textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" placeholder="What was the fix?"></textarea></div>
                        <div className="flex gap-3"><button onClick={() => setShowResolveModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button><button onClick={handleResolveConfirm} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm">Confirm Closure</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserDirectory({ users, currentUser, onAddUser, onUpdateUser, departments, schools }) {
    const [editingUser, setEditingUser] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const UserRow = ({ user }) => (
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 transition-colors group">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${user.isSuperAdmin ? 'bg-purple-600' : user.dept === 'IT' ? 'bg-zinc-800' : 'bg-zinc-400'}`}>{user.avatar}</div>
                <div>
                    <div className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                        {user.name}
                        {user.isSuperAdmin && <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold tracking-wide">SUPER ADMIN</span>}
                    </div>
                    <div className="text-xs text-zinc-500 flex gap-2 mt-0.5">
                        <span className="font-medium">{user.role}</span>
                        <span className="text-zinc-300">•</span>
                        <span className="flex items-center gap-1"><Icons.School size={10}/> {user.school}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {user.accessScopes && user.accessScopes.length > 0 && (
                    <div className="flex -space-x-2 mr-2">
                        {user.accessScopes.map(scope => (
                            <div key={scope} className="w-6 h-6 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-600" title={`Has access to ${scope}`}>{scope.substring(0,2)}</div>
                        ))}
                    </div>
                )}
                <span className="text-xs text-zinc-500 font-medium bg-zinc-100 px-2.5 py-1 rounded-md min-w-[4rem] text-center border border-zinc-200">{user.dept}</span>
                {currentUser.isSuperAdmin && (
                    <button onClick={() => setEditingUser(user)} className="flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm">
                        <Icons.Edit3 size={14} /> Edit
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-5xl mx-auto overflow-y-auto h-full pb-20">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-zinc-800 tracking-tight">Staff Directory</h2>
                {currentUser.isSuperAdmin && <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black shadow-md transition-all"><Icons.UserPlus size={16} /> Add New Hire</button>}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-6">
                 <div className="bg-zinc-50/50 px-4 py-3 border-b border-zinc-200 font-bold text-zinc-500 text-xs uppercase tracking-wider">All Users</div>
                 {users.map(u => <UserRow key={u.id} user={u} />)}
            </div>
            {(editingUser || isAdding) && (
                <UserEditModal user={editingUser} isAdding={isAdding} departments={departments} schools={schools} onClose={() => { setEditingUser(null); setIsAdding(false); }} onSave={(u) => { isAdding ? onAddUser(u) : onUpdateUser(u); setEditingUser(null); setIsAdding(false); }} />
            )}
        </div>
    );
}

function DepartmentManager({ departments, onAdd, onRemove }) {
    const [newDept, setNewDept] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); if(!newDept.trim()) return; onAdd(newDept.trim()); setNewDept(''); };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-6">
                <div className="bg-zinc-50 px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                    <div><h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-1"><Icons.Layers size={24}/> Department Management</h2><p className="text-zinc-500 text-sm">Configure organizational structure.</p></div>
                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200">SUPER ADMIN ONLY</div>
                </div>
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
                        <input type="text" value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Enter new department name" className="flex-1 p-3 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                        <button type="submit" className="bg-zinc-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-black shadow-md flex items-center gap-2 transition-transform active:scale-95"><Icons.Plus size={18} /> Add</button>
                    </form>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Active Departments</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {departments.map(dept => (
                            <div key={dept} className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all group">
                                <span className="font-semibold text-zinc-700">{dept}</span>
                                <button onClick={() => onRemove(dept)} className="text-zinc-400 hover:text-red-600 bg-zinc-50 hover:bg-red-50 p-2 rounded-lg transition-colors"><Icons.Trash2 size={16} /></button>
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
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newTriggers, setNewTriggers] = useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        if(!newTitle.trim() || !newContent.trim() || !newTriggers.trim()) return alert("Fill all fields");
        onAdd({ title: newTitle, content: newContent, triggers: newTriggers.split(',').map(t => t.trim()).filter(Boolean) });
        setIsAdding(false); setNewTitle(''); setNewContent(''); setNewTriggers('');
    };
    return (
        <div className="p-8 max-w-5xl mx-auto overflow-y-auto h-full pb-20">
            <div className="flex justify-between items-center mb-8">
                <div><h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-1"><Icons.BookOpen size={24}/> Knowledge Base</h2><p className="text-sm text-zinc-500">Manage automated deflection articles.</p></div>
                <button onClick={() => setIsAdding(true)} className="bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black flex items-center gap-2 shadow-md transition-all"><Icons.Plus size={16} /> Add Article</button>
            </div>
            {isAdding && (
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-8 shadow-sm animate-pulse-once">
                    <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2"><Icons.Lightbulb size={18} className="text-yellow-500"/> New Article</h3>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Title</label><input type="text" className="w-full p-2.5 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. How to fix a paper jam" /></div>
                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Solution Content</label><textarea className="w-full p-2.5 border border-zinc-300 rounded-lg text-sm h-32 focus:ring-2 focus:ring-zinc-900 outline-none" value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Step 1: Open tray..." /></div>
                        <div><label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Triggers (comma-separated)</label><input type="text" className="w-full p-2.5 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-zinc-900 outline-none" value={newTriggers} onChange={e => setNewTriggers(e.target.value)} placeholder="printer, jam, paper" /></div>
                        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-600 bg-zinc-100 rounded-lg text-sm font-medium hover:bg-zinc-200">Cancel</button><button type="submit" className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-black shadow-sm">Save Article</button></div>
                    </form>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map(kb => (
                    <div key={kb.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative group">
                        <button onClick={() => onRemove(kb.id)} className="absolute top-4 right-4 text-zinc-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Icons.Trash2 size={16} /></button>
                        <h4 className="font-bold text-zinc-900 mb-2 pr-8 text-lg">{kb.title}</h4>
                        <p className="text-sm text-zinc-600 line-clamp-3 mb-4 leading-relaxed">{kb.content}</p>
                        <div className="flex flex-wrap gap-2">{kb.triggers.map((t, i) => <span key={i} className="text-[10px] font-medium bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-md border border-zinc-200">{t}</span>)}</div>
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
    const handleChangeOwner = (cat, newOwner) => {
        const newKeywords = { ...keywords, [cat]: { ...keywords[cat], owner: newOwner } };
        setKeywords(newKeywords);
    };
    const toggleSensitive = (cat) => {
        const newKeywords = { ...keywords, [cat]: { ...keywords[cat], sensitive: !keywords[cat].sensitive } };
        setKeywords(newKeywords);
    };
    const handleCreateCategory = () => {
        if (!newCatName.trim() || keywords[newCatName]) return;
        const updatedKeywords = { [newCatName]: { owner: newCatOwner, sensitive: newCatSensitive, score: 0, keywords: [] }, ...keywords };
        setKeywords(updatedKeywords); setIsCreating(false); setNewCatName(''); setNewCatOwner(departments[0]); setNewCatSensitive(false);
    };
    const handleDeleteCategory = (catName) => {
        if (confirm(`Delete ${catName}?`)) {
            const updatedKeywords = { ...keywords };
            delete updatedKeywords[catName];
            setKeywords(updatedKeywords);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center modal-overlay p-6">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col slide-in border border-zinc-200">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 rounded-t-2xl">
                    <div><h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><Icons.Settings size={20} /> Logic Brain Configuration</h3><p className="text-sm text-zinc-500 mt-1">Routing rules and keyword triggers.</p></div>
                    <button onClick={onClose}><Icons.X size={24} className="text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 p-1 rounded-lg transition-colors"/></button>
                </div>
                <div className="p-6 bg-zinc-50 border-b border-zinc-200">
                    {isCreating ? (
                        <div className="flex gap-3 items-center bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New Category Name" className="text-sm border border-zinc-300 p-2 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none flex-1" />
                            <select value={newCatOwner} onChange={e => setNewCatOwner(e.target.value)} className="text-sm border border-zinc-300 p-2 rounded-lg bg-white">{departments.map(d => <option key={d} value={d}>{d} Dept</option>)}</select>
                            <label className="text-xs flex items-center gap-1.5 font-medium text-zinc-700 bg-zinc-100 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-200"><input type="checkbox" checked={newCatSensitive} onChange={e => setNewCatSensitive(e.target.checked)} className="rounded text-zinc-900 focus:ring-zinc-900" /> Confidential</label>
                            <button onClick={handleCreateCategory} className="text-xs bg-zinc-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-black">Save</button>
                            <button onClick={() => setIsCreating(false)} className="text-xs bg-white border border-zinc-300 text-zinc-600 px-4 py-2 rounded-lg font-medium hover:bg-zinc-50">Cancel</button>
                        </div>
                    ) : <button onClick={() => setIsCreating(true)} className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 text-sm font-medium hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"><Icons.Plus size={18}/> Create New Category</button>}
                </div>
                <div className="p-8 overflow-y-auto bg-zinc-50/30 grid grid-cols-1 gap-6">
                    {Object.entries(keywords).map(([cat, data]) => (
                        <div key={cat} className={`bg-white border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${data.sensitive ? 'border-red-200 bg-red-50/10' : 'border-zinc-200'}`}>
                            <div className="flex justify-between mb-4 items-center">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-sm uppercase tracking-wide text-zinc-800">{cat}</h4>
                                    <button onClick={() => handleDeleteCategory(cat)} className="text-zinc-300 hover:text-red-500 transition-colors"><Icons.Trash2 size={16}/></button>
                                </div>
                                <div className="flex gap-2">
                                    <select value={data.owner} onChange={e => handleChangeOwner(cat, e.target.value)} className="text-xs border border-zinc-300 p-1.5 rounded-md bg-white font-medium text-zinc-600 focus:ring-2 focus:ring-zinc-900 outline-none">{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                    <button onClick={() => toggleSensitive(cat)} className={`text-[10px] px-3 py-1.5 rounded-md font-bold border transition-colors ${data.sensitive ? 'bg-red-600 text-white border-red-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'}`}>{data.sensitive ? 'CONFIDENTIAL' : 'PUBLIC'}</button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {data.keywords.map(kw => (
                                    <div key={kw} className="text-xs bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-full border border-zinc-200 flex items-center gap-1.5 font-medium group">
                                        {kw} <button onClick={() => handleRemoveKeyword(cat, kw)} className="text-zinc-400 hover:text-red-600 flex items-center justify-center bg-white rounded-full w-4 h-4 shadow-sm"><Icons.X size={10}/></button>
                                    </div>
                                ))}
                            </div>
                            <input type="text" placeholder="+ Add keyword and press Enter" className="w-full text-xs border border-zinc-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all bg-zinc-50 focus:bg-white" value={newKeywordInputs[cat] || ''} onChange={e => setNewKeywordInputs({...newKeywordInputs, [cat]: e.target.value})} onKeyDown={e => handleAddKeyword(cat, e)} />
                        </div>
                    ))}
                </div>
                <div className="p-6 border-t border-zinc-200 bg-white rounded-b-2xl flex justify-end"><button onClick={onClose} className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-black shadow-lg transition-transform active:scale-95">Done Configuration</button></div>
            </div>
        </div>
    );
}

// --- APP COMPONENT ---

function App() {
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
    }, [users]);

    const handleNewTicket = (ticket) => {
        setTickets([ticket, ...tickets]);
        setNotifications(prev => prev + 1);
    };

    const updateTicket = (updatedTicket) => {
        setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    };

    const handleAddUser = (newUser) => {
        setUsers([...users, { ...newUser, id: `u${Date.now()}` }]);
    };

    const handleUpdateUser = (updatedUser) => {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    };

    const handleAddDepartment = (newDept) => {
        if (departments.includes(newDept)) return alert("Department already exists");
        setDepartments([...departments, newDept]);
    };

    const handleRemoveDepartment = (deptToRemove) => {
        if (confirm(`Delete ${deptToRemove}? Users/Tickets assigned to this dept may need manual updates.`)) {
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

    // THE ROUTING BRAIN
    const runCategorization = (text) => {
        const lowerText = text.toLowerCase();
        const categories = JSON.parse(JSON.stringify(keywords));
        
        Object.keys(categories).forEach(cat => {
            categories[cat].keywords.forEach(word => {
                if (lowerText.includes(word.toLowerCase())) {
                    const weight = ['iwb', 'leak', 'wifi', 'fire', 'spark', 'salary'].includes(word) ? 2 : 1;
                    categories[cat].score += weight;
                }
            });
        });
        
        let bestCategory = 'General Support';
        let maxScore = 0;
        Object.keys(categories).forEach(cat => {
            if (categories[cat].score > maxScore) { 
                maxScore = categories[cat].score; 
                bestCategory = cat; 
            }
        });
        
        return {
            category: bestCategory,
            owner: keywords[bestCategory]?.owner || 'Unassigned',
            isSensitive: keywords[bestCategory]?.sensitive || false
        };
    };

    return (
        <div className="min-h-screen flex flex-col">
            <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <Icons.Briefcase className="w-6 h-6 text-blue-400" />
                    <span className="font-bold text-lg tracking-tight">CorpTicket <span className="text-xs font-normal text-slate-400">Internal</span></span>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setView('chat')} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'chat' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <Icons.MessageSquare size={16} /> Slack View
                        </button>
                        <button onClick={() => { setView('admin'); setNotifications(0); }} className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                            <div className="relative">
                                <Icons.LayoutDashboard size={16} />
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
                                <Icons.ChevronDown size={14} className="text-slate-500" />
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
                        categorizer={runCategorization} 
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

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
