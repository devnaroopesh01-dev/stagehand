"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewEventPage() {
  const supabase = createClient();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalSeats = rows * cols;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rows < 1 || rows > 26) {
      setError("Rows must be between 1 and 26 (rows are lettered A–Z).");
      return;
    }
    if (cols < 1 || cols > 50) {
      setError("Columns must be between 1 and 50.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const eventTime = new Date(`${date}T${time}`).toISOString();

    // 1. Create the event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organiser_id: user.id,
        title,
        description,
        venue,
        event_time: eventTime,
        ticket_price: Number(price),
        rows,
        cols,
      })
      .select()
      .single();

    if (eventError || !event) {
      setError(eventError?.message ?? "Could not create event.");
      setLoading(false);
      return;
    }

    // 2. Generate the seat grid: A1..A{cols}, B1..B{cols}, ...
    const seatRows = [];
    for (let r = 0; r < rows; r++) {
      const rowLetter = String.fromCharCode(65 + r);
      for (let c = 1; c <= cols; c++) {
        seatRows.push({
          event_id: event.id,
          label: `${rowLetter}${c}`,
          row_index: r,
          col_index: c - 1,
        });
      }
    }

    const { error: seatsError } = await supabase.from("seats").insert(seatRows);

    setLoading(false);

    if (seatsError) {
      setError(
        `Event created, but seat generation failed: ${seatsError.message}`
      );
      return;
    }

    router.push(`/events/${event.id}`);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-3xl mb-6">Create an event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Venue</label>
          <input
            required
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Time</label>
            <input
              required
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Ticket price (₹)</label>
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Rows (max 26)</label>
            <input
              required
              type="number"
              min={1}
              max={26}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Columns (max 50)</label>
            <input
              required
              type="number"
              min={1}
              max={50}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full border border-line rounded-stub px-3 py-2 focus:outline-none focus:ring-2 focus:ring-marigold"
            />
          </div>
        </div>

        <p className="text-sm text-muted">
          This generates {totalSeats} seats, labelled A1 through{" "}
          {String.fromCharCode(65 + rows - 1)}
          {cols}.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-midnight text-canvas rounded-stub py-2.5 font-medium hover:bg-midnight/90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create event"}
        </button>
      </form>
    </div>
  );
}