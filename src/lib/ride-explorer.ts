export type StartingAreaIconKey = "building" | "sprout" | "landmark" | "sailboat" | "airport";
export type DistrictRegionId = "all" | "hong-kong-island" | "kowloon" | "new-territories";

export type StartingAreaSummary = {
  id: string;
  name: string;
  rideCount: number;
  icon: StartingAreaIconKey;
  accentClassName: string;
  queryValue: string;
};

export type PopularRouteSummary = {
  id: string;
  from: string;
  to: string;
  rideCount: number;
  accentClassName: string;
  fromQuery: string;
  toQuery: string;
};

export type DistrictSummary = {
  id: string;
  name: string;
  region: Exclude<DistrictRegionId, "all">;
  rideCount: number;
  queryValue: string;
};

export const startingAreaSummaries: StartingAreaSummary[] = [
  {
    id: "tuen-mun",
    name: "Tuen Mun",
    rideCount: 20,
    icon: "building",
    accentClassName: "from-[#ffd968] to-[#f5b934] text-[#07131c]",
    queryValue: "tuen-mun",
  },
  {
    id: "yuen-long",
    name: "Yuen Long",
    rideCount: 14,
    icon: "sprout",
    accentClassName: "from-[#7bea98] to-[#2dd4bf] text-[#05140b]",
    queryValue: "yuen-long",
  },
  {
    id: "sha-tin",
    name: "Sha Tin",
    rideCount: 11,
    icon: "landmark",
    accentClassName: "from-[#7dd3fc] to-[#2563eb] text-white",
    queryValue: "sha-tin",
  },
  {
    id: "tseung-kwan-o",
    name: "Tseung Kwan O",
    rideCount: 8,
    icon: "sailboat",
    accentClassName: "from-[#67e8f9] to-[#0891b2] text-[#04101a]",
    queryValue: "tseung-kwan-o",
  },
  {
    id: "tai-po",
    name: "Tai Po",
    rideCount: 7,
    icon: "landmark",
    accentClassName: "from-[#c4b5fd] to-[#7c3aed] text-white",
    queryValue: "tai-po",
  },
  {
    id: "mong-kok",
    name: "Mong Kok",
    rideCount: 9,
    icon: "building",
    accentClassName: "from-[#ffe8c6] to-[#f6d7ad] text-[#14100b]",
    queryValue: "mong-kok",
  },
];

export const popularRouteSummaries: PopularRouteSummary[] = [
  {
    id: "tuen-mun-central",
    from: "Tuen Mun",
    to: "Central",
    rideCount: 12,
    accentClassName: "bg-[#ffd968]",
    fromQuery: "tuen-mun",
    toQuery: "central",
  },
  {
    id: "yuen-long-mong-kok",
    from: "Yuen Long",
    to: "Mong Kok",
    rideCount: 9,
    accentClassName: "bg-[#65e6d0]",
    fromQuery: "yuen-long",
    toQuery: "mong-kok",
  },
];

export const districtRegionTabs: Array<{ id: DistrictRegionId; label: string }> = [
  { id: "all", label: "All" },
  { id: "hong-kong-island", label: "Hong Kong Island" },
  { id: "kowloon", label: "Kowloon" },
  { id: "new-territories", label: "New Territories" },
];

export const officialDistricts: DistrictSummary[] = [
  { id: "central-and-western", name: "Central and Western", region: "hong-kong-island", rideCount: 16, queryValue: "central-and-western" },
  { id: "eastern", name: "Eastern", region: "hong-kong-island", rideCount: 10, queryValue: "eastern" },
  { id: "southern", name: "Southern", region: "hong-kong-island", rideCount: 6, queryValue: "southern" },
  { id: "wan-chai", name: "Wan Chai", region: "hong-kong-island", rideCount: 13, queryValue: "wan-chai" },
  { id: "kowloon-city", name: "Kowloon City", region: "kowloon", rideCount: 8, queryValue: "kowloon-city" },
  { id: "kwun-tong", name: "Kwun Tong", region: "kowloon", rideCount: 10, queryValue: "kwun-tong" },
  { id: "sham-shui-po", name: "Sham Shui Po", region: "kowloon", rideCount: 7, queryValue: "sham-shui-po" },
  { id: "wong-tai-sin", name: "Wong Tai Sin", region: "kowloon", rideCount: 5, queryValue: "wong-tai-sin" },
  { id: "yau-tsim-mong", name: "Yau Tsim Mong", region: "kowloon", rideCount: 18, queryValue: "yau-tsim-mong" },
  { id: "islands", name: "Islands", region: "new-territories", rideCount: 5, queryValue: "islands" },
  { id: "kwai-tsing", name: "Kwai Tsing", region: "new-territories", rideCount: 8, queryValue: "kwai-tsing" },
  { id: "north", name: "North", region: "new-territories", rideCount: 4, queryValue: "north" },
  { id: "sai-kung", name: "Sai Kung", region: "new-territories", rideCount: 7, queryValue: "sai-kung" },
  { id: "sha-tin", name: "Sha Tin", region: "new-territories", rideCount: 11, queryValue: "sha-tin" },
  { id: "tai-po", name: "Tai Po", region: "new-territories", rideCount: 7, queryValue: "tai-po" },
  { id: "tsuen-wan", name: "Tsuen Wan", region: "new-territories", rideCount: 9, queryValue: "tsuen-wan" },
  { id: "tuen-mun", name: "Tuen Mun", region: "new-territories", rideCount: 20, queryValue: "tuen-mun" },
  { id: "yuen-long", name: "Yuen Long", region: "new-territories", rideCount: 14, queryValue: "yuen-long" },
];

export const popularHubSummaries = [
  {
    id: "airport",
    name: "Airport",
    rideCount: 6,
    queryValue: "airport",
  },
];

export function buildRideExploreHref({ from, to }: { from?: string; to?: string } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/rides/explore?${query}` : "/rides/explore";
}

export function slugToTitle(value: string | null | undefined) {
  if (!value) return "";

  const knownArea = [...startingAreaSummaries, ...officialDistricts, ...popularHubSummaries].find(
    (area) => area.queryValue === value || area.id === value,
  );
  if (knownArea) return knownArea.name;

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
