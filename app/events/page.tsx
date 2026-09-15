"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";
import EventCard from "@/components/EventCard";

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gt("event_time", new Date().toISOString())
        .order("event_time", { ascending: true });

      if (!error && data) setEvents(data as Event[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Upcoming events</h1>
        <Link
          href="/events/new"
          className="rounded-stub bg-marigold text-midnight px-4 py-2 font-medium hover:bg-marigoldDark transition-colors"
        >
          Create event
        </Link>
      </div>

      {loading && <p className="text-muted">Loading events…</p>}

      {!loading && events.length === 0 && (
        <div className="border border-dashed border-line rounded-stub py-16 text-center">
          <p className="text-muted">No upcoming events yet.</p>
          <Link href="/events/new" className="text-marigoldDark font-medium">
            Be the first to create one
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}