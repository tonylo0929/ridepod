import { HK_TAXI_TYPE_LABELS, calculateHkTaxiFareEstimate, calculateSuggestedSeatContribution, formatHkdRange, type TaxiType } from "@/lib/hkTaxiFare";
import type { HomeRide } from "@/lib/home-ride-mock";

export function inferDistanceMeters(ride: HomeRide) {
  if (ride.fareReferenceDistanceMeters) return ride.fareReferenceDistanceMeters;

  const routeKey = `${ride.fromLabel} -> ${ride.toLabel}`.toLowerCase();
  if (/central.*tsim sha tsui|tsim sha tsui.*central/.test(routeKey)) return 8600;
  if (/wan chai.*mong kok|mong kok.*wan chai/.test(routeKey)) return 7200;
  if (/airport|hk international airport/.test(routeKey)) return 32000;
  if (/sha tin.*central|central.*sha tin/.test(routeKey)) return 17000;
  if (/tung chung|lantau/.test(routeKey)) return 15000;
  return 6000;
}

export function inferTaxiType(ride: HomeRide): TaxiType {
  if (ride.fareReferenceTaxiType) return ride.fareReferenceTaxiType;
  const routeKey = `${ride.fromDistrict} ${ride.toDistrict} ${ride.fromLabel} ${ride.toLabel}`.toLowerCase();
  if (/lantau|tung chung/.test(routeKey)) return "lantau";
  if (/sha tin|tsuen wan|new territories/.test(routeKey)) return "nt";
  return "urban";
}

export function inferBaggageCount(ride: HomeRide) {
  const match = ride.luggage.match(/\d+/);
  return match ? Number(match[0]) : ride.luggage.toLowerCase().includes("no luggage") ? 0 : 1;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-[var(--rp-border)] pt-2 first:border-t-0 first:pt-0">
      <dt className="text-sm font-semibold leading-5 text-[var(--rp-muted)]">{label}</dt>
      <dd className="max-w-[58%] text-right text-sm font-black leading-5 text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

export function getPodDetailFareReference(ride: HomeRide) {
  const taxiType = inferTaxiType(ride);
  const distanceMeters = inferDistanceMeters(ride);
  const fareEstimate = calculateHkTaxiFareEstimate({
    taxiType,
    distanceMeters,
    baggageCount: inferBaggageCount(ride),
    tollAmount: ride.fareReferenceTollAmount ?? 0,
    uncertaintyPercent: 0.15,
  });
  const contribution = calculateSuggestedSeatContribution({
    fareEstimate,
    seatCount: ride.seatsTotal,
    ridePodServiceFeePerSeat: ride.ridePodProtectionFeePerSeat ?? 8,
  });

  return { taxiType, fareEstimate, contribution };
}

export function PodDetailFareReferenceRows({ ride }: { ride: HomeRide }) {
  const { taxiType, fareEstimate, contribution } = getPodDetailFareReference(ride);

  if (!fareEstimate.available) {
    return (
      <p className="text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        Fare reference unavailable until pickup and dropoff are selected.
      </p>
    );
  }

  const fareRange = formatHkdRange(fareEstimate.roundedLowEstimate, fareEstimate.roundedHighEstimate);
  const splitRange = formatHkdRange(contribution.roundedBaseLowPerSeat, contribution.roundedBaseHighPerSeat);
  const distanceKm = (fareEstimate.distanceMeters / 1000).toFixed(1);

  return (
    <>
      <dl className="grid gap-2">
        <Row label="Estimated taxi fare reference" value={fareRange} />
        <Row label={`Split by ${contribution.seatCount} riders`} value={`${splitRange} / seat`} />
        <Row label="RidePod fee" value={`HK$${contribution.ridePodServiceFeePerSeat} / seat`} />
        <Row label="Taxi type" value={HK_TAXI_TYPE_LABELS[taxiType]} />
        <Row label="Route distance" value={`${distanceKm} km`} />
      </dl>
      <p className="mt-3 rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
        Reference only. Final taxi quote may vary due to route, traffic, waiting time, tolls, and luggage.
      </p>
    </>
  );
}

export function PodDetailFareReferenceCard({ ride }: { ride: HomeRide }) {
  const { taxiType, fareEstimate, contribution } = getPodDetailFareReference(ride);

  if (!fareEstimate.available) {
    return (
      <section className="rounded-[26px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
        <h2 className="text-xl font-black text-[var(--rp-text)]">Fare reference</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
          Fare reference unavailable until pickup and dropoff are selected.
        </p>
      </section>
    );
  }

  const fareRange = formatHkdRange(fareEstimate.roundedLowEstimate, fareEstimate.roundedHighEstimate);
  const splitRange = formatHkdRange(contribution.roundedBaseLowPerSeat, contribution.roundedBaseHighPerSeat);
  const contributionRange = formatHkdRange(
    contribution.roundedSuggestedLowPerSeat,
    contribution.roundedSuggestedHighPerSeat,
  );
  const distanceKm = (fareEstimate.distanceMeters / 1000).toFixed(1);

  return (
    <section className="rounded-[26px] border border-[var(--rp-border-strong)] bg-[linear-gradient(135deg,rgba(246,196,83,0.1),rgba(15,23,42,0.18)),var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">
        Fare reference
      </p>
      <h2 className="mt-2 text-3xl font-black leading-none text-[var(--rp-text)]">
        {contributionRange} / seat
      </h2>
      <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
        Suggested shared contribution
      </p>

      <dl className="mt-4 grid gap-2">
        <Row label="Estimated taxi fare reference" value={fareRange} />
        <Row label={`Split by ${contribution.seatCount} riders`} value={`${splitRange} / seat`} />
        <Row label="RidePod fee" value={`HK$${contribution.ridePodServiceFeePerSeat} / seat`} />
        <Row label="Taxi type" value={HK_TAXI_TYPE_LABELS[taxiType]} />
        <Row label="Route distance" value={`${distanceKm} km`} />
      </dl>

      <p className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
        Reference only. Final taxi meter fare may vary due to route, traffic, waiting time, tolls and luggage.
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
        Based on estimated route distance and Hong Kong taxi meter rules. Tolls may not be included.
      </p>
    </section>
  );
}
