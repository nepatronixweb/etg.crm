"use client";

import { useSession, signOut } from "next-auth/react";
import { CreditCard, LogOut } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Link href="/login" className="text-blue-600 hover:underline text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  const org = session.user.organizationName;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-2xl border border-white/10 p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-amber-500/20 text-amber-300">
            <CreditCard size={40} strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-center mb-2">Subscription required</h1>
        <p className="text-sm text-slate-300 text-center leading-relaxed mb-6">
          {org ? (
            <>
              Access for <span className="text-white font-medium">{org}</span> is paused. Your free trial may have
              ended, or the account needs to be activated after payment.
            </>
          ) : (
            <>Your account is not linked to an active organization subscription.</>
          )}
        </p>
        <p className="text-xs text-slate-400 text-center mb-8">
          Please contact your administrator or our team to complete payment. Once your organization is set to{" "}
          <strong className="text-slate-200">active</strong> in the system, refresh this page or sign in again—access
          updates within about a minute.
        </p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}
