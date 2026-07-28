"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { HomeMenuDrawer } from "@/components/home-menu-drawer";
import { RidePodLogo } from "@/components/ridepod-logo";
import {
  hk18DistrictOptions,
  resolveHongKongDistrictFromAddressComponents,
  resolveHongKongDistrictFromCoordinates,
  resolveHongKongDistrictFromText,
  type Hk18District,
} from "@/lib/hk-districts";
import {
  GoogleMapsConfigurationError,
  hasGoogleMapsApiKey,
  loadGoogleMapsLibrary,
} from "@/lib/google-maps-loader";
import {
  getRecentRideLocations,
  getSavedRideLocations,
  rememberRideLocation,
} from "@/lib/ride-location-storage";
import type {
  RideCoordinates,
  RideLocation,
  RideLocationMode,
  RideLocationSource,
  RideRouteSummary,
} from "@/lib/ride-location-types";

type PlaceSuggestion = {
  id: string;
  mainText: string;
  secondaryText: string;
  distanceMeters: number | null;
  prediction: google.maps.places.PlacePrediction;
};

type LocalPlaceSeed = {
  id: string;
  name: string;
  formattedAddress: string;
  district: Hk18District;
  coordinates: RideCoordinates;
  aliases: string[];
};

type LocalLocationSuggestion = {
  id: string;
  mainText: string;
  secondaryText: string;
  distanceMeters: number | null;
  location: RideLocation;
};

const hongKongDefaultCenter: RideCoordinates = { lat: 22.3193, lng: 114.1694 };
const hongKongBounds = {
  north: 22.57,
  south: 22.13,
  east: 114.47,
  west: 113.825,
};

const localHongKongPlaceSeeds: LocalPlaceSeed[] = [
  {
    id: "k-city-kai-tak",
    name: "K City",
    formattedAddress: "7 Muk Ning Street, Kai Tak",
    district: "Kowloon City",
    coordinates: { lat: 22.331, lng: 114.2034 },
    aliases: ["k city", "k.city", "kcity", "kai tak k city", "muk ning street"],
  },
  {
    id: "kai-tak-station",
    name: "Kai Tak Station",
    formattedAddress: "Kai Tak MTR Station, Kai Tak",
    district: "Kowloon City",
    coordinates: { lat: 22.3313, lng: 114.1997 },
    aliases: ["kai tak", "kai tak mtr", "kai tak station"],
  },
  {
    id: "airside",
    name: "AIRSIDE",
    formattedAddress: "2 Concorde Road, Kai Tak",
    district: "Kowloon City",
    coordinates: { lat: 22.3291, lng: 114.1987 },
    aliases: ["airside", "kai tak mall", "concorde road"],
  },
  {
    id: "hong-kong-airport",
    name: "Hong Kong International Airport",
    formattedAddress: "Hong Kong International Airport, Chek Lap Kok",
    district: "Islands",
    coordinates: { lat: 22.308, lng: 113.9185 },
    aliases: ["hkia", "hkg", "airport", "chek lap kok", "hong kong airport"],
  },
  {
    id: "central-station",
    name: "Central Station",
    formattedAddress: "Central MTR Station, Central",
    district: "Central and Western",
    coordinates: { lat: 22.2819, lng: 114.1585 },
    aliases: ["central", "central mtr", "central station"],
  },
  {
    id: "causeway-bay",
    name: "Causeway Bay",
    formattedAddress: "Causeway Bay, Hong Kong Island",
    district: "Wan Chai",
    coordinates: { lat: 22.2802, lng: 114.1847 },
    aliases: ["causeway bay", "cwb", "sogo"],
  },
  {
    id: "hku-station",
    name: "HKU Station",
    formattedAddress: "HKU Station, Pok Fu Lam Road",
    district: "Central and Western",
    coordinates: { lat: 22.283, lng: 114.1355 },
    aliases: ["hku", "hong kong university", "hku station"],
  },
  {
    id: "mong-kok",
    name: "Mong Kok",
    formattedAddress: "Mong Kok, Kowloon",
    district: "Yau Tsim Mong",
    coordinates: { lat: 22.3193, lng: 114.1694 },
    aliases: ["mong kok", "mk", "mongkok"],
  },
  {
    id: "tsim-sha-tsui",
    name: "Tsim Sha Tsui",
    formattedAddress: "Tsim Sha Tsui, Kowloon",
    district: "Yau Tsim Mong",
    coordinates: { lat: 22.2988, lng: 114.1722 },
    aliases: ["tsim sha tsui", "tst", "尖沙咀"],
  },
  {
    id: "tseung-kwan-o",
    name: "Tseung Kwan O",
    formattedAddress: "Tseung Kwan O, New Territories",
    district: "Sai Kung",
    coordinates: { lat: 22.307, lng: 114.2605 },
    aliases: ["tseung kwan o", "tko", "hang hau", "lohas"],
  },
  {
    id: "sha-tin",
    name: "Sha Tin",
    formattedAddress: "Sha Tin, New Territories",
    district: "Sha Tin",
    coordinates: { lat: 22.3828, lng: 114.1885 },
    aliases: ["sha tin", "shatin", "new town plaza"],
  },
];

const googleDarkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#07111d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#06111d" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#263241" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0b1724" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#101e2c" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0e2c2a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1d2d3d" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f1825" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#27384b" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#102235" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#031525" }] },
];

function getLocationTitle(mode: RideLocationMode) {
  return mode === "pickup" ? "Choose pickup point" : "Choose drop-off point";
}

function getConfirmLabel(mode: RideLocationMode) {
  return mode === "pickup" ? "Confirm pickup point" : "Confirm drop-off point";
}

function getShortLocationName(location: RideLocation | null, fallback = "None") {
  if (!location) return fallback;
  return location.name || location.formattedAddress.split(",")[0]?.trim() || fallback;
}

function formatDistance(meters: number | null) {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function formatDuration(millis: number | null) {
  if (millis == null || !Number.isFinite(millis)) return null;
  const minutes = Math.max(1, Math.round(millis / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function formatGeolocationError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "Location permission was not allowed. You can still search manually.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Location services could not find you. Try search or choose on map.";
  if (error.code === error.TIMEOUT) return "Location request timed out. Try again or choose on map.";
  return "Current location is unavailable. Try search or choose on map.";
}

function getGoogleErrorMessage(error: unknown) {
  if (error instanceof GoogleMapsConfigurationError) return error.message;
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You appear to be offline. Reconnect and try again.";
  return "Search is not available right now. Try again or choose on map.";
}

function distanceBetweenCoordinates(a: RideCoordinates, b: RideCoordinates) {
  const earthRadiusMeters = 6371000;
  const toRadians = Math.PI / 180;
  const latDelta = (b.lat - a.lat) * toRadians;
  const lngDelta = (b.lng - a.lng) * toRadians;
  const latA = a.lat * toRadians;
  const latB = b.lat * toRadians;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function getAddressComponentValues(components: google.maps.places.AddressComponent[] | undefined) {
  return (components ?? []).map((component) => ({
    longText: component.longText,
    shortText: component.shortText,
    types: component.types,
  }));
}

function getGeocoderComponentValues(components: google.maps.GeocoderAddressComponent[] | undefined) {
  return (components ?? []).map((component) => ({
    long_name: component.long_name,
    short_name: component.short_name,
    types: component.types,
  }));
}

function makeRideLocation({
  placeId,
  name,
  formattedAddress,
  latitude,
  longitude,
  district,
  source,
  meetingPointNote,
}: RideLocation) {
  return {
    placeId,
    name: name.trim() || formattedAddress.split(",")[0]?.trim() || "Selected location",
    formattedAddress: formattedAddress.trim() || name.trim() || "Selected location",
    latitude,
    longitude,
    district: district ?? resolveHongKongDistrictFromCoordinates({ lat: latitude, lng: longitude }),
    source,
    meetingPointNote,
  };
}

function normalizeLocationSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLocalPlaceSeed(seed: LocalPlaceSeed, normalizedQuery: string) {
  const seedName = normalizeLocationSearchText(seed.name);
  const haystack = normalizeLocationSearchText([
    seed.name,
    seed.formattedAddress,
    seed.district,
    ...seed.aliases,
  ].join(" "));
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return 0;

  let score = 0;
  if (seedName === normalizedQuery) score += 90;
  if (seedName.startsWith(normalizedQuery)) score += 55;
  if (seed.aliases.some((alias) => normalizeLocationSearchText(alias) === normalizedQuery)) score += 70;
  if (haystack.includes(normalizedQuery)) score += 35;
  score += tokens.filter((token) => haystack.includes(token)).length * 12;

  return score;
}

function getLocalLocationSuggestions(query: string, origin: RideCoordinates | null): LocalLocationSuggestion[] {
  const normalizedQuery = normalizeLocationSearchText(query);
  if (normalizedQuery.length < 2) return [];

  return localHongKongPlaceSeeds
    .map((seed) => ({ seed, score: scoreLocalPlaceSeed(seed, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.seed.name.localeCompare(b.seed.name))
    .slice(0, 5)
    .map(({ seed }) => {
      const distanceMeters = origin ? Math.round(distanceBetweenCoordinates(origin, seed.coordinates)) : null;

      return {
        id: seed.id,
        mainText: seed.name,
        secondaryText: `${seed.formattedAddress} · ${seed.district}`,
        distanceMeters,
        location: makeRideLocation({
          placeId: `local:${seed.id}`,
          name: seed.name,
          formattedAddress: seed.formattedAddress,
          latitude: seed.coordinates.lat,
          longitude: seed.coordinates.lng,
          district: seed.district,
          source: "autocomplete",
        }),
      };
    });
}

async function createRideLocationFromPlace(
  prediction: google.maps.places.PlacePrediction,
  source: RideLocationSource,
) {
  const place = prediction.toPlace();
  const { place: fetchedPlace } = await place.fetchFields({
    fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"],
  });
  const coordinates = fetchedPlace.location?.toJSON();

  if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
    throw new Error("Selected place has no usable coordinates.");
  }

  const name = fetchedPlace.displayName ?? prediction.mainText?.text ?? prediction.text.text;
  const formattedAddress = fetchedPlace.formattedAddress ?? prediction.secondaryText?.text ?? prediction.text.text;
  const addressComponents = getAddressComponentValues(fetchedPlace.addressComponents);
  const district = resolveHongKongDistrictFromAddressComponents(
    addressComponents,
    [
      name,
      formattedAddress,
      prediction.mainText?.text,
      prediction.secondaryText?.text,
      prediction.text.text,
    ].filter(Boolean).join(" "),
  );

  return makeRideLocation({
    placeId: fetchedPlace.id ?? prediction.placeId,
    name,
    formattedAddress,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    district,
    source,
  });
}

async function reverseGeocodeRideLocation(
  coordinates: RideCoordinates,
  source: RideLocationSource,
  fallbackName = "Selected location",
): Promise<RideLocation> {
  const { Geocoder } = await loadGoogleMapsLibrary("geocoding");
  const geocoder = new Geocoder();
  const response = await geocoder.geocode({
    location: coordinates,
    region: "HK",
  });
  const result = response.results[0];
  const formattedAddress = result?.formatted_address ?? fallbackName;
  const district = resolveHongKongDistrictFromAddressComponents(
    getGeocoderComponentValues(result?.address_components),
    formattedAddress,
  );

  return makeRideLocation({
    placeId: result?.place_id ?? null,
    name: result?.address_components?.[0]?.long_name ?? fallbackName,
    formattedAddress,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    district,
    source,
  });
}

function RoutePointCircle({
  map,
  location,
  type,
}: {
  map: google.maps.Map | null;
  location: RideLocation | null;
  type: "pickup" | "dropoff";
}) {
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !location) {
      circleRef.current?.setMap(null);
      circleRef.current = null;
      return;
    }

    const center = { lat: location.latitude, lng: location.longitude };
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius: 62,
        strokeColor: type === "pickup" ? "#f6c453" : "#fb923c",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: type === "pickup" ? "#f6c453" : "#fb923c",
        fillOpacity: 0.88,
        clickable: false,
      });
      return;
    }

    circleRef.current.setOptions({
      center,
      strokeColor: type === "pickup" ? "#f6c453" : "#fb923c",
      fillColor: type === "pickup" ? "#f6c453" : "#fb923c",
      map,
    });
  }, [location, map, type]);

  useEffect(() => {
    return () => {
      circleRef.current?.setMap(null);
    };
  }, []);

  return null;
}

export function RoutePreviewMap({
  pickupLocation,
  dropoffLocation,
  stops,
  pickupFallbackLabel = "Pickup point",
  dropoffFallbackLabel = "Dropoff point",
}: {
  pickupLocation: RideLocation | null;
  dropoffLocation: RideLocation | null;
  stops: Array<{ id: number; address: string }>;
  pickupFallbackLabel?: string;
  dropoffFallbackLabel?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(() =>
    hasGoogleMapsApiKey() ? null : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the live route map.",
  );
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RideRouteSummary>({
    distanceMeters: null,
    durationMillis: null,
    distanceLabel: null,
    durationLabel: null,
  });
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const routeKey = pickupLocation && dropoffLocation
    ? `${pickupLocation.latitude},${pickupLocation.longitude}-${dropoffLocation.latitude},${dropoffLocation.longitude}`
    : "";
  const hasRoutePoints = Boolean(pickupLocation || dropoffLocation || stops.some((stop) => stop.address.trim()));
  const filledPointCount =
    (pickupLocation ? 1 : 0) +
    stops.filter((stop) => stop.address.trim()).length +
    (dropoffLocation ? 1 : 0);
  const points = [
    {
      id: "pickup",
      label: pickupFallbackLabel,
      value: getShortLocationName(pickupLocation),
      type: "pickup" as const,
    },
    ...stops.map((stop, index) => ({
      id: `stop-${stop.id}`,
      label: `Stop ${index + 1}`,
      value: stop.address.trim() || "Optional stop",
      type: "stop" as const,
    })),
    {
      id: "dropoff",
      label: stops.length > 0 ? `Final ${dropoffFallbackLabel.toLowerCase()}` : dropoffFallbackLabel,
      value: getShortLocationName(dropoffLocation),
      type: "dropoff" as const,
    },
  ];

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !hasGoogleMapsApiKey()) return;
    let cancelled = false;

    async function loadMap() {
      try {
        const { Map } = await loadGoogleMapsLibrary("maps");
        if (cancelled || !mapContainerRef.current) return;

        const nextMap = new Map(mapContainerRef.current, {
          center: hongKongDefaultCenter,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          keyboardShortcuts: false,
          restriction: { latLngBounds: hongKongBounds, strictBounds: false },
          styles: googleDarkMapStyle,
          zoom: 11,
        });
        mapRef.current = nextMap;
        setMap(nextMap);
        setMapError(null);
      } catch (error) {
        if (!cancelled) setMapError(getGoogleErrorMessage(error));
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    window.setTimeout(() => {
      google.maps.event.trigger(map, "resize");
      map.setCenter(map.getCenter() ?? hongKongDefaultCenter);
    }, 80);
  }, [map]);

  useEffect(() => {
    if (!map) return;

    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];
    const resetRouteTimer = window.setTimeout(() => {
      setRouteError(null);
      setRouteSummary({
        distanceMeters: null,
        durationMillis: null,
        distanceLabel: null,
        durationLabel: null,
      });
    }, 0);

    if (!pickupLocation && !dropoffLocation) {
      map.setCenter(hongKongDefaultCenter);
      map.setZoom(11);
      return () => window.clearTimeout(resetRouteTimer);
    }

    if (!pickupLocation || !dropoffLocation) {
      const location = pickupLocation ?? dropoffLocation;
      if (location) {
        map.panTo({ lat: location.latitude, lng: location.longitude });
        map.setZoom(15);
      }
      return () => window.clearTimeout(resetRouteTimer);
    }

    const routeMap = map;
    const routePickupLocation = pickupLocation;
    const routeDropoffLocation = dropoffLocation;
    let cancelled = false;
    const loadingTimer = window.setTimeout(() => setRouteLoading(true), 0);

    async function loadRoute() {
      try {
        const { Route } = await loadGoogleMapsLibrary("routes");
        const { routes } = await Route.computeRoutes({
          origin: {
            location: { lat: routePickupLocation.latitude, lng: routePickupLocation.longitude },
            vehicleStopover: true,
          },
          destination: {
            location: { lat: routeDropoffLocation.latitude, lng: routeDropoffLocation.longitude },
            vehicleStopover: true,
          },
          travelMode: "DRIVING",
          routingPreference: "TRAFFIC_AWARE",
          polylineQuality: "HIGH_QUALITY",
          region: "HK",
          language: "en",
          fields: ["distanceMeters", "durationMillis", "path", "viewport"],
        });
        if (cancelled) return;
        const route = routes?.[0];
        if (!route) throw new Error("No route available.");

        const polylines = route.createPolylines({
          polylineOptions: {
            map: routeMap,
            strokeColor: "#56d9ef",
            strokeOpacity: 0.95,
            strokeWeight: 5,
            zIndex: 4,
          },
        });
        polylinesRef.current = polylines;

        if (route.viewport) {
          routeMap.fitBounds(route.viewport, 36);
        } else if (route.path?.length) {
          const bounds = new google.maps.LatLngBounds();
          route.path.forEach((point) => bounds.extend(point));
          routeMap.fitBounds(bounds, 36);
        }

        const distanceMeters = route.distanceMeters ?? null;
        const durationMillis = route.durationMillis ?? null;
        setRouteSummary({
          distanceMeters,
          durationMillis,
          distanceLabel: formatDistance(distanceMeters),
          durationLabel: formatDuration(durationMillis),
        });
      } catch {
        if (!cancelled) {
          setRouteError("Route could not be calculated. Selected points stay saved, so you can retry or adjust them.");
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }

    void loadRoute();

    return () => {
      cancelled = true;
      window.clearTimeout(resetRouteTimer);
      window.clearTimeout(loadingTimer);
    };
  }, [dropoffLocation, map, pickupLocation, routeKey]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--rp-primary)_28%,var(--rp-border))] bg-[linear-gradient(180deg,rgba(15,27,39,0.94),rgba(8,17,29,0.94))] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">Route preview</p>
          <p className="mt-1 text-sm font-bold text-slate-300">
            {hasRoutePoints ? "Pickup to final dropoff" : "No route points set yet"}
          </p>
        </div>
        <span className="rounded-full border border-[var(--rp-border)] bg-[#0b1724] px-3 py-1 text-xs font-black text-[var(--rp-text)]">
          {filledPointCount} set
        </span>
      </div>

      <div className="relative h-[150px] overflow-hidden rounded-[18px] border border-white/10 bg-[#06111d]">
        <div ref={mapContainerRef} className="absolute inset-0" />
        <RoutePointCircle map={map} location={pickupLocation} type="pickup" />
        <RoutePointCircle map={map} location={dropoffLocation} type="dropoff" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,9,18,0.02),rgba(2,9,18,0.22))]" />
        {!pickupLocation || !dropoffLocation ? (
          <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-[#06111d]/80 px-3 py-1 text-[11px] font-black text-slate-200 backdrop-blur">
            Select pickup and dropoff
          </div>
        ) : null}
        {routeLoading ? (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#06111d]/86 px-3 py-1 text-[11px] font-black text-[#a7f3ff] backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Routing
          </div>
        ) : null}
        {routeSummary.distanceLabel || routeSummary.durationLabel ? (
          <div className="absolute bottom-3 left-3 flex gap-2 rounded-full border border-[#56d9ef]/20 bg-[#06111d]/84 px-3 py-1 text-[11px] font-black text-[#a7f3ff] backdrop-blur">
            {routeSummary.distanceLabel ? <span>{routeSummary.distanceLabel}</span> : null}
            {routeSummary.durationLabel ? <span>{routeSummary.durationLabel}</span> : null}
          </div>
        ) : null}
        {mapError || routeError ? (
          <div className="absolute inset-x-3 bottom-3 rounded-[12px] border border-amber-300/20 bg-[#19170d]/88 px-3 py-2 text-[11px] font-bold leading-4 text-amber-100 backdrop-blur">
            {mapError ?? routeError}
          </div>
        ) : null}
        <div className="absolute bottom-1.5 right-2 rounded bg-[#06111d]/70 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
          Google Maps
        </div>
      </div>

      <div className="mt-3 grid gap-1.5">
        {points.map((point) => (
          <div
            key={point.id}
            className="grid min-h-11 grid-cols-[18px_1fr_auto] items-center gap-3 rounded-[14px] px-2.5 py-2"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                point.type === "pickup"
                  ? "bg-[var(--rp-primary)]"
                  : point.type === "dropoff"
                    ? "bg-orange-400"
                    : "border border-[var(--rp-primary)] bg-transparent",
              )}
            />
            <span className="min-w-0 truncate text-sm font-black text-[#f8fafc]">
              {point.value}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#f6c453]">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShortcutButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#132231] px-3 text-xs font-black text-slate-100 transition hover:border-[#56d9ef]/40 hover:bg-[#173044] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function LocationResultButton({
  suggestion,
  active,
  onSelect,
}: {
  suggestion: PlaceSuggestion;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-white/8 px-3 py-3 text-left last:border-b-0",
        active ? "bg-[#102b3d]" : "hover:bg-white/5",
      )}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] text-[#56d9ef]">
        <MapPin className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[#f8fafc]">{suggestion.mainText}</span>
        <span className="mt-1 block line-clamp-2 text-xs font-semibold leading-4 text-slate-400">
          {suggestion.secondaryText}
        </span>
      </span>
      {formatDistance(suggestion.distanceMeters) ? (
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-slate-200">
          {formatDistance(suggestion.distanceMeters)}
        </span>
      ) : null}
    </button>
  );
}

function LocalLocationResultButton({
  suggestion,
  onSelect,
}: {
  suggestion: LocalLocationSuggestion;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-white/8 px-3 py-3 text-left last:border-b-0 hover:bg-white/5"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] text-[#56d9ef]">
        <MapPin className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[#f8fafc]">{suggestion.mainText}</span>
        <span className="mt-1 block line-clamp-2 text-xs font-semibold leading-4 text-slate-400">
          {suggestion.secondaryText}
        </span>
      </span>
      <span className="rounded-full border border-[#56d9ef]/20 bg-[#0b2a38] px-2 py-1 text-[10px] font-black text-[#a7f3ff]">
        {formatDistance(suggestion.distanceMeters) ?? "HK"}
      </span>
    </button>
  );
}

function ExistingLocationButton({
  location,
  icon,
  label,
  onSelect,
}: {
  location: RideLocation;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[42px_1fr_auto] items-center gap-3 rounded-[16px] border border-white/10 bg-[#101c29] px-3 py-3 text-left transition hover:border-[#56d9ef]/35 hover:bg-[#13283a]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] text-[#56d9ef]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#56d9ef]">{label}</span>
        <span className="mt-1 block truncate text-sm font-black text-[#f8fafc]">{location.name}</span>
        <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">{location.formattedAddress}</span>
      </span>
      <ChevronRight className="h-4.5 w-4.5 text-slate-500" />
    </button>
  );
}

function MapLocationAdjuster({
  mode,
  initialLocation,
  onBack,
  onConfirm,
}: {
  mode: RideLocationMode;
  initialLocation: RideLocation;
  onBack: () => void;
  onConfirm: (location: RideLocation) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const idleListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const reverseTimerRef = useRef<number | null>(null);
  const lastReverseCoordinatesRef = useRef<RideCoordinates | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<RideLocation>(initialLocation);
  const [meetingPointNote, setMeetingPointNote] = useState(initialLocation.meetingPointNote ?? "");

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    async function loadMap() {
      try {
        const { Map } = await loadGoogleMapsLibrary("maps");
        if (cancelled || !mapContainerRef.current) return;

        const map = new Map(mapContainerRef.current, {
          center: { lat: initialLocation.latitude, lng: initialLocation.longitude },
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          restriction: { latLngBounds: hongKongBounds, strictBounds: false },
          styles: googleDarkMapStyle,
          zoom: 17,
        });
        mapRef.current = map;
        setMapReady(true);
        window.setTimeout(() => {
          google.maps.event.trigger(map, "resize");
          map.setCenter({ lat: initialLocation.latitude, lng: initialLocation.longitude });
        }, 80);
      } catch (error) {
        setStatusMessage(getGoogleErrorMessage(error));
      }
    }

    void loadMap();

    return () => {
      cancelled = true;
      idleListenerRef.current?.remove();
      if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current);
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, [initialLocation.latitude, initialLocation.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    idleListenerRef.current?.remove();
    idleListenerRef.current = map.addListener("idle", () => {
      const center = map.getCenter();
      if (!center) return;
      const coordinates = center.toJSON();
      const previousCoordinates = lastReverseCoordinatesRef.current;
      if (previousCoordinates && distanceBetweenCoordinates(previousCoordinates, coordinates) < 18) return;
      if (reverseTimerRef.current) window.clearTimeout(reverseTimerRef.current);

      reverseTimerRef.current = window.setTimeout(async () => {
        lastReverseCoordinatesRef.current = coordinates;
        setIsReverseGeocoding(true);
        setStatusMessage(null);

        try {
          const nextLocation = await reverseGeocodeRideLocation(
            coordinates,
            "map-pin",
            candidate.name || "Selected location",
          );
          setCandidate((current) => ({
            ...nextLocation,
            meetingPointNote: current.meetingPointNote,
          }));
        } catch {
          setCandidate((current) => ({
            ...current,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            district: resolveHongKongDistrictFromCoordinates(coordinates) ?? current.district,
            source: "map-pin",
          }));
          setStatusMessage("Address could not be refreshed for this pin. You can still confirm or move the map.");
        } finally {
          setIsReverseGeocoding(false);
        }
      }, 520);
    });

    return () => {
      idleListenerRef.current?.remove();
    };
  }, [candidate.name, mapReady]);

  function handleConfirm() {
    onConfirm({
      ...candidate,
      meetingPointNote: meetingPointNote.trim() || undefined,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to location search"
          className="grid h-11 w-11 place-items-center rounded-full border border-[#f6c453]/35 bg-[#101c29] text-[#f6c453] transition hover:bg-[#172536]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#56d9ef]">Adjust pin</p>
          <h2 className="truncate text-lg font-black text-[#f8fafc]">{getLocationTitle(mode)}</h2>
        </div>
        <span />
      </div>

      <div className="relative h-[46vh] min-h-[280px] border-b border-white/10 bg-[#06111d]">
        <div ref={mapContainerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-full place-items-center rounded-full border border-[#56d9ef]/35 bg-[#092435]/85 text-[#56d9ef] shadow-[0_0_34px_rgba(86,217,239,0.38)] backdrop-blur">
          <MapPin className="h-8 w-8 fill-[#56d9ef]/20 stroke-[2.4]" />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 mt-1 h-2 w-2 -translate-x-1/2 rounded-full bg-[#56d9ef] shadow-[0_0_18px_rgba(86,217,239,0.8)]" />
        {isReverseGeocoding ? (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#06111d]/86 px-3 py-1 text-[11px] font-black text-[#a7f3ff] backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating address
          </div>
        ) : null}
        {!mapReady ? (
          <div className="absolute inset-0 grid place-items-center bg-[#06111d]/80 text-sm font-black text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#56d9ef]" />
              Loading map
            </span>
          </div>
        ) : null}
      </div>

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-[22px] border border-white/10 bg-[#101c29] p-4 shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
          <div className="flex items-start gap-3">
            <span className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] text-[#56d9ef]">
              <Navigation className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-black leading-tight text-[#f8fafc]">{candidate.name}</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-300">{candidate.formattedAddress}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-[16px] border border-white/10 bg-[#07111d] p-3">
            <label className="grid gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f6c453]">District</span>
              <span className="relative block">
                <select
                  value={candidate.district ?? ""}
                  onChange={(event) =>
                    setCandidate((current) => ({
                      ...current,
                      district: (event.target.value || null) as Hk18District | null,
                    }))
                  }
                  className="h-12 w-full appearance-none rounded-[14px] border border-white/10 bg-[#182331] px-3 pr-10 text-sm font-black text-[#f8fafc] outline-none transition focus:border-[#56d9ef]/60"
                >
                  <option value="">Choose district</option>
                  {hk18DistrictOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f6c453]" />
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f6c453]">Meeting-point details</span>
              <input
                type="text"
                value={meetingPointNote}
                onChange={(event) => setMeetingPointNote(event.target.value)}
                placeholder="Near the main entrance"
                className="h-12 rounded-[14px] border border-white/10 bg-[#182331] px-3 text-sm font-black text-[#f8fafc] outline-none transition placeholder:text-slate-500 focus:border-[#56d9ef]/60"
              />
            </label>
          </div>

          {statusMessage ? (
            <p className="mt-3 rounded-[14px] border border-amber-300/20 bg-[#19170d] px-3 py-2 text-xs font-bold leading-5 text-amber-100">
              {statusMessage}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleConfirm}
            className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(180deg,#ffe08a,#f3b23c)] px-4 text-base font-black text-[#06111d] shadow-[0_18px_34px_rgba(246,196,83,0.28)] transition hover:brightness-105"
          >
            <Check className="h-5 w-5" />
            {getConfirmLabel(mode)}
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationPickerTopBar({ onClose }: { onClose: () => void }) {
  return (
    <header className="border-b border-white/10 bg-[#06111d]/95 px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="grid grid-cols-[56px_1fr_56px] items-center gap-3">
        <HomeMenuDrawer />
        <div className="inline-flex items-center justify-center gap-1.5 justify-self-center">
          <RidePodLogo className="h-8 w-[136px] justify-center min-[390px]:w-[158px]" imageClassName="h-full w-full" priority />
          <span className="rounded-full border border-white/15 bg-[#101c29] px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-[#f6c453]">
            v1.0
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close location picker"
          className="grid h-12 w-12 justify-self-end place-items-center rounded-[20px] border border-white/10 bg-[#101c29] text-slate-200 shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition hover:bg-[#172536]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export function LocationPicker({
  mode,
  value,
  open,
  onClose,
  onConfirm,
}: {
  mode: RideLocationMode;
  value: RideLocation | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (location: RideLocation) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const searchVersionRef = useRef(0);
  const [phase, setPhase] = useState<"search" | "map">("search");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [candidateLocation, setCandidateLocation] = useState<RideLocation | null>(value);
  const [recentLocations, setRecentLocations] = useState<RideLocation[]>([]);
  const [savedLocations, setSavedLocations] = useState(() => getSavedRideLocations());
  const [userCoordinates, setUserCoordinates] = useState<RideCoordinates | null>(null);
  const cleanQuery = query.trim();
  const hasGoogleKey = hasGoogleMapsApiKey();
  const localSuggestions = useMemo(
    () => getLocalLocationSuggestions(cleanQuery, userCoordinates),
    [cleanQuery, userCoordinates],
  );
  const visibleLocalSuggestions = useMemo(() => {
    const googleResultText = new Set(
      suggestions.map((suggestion) => normalizeLocationSearchText(`${suggestion.mainText} ${suggestion.secondaryText}`)),
    );

    return localSuggestions.filter((suggestion) => {
      const localText = normalizeLocationSearchText(`${suggestion.mainText} ${suggestion.secondaryText}`);
      return !googleResultText.has(localText);
    });
  }, [localSuggestions, suggestions]);
  const hasVisibleSuggestions = suggestions.length > 0 || visibleLocalSuggestions.length > 0;

  useEffect(() => {
    if (!open) return;
    const resetTimer = window.setTimeout(() => {
      setPhase("search");
      setQuery("");
      setSuggestions([]);
      setActiveIndex(0);
      setStatusMessage(hasGoogleKey ? null : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable live location search.");
      setCandidateLocation(value);
      setRecentLocations(getRecentRideLocations());
      setSavedLocations(getSavedRideLocations());
    }, 0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(focusTimer);
    };
  }, [hasGoogleKey, open, value]);

  useEffect(() => {
    if (!open || phase !== "search") return;

    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [onClose, open, phase]);

  useEffect(() => {
    if (!open || phase !== "search") return;
    if (cleanQuery.length < 2 || !hasGoogleKey) {
      const resetTimer = window.setTimeout(() => {
        setSuggestions([]);
        setIsSearching(false);
        if (cleanQuery.length < 2 && hasGoogleKey) setStatusMessage(null);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    const version = searchVersionRef.current + 1;
    searchVersionRef.current = version;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setStatusMessage(null);

      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = await loadGoogleMapsLibrary("places");
        if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();
        const origin = userCoordinates ?? hongKongDefaultCenter;
        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: cleanQuery,
          includedRegionCodes: ["hk"],
          language: "en",
          region: "HK",
          locationBias: userCoordinates
            ? { center: userCoordinates, radius: 30000 }
            : { center: hongKongDefaultCenter, radius: 55000 },
          origin,
          sessionToken: sessionTokenRef.current,
        });
        if (searchVersionRef.current !== version) return;

        const nextSuggestions = response.suggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter((prediction): prediction is google.maps.places.PlacePrediction => Boolean(prediction))
          .map((prediction) => ({
            id: prediction.placeId,
            mainText: prediction.mainText?.text || prediction.text.text,
            secondaryText: prediction.secondaryText?.text || "Hong Kong",
            distanceMeters: prediction.distanceMeters,
            prediction,
          }));

        setSuggestions(nextSuggestions);
        setActiveIndex(0);
        setStatusMessage(nextSuggestions.length ? null : "No matching Hong Kong places found.");
      } catch (error) {
        if (searchVersionRef.current === version) {
          setSuggestions([]);
          setStatusMessage(getGoogleErrorMessage(error));
        }
      } finally {
        if (searchVersionRef.current === version) setIsSearching(false);
      }
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [cleanQuery, hasGoogleKey, open, phase, userCoordinates]);

  async function openMapWithLocation(location: RideLocation) {
    setCandidateLocation(location);
    setPhase("map");
  }

  async function handleSelectSuggestion(suggestion: PlaceSuggestion) {
    setIsSelecting(true);
    setStatusMessage(null);

    try {
      const location = await createRideLocationFromPlace(suggestion.prediction, "autocomplete");
      sessionTokenRef.current = null;
      await openMapWithLocation(location);
    } catch {
      setStatusMessage("This place has no usable coordinates. Try another result or choose on map.");
    } finally {
      setIsSelecting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, suggestions.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (event.key === "Enter" && suggestions[activeIndex]) {
      event.preventDefault();
      void handleSelectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setStatusMessage("This browser does not support current location. Search or choose on map.");
      return;
    }

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setStatusMessage("Current location needs HTTPS. Search or choose on map instead.");
      return;
    }

    setIsLocating(true);
    setStatusMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoordinates(coordinates);

        try {
          const location = await reverseGeocodeRideLocation(coordinates, "current-location", "Current location");
          await openMapWithLocation(location);
        } catch {
          await openMapWithLocation(
            makeRideLocation({
              placeId: null,
              name: "Current location",
              formattedAddress: "Adjust the pin to refine this location.",
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              district: null,
              source: "current-location",
            }),
          );
          setStatusMessage("Current location selected. Adjust the pin to confirm the exact point.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        setStatusMessage(formatGeolocationError(error));
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  async function handleChooseOnMap() {
    const initialCoordinates = value
      ? { lat: value.latitude, lng: value.longitude }
      : userCoordinates ?? hongKongDefaultCenter;
    const district =
      value?.district ??
      resolveHongKongDistrictFromText(value?.formattedAddress ?? null) ??
      resolveHongKongDistrictFromCoordinates(initialCoordinates);
    await openMapWithLocation(
      value ??
        makeRideLocation({
          placeId: null,
          name: "Choose on map",
          formattedAddress: "Move the map to the exact pickup or drop-off point.",
          latitude: initialCoordinates.lat,
          longitude: initialCoordinates.lng,
          district,
          source: "map-pin",
        }),
    );
  }

  function handleConfirmLocation(location: RideLocation) {
    const nextLocation = {
      ...location,
      source: location.source === "saved-place" || location.source === "recent" ? location.source : location.source,
    };
    rememberRideLocation(nextLocation);
    onConfirm(nextLocation);
    onClose();
  }

  const visibleSavedShortcuts = useMemo(() => {
    return [
      savedLocations.home ? { key: "home", label: "Home", icon: <Home className="h-4.5 w-4.5" />, location: savedLocations.home } : null,
      savedLocations.work ? { key: "work", label: "Work", icon: <BriefcaseBusiness className="h-4.5 w-4.5" />, location: savedLocations.work } : null,
    ].filter(Boolean) as Array<{ key: string; label: string; icon: ReactNode; location: RideLocation }>;
  }, [savedLocations.home, savedLocations.work]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-[#020912] text-[#f8fafc]">
      <div className="flex h-full w-full max-w-[520px] flex-col bg-[#06111d] shadow-[0_0_70px_rgba(0,0,0,0.5)]">
        <LocationPickerTopBar onClose={onClose} />
        {phase === "map" && candidateLocation ? (
          <MapLocationAdjuster
            key={`${candidateLocation.placeId ?? "pin"}-${candidateLocation.latitude}-${candidateLocation.longitude}`}
            mode={mode}
            initialLocation={candidateLocation}
            onBack={() => {
              setPhase("search");
              window.setTimeout(() => inputRef.current?.focus(), 80);
            }}
            onConfirm={handleConfirmLocation}
          />
        ) : (
          <>
            <div className="border-b border-white/10 px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#56d9ef]">Ride location</p>
              <h2 className="truncate text-lg font-black text-[#f8fafc]">{getLocationTitle(mode)}</h2>
            </div>

            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <label htmlFor={inputId} className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6c453]">Search</span>
                <span className="grid grid-cols-[20px_1fr_auto] items-center gap-2 rounded-[18px] border border-white/10 bg-[#142230] px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.22)] focus-within:border-[#56d9ef]/60">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search building, MTR station or address"
                    autoComplete="off"
                    className="h-9 min-w-0 bg-transparent text-base font-black text-[#f8fafc] outline-none placeholder:text-slate-500"
                  />
                  {isSearching || isSelecting ? <Loader2 className="h-4.5 w-4.5 animate-spin text-[#56d9ef]" /> : null}
                </span>
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                <ShortcutButton
                  icon={isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  label="Use my current location"
                  disabled={isLocating}
                  onClick={handleUseCurrentLocation}
                />
                {visibleSavedShortcuts.map((shortcut) => (
                  <ShortcutButton
                    key={shortcut.key}
                    icon={shortcut.icon}
                    label={shortcut.label}
                    onClick={() => openMapWithLocation({ ...shortcut.location, source: "saved-place" })}
                  />
                ))}
              </div>

              {statusMessage && visibleLocalSuggestions.length === 0 ? (
                <p className="mt-4 rounded-[16px] border border-amber-300/20 bg-[#19170d] px-4 py-3 text-xs font-bold leading-5 text-amber-100">
                  {statusMessage}
                </p>
              ) : null}

              {cleanQuery.length >= 2 ? (
                <section className="mt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#56d9ef]">Suggestions</h3>
                    {isSearching ? <span className="text-xs font-bold text-slate-500">Searching...</span> : null}
                  </div>
                  <div className="mt-2 overflow-hidden rounded-[18px] border border-white/10 bg-[#0c1825]">
                    {hasVisibleSuggestions ? (
                      <>
                        {suggestions.map((suggestion, index) => (
                          <LocationResultButton
                            key={suggestion.id}
                            suggestion={suggestion}
                            active={index === activeIndex}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                          />
                        ))}
                        {visibleLocalSuggestions.map((suggestion) => (
                          <LocalLocationResultButton
                            key={suggestion.id}
                            suggestion={suggestion}
                            onSelect={() => openMapWithLocation(suggestion.location)}
                          />
                        ))}
                      </>
                    ) : !isSearching && !statusMessage ? (
                      <div className="px-4 py-5 text-sm font-bold text-slate-400">No results yet.</div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {recentLocations.length > 0 && cleanQuery.length < 2 ? (
                <section className="mt-5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#56d9ef]">Recent</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Previously selected locations</p>
                  <div className="mt-3 grid gap-2">
                    {recentLocations.map((location) => (
                      <ExistingLocationButton
                        key={`${location.placeId ?? location.name}-${location.latitude}-${location.longitude}`}
                        location={location}
                        label="Recent"
                        icon={<Clock3 className="h-4.5 w-4.5" />}
                        onSelect={() => openMapWithLocation({ ...location, source: "recent" })}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {visibleSavedShortcuts.length > 0 && cleanQuery.length < 2 ? (
                <section className="mt-5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#56d9ef]">Saved places</h3>
                  <div className="mt-3 grid gap-2">
                    {visibleSavedShortcuts.map((shortcut) => (
                      <ExistingLocationButton
                        key={shortcut.key}
                        location={shortcut.location}
                        label={shortcut.label}
                        icon={shortcut.icon}
                        onSelect={() => openMapWithLocation({ ...shortcut.location, source: "saved-place" })}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <button
                type="button"
                onClick={handleChooseOnMap}
                className="mt-5 grid min-h-16 w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[18px] border border-[#56d9ef]/30 bg-[#0b2a38] px-4 text-left text-[#a7f3ff] shadow-[0_16px_34px_rgba(86,217,239,0.11)] transition hover:border-[#56d9ef]/60"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#102f43] text-[#56d9ef]">
                  <MapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-black text-[#f8fafc]">Choose on map</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-400">Move the pin to the exact point</span>
                </span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function RideLocationField({
  label,
  value,
  placeholder,
  allowCurrentLocation = false,
  onOpen,
}: {
  label: string;
  value: RideLocation | null;
  placeholder: string;
  allowCurrentLocation?: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[rgba(15,27,39,0.9)] px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition">
      <button
        type="button"
        onClick={onOpen}
        className="grid min-h-[76px] w-full grid-cols-[42px_1fr] items-center gap-3 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full border border-[#f6c453]/25 bg-[#1b2936] text-[#ffc94d]">
          <MapPin className="h-5 w-5 fill-[#ffc94d]/10 stroke-[2.3]" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-[0.12em] text-[#f6c453]">{label}</span>
          {value ? (
            <>
              <span className="mt-2 block truncate text-sm font-black leading-5 text-[#f8fafc]">{value.name}</span>
              <span className="mt-1 block line-clamp-2 text-xs font-bold leading-4 text-slate-400">{value.formattedAddress}</span>
            </>
          ) : (
            <span className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] px-3 text-sm font-black text-[#a7f3ff]">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
        </span>
      </button>

      {value ? (
        <div className="ml-[52px] mt-3 grid gap-2">
          {value.district ? (
            <span className="w-fit rounded-full border border-[#2dd4bf]/25 bg-[#0f2f2d] px-2.5 py-1 text-xs font-bold text-[#86efac]">
              {value.district}
            </span>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] px-3 text-xs font-black text-[#a7f3ff] transition hover:border-[#56d9ef]/50"
            >
              <MapPin className="h-3.5 w-3.5" />
              Adjust pin
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-black text-slate-200 transition hover:border-white/20"
            >
              <Pencil className="h-3.5 w-3.5" />
              Change
            </button>
          </div>
        </div>
      ) : allowCurrentLocation ? (
        <button
          type="button"
          onClick={onOpen}
          className="ml-[52px] mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#56d9ef]/25 bg-[#0b2a38] px-3 text-xs font-black text-[#a7f3ff] transition hover:border-[#56d9ef]/50"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Use my current location
        </button>
      ) : null}
    </div>
  );
}

export function DistrictDetectionStatus({
  district,
  editing,
  onEdit,
  children,
}: {
  district: Hk18District | string | null;
  editing: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  if (!district || editing) return <>{children}</>;

  return (
    <div className="rounded-[16px] border border-[#2dd4bf]/20 bg-[#0d2427] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[#5eead4]">District</span>
          <span className="mt-1 block text-sm font-black text-[#f8fafc]">{district}</span>
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-[#5eead4]/25 bg-[#0b2a38] px-3 text-xs font-black text-[#a7f3ff] transition hover:border-[#5eead4]/50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Change district
        </button>
      </div>
    </div>
  );
}
