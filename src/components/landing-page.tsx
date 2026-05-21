import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CarFront,
  CircleDollarSign,
  UsersRound,
} from "lucide-react";
import { RidePodLogo } from "@/components/ridepod-logo";

const steps = [
  {
    title: "Create a shared taxi pod",
    body: "Pick a planned route for airport, campus, commute, or event rides.",
  },
  {
    title: "Guests join first",
    body: "Riders join the pod before the group requests one shared taxi quote.",
  },
  {
    title: "Taxi partner quotes",
    body: "RidePod does not provide drivers. Taxi partners are external licensed providers.",
  },
  {
    title: "Review before payout",
    body: "Guests accept the quote, then RidePod tracks mock payment and review states.",
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-zinc-950">
      <section className="mx-auto flex min-h-[92vh] w-full max-w-6xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-3">
            <RidePodLogo className="h-10" priority />
          </Link>
          <Link
            href="/home"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white"
          >
            Open app
          </Link>
        </nav>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-zinc-700 ring-1 ring-zinc-200">
              <CalendarCheck className="h-4 w-4 text-emerald-700" />
              Scheduled pods, not instant ride-hailing
            </div>
            <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">
              Shared taxi pods for planned rides.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-700">
              RidePod helps groups create shared taxi pods, request a taxi partner quote, and split the ride with clear quote, acceptance, and review steps. RidePod does not provide drivers. Taxi partners are external licensed providers.
            </p>
            <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-zinc-600">
              Taxi-first beta. No real taxi dispatch or payment yet.
            </p>
            <div className="mt-7 grid gap-3 sm:flex">
              <Link
                href="/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-bold text-white"
              >
                Create taxi pod <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-bold text-zinc-950"
              >
                How RidePod works
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-200/70">
            <div className="rounded-lg bg-zinc-950 p-4 text-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">SFO early flight pod</p>
                <span className="rounded-full bg-amber-300 px-2 py-1 text-xs font-bold text-zinc-950">
                  Forming
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-lg bg-white/10 p-3">
                  <p className="text-xs text-zinc-300">Route</p>
                  <p className="font-bold">Mission District to SFO Terminal 2</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/10 p-3">
                    <p className="text-xs text-zinc-300">Seats owned</p>
                    <p className="font-bold">3 of 4</p>
                  </div>
                  <div className="rounded-lg bg-white/10 p-3">
                    <p className="text-xs text-zinc-300">Est. share</p>
                    <p className="font-bold">$21</p>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-500 p-3 text-zinc-950">
                  <p className="text-xs font-bold uppercase">Taxi quote flow ready</p>
                  <p className="mt-1 text-sm font-semibold">
                    No taxi quote proceeds until guests accept.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-semibold text-zinc-600">
              <span>Airport</span>
              <span>Campus</span>
              <span>Commute</span>
              <span>Events</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {index + 1}
              </div>
              <h2 className="mt-3 font-bold text-zinc-950">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white px-5 py-10">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {[
            ["Shared taxi pods", UsersRound],
            ["Taxi partner quote", CircleDollarSign],
            ["Review before payout", CarFront],
          ].map(([label, Icon]) => (
            <div key={label as string} className="flex items-center gap-3 rounded-lg bg-[#f7f5f0] p-4">
              <Icon className="h-5 w-5 text-emerald-700" />
              <p className="font-bold">{label as string}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
