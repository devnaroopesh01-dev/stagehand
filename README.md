# Stagehand — a mini BookMyShow

Create events, get an auto-generated seat grid, and let logged-in users book
up to 4 seats each without ever double-booking a seat.

**Live demo:** https://stagehand-three-drab.vercel.app/events
**Repo:** https://github.com/devnaroopesh01-dev/stagehand

## Screenshots

![Events page](screenshots/events.png)
![Seat map with VIP rows](screenshots/seatmap.png)
![My bookings with QR code](screenshots/bookings.png)
![Receipt page](screenshots/receipt.png)

## Features

- Sign up / log in with Supabase Auth
- Create an event (title, description, venue, date/time, price, rows × columns) — seats are generated automatically (A1–E10 style)
- Browse upcoming events
- Seat map showing available, selected, held, VIP, and booked seats
- Hold up to 4 seats for 5 minutes before confirming
- Last 2 rows of every event are VIP, priced at 2x
- My Bookings page with cancellation (before the event starts) and a QR code per booking that opens a receipt
- Organiser dashboard per event: seats sold, revenue, attendee list

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase: Postgres, Auth, Row Level Security
- `qrcode.react` for booking QR codes

## Setup

1. **Create a Supabase project** at supabase.com.

2. **Run the schema.** Open the SQL editor in your Supabase dashboard and run
   the entire contents of [`supabase/schema.sql`](supabase/schema.sql). This
   creates the tables, the profile-creation trigger, the seat-hold and
   booking functions, and all RLS policies.

3. **Env vars.** Copy `.env.example` to `.env.local` and fill in your
   project's URL and anon key (Project Settings → API in Supabase).

4. **Install & run.**
```bash
   npm install
   npm run dev
```
   Visit http://localhost:3000.

5. **Auth settings.** In Supabase → Authentication → Providers, Email is
   enabled by default. For local testing, turn off "Confirm email" under
   Authentication → Settings so signup logs you in immediately.

## How double-booking is prevented

`booking_seats.seat_id` has a `unique` constraint in Postgres. Booking is
done through a single database function (`book_seats`), called via
`supabase.rpc()`, that inserts the booking and its seats in one transaction.
If two people race for the same seat, the second insert hits the unique
constraint and the whole transaction rolls back — so no partial or
duplicate booking is ever created. **This guarantee is enforced by the
database itself, not application code**, so it holds even under concurrent
requests or if the frontend is bypassed entirely.

Seats can also be soft-held for 5 minutes before confirming (via
`hold_seats`), so two people don't both start checkout on the same seat at
once — but the hard guarantee against double-booking is the unique
constraint above, not the hold. An expired hold is simply ignored by
`book_seats`, so a hold can never itself block a legitimate booking.

Cancelling a booking deletes its `booking_seats` rows (freeing the seat)
and marks the booking `cancelled` for history. Cancellation is blocked
once the event's `event_time` has passed.

## Project structure

```
stagehand/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
├── middleware.ts                          # refreshes auth session, gates protected routes
├── app/
│   ├── globals.css
│   ├── layout.tsx                         # root layout, fonts, navbar
│   ├── page.tsx                           # redirects to /events
│   ├── login/
│   │   └── page.tsx                       # log in (Suspense-wrapped for useSearchParams)
│   ├── signup/
│   │   └── page.tsx                       # sign up
│   ├── events/
│   │   ├── page.tsx                       # upcoming events list
│   │   ├── new/
│   │   │   └── page.tsx                   # create-event form + seat generation
│   │   └── [id]/
│   │       ├── page.tsx                   # event detail: seat map, hold, booking
│   │       └── organiser/
│   │           └── page.tsx               # seats sold, revenue, attendees
│   ├── my-bookings/
│   │   └── page.tsx                       # user's bookings, cancel, QR code
│   └── receipt/
│       └── [bookingId]/
│           └── page.tsx                   # booking receipt (opened via QR code)
├── components/
│   ├── Navbar.tsx                         # top nav, auth-aware links
│   ├── EventCard.tsx                      # ticket-stub style event card
│   └── SeatMap.tsx                        # seat grid: available/selected/held/VIP/booked
├── lib/
│   ├── types.ts                           # shared TypeScript types
│   └── supabase/
│       ├── client.ts                      # browser Supabase client
│       └── server.ts                      # server Supabase client
└── supabase/
    └── schema.sql                         # tables, RLS policies, booking/hold functions
```
  
