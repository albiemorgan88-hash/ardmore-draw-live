"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePath, setActivePath] = useState("/");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  // Close on route change (popstate)
  useEffect(() => {
    const handleNav = () => {
      setMobileOpen(false);
      setActivePath(window.location.pathname);
    };
    window.addEventListener("popstate", handleNav);
    return () => window.removeEventListener("popstate", handleNav);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/committee", label: "Committee" },
    { href: "/fixtures", label: "Fixtures" },
    { href: "/news", label: "News" },
    { href: "/archive", label: "Archive" },
    { href: "/draw", label: "Weekly Draw", highlight: true },
    { href: "/sponsors", label: "Sponsors" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return activePath === "/";
    return activePath.startsWith(href);
  };

  return (
    <nav className="bg-navy text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <Image src="/images/ardmore-crest.png" alt="Ardmore CC Crest" width={40} height={40} className="rounded-full" />
            <span className="font-heading text-xl font-bold tracking-wide">Ardmore CC</span>
            <span className="hidden sm:inline text-gold text-sm font-body">Est. 1879</span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navLinks.map((link) =>
              link.highlight ? (
                <a
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-md font-semibold transition-colors ${
                    isActive(link.href)
                      ? "bg-gold text-navy"
                      : "bg-gold/80 text-navy hover:bg-gold"
                  }`}
                >
                  {link.label}
                </a>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className={`transition-colors ${
                    isActive(link.href) ? "text-gold" : "hover:text-gold"
                  }`}
                >
                  {link.label}
                </a>
              )
            )}
            {user && (
              <a
                href="/draw/manage"
                className={`transition-colors ${isActive("/draw/manage") ? "text-gold" : "hover:text-gold"}`}
              >
                My Numbers
              </a>
            )}
            {loading ? null : user ? (
              <button onClick={handleLogout} className="hover:text-gold transition-colors">
                Logout
              </button>
            ) : (
              <a href="/login" className="hover:text-gold transition-colors">Login</a>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden" ref={menuRef}>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-3 -mr-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              <div className="w-6 h-5 relative flex flex-col justify-between">
                <span
                  className={`block h-0.5 w-6 bg-white rounded transition-all duration-200 origin-center ${
                    mobileOpen ? "rotate-45 translate-y-[9px]" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-white rounded transition-all duration-200 ${
                    mobileOpen ? "opacity-0 scale-x-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-white rounded transition-all duration-200 origin-center ${
                    mobileOpen ? "-rotate-45 -translate-y-[9px]" : ""
                  }`}
                />
              </div>
            </button>

            {/* Mobile Menu */}
            <div
              className={`absolute right-0 left-0 top-full bg-navy-dark shadow-xl border-t border-navy-light overflow-hidden transition-all duration-200 ease-out ${
                mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="py-3">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-5 py-3 text-sm font-medium transition-colors ${
                      link.highlight
                        ? isActive(link.href)
                          ? "text-gold font-semibold bg-navy-light"
                          : "text-gold font-semibold hover:bg-navy-light"
                        : isActive(link.href)
                        ? "text-gold bg-navy-light"
                        : "hover:bg-navy-light"
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
                {user && (
                  <a
                    href="/draw/manage"
                    onClick={() => setMobileOpen(false)}
                    className={`block px-5 py-3 text-sm font-medium transition-colors ${
                      isActive("/draw/manage") ? "text-gold bg-navy-light" : "hover:bg-navy-light"
                    }`}
                  >
                    My Numbers
                  </a>
                )}
                <div className="border-t border-navy-light my-2" />
                {loading ? null : user ? (
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="block w-full text-left px-5 py-3 hover:bg-navy-light text-sm font-medium"
                  >
                    Logout
                  </button>
                ) : (
                  <a
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-5 py-3 hover:bg-navy-light text-sm font-medium"
                  >
                    Login / Sign Up
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
