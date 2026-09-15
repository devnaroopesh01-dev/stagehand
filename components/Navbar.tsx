"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-plum text-cream">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/events" className="font-display text-xl tracking-tight">
          Stagehand
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/events" className="hover:text-mauve transition-colors">
            Events
          </Link>
          {user && (
            <>
              <Link href="/events/new" className="hover:text-mauve transition-colors">
                Create event
              </Link>
              <Link href="/my-bookings" className="hover:text-mauve transition-colors">
                My bookings
              </Link>
            </>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-stub border border-cream/30 px-3 py-1.5 hover:bg-cream/10 transition-colors"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-stub bg-mauve text-plum px-3 py-1.5 font-medium hover:bg-mauveDark hover:text-cream transition-colors"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}