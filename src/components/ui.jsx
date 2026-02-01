import React from 'react';
import { 
  Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe, HelpCircle,
  Mail, MessageCircle
} from 'lucide-react';

// --- ICONS ---
export const getIcon = (iconName, size = 20, className) => {
  const icons = { Monitor, Cpu, Wifi, ShieldAlert, Wrench, ShoppingBag, Briefcase, Zap, Globe };
  const IconComponent = icons[iconName] || HelpCircle;
  return <IconComponent size={size} className={className} />;
};

export const SourceIcon = ({ source }) => {
  switch (source) {
    case 'email': return <Mail size={14} className="text-purple-400" />;
    case 'teams': return <MessageCircle size={14} className="text-indigo-400" />;
    default: return <Globe size={14} className="text-cyan-400" />;
  }
};

// --- VISUAL COMPONENTS ---
export const GlassCard = ({ children, className = '', hover = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`
    relative overflow-hidden
    bg-white/5 backdrop-blur-xl 
    border border-white/10 
    rounded-2xl 
    shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
    ${hover ? 'transition-all duration-300 hover:bg-white/10 hover:scale-[1.01] hover:border-white/20 cursor-pointer' : ''}
    ${className}
  `}>
    {children}
  </div>
);

export const Badge = ({ status }) => {
  const styles = {
    'New': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Resolved': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Critical': 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
    'High': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Low': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    'Pending Approval': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Active': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };
  const defaultStyle = 'bg-gray-500/20 text-gray-300 border-gray-500/30';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};

export const NavItem = ({ icon: Icon, label, active, count, onClick, collapsed }) => (
  <button 
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200
      ${active 
        ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}
      ${collapsed ? 'justify-center' : ''}
    `}
  >
    <Icon size={20} className={active ? 'text-blue-400' : 'text-slate-400'} />
    {!collapsed && (
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
    )}
    {!collapsed && count && (
      <span className="bg-rose-500/20 text-rose-300 text-xs py-0.5 px-2 rounded-full border border-rose-500/20">
        {count}
      </span>
    )}
  </button>
);

export const StatCard = ({ label, value, trend, color }) => (
  <GlassCard className="p-4 flex flex-col gap-1">
    <span className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{label}</span>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${
        color === 'rose' ? 'bg-rose-500/20 text-rose-300' : 
        color === 'blue' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
      }`}>
        {trend}
      </span>
    </div>
  </GlassCard>
);
