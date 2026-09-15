"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ReceiptData = {
  id: string;
  created_at: string;
  status: string;
  events: {
    title: string;
    venue: string;
    event_time: string;
  };
  booking_seats: { price: number; seats: { label: string } }[];
};

export default function ReceiptPage({ params }: { params: { bookingId: string } }) {
  const supabase = createClient();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: row, error } = await supabase
        .from("bookings")
        .select(
          `id, created_at, status,
           events ( title, venue, event_time ),
           booking_seats ( price, seats ( label ) )`
        )
        .eq("id", params.bookingId)
        .single();

      if (error || !row) {
        setNotFound(true);
      } else {
        setData(row as unknown as ReceiptData);
      }
      setLoading(false);
    }
    load();
  }, [params.bookingId, supabase]);

  if (loading) return <p className="text-muted">Loading receipt…</p>;
  if (notFound || !data)
    return <p className="text-muted">Receipt not found, or you don't have access to it.</p>;

  const seatLabels = data.booking_seats.map((bs) => bs.seats.label).sort();
  const total = data.booking_seats.reduce((sum, bs) => sum + Number(bs.price), 0);
  const eventDate = new Date(data.events.event_time);

  return (
    <div className="max-w-md mx-auto">
      <div className="border border-line rounded-stub bg-white p-8">
        <div className="text-center mb-6">
          <p className="text-xs tracking-widest text-muted uppercase">Receipt</p>
          <h1 className="font-display text-2xl mt-1">{data.events.title}</h1>
        </div>

        <div className="border-t border-dashed border-line my-4" />

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Venue</dt>
            <dd>{data.events.venue}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Date &amp; time</dt>
            <dd>
              {eventDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Seats</dt>
            <dd>{seatLabels.join(", ")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Status</dt>
            <dd className="capitalize">{data.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Booked on</dt>
            <dd>{new Date(data.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>

        <div className="border-t border-dashed border-line my-4" />

        <div className="flex justify-between items-baseline">
          <span className="font-display text-lg">Total</span>
          <span className="font-display text-2xl text-mauveDark">₹{total.toFixed(2)}</span>
        </div>

        <p className="text-xs text-muted text-center mt-6">
          Booking ID: {data.id}
        </p>
      </div>

      <div className="text-center mt-6">
        <Link href="/my-bookings" className="text-sm text-mauveDark font-medium">
          ← Back to My Bookings
        </Link>
      </div>
    </div>
  );
}