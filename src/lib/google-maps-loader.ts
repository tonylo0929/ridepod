import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configuredKey: string | null = null;

export function getGoogleMapsApiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

export function hasGoogleMapsApiKey() {
  return getGoogleMapsApiKey().length > 0;
}

export class GoogleMapsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleMapsConfigurationError";
  }
}

function ensureGoogleMapsConfigured() {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new GoogleMapsConfigurationError("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable live Google location search and route preview.");
  }

  if (configuredKey === apiKey) return;

  setOptions({
    key: apiKey,
    v: "weekly",
    language: "en",
    region: "HK",
    authReferrerPolicy: "origin",
  });
  configuredKey = apiKey;
}

export async function loadGoogleMapsLibrary<TLibraryName extends keyof google.maps.ImportLibraryMap>(
  libraryName: TLibraryName,
) {
  ensureGoogleMapsConfigured();
  return importLibrary(libraryName);
}
