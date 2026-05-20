import { getRidePodDemoScenario, type RidePodDemoScenario } from "@/lib/demo/ridepod-demo-scenarios";

export type RidePodDemoScenarioResetResult = {
  success: boolean;
  scenario: RidePodDemoScenario | null;
  routeToOpen: string | null;
  message: string;
};

const DEMO_SCENARIO_STORAGE_KEY = "ridepod:demo-scenario";

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function resetRidePodDemoScenarioMock(scenarioId: string): RidePodDemoScenarioResetResult {
  const scenario = getRidePodDemoScenario(scenarioId);

  if (!scenario) {
    return {
      success: false,
      scenario: null,
      routeToOpen: null,
      message: "Couldn't load this demo scenario.",
    };
  }

  try {
    if (canUseLocalStorage()) {
      window.localStorage.setItem(
        DEMO_SCENARIO_STORAGE_KEY,
        JSON.stringify({
          scenarioId: scenario.id,
          routeToOpen: scenario.recommendedRoute,
          expectedStatus: scenario.primaryStatus,
          loadedAt: new Date().toISOString(),
        }),
      );

      return {
        success: true,
        scenario,
        routeToOpen: scenario.recommendedRoute,
        message: "Demo scenario loaded.",
      };
    }
  } catch {
    return {
      success: true,
      scenario,
      routeToOpen: scenario.recommendedRoute,
      message: "Scenario opened with current demo data.",
    };
  }

  return {
    success: true,
    scenario,
    routeToOpen: scenario.recommendedRoute,
    message: "Scenario opened with current demo data.",
  };
}
