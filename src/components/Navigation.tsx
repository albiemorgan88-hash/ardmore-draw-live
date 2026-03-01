"use client";

import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="bg-navy text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3">
            <span className="font-heading text-xl font-bold tracking-wide">Ardmore CC</span>
            <span className="hidden sm:inline text-gold text-sm font-body">Est. 1879</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="/" className="hover:text-gold transition-colors">Home</a>
            <a href="/about" className="hover:text-gold transition-colors">About</a>
            <a href="/draw" className="bg-gold text-navy px-4 py-2 rounded-md font-semibold hover:bg-gold-light transition-colors">Weekly Draw</a>
            <a href="/sponsors" className="hover:text-gold transition-colors">Sponsors</a>
            {loading ? null : user ? (
              <button onClick={handleLogout} className="hover:text-gold transition-colors">
                Logout
              </button>
            ) : (
              <a href="/login" className="hover:text-gold transition-colors">Login</a>
            )}
          </div>
          <div className="md:hidden">
            <MobileMenu user={user} loading={loading} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ user, loading, onLogout }: { user: any; loading: boolean; onLogout: () => void }) {
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer p-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full mt-2 w-48 bg-navy-dark rounded-lg shadow-xl py-2 border border-navy-light">
        <a href="/" className="block px-4 py-2 hover:bg-navy-light">Home</a>
        <a href="/about" className="block px-4 py-2 hover:bg-navy-light">About</a>
        <a href="/draw" className="block px-4 py-2 hover:bg-navy-light text-gold font-semibold">Weekly Draw</a>
        <a href="/sponsors" className="block px-4 py-2 hover:bg-navy-light">Sponsors</a>
        {loading ? null : user ? (
          <button onClick={onLogout} className="block w-full text-left px-4 py-2 hover:bg-navy-light">Logout</button>
        ) : (
          <a href="/login" className="block px-4 py-2 hover:bg-navy-light">Login</a>
        )}
      </div>
    </details>
  );
}
