export type Event = {
  id: string;
  organiser_id: string;
  title: string;
  description: string | null;
  venue: string;
  event_time: string;
  ticket_price: number;
  rows: number;
  cols: number;
  created_at: string;
};

export type Seat = {
  id: string;
  event_id: string;
  label: string;
  row_index: number;
  col_index: number;
};

export type Booking = {
  id: string;
  event_id: string;
  user_id: string;
  status: "confirmed" | "cancelled";
  created_at: string;
};

export type BookingSeat = {
  id: string;
  booking_id: string;
  seat_id: string;
};