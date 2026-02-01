import React from 'react';
import { Building2, Globe, MoreHorizontal } from 'lucide-react';
import { GlassCard, Badge } from '../components/ui';

export default function TenantsView({ tenants }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
       <div className="flex justify-between items-center">
         <div>
           <h3 className="text-lg font-medium text-slate-200">Tenant Management</h3>
           <p className="text-sm text-slate-400">Provision and manage school instances</p>
         </div>
         <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
           Provision New Tenant
         </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map(tenant => (
            <GlassCard key={tenant.id} hover className="p-6 space-y-4 group">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                     <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Building2 size={24} />
                     </div>
                     <div>
                        <h4 className="font-semibold text-white">{tenant.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                           <Globe size={10} /> {tenant.domain}
                        </div>
                     </div>
                  </div>
                  <Badge status="Active" />
               </div>
               <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                  <div className="bg-black/20 rounded-lg p-3">
                     <span className="text-xs text-slate-500 block mb-1">Code</span>
                     <span className="text-lg font-mono font-bold text-white">{tenant.code}</span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                     <span className="text-xs text-slate-500 block mb-1">Users</span>
                     <span className="text-lg font-bold text-white">{tenant.users}</span>
                  </div>
               </div>
            </GlassCard>
          ))}
       </div>
    </div>
  );
}
