export type PricingSeat = { row_index: number };
export type PricingEvent = { rows: number; ticket_price: number };

// Last two rows of the grid are VIP.
export function isVipSeat(seat: PricingSeat, event: PricingEvent) {
  return seat.row_index >= event.rows - 2;
}

export function seatPrice(seat: PricingSeat, event: PricingEvent) {
  return isVipSeat(seat, event) ? event.ticket_price * 2 : event.ticket_price;
}

export function totalPrice(seats: PricingSeat[], event: PricingEvent) {
  return seats.reduce((sum, s) => sum + seatPrice(s, event), 0);
}