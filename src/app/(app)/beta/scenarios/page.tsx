import { CircleAlert, Route, ShieldCheck } from "lucide-react";
import { BetaScenarioActions } from "@/components/beta-scenario-actions";
import { Badge, Card, cn } from "@/components/ui";
import { listRidePodDemoScenarios, type RidePodDemoScenario } from "@/lib/demo/ridepod-demo-scenarios";

const knownDemoRoutes = new Set([
  "/host",
  "/create/recurring",
  "/pods/usc-lax-001/settlement",
  "/admin/review",
  "/profile",
  "/pods/usc-lax-001",
]);

function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_RIDEPOD_DEMO_MODE === "true";
}

function ScenarioCard({ scenario }: { scenario: RidePodDemoScenario }) {
  const routeReady = knownDemoRoutes.has(scenario.recommendedRoute);

  return (
    <Card className="grid content-between gap-5 p-5">
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black leading-tight text-[var(--rp-text)]">{scenario.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              {scenario.description}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)]">
            <Route className="h-5 w-5" />
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
            {scenario.role}
          </Badge>
          <Badge className="bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
            {scenario.primaryStatus}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {scenario.tags.map((tag) => (
            <Badge key={tag} className="bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <p className="text-xs font-black uppercase text-[var(--rp-primary)]">Recommended route</p>
          <p className="mt-1 break-all font-mono text-sm font-semibold text-[var(--rp-text)]">
            {scenario.recommendedRoute}
          </p>
        </div>

        <p className="text-xs font-semibold leading-5 text-[var(--rp-muted)]">{scenario.notes}</p>
      </div>

      <BetaScenarioActions scenarioId={scenario.id} routeReady={routeReady} />
    </Card>
  );
}

export default function BetaScenariosPage() {
  const demoModeEnabled = isDemoModeEnabled();
  const scenarios = listRidePodDemoScenarios();

  return (
    <div className="grid gap-7 pb-4">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card-elevated)] p-6 shadow-[var(--rp-shadow-soft)] sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_18%,transparent),transparent_42%)]" />
        <div className="relative grid gap-4">
          <Badge className="w-fit bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
            Closed beta
          </Badge>
          <div>
            <h1 className="text-4xl font-black leading-tight text-[var(--rp-text)] sm:text-5xl">
              Beta Demo Scenarios
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)]">
              Jump into a prepared RidePod test flow.
            </p>
          </div>
        </div>
      </section>

      <Card className="border-[var(--rp-border-strong)] bg-[var(--rp-card-elevated)] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-primary)]" />
          <div>
            <h2 className="text-xl font-black text-[var(--rp-text)]">Closed beta only</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              These scenarios use demo or mock states. They do not represent live payments or payouts.
            </p>
          </div>
        </div>
      </Card>

      {!demoModeEnabled ? (
        <Card className="border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-1 h-6 w-6 shrink-0 text-[var(--rp-warning)]" />
            <div>
              <h2 className="text-xl font-black text-[var(--rp-text)]">Demo scenarios are not enabled.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
                Set <span className="font-mono text-[var(--rp-text)]">NEXT_PUBLIC_RIDEPOD_DEMO_MODE=true</span>{" "}
                for founder/testing sessions.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <section className={cn("grid gap-3", "sm:grid-cols-2 xl:grid-cols-3")}>
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </section>
      )}
    </div>
  );
}
