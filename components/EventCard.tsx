import Link from "next/link";
import type { Event } from "@/lib/types";

function formatDateParts(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, { day: "2-digit" });
  const month = d.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { day, month, time };
}

export default function EventCard({ event }: { event: Event }) {
  const { day, month, time } = formatDateParts(event.event_time);
  const totalSeats = event.rows * event.cols;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="ticket-card group-hover:shadow-md transition-shadow">
        <div className="stub">
          <span className="text-2xl font-display leading-none">{day}</span>
          <span className="text-xs tracking-wide mt-1">{month}</span>
        </div>
        <div className="perforation" />
        <div className="flex-1 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg truncate">{event.title}</h3>
            <p className="text-sm text-muted truncate">{event.venue}</p>
            <p className="text-sm text-muted mt-1">
              {time} · {totalSeats} seats
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-lg text-mauveDark">
              ₹{event.ticket_price}+
            </p>
            <p className="text-xs text-muted">from, VIP 2x</p>
          </div>
        </div>
      </div>
    </Link>
  );
}