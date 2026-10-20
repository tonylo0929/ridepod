import { Plane } from "lucide-react";
import {
  departureAt,
  fullMomentLabel,
  normalizeFlight,
  type Journey,
} from "./data";
import s from "./preview.module.css";

export function FlightBadge({ flight }: { flight: string }) {
  const number = normalizeFlight(flight);
  if (!number) return null;
  return (
    <span className={s.flightBadge}>
      <Plane size={15} aria-hidden="true" />
      <span>
        航班 <b>{number}</b>
      </span>
    </span>
  );
}

export function AirportTiming({
  journey,
}: {
  journey: Pick<
    Journey,
    "date" | "time" | "direction" | "scheduledFlightAt" | "airportReadyAt"
  >;
  today: string;
}) {
  return (
    <dl className={s.timingList} aria-label="機場旅程時間">
      {journey.direction === "from_airport" && journey.airportReadyAt && (
        <div>
          <dt>預計出閘 · 已過關及取行李</dt>
          <dd>{fullMomentLabel(journey.airportReadyAt)}</dd>
        </div>
      )}
      <div className={s.departureRow}>
        <dt>預計夾車出發</dt>
        <dd>{fullMomentLabel(departureAt(journey))}</dd>
      </div>
      {journey.scheduledFlightAt && (
        <div>
          <dt>
            {journey.direction === "from_airport"
              ? "航班預定抵達"
              : "航班預定起飛"}
          </dt>
          <dd>{fullMomentLabel(journey.scheduledFlightAt)}</dd>
        </div>
      )}
    </dl>
  );
}
