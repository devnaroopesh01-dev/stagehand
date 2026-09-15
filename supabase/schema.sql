-- =========================================================
-- Stagehand — mini BookMyShow schema
-- Run this once in the Supabase SQL editor.
-- =========================================================

-- ---------- Tables ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organiser_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  venue text not null,
  event_time timestamptz not null,
  ticket_price numeric(10, 2) not null check (ticket_price >= 0),
  rows int not null check (rows > 0 and rows <= 26),
  cols int not null check (cols > 0 and cols <= 50),
  created_at timestamptz not null default now()
);

create table if not exists seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text not null,
  row_index int not null,
  col_index int not null,
  unique (event_id, label)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists booking_seats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  seat_id uuid not null references seats(id) on delete cascade,
  unique (seat_id)
);

create index if not exists idx_seats_event on seats(event_id);
create index if not exists idx_bookings_event on bookings(event_id);
create index if not exists idx_bookings_user on bookings(user_id);
create index if not exists idx_booking_seats_booking on booking_seats(booking_id);

-- ---------- Auto-create a profile row on signup ----------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Booking RPCs (the only way seats get booked/cancelled) ----------

create or replace function book_seats(p_event_id uuid, p_seat_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_seat_count int;
  v_event_time timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Must be logged in to book seats';
  end if;

  if p_seat_ids is null or array_length(p_seat_ids, 1) is null then
    raise exception 'No seats selected';
  end if;

  if array_length(p_seat_ids, 1) > 4 then
    raise exception 'Cannot book more than 4 seats at once';
  end if;

  select count(*) into v_seat_count
  from seats
  where id = any(p_seat_ids) and event_id = p_event_id;

  if v_seat_count <> array_length(p_seat_ids, 1) then
    raise exception 'One or more seats do not belong to this event';
  end if;

  select event_time into v_event_time from events where id = p_event_id;
  if v_event_time is null then
    raise exception 'Event not found';
  end if;
  if v_event_time < now() then
    raise exception 'This event has already taken place';
  end if;

  insert into bookings (event_id, user_id)
  values (p_event_id, auth.uid())
  returning id into v_booking_id;

  insert into booking_seats (booking_id, seat_id)
  select v_booking_id, s
  from unnest(p_seat_ids) as s;

  return v_booking_id;
exception
  when unique_violation then
    raise exception 'One or more selected seats were just booked by someone else';
end;
$$;

create or replace function cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_event_time timestamptz;
begin
  select b.user_id, e.event_time
  into v_user_id, v_event_time
  from bookings b
  join events e on e.id = b.event_id
  where b.id = p_booking_id;

  if v_user_id is null then
    raise exception 'Booking not found';
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'Not your booking';
  end if;

  if v_event_time < now() then
    raise exception 'Cannot cancel a booking after the event has started';
  end if;

  delete from booking_seats where booking_id = p_booking_id;

  update bookings set status = 'cancelled' where id = p_booking_id;
end;
$$;

grant execute on function book_seats(uuid, uuid[]) to authenticated;
grant execute on function cancel_booking(uuid) to authenticated;

-- ---------- Row Level Security ----------

alter table profiles enable row level security;
alter table events enable row level security;
alter table seats enable row level security;
alter table bookings enable row level security;
alter table booking_seats enable row level security;

create policy "profiles are readable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid());

create policy "events are readable by authenticated users"
  on events for select
  to authenticated
  using (true);

create policy "users can create events as themselves"
  on events for insert
  to authenticated
  with check (organiser_id = auth.uid());

create policy "organisers can update their own events"
  on events for update
  to authenticated
  using (organiser_id = auth.uid());

create policy "organisers can delete their own events"
  on events for delete
  to authenticated
  using (organiser_id = auth.uid());

create policy "seats are readable by authenticated users"
  on seats for select
  to authenticated
  using (true);

create policy "organisers can generate seats for their own events"
  on seats for insert
  to authenticated
  with check (
    exists (
      select 1 from events
      where events.id = seats.event_id
      and events.organiser_id = auth.uid()
    )
  );

create policy "users can view their own bookings"
  on bookings for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from events
      where events.id = bookings.event_id
      and events.organiser_id = auth.uid()
    )
  );

create policy "users can view seats on their own or organised bookings"
  on booking_seats for select
  to authenticated
  using (
    exists (
      select 1 from bookings b
      join events e on e.id = b.event_id
      where b.id = booking_seats.booking_id
      and (b.user_id = auth.uid() or e.organiser_id = auth.uid())
    )
  );