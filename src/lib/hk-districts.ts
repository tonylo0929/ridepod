export const hk18DistrictOptions = [
  "Central and Western",
  "Eastern",
  "Southern",
  "Wan Chai",
  "Kowloon City",
  "Kwun Tong",
  "Sham Shui Po",
  "Wong Tai Sin",
  "Yau Tsim Mong",
  "Islands",
  "Kwai Tsing",
  "North",
  "Sai Kung",
  "Sha Tin",
  "Tai Po",
  "Tsuen Wan",
  "Tuen Mun",
  "Yuen Long",
] as const;

export type Hk18District = (typeof hk18DistrictOptions)[number];

export type HkDistrictCoordinates = {
  lng: number;
  lat: number;
};

export const hk18DistrictCenters: Record<Hk18District, HkDistrictCoordinates> = {
  "Central and Western": { lat: 22.285, lng: 114.15 },
  Eastern: { lat: 22.284, lng: 114.225 },
  Southern: { lat: 22.248, lng: 114.158 },
  "Wan Chai": { lat: 22.277, lng: 114.173 },
  "Kowloon City": { lat: 22.328, lng: 114.191 },
  "Kwun Tong": { lat: 22.313, lng: 114.225 },
  "Sham Shui Po": { lat: 22.331, lng: 114.159 },
  "Wong Tai Sin": { lat: 22.342, lng: 114.195 },
  "Yau Tsim Mong": { lat: 22.304, lng: 114.17 },
  Islands: { lat: 22.309, lng: 113.918 },
  "Kwai Tsing": { lat: 22.354, lng: 114.103 },
  North: { lat: 22.501, lng: 114.128 },
  "Sai Kung": { lat: 22.382, lng: 114.271 },
  "Sha Tin": { lat: 22.384, lng: 114.188 },
  "Tai Po": { lat: 22.45, lng: 114.166 },
  "Tsuen Wan": { lat: 22.371, lng: 114.114 },
  "Tuen Mun": { lat: 22.391, lng: 113.977 },
  "Yuen Long": { lat: 22.445, lng: 114.022 },
};

type GoogleAddressComponentLike = {
  long_name?: string | null;
  short_name?: string | null;
  longText?: string | null;
  shortText?: string | null;
  types?: string[] | null;
};

const districtAliases: Array<[Hk18District, string[]]> = [
  ["Central and Western", ["central and western", "central & western", "central western", "central", "sheung wan", "sai ying pun", "kennedy town", "mid-levels", "admiralty"]],
  ["Eastern", ["eastern", "north point", "quarry bay", "tai koo", "sai wan ho", "shau kei wan", "heng fa chuen", "chai wan"]],
  ["Southern", ["southern", "aberdeen", "ap lei chau", "wong chuk hang", "repulse bay", "stanley", "pok fu lam"]],
  ["Wan Chai", ["wan chai", "wanchai", "causeway bay", "happy valley", "tin hau"]],
  ["Kowloon City", ["kowloon city", "hung hom", "ho man tin", "to kwa wan", "ma tau wai", "kai tak"]],
  ["Kwun Tong", ["kwun tong", "kowloon bay", "ngau tau kok", "lam tin", "yau tong", "apm", "emsg", "emsd"]],
  ["Sham Shui Po", ["sham shui po", "cheung sha wan", "lai chi kok", "mei foo", "stonecutters"]],
  ["Wong Tai Sin", ["wong tai sin", "diamond hill", "choi hung", "lok fu", "san po kong"]],
  ["Yau Tsim Mong", ["yau tsim mong", "yau ma tei", "tsim sha tsui", "mong kok", "prince edward", "jordan", "west kowloon"]],
  ["Islands", ["islands", "hong kong international airport", "hkg", "hki", "hkia", "airport", "chek lap kok", "tung chung", "lantau", "disneyland", "discovery bay"]],
  ["Kwai Tsing", ["kwai tsing", "kwai chung", "tsing yi", "lai king"]],
  ["North", ["north district", "sheung shui", "fanling", "sha tau kok", "ta kwu ling"]],
  ["Sai Kung", ["sai kung", "tseung kwan o", "hang hau", "lohas park", "clear water bay"]],
  ["Sha Tin", ["sha tin", "shatin", "ma on shan", "fo tan", "tai wai", "science park", "city one"]],
  ["Tai Po", ["tai po", "taipo", "tai po market", "tai mei tuk"]],
  ["Tsuen Wan", ["tsuen wan", "ting kau", "sham tseng", "discovery park"]],
  ["Tuen Mun", ["tuen mun", "gold coast", "siu hong"]],
  ["Yuen Long", ["yuen long", "tin shui wai", "long ping", "kam tin", "fairview park"]],
];

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bdistrict\b/g, " ")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isHk18District(value: string): value is Hk18District {
  return hk18DistrictOptions.includes(value as Hk18District);
}

export function getDistrictCenter(value: string) {
  return isHk18District(value) ? hk18DistrictCenters[value] : null;
}

export function normalizeHongKongDistrict(value: string | null | undefined): Hk18District | null {
  const clean = normalizeComparableText(value ?? "");
  if (!clean) return null;

  const direct = hk18DistrictOptions.find((district) => normalizeComparableText(district) === clean);
  if (direct) return direct;

  for (const [district, aliases] of districtAliases) {
    if (aliases.some((alias) => clean.includes(normalizeComparableText(alias)))) return district;
  }

  return null;
}

export function resolveHongKongDistrictFromText(value: string | null | undefined): Hk18District | null {
  return normalizeHongKongDistrict(value);
}

export function resolveHongKongDistrictFromAddressComponents(
  components: GoogleAddressComponentLike[] | null | undefined,
  fallbackText?: string | null,
): Hk18District | null {
  const relevant = (components ?? [])
    .filter((component) =>
      (component.types ?? []).some((type) =>
        [
          "administrative_area_level_2",
          "administrative_area_level_3",
          "locality",
          "sublocality",
          "sublocality_level_1",
          "sublocality_level_2",
          "neighborhood",
          "premise",
          "point_of_interest",
        ].includes(type),
      ),
    )
    .flatMap((component) => [
      component.longText,
      component.shortText,
      component.long_name,
      component.short_name,
    ])
    .filter((value): value is string => Boolean(value?.trim()));

  for (const text of relevant) {
    const district = normalizeHongKongDistrict(text);
    if (district) return district;
  }

  return resolveHongKongDistrictFromText(fallbackText);
}
