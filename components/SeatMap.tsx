"use client";

import type { Seat } from "@/lib/types";

type SeatMapProps = {
  seats: Seat[];
  bookedSeatIds: Set<string>;
  heldByOthersSeatIds: Set<string>;
  selectedSeatIds: Set<string>;
  onToggleSeat: (seat: Seat) => void;
  maxSelectable?: number;
  vipRowThreshold: number; // row_index >= this is VIP
  basePrice: number;
};

export default function SeatMap({
  seats,
  bookedSeatIds,
  heldByOthersSeatIds,
  selectedSeatIds,
  onToggleSeat,
  maxSelectable = 4,
  vipRowThreshold,
  basePrice,
}: SeatMapProps) {
  const rowCount = Math.max(...seats.map((s) => s.row_index), -1) + 1;

  const byRow: Seat[][] = Array.from({ length: rowCount }, () => []);
  for (const seat of seats) {
    byRow[seat.row_index].push(seat);
  }
  byRow.forEach((row) => row.sort((a, b) => a.col_index - b.col_index));

  return (
    <div>
      <div className="mx-auto mb-8 w-full max-w-md">
        <div className="h-2 rounded-full bg-gradient-to-r from-transparent via-ink/20 to-transparent" />
        <p className="text-center text-xs text-muted tracking-wide mt-2">SCREEN / STAGE</p>
      </div>

      <div className="flex flex-col items-center gap-2 overflow-x-auto pb-2">
        {byRow.map((row, i) => {
          const isVipRow = i >= vipRowThreshold;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-xs text-muted text-right">
                {String.fromCharCode(65 + i)}
              </span>
              <div className="flex gap-1.5">
                {row.map((seat) => {
                  const isBooked = bookedSeatIds.has(seat.id);
                  const isHeld = heldByOthersSeatIds.has(seat.id);
                  const isSelected = selectedSeatIds.has(seat.id);
                  const isTaken = isBooked || isHeld;
                  const atLimit =
                    !isSelected && selectedSeatIds.size >= maxSelectable;

                  let className = isVipRow ? "seat seat-vip" : "seat seat-available";
                  if (isBooked) className = "seat seat-booked";
                  else if (isHeld) className = "seat seat-held";
                  else if (isSelected) className = "seat seat-selected";

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={isTaken || (atLimit && !isSelected)}
                      onClick={() => onToggleSeat(seat)}
                      title={`${seat.label}${isVipRow ? " · VIP" : ""}${isHeld ? " · held" : ""}`}
                      className={`${className} ${
                        atLimit && !isSelected && !isTaken ? "opacity-40" : ""
                      }`}
                    >
                      {seat.col_index + 1}
                    </button>
                  );
                })}
              </div>
              {isVipRow && (
                <span className="text-xs text-vipGold font-medium ml-1">
                  VIP · ₹{(basePrice * 2).toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="seat seat-available !w-4 !h-4" />
          Available
        </div>
        <div className="flex items-center gap-2">
          <span className="seat seat-vip !w-4 !h-4" />
          VIP
        </div>
        <div className="flex items-center gap-2">
          <span className="seat seat-selected !w-4 !h-4" />
          Selected
        </div>
        <div className="flex items-center gap-2">
          <span className="seat seat-held !w-4 !h-4" />
          Held
        </div>
        <div className="flex items-center gap-2">
          <span className="seat seat-booked !w-4 !h-4" />
          Booked
        </div>
      </div>
    </div>
  );
}