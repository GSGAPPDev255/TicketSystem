import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase'; // Adjust path if needed

// --- Types ---
interface Tenant {
  id: string;
  name: string;
  slug: string; // or 'domain', whatever your DB uses
  type: string; // 'School', 'Group', etc.
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant) => void;
  tenants: Tenant[];
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  // 1. LAZY INITIALIZATION (The Fix)
  // We check localStorage *before* setting the initial state to prevent reset.
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_active_tenant');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. FETCH TENANTS ON MOUNT
  useEffect(() => {
    async function fetchTenants() {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .order('name');

        if (error) throw error;

        setTenants(data || []);

        // Edge Case: If no tenant is selected (fresh login), auto-select the first one
        if (!currentTenant && data && data.length > 0) {
          const defaultTenant = data[0];
          setCurrentTenant(defaultTenant);
          localStorage.setItem('nexus_active_tenant', JSON.stringify(defaultTenant));
        }
      } catch (err) {
        console.error('Error fetching tenants:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTenants();
  }, []); // Run once on mount

  // 3. PERSISTENCE EFFECT
  // Whenever the user switches tenants, save it immediately.
  useEffect(() => {
    if (currentTenant) {
      localStorage.setItem('nexus_active_tenant', JSON.stringify(currentTenant));
    }
  }, [currentTenant]);

  return (
    <TenantContext.Provider value={{ currentTenant, setCurrentTenant, tenants, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

// Hook for easy access
export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
