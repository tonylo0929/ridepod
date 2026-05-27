"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  CarFront,
  ChevronDown,
  LayoutGrid,
  MapPin,
  Plane,
  RefreshCcw,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/components/ui";
import {
  districtOptions,
  homeRides,
  matchesDistrict,
  rideMatchesTab,
  type HomeRide,
  type HomeTab,
} from "@/lib/home-ride-mock";

const tabs: Array<{ id: HomeTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "airport", label: "Airport" },
  { id: "one_off", label: "One-off" },
  { id: "recurring", label: "Recurring" },
];

const categoryCards: Array<{ id: HomeTab; label: string; icon: typeof LayoutGrid; fallbackCount: number }> = [
  { id: "all", label: "All rides", icon: LayoutGrid, fallbackCount: 128 },
  { id: "airport", label: "Airport", icon: Plane, fallbackCount: 42 },
  { id: "one_off", label: "One-off", icon: CarFront, fallbackCount: 63 },
  { id: "recurring", label: "Recurring", icon: RefreshCcw, fallbackCount: 23 },
];

function getEmptyTitle(tab: HomeTab) {
  if (tab === "airport") return "No airport rides found.";
  if (tab === "one_off") return "No one-off rides found.";
  if (tab === "recurring") return "No recurring rides found.";
  return "No rides found.";
}

function CitySelect() {
  return (
    <label className="inline-flex max-w-full items-center gap-2">
      <MapPin className="h-5 w-5 shrink-0 text-[var(--rp-muted-strong)]" />
      <span className="sr-only">City</span>
      <span className="relative inline-flex min-w-0 items-center">
        <select
          value="Hong Kong"
          aria-label="City"
          className="h-10 max-w-full appearance-none bg-transparent pr-7 text-2xl font-black text-[var(--rp-text)] outline-none"
          onChange={() => undefined}
        >
          <option value="Hong Kong" className="bg-[var(--rp-shell)] text-[var(--rp-text)]">
            Hong Kong
          </option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 h-5 w-5 text-[var(--rp-muted-strong)]" />
      </span>
    </label>
  );
}

function DistrictSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative min-w-0 px-4 py-4">
      <span className="block text-sm font-semibold text-[var(--rp-muted-strong)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-8 w-full appearance-none truncate bg-transparent pr-8 text-xl font-black text-[var(--rp-text)] outline-none"
      >
        {districtOptions.map((district) => (
          <option key={district} value={district} className="bg-[var(--rp-shell)] text-[var(--rp-text)]">
            {district}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute bottom-5 right-4 h-5 w-5 text-[var(--rp-muted-strong)]" />
    </label>
  );
}

function DistrictRoutePicker({
  fromDistrict,
  toDistrict,
  onFromChange,
  onToChange,
  onSwap,
}: {
  fromDistrict: string;
  toDistrict: string;
  onFromChange: (district: string) => void;
  onToChange: (district: string) => void;
  onSwap: () => void;
}) {
  return (
    <section className="mt-6 rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_88%,transparent),var(--rp-card-soft))] shadow-[var(--rp-shadow-soft)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <DistrictSelect label="From district" value={fromDistrict} onChange={onFromChange} />
        <button
          type="button"
          aria-label="Swap districts"
          onClick={onSwap}
          className="self-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-2 text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>
        <DistrictSelect label="To district" value={toDistrict} onChange={onToChange} />
      </div>
    </section>
  );
}

function CategoryTabs({ activeTab, onChange }: { activeTab: HomeTab; onChange: (tab: HomeTab) => void }) {
  return (
    <div className="mt-7 border-b border-[var(--rp-border)]">
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative min-h-12 px-2 text-base font-black transition",
                active ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted-strong)]",
              )}
            >
              {tab.label}
              {active ? <span className="absolute inset-x-2 bottom-0 h-1 rounded-full bg-[var(--rp-primary)]" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryCard({
  id,
  label,
  count,
  icon: Icon,
  selected,
  onClick,
}: {
  id: HomeTab;
  label: string;
  count: number;
  icon: typeof LayoutGrid;
  selected: boolean;
  onClick: (tab: HomeTab) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        "grid min-h-[140px] min-w-[132px] place-items-center rounded-[18px] border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rp-card)_92%,transparent),var(--rp-card-soft))] p-4 text-center transition",
        selected
          ? "border-[var(--rp-primary)] shadow-[0_0_30px_color-mix(in_srgb,var(--rp-primary)_22%,transparent)]"
          : "border-[var(--rp-border)] hover:border-[var(--rp-border-strong)]",
      )}
    >
      <span className="grid h-11 w-11 place-items-center text-[var(--rp-primary)]">
        <Icon className="h-10 w-10" />
      </span>
      <span className="mt-3 block w-full text-center text-base font-black text-[var(--rp-text)]">{label}</span>
      <span className={cn("mt-2 block w-full text-center text-3xl font-black", selected ? "text-[var(--rp-primary)]" : "text-[var(--rp-text)]")}>
        {count}
      </span>
    </button>
  );
}

function RideKindIcon({ ride }: { ride: HomeRide }) {
  const Icon = ride.rideKind === "airport" ? Plane : ride.rideKind === "recurring" ? RefreshCcw : CarFront;

  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
      <Icon className="h-8 w-8" />
    </div>
  );
}

function RideBadge({ ride }: { ride: HomeRide }) {
  if (ride.airportDirection) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/15 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-300">
        <Plane className="h-3.5 w-3.5" />
        {ride.airportDirection === "to_airport" ? "To Airport" : "From Airport"}
      </span>
    );
  }

  if (ride.rideKind === "recurring") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
        <RefreshCcw className="h-3.5 w-3.5" />
        Recurring
      </span>
    );
  }

  return null;
}

function HomeRideCard({ ride }: { ride: HomeRide }) {
  return (
    <Link
      href={`/pods/${ride.id}`}
      className="block rounded-[22px] border border-[var(--rp-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rp-card)_94%,transparent),var(--rp-card-soft))] p-4 shadow-[var(--rp-shadow-soft)] transition hover:border-[var(--rp-border-strong)]"
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-4">
        <RideKindIcon ride={ride} />

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="min-w-0 text-xl font-black leading-tight text-[var(--rp-text)]">
              {ride.fromLabel} {"\u2192"} {ride.toLabel}
            </h2>
          </div>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-[var(--rp-muted-strong)]">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {ride.dateLabel} <span aria-hidden="true">{"\u00b7"}</span> {ride.timeLabel}
            </p>
            <p className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 shrink-0" />
              {ride.seatsUsed} / {ride.seatsTotal} seats
            </p>
          </div>
        </div>

        <div className="flex min-w-[82px] flex-col items-end justify-between gap-3 text-right">
          <RideBadge ride={ride} />
          <div>
            <p className="text-3xl font-black leading-none text-[var(--rp-text)]">HK${ride.pricePerPerson}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--rp-muted-strong)]">per person</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyRides({ tab }: { tab: HomeTab }) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-5 text-center">
      <p className="text-lg font-black text-[var(--rp-text)]">{getEmptyTitle(tab)}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--rp-muted-strong)]">
        Try changing your From / To district filters.
      </p>
      <Link
        href="/create"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
      >
        Create taxi pod
      </Link>
    </section>
  );
}

export default function HomePage() {
  const [fromDistrict, setFromDistrict] = useState("Hong Kong Island");
  const [toDistrict, setToDistrict] = useState("All districts");
  const [activeTab, setActiveTab] = useState<HomeTab>("all");

  const districtFilteredRides = useMemo(
    () =>
      homeRides.filter(
        (ride) =>
          matchesDistrict(fromDistrict, ride.fromDistrict) &&
          matchesDistrict(toDistrict, ride.toDistrict),
      ),
    [fromDistrict, toDistrict],
  );

  const visibleRides = useMemo(
    () => districtFilteredRides.filter((ride) => rideMatchesTab(activeTab, ride)),
    [activeTab, districtFilteredRides],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<HomeTab, number> = {
      all: districtFilteredRides.length,
      airport: districtFilteredRides.filter((ride) => ride.rideKind === "airport").length,
      one_off: districtFilteredRides.filter((ride) => ride.rideKind === "one_off").length,
      recurring: districtFilteredRides.filter((ride) => ride.rideKind === "recurring").length,
    };

    return counts;
  }, [districtFilteredRides]);

  return (
    <div className="relative min-h-[calc(100vh-1.25rem)] overflow-hidden pb-2">
      <div className="pointer-events-none absolute inset-x-[-30%] top-[-120px] h-72 bg-[radial-gradient(circle,rgba(242,193,91,0.14),transparent_58%)]" />

      <section className="relative">
        <CitySelect />

        <DistrictRoutePicker
          fromDistrict={fromDistrict}
          toDistrict={toDistrict}
          onFromChange={setFromDistrict}
          onToChange={setToDistrict}
          onSwap={() => {
            setFromDistrict(toDistrict);
            setToDistrict(fromDistrict);
          }}
        />

        <CategoryTabs activeTab={activeTab} onChange={setActiveTab} />
      </section>

      <section className="relative mt-7">
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categoryCards.map((card) => (
            <CategoryCard
              key={card.id}
              id={card.id}
              label={card.label}
              icon={card.icon}
              count={categoryCounts[card.id] ?? card.fallbackCount}
              selected={activeTab === card.id}
              onClick={setActiveTab}
            />
          ))}
        </div>
      </section>

      <section className="relative mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-[var(--rp-text)]">Recommended for you</h1>
          <Link href="/pods" className="flex items-center gap-1 text-sm font-black text-[var(--rp-primary)]">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3">
          {visibleRides.length > 0 ? (
            visibleRides.map((ride) => <HomeRideCard key={ride.id} ride={ride} />)
          ) : (
            <EmptyRides tab={activeTab} />
          )}
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-36 bg-[linear-gradient(180deg,transparent,var(--rp-bg))] opacity-80 lg:hidden" />
    </div>
  );
}
