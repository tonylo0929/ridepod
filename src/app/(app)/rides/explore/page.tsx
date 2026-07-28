"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Landmark,
  MapPin,
  Plane,
  Search,
  UsersRound,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { cn } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { createdHomeRideViewerIdentityFromAuth, useCreatedHomeRides } from "@/lib/created-home-rides";
import { homeRides, type HomeRide } from "@/lib/home-ride-mock";
import {
  buildRideExploreHref,
  districtRegionTabs,
  officialDistricts,
  popularHubSummaries,
  popularRouteSummaries,
  slugToTitle,
  type DistrictRegionId,
} from "@/lib/ride-explorer";
import { applyRideAppDemoPersona } from "@/lib/ride-app-demo-persona";

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function parseRideExploreDate(ride: HomeRide, referenceDate: Date) {
  if (ride.selectedRideDate) {
    const parsed = new Date(`${ride.selectedRideDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const label = ride.dateLabel.trim().toLowerCase();
  if (label.includes("today")) return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (label.includes("tomorrow")) return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 1);

  const match = ride.dateLabel.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{1,2})\b/i);
  if (!match) return null;
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].findIndex((item) =>
    match[1].toLowerCase().startsWith(item),
  );
  if (month < 0) return null;
  return new Date(referenceDate.getFullYear(), month, Number(match[2]));
}

function isRideExploreUpcoming(ride: HomeRide, referenceDate: Date) {
  if (
    ride.status === "cancelled" ||
    ride.status === "cancelled_by_host" ||
    ride.status === "cancelled_by_system" ||
    ride.status === "cancellation_review_required" ||
    ride.status === "expired" ||
    ride.rideAppPodStatus === "cancelled" ||
    ride.rideAppHostCancellationStatus === "cancelled" ||
    ride.rideAppHostCancellationStatus === "host_cancelled" ||
    ride.rideAppHostCancellationStatus === "cancelled_by_host" ||
    ride.rideAppHostCancellationStatus === "cancellation_review_required"
  ) {
    return false;
  }

  const rideDate = parseRideExploreDate(ride, referenceDate);
  if (!rideDate) return true;
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return rideDate.getTime() >= today.getTime();
}

function rideAreaMatches(ride: HomeRide, areaName: string, side: "from" | "to" | "either") {
  const area = normalizeSearchText(areaName);
  const values = side === "from"
    ? [ride.fromDistrict, ride.fromLabel, ride.pickupLabel]
    : side === "to"
      ? [ride.toDistrict, ride.toLabel, ride.dropoffLabel]
      : [ride.fromDistrict, ride.fromLabel, ride.pickupLabel, ride.toDistrict, ride.toLabel, ride.dropoffLabel];

  return values.some((value) => value && normalizeSearchText(value).includes(area));
}

function countRidesForArea(rides: HomeRide[], areaName: string, side: "from" | "to" | "either" = "from") {
  return rides.filter((ride) => rideAreaMatches(ride, areaName, side)).length;
}

function RideExploreContent() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const viewerIdentity = useMemo(() => createdHomeRideViewerIdentityFromAuth({ profile, user }), [profile, user]);
  const createdHomeRides = useCreatedHomeRides(user?.id ?? null, true, viewerIdentity);
  const fromQuery = searchParams.get("from");
  const toQuery = searchParams.get("to");
  const fromLabel = slugToTitle(fromQuery);
  const toLabel = slugToTitle(toQuery);
  const [activeRegion, setActiveRegion] = useState<DistrictRegionId>("all");
  const [searchValue, setSearchValue] = useState("");
  const normalizedSearch = normalizeSearchText(searchValue);
  const referenceDate = useMemo(() => new Date(), []);
  const visibleRides = useMemo(() => {
    const demoRides = homeRides.map((ride) => applyRideAppDemoPersona(ride, { profile, user }));
    return [
      ...createdHomeRides,
      ...demoRides.filter((ride) => !createdHomeRides.some((createdRide) => createdRide.id === ride.id)),
    ].filter((ride) => isRideExploreUpcoming(ride, referenceDate));
  }, [createdHomeRides, profile, referenceDate, user]);

  const districtCards = useMemo(
    () =>
      officialDistricts.map((district) => ({
        ...district,
        rideCount: countRidesForArea(visibleRides, district.name, "from"),
      })),
    [visibleRides],
  );

  const routeCards = useMemo(
    () =>
      popularRouteSummaries.map((route) => ({
        ...route,
        rideCount: visibleRides.filter((ride) => rideAreaMatches(ride, route.from, "from") && rideAreaMatches(ride, route.to, "to")).length,
      })),
    [visibleRides],
  );

  const hubCards = useMemo(
    () =>
      popularHubSummaries.map((hub) => ({
        ...hub,
        rideCount: countRidesForArea(visibleRides, hub.name, "either"),
      })),
    [visibleRides],
  );

  const filteredDistricts = useMemo(
    () =>
      districtCards.filter((district) => {
        const matchesRegion = activeRegion === "all" || district.region === activeRegion;
        const matchesSearch =
          !normalizedSearch ||
          normalizeSearchText(`${district.name} ${district.region}`).includes(normalizedSearch);

        return matchesRegion && matchesSearch;
      }),
    [activeRegion, districtCards, normalizedSearch],
  );

  const matchingRoutes = useMemo(
    () =>
      routeCards.filter((route) => {
        const matchesFrom = !fromQuery || route.fromQuery === fromQuery;
        const matchesTo = !toQuery || route.toQuery === toQuery;
        return matchesFrom && matchesTo;
      }),
    [fromQuery, routeCards, toQuery],
  );

  const title = fromLabel && toLabel ? `${fromLabel} to ${toLabel}` : fromLabel ? `Rides from ${fromLabel}` : "Explore rides";
  const subtitle = fromLabel ? "Choose where you're going" : "Search districts, hubs, and popular routes";

  return (
    <main className="mx-auto grid w-full max-w-[680px] gap-5 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8">
      <Link
        href="/home"
        aria-label="Back home"
        className="ridepod-back-button"
      >
        <ArrowLeft aria-hidden="true" />
      </Link>

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(11,25,38,0.96),rgba(5,15,24,0.98))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#65e6d0]">Ride explorer</p>
        <h1 className="mt-2 text-[28px] font-black leading-tight text-[var(--rp-text)]">{title}</h1>
        <p className="mt-2 text-sm font-bold leading-5 text-[var(--rp-muted-strong)]">{subtitle}</p>

        {(fromLabel || toLabel) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {fromLabel ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-[#65e6d0]/28 bg-[#65e6d0]/10 px-3 text-xs font-black text-[#9ffce8]">
                From: {fromLabel}
              </span>
            ) : null}
            {toLabel ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-[var(--rp-primary)]/28 bg-[var(--rp-primary)]/10 px-3 text-xs font-black text-[var(--rp-primary)]">
                To: {toLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="matching-routes-title" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="matching-routes-title" className="scroll-mt-24 text-lg font-black text-[var(--rp-text)]">Popular routes near you</h2>
          <UsersRound className="h-5 w-5 text-[var(--rp-primary)]" />
        </div>

        <div className="grid gap-2.5">
          {(matchingRoutes.length ? matchingRoutes : routeCards).map((route) => (
            <Link
              key={route.id}
              href={buildRideExploreHref({ from: route.fromQuery, to: route.toQuery })}
              className="group grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-white/10 bg-[rgba(10,24,37,0.9)] px-3 py-3 transition hover:border-[var(--rp-primary)]/46 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-[var(--rp-primary)]"
            >
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", route.accentClassName)} />
                  <span className="truncate text-sm font-black text-white">
                    {route.from} <span className="text-[#65e6d0]">-&gt;</span> {route.to}
                  </span>
                </span>
                <span className="mt-1.5 block text-xs font-bold text-[var(--rp-muted-strong)]">{route.rideCount} rides</span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/46 transition group-hover:translate-x-0.5 group-hover:text-[var(--rp-primary)]" />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="districts-title" className="grid gap-3">
        <div>
          <h2 id="districts-title" className="scroll-mt-24 text-lg font-black text-[var(--rp-text)]">Browse all districts</h2>
          <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">Official Hong Kong districts</p>
        </div>

        <label className="flex min-h-12 items-center gap-2 rounded-[16px] border border-white/10 bg-[#07111a] px-3 focus-within:border-[#65e6d0]/58 focus-within:ring-2 focus-within:ring-[#65e6d0]/18">
          <Search className="h-4 w-4 shrink-0 text-[#98fbcB]" />
          <span className="sr-only">Search district or destination</span>
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search district or destination"
            className="min-w-0 flex-1 bg-transparent text-sm font-black text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)]"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {districtRegionTabs.map((tab) => {
            const selected = activeRegion === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRegion(tab.id)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-xs font-black transition",
                  selected
                    ? "border-[#65e6d0]/58 bg-[#65e6d0]/18 text-[#a7fff0]"
                    : "border-white/10 bg-white/[0.055] text-[var(--rp-muted-strong)] hover:border-white/20 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2">
          {filteredDistricts.map((district) => (
            <Link
              key={district.id}
              href={buildRideExploreHref({ from: district.queryValue })}
              className="group grid min-h-[64px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-white/10 bg-[rgba(10,24,37,0.86)] px-3 py-2.5 transition hover:border-[#65e6d0]/40 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-[#65e6d0]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#65e6d0]/24 bg-[#65e6d0]/10 text-[#98fbcB]">
                {district.region === "hong-kong-island" ? <Building2 className="h-4 w-4" /> : district.region === "kowloon" ? <Landmark className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">{district.name}</span>
                <span className="mt-1 block text-xs font-bold text-[var(--rp-muted-strong)]">{district.rideCount} upcoming rides</span>
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#65e6d0] text-[#07111a] shadow-[0_10px_22px_rgba(101,230,208,0.16)] transition group-hover:translate-x-0.5 group-hover:bg-[#9ffce8]">
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="popular-hubs-title" className="grid gap-3">
        <div>
          <h2 id="popular-hubs-title" className="text-lg font-black text-[var(--rp-text)]">Popular hubs</h2>
          <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">Airport is a travel hub, not an official district.</p>
        </div>
        {hubCards.map((hub) => (
          <Link
            key={hub.id}
            href={buildRideExploreHref({ from: hub.queryValue })}
            className="group grid min-h-[70px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[#f6d7ad]/24 bg-[#f6d7ad]/10 px-3 py-3 transition hover:border-[#f6d7ad]/50 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-3 focus-visible:outline-[#f6d7ad]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(180deg,#ffe8c6,#f6d7ad)] text-[#14100b]">
              <Plane className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-white">{hub.name}</span>
              <span className="mt-1 block text-xs font-bold text-[#fff4e6]/70">{hub.rideCount} upcoming rides</span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#fff4e6]/54 transition group-hover:translate-x-0.5 group-hover:text-[#f6d7ad]" />
          </Link>
        ))}
      </section>
    </main>
  );
}

export default function RideExplorePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto grid w-full max-w-[680px] gap-5 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8">
          <div className="min-h-[220px] rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(11,25,38,0.96),rgba(5,15,24,0.98))]" />
        </main>
      }
    >
      <RideExploreContent />
    </Suspense>
  );
}
