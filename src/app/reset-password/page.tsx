"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have a valid reset session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidSession(true);
      } else {
        setError("Invalid or expired reset link. Please request a new password reset.");
      }
      setCheckingSession(false);
    };

    // Listen for auth state changes (when user comes from email link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setValidSession(true);
        setCheckingSession(false);
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Redirect to home page after a delay
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-2xl mb-4">🔄</div>
          <h1 className="font-heading text-xl font-bold text-navy mb-2">Loading...</h1>
          <p className="text-navy/60">Verifying your reset link</p>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="font-heading text-2xl font-bold text-navy mb-2">Invalid Reset Link</h1>
          <p className="text-navy/60 mb-6">{error}</p>
          <div className="space-y-3">
            <a 
              href="/forgot-password" 
              className="block bg-navy text-white px-6 py-2 rounded-md hover:bg-navy-light transition-colors"
            >
              Request New Reset Link
            </a>
            <a 
              href="/login" 
              className="block text-gold font-semibold hover:underline"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="font-heading text-2xl font-bold text-navy mb-2">Password Updated</h1>
          <p className="text-navy/60 mb-6">
            Your password has been successfully updated. You&apos;ll be redirected to the home page in a moment.
          </p>
          <a 
            href="/" 
            className="inline-block bg-navy text-white px-6 py-2 rounded-md hover:bg-navy-light transition-colors"
          >
            Continue to Site
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="font-heading text-3xl font-bold text-navy text-center mb-2">Set New Password</h1>
        <p className="text-center text-navy/60 mb-8">
          Enter your new password below
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">New Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold focus:border-gold outline-none" 
              placeholder="Enter new password"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required 
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold focus:border-gold outline-none" 
              placeholder="Confirm new password"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-navy text-white font-semibold py-3 rounded-md hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <div className="text-center text-sm text-navy/60 mt-6">
          <a href="/login" className="text-gold font-semibold hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-2xl mb-4">🔄</div>
          <h1 className="font-heading text-xl font-bold text-navy mb-2">Loading...</h1>
          <p className="text-navy/60">Please wait</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}