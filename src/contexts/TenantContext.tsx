import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// --- Types ---
interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant) => void;
  tenants: Tenant[];
  loading: boolean;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  
  // 1. LAZY INITIALIZATION (Keeps your persistence)
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_active_tenant');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. FETCH SECURE TENANTS
  const fetchTenants = async () => {
    setLoading(true);
    try {
      // A. Get Current User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // B. Check Role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isSuperAdmin = profile?.role === 'super_admin';

      // C. Query Tenants (Filtered)
      let query = supabase.from('tenants').select('*').order('name');

      if (!isSuperAdmin) {
        // Normal User: Filter by 'tenant_access'
        const { data: accessList } = await supabase
          .from('tenant_access')
          .select('tenant_id')
          .eq('user_id', user.id);
          
        const allowedIds = accessList?.map((a: any) => a.tenant_id) || [];
        
        // Apply Filter
        query = query.in('id', allowedIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const allowedTenants = data || [];
      setTenants(allowedTenants);

      // D. Intelligent Selection / Validation
      if (allowedTenants.length > 0) {
        // If we have a saved tenant, verify we still have access to it
        if (currentTenant) {
            const hasAccess = allowedTenants.find(t => t.id === currentTenant.id);
            if (!hasAccess) {
                // Access revoked? Switch to the first available one
                setCurrentTenant(allowedTenants[0]);
                localStorage.setItem('nexus_active_tenant', JSON.stringify(allowedTenants[0]));
            }
        } else {
            // Fresh login? Select the first one
            setCurrentTenant(allowedTenants[0]);
            localStorage.setItem('nexus_active_tenant', JSON.stringify(allowedTenants[0]));
        }
      } else {
          // No access to anything
          setTenants([]);
          setCurrentTenant(null);
          localStorage.removeItem('nexus_active_tenant');
      }

    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchTenants();
  }, []);

  // 3. PERSISTENCE EFFECT
  useEffect(() => {
    if (currentTenant) {
      localStorage.setItem('nexus_active_tenant', JSON.stringify(currentTenant));
    }
  }, [currentTenant]);

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, tenants, loading, refreshTenants: fetchTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

// Hook
export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
