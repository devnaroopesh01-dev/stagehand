"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/types";

type Attendee = {
  booking_id: string;
  user_id: string;
  full_name: string | null;
  seat_labels: string[];
  booked_at: string;
};

export default function OrganiserPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const eventId = params.id;

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!eventData || eventData.organiser_id !== user?.id) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    setEvent(eventData as Event);

    const { data: bookingRows } = await supabase
      .from("bookings")
      .select(
        `id, user_id, created_at,
         profiles ( full_name ),
         booking_seats ( seats ( label ) )`
      )
      .eq("event_id", eventId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false });

    const rows: Attendee[] = (bookingRows ?? []).map((b: any) => ({
      booking_id: b.id,
      user_id: b.user_id,
      full_name: b.profiles?.full_name ?? null,
      seat_labels: (b.booking_seats ?? []).map((bs: any) => bs.seats.label).sort(),
      booked_at: b.created_at,
    }));

    setAttendees(rows);
    setLoading(false);
  }, [eventId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (forbidden)
    return <p className="text-muted">You don't have access to this page.</p>;
  if (!event) return null;

  const seatsSold = attendees.reduce((sum, a) => sum + a.seat_labels.length, 0);
  const revenue = seatsSold * event.ticket_price;
  const totalSeats = event.rows * event.cols;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">{event.title}</h1>
      <p className="text-muted mb-6">Organiser view</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-line rounded-stub p-4 bg-white">
          <p className="text-sm text-muted">Seats sold</p>
          <p className="font-display text-2xl mt-1">
            {seatsSold} <span className="text-base text-muted">/ {totalSeats}</span>
          </p>
        </div>
        <div className="border border-line rounded-stub p-4 bg-white">
          <p className="text-sm text-muted">Revenue</p>
          <p className="font-display text-2xl mt-1">₹{revenue.toFixed(2)}</p>
        </div>
        <div className="border border-line rounded-stub p-4 bg-white">
          <p className="text-sm text-muted">Bookings</p>
          <p className="font-display text-2xl mt-1">{attendees.length}</p>
        </div>
      </div>

      <h2 className="font-display text-xl mb-3">Attendees</h2>
      {attendees.length === 0 ? (
        <p className="text-muted">No bookings yet.</p>
      ) : (
        <div className="border border-line rounded-stub overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-canvas border-b border-line">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Seats</th>
                <th className="px-4 py-2 font-medium">Booked at</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.booking_id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">{a.full_name ?? "—"}</td>
                  <td className="px-4 py-2">{a.seat_labels.join(", ")}</td>
                  <td className="px-4 py-2 text-muted">
                    {new Date(a.booked_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}