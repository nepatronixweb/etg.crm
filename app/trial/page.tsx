"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Building2, MapPin, User } from "lucide-react";
import { INPUT_STYLES } from "@/components/FormComponents";

export default function TrialSignupPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trial/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName,
          branchName,
          branchLocation: branchLocation || undefined,
          adminName,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Registration failed.");
        setLoading(false);
        return;
      }
      const sign = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError("Account created but sign-in failed. Please use Sign in on the login page.");
        setLoading(false);
        return;
      }
      if (sign?.ok) {
        router.push("/dashboard");
        return;
      }
      setError("Account created but sign-in did not complete. Try logging in.");
      setLoading(false);
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 ring-1 ring-white/10">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Create trial account</h2>
            <p className="text-blue-100 text-sm">
              You will be the organization admin for your team. Full access to all CRM modules during the trial.
            </p>
            <p className="text-blue-100/90 text-xs mt-3 leading-relaxed border-t border-white/10 pt-3">
              <strong className="text-white">Your own workspace.</strong> Each trial gets a new organization and branch in
              our database—your CRM data is never mixed with other companies. Lists start empty until you add them in
              Settings.
            </p>
            <p className="text-blue-100/80 text-xs mt-2 leading-relaxed">
              <strong className="text-white">Security.</strong> Passwords are stored with strong hashing. Always use this
              site over HTTPS; your host should use encrypted connections to the database (e.g. MongoDB Atlas TLS).
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/20 border border-red-400/50 text-red-100 px-4 py-3.5 rounded-xl mb-6 backdrop-blur-sm ring-1 ring-red-400/30">
              <Lock size={18} className="shrink-0 mt-0.5 text-red-300" />
              <div>
                <p className="font-semibold text-sm">Could not continue</p>
                <p className="text-xs mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">Organization name</label>
              <div className="relative group">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-100 transition-colors" />
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  maxLength={200}
                  autoComplete="organization"
                  className={`${INPUT_STYLES.full} bg-white/10 border-white/20 text-white placeholder-white/50 pl-12 focus:bg-white/20 focus:border-blue-400 focus:ring-blue-400/40 backdrop-blur-sm`}
                  placeholder="Your company or school"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">First branch name</label>
              <div className="relative group">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-100 transition-colors" />
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                  maxLength={200}
                  className={`${INPUT_STYLES.full} bg-white/10 border-white/20 text-white placeholder-white/50 pl-12 focus:bg-white/20 focus:border-blue-400 focus:ring-blue-400/40 backdrop-blur-sm`}
                  placeholder="e.g. Main office"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">Branch location (optional)</label>
              <div className="relative group">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-100 transition-colors" />
                <input
                  type="text"
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                  maxLength={500}
                  className={`${INPUT_STYLES.full} bg-white/10 border-white/20 text-white placeholder-white/50 pl-12 focus:bg-white/20 focus:border-blue-400 focus:ring-blue-400/40 backdrop-blur-sm`}
                  placeholder="City or address"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">Your name</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-100 transition-colors" />
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  maxLength={120}
                  autoComplete="name"
                  className={`${INPUT_STYLES.full} bg-white/10 border-white/20 text-white placeholder-white/50 pl-12 focus:bg-white/20 focus:border-blue-400 focus:ring-blue-400/40 backdrop-blur-sm`}
                  placeholder="Admin full name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-100 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={`${INPUT_STYLES.full} bg-white/10 border-white/20 text-white placeholder-white/50 pl-12 focus:bg-white/20 focus:border-blue-400 focus:ring-blue-400/40 backdrop-blur-sm`}
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-100 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`${INPUT_STYLES.full} bg-white/10 border-white/20 text-white placeholder-white/50 pl-12 pr-12 focus:bg-white/20 focus:border-blue-400 focus:ring-blue-400/40 backdrop-blur-sm`}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-100 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded-xl font-bold transition-colors duration-200 shadow-lg hover:shadow-xl disabled:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2.5 group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>Creating workspace…</span>
                </>
              ) : (
                <>
                  <span>Start trial and sign in</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/50 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-200 hover:text-white underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        <div className="text-center mt-6 text-xs text-blue-200/60">
          <p>Trial access is subject to fair use. Contact us to continue after the trial.</p>
        </div>
      </div>
    </div>
  );
}
