import React from 'react';
import { Hash, Shield } from 'lucide-react';
import { GlassCard, getIcon } from '../components/ui';

export default function SettingsView({ categories, tenants }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Manager */}
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
             <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Hash size={20} /></div>
             <div><h3 className="font-semibold text-white">Issue Categories</h3></div>
           </div>
           <div className="space-y-3">
             {categories.map(cat => (
               <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${cat.bg} ${cat.color}`}>{getIcon(cat.icon, 16)}</div>
                   <span className="text-sm font-medium text-slate-200">{cat.label}</span>
                 </div>
               </div>
             ))}
           </div>
        </GlassCard>

        {/* Access Control */}
        <GlassCard className="p-6 space-y-6">
           <div className="flex items-center gap-3 border-b border-white/10 pb-4">
             <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Shield size={20} /></div>
             <div><h3 className="font-semibold text-white">Access Control</h3></div>
           </div>
           <div className="space-y-3">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tenants</label>
             {tenants.map(t => (
               <div key={t.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                 <span className="text-sm text-white">{t.name}</span>
                 <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">Active</span>
               </div>
             ))}
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
