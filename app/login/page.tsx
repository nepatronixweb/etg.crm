"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const quickFill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError("");
  };

  const QUICK_LOGINS = [
    { label: "Super Admin", email: "admin@etg.com" },
    { label: "Front Desk", email: "hari@etg.com" },
    { label: "Counsellor", email: "ram@etg.com" },
    { label: "Application", email: "priya@etg.com" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-xl mb-4 shadow-lg">
            <span className="text-white text-lg font-bold tracking-tight">ETG</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Education Tree Global</h1>
          <p className="text-sm text-gray-500 mt-1">CRM Portal — Staff Access</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">

          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900">Sign in to your account</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter your credentials to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              <Lock size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
                  placeholder="you@etg.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-colors mt-2 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gray-900 hover:bg-gray-700 text-white"
              }`}
            >
              {loading ? (
                <>
                  <span className="border-2 border-white/40 border-t-white rounded-full animate-spin w-3.5 h-3.5" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Quick-fill for dev */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Quick Login</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_LOGINS.map((q) => (
                <button
                  key={q.email}
                  type="button"
                  onClick={() => quickFill(q.email, "Admin@123")}
                  className="text-left px-3 py-2 border border-gray-200 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-xs font-semibold text-gray-700">{q.label}</p>
                  <p className="text-xs text-gray-400 truncate">{q.email}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Password: <span className="font-mono font-semibold text-gray-500">Admin@123</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Restricted access — Authorized staff only
        </p>
      </div>
    </div>
  );
}
