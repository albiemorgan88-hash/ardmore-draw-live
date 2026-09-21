"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, browserAuthConfigured } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(browserAuthConfigured);
  const pathname = usePathname();

  useEffect(() => {
    if (!browserAuthConfigured) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!browserAuthConfigured && ['/login','/signup','/forgot-password','/reset-password','/draw/manage','/claim'].includes(pathname || '') ? (
        <main className="max-w-lg mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Accounts are unavailable here</h1>
          <p>This environment is available for reviewing the public site. Sign-in, prize claims and payments are unavailable.</p>
          <Link href="/" className="underline mt-6 inline-block">Return to the site</Link>
        </main>
      ) : children}
    </AuthContext.Provider>
  );
}
