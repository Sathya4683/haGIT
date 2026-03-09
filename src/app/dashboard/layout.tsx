"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth/login");
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--paper))]">
        <div className="space-y-3 text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--ink-muted))]">Loading</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
