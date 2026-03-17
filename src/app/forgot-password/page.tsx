"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="font-heading text-2xl font-bold text-navy mb-2">Check Your Email</h1>
          <p className="text-navy/60 mb-6">
            We&apos;ve sent a password reset link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-navy/60 mb-4">
            Click the link in the email to reset your password. The link will expire in 24 hours.
          </p>
          <a 
            href="/login" 
            className="inline-block bg-navy text-white px-6 py-2 rounded-md hover:bg-navy-light transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-cream px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="font-heading text-3xl font-bold text-navy text-center mb-2">Reset Password</h1>
        <p className="text-center text-navy/60 mb-8">
          Enter your email and we&apos;ll send you a link to reset your password
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="w-full px-4 py-2.5 border border-gray-200 rounded-md focus:ring-2 focus:ring-gold focus:border-gold outline-none" 
              placeholder="Enter your email address"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-navy text-white font-semibold py-3 rounded-md hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="text-center text-sm text-navy/60 mt-6">
          <a href="/login" className="text-gold font-semibold hover:underline">Back to Login</a>
        </div>
      </div>
    </div>
  );
}