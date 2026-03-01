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
            <a href="/committee" className="hover:text-gold transition-colors">Committee</a>
            <a href="/news" className="hover:text-gold transition-colors">News</a>
            <a href="/draw" className="bg-gold text-navy px-4 py-2 rounded-md font-semibold hover:bg-gold-light transition-colors">Weekly Draw</a>
            <a href="/sponsors" className="hover:text-gold transition-colors">Sponsors</a>
            {user && <a href="/draw/manage" className="hover:text-gold transition-colors">My Numbers</a>}
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
    <details className="relative group">
      <summary className="list-none cursor-pointer p-3 -mr-2 rounded-md hover:bg-white/10 transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full mt-2 w-56 bg-navy-dark rounded-lg shadow-xl py-3 border border-navy-light">
        <a href="/" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">Home</a>
        <a href="/about" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">About</a>
        <a href="/committee" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">Committee</a>
        <a href="/news" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">News</a>
        <a href="/draw" className="block px-5 py-3 hover:bg-navy-light text-gold font-semibold text-sm">Weekly Draw</a>
        <a href="/sponsors" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">Sponsors</a>
        {user && <a href="/draw/manage" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">My Numbers</a>}
        <div className="border-t border-navy-light my-2" />
        {loading ? null : user ? (
          <button onClick={onLogout} className="block w-full text-left px-5 py-3 hover:bg-navy-light text-sm font-medium">Logout</button>
        ) : (
          <a href="/login" className="block px-5 py-3 hover:bg-navy-light text-sm font-medium">Login / Sign Up</a>
        )}
      </div>
    </details>
  );
}
