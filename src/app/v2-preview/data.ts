import type { HomeRide, AirportDirection } from "@/lib/home-ride-mock";

export type CoverId =
  | "terminal"
  | "harbour"
  | "night"
  | "bridge"
  | "town"
  | "sunset"
  | "boarding"
  | "luggage"
  | "airport-sign";
export type Journey = Pick<
  HomeRide,
  "id" | "fromLabel" | "toLabel" | "rideKind"
> & {
  /** Advertised companion places, excluding the one host. Never a booking count. */
  offeredPlaces: number;
  /** Other people's demo interest, excluding the host and current viewer. */
  interestCount: number;
  title: string;
  description: string;
  date: string;
  time: string;
  author: string;
  avatar: string;
  cover: CoverId;
  direction: AirportDirection;
  flight: string;
  /** Local Hong Kong date-times. Neither field implies a real flight update. */
  scheduledFlightAt?: string;
  airportReadyAt?: string;
  luggage?: number;
  wait?: number;
  meeting: string;
  mine?: boolean;
};

export const covers: { id: CoverId; label: string }[] = [
  { id: "terminal", label: "機場日光" },
  { id: "harbour", label: "維港藍調" },
  { id: "night", label: "城市夜色" },
  { id: "bridge", label: "沿途海風" },
  { id: "town", label: "日常小城" },
  { id: "sunset", label: "黃昏出走" },
  { id: "boarding", label: "同路登機證" },
  { id: "luggage", label: "行李小日子" },
  { id: "airport-sign", label: "機場指示牌" },
];
export const corridors = [
  "全部路線",
  "屯門 → 中環",
  "元朗 → 尖沙咀",
  "沙田 → 中環",
  "將軍澳 → 觀塘",
  "機場 → 屯門",
];

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00+08:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function dateLabel(date: string, today: string) {
  if (date === today) return "今日";
  if (date === addDays(today, 1)) return "聽日";
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日`;
}
export function automaticCover(
  kind: Journey["rideKind"],
  time: string,
  route = "",
): CoverId {
  if (Number(time.slice(0, 2)) >= 19 || Number(time.slice(0, 2)) < 6)
    return "night";
  if (kind === "airport") {
    const airportCovers: CoverId[] = [
      "terminal",
      "boarding",
      "luggage",
      "airport-sign",
    ];
    return airportCovers[
      Array.from(route).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) %
        airportCovers.length
    ];
  }
  if (Number(time.slice(0, 2)) >= 17) return "sunset";
  return "harbour";
}
export function normalizeFlight(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}
export const pastDepartureMessage = "呢個出發時間已經過咗，請揀返未來嘅時間。";

/** V2 input times are in Hong Kong (UTC+08:00), independent of the host timezone.
 * Compare the complete instant, with an injectable clock called on every attempt.
 * A minute input denotes its start: exact equality is valid; even 1ms past is not.
 */
export function validateDepartureTime(
  journey: Pick<Journey, "date" | "time">,
  now: () => number = Date.now,
) {
  const departure = Date.parse(`${journey.date}T${journey.time}+08:00`);
  if (!Number.isFinite(departure)) return "請填寫有效嘅出發日期同時間。";
  return departure < now() ? pastDepartureMessage : "";
}
export function momentLabel(value: string, today: string) {
  const [date, time] = value.split("T");
  return `${dateLabel(date, today)} ${time}`;
}
export function fullMomentLabel(value: string) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日 ${time}`;
}
export function journeyCounts(journey: Pick<Journey, "offeredPlaces" | "interestCount" | "mine">, viewerInterested = false) {
  return {
    host: 1,
    interested: journey.interestCount + Number(viewerInterested && !journey.mine),
    maxCapacity: journey.offeredPlaces + 1,
  };
}
export function departureAt(journey: Pick<Journey, "date" | "time">) {
  return `${journey.date}T${journey.time}`;
}
export function validateAirportTiming(
  journey: Pick<
    Journey,
    | "rideKind"
    | "direction"
    | "date"
    | "time"
    | "airportReadyAt"
    | "scheduledFlightAt"
  >,
) {
  if (journey.rideKind !== "airport") return "";
  if (journey.direction === "from_airport") {
    if (
      journey.scheduledFlightAt &&
      journey.airportReadyAt &&
      journey.scheduledFlightAt > journey.airportReadyAt
    )
      return "預計出閘時間要喺航班預定抵達之後。";
    if (journey.airportReadyAt && journey.airportReadyAt > departureAt(journey))
      return "夾車出發時間要喺預計出閘時間之後。";
    if (journey.scheduledFlightAt && journey.scheduledFlightAt > departureAt(journey))
      return "夾車出發時間要喺航班預定抵達之後。";
  } else if (
    journey.scheduledFlightAt &&
    journey.scheduledFlightAt <= departureAt(journey)
  ) {
    return "去機場嘅夾車出發時間要喺航班預定起飛之前。";
  }
  return "";
}
export function generatePost(
  input: Pick<
    Journey,
    | "rideKind"
    | "direction"
    | "fromLabel"
    | "toLabel"
    | "time"
    | "date"
    | "luggage"
    | "wait"
    | "flight"
    | "airportReadyAt"
  >,
  today: string,
) {
  const when = `${dateLabel(input.date, today)} ${input.time}`;
  const arrival =
    input.rideKind === "airport" && input.direction === "from_airport";
  const flight =
    input.rideKind === "airport" ? normalizeFlight(input.flight) : "";
  const title =
    arrival && flight
      ? `搭 ${flight} 落機，有冇人一齊返${input.toLabel}？✈️`
      : `${when} ${input.fromLabel}出發，有冇人一齊去${input.toLabel}？${input.rideKind === "airport" ? "✈️" : "🚕"}`;
  const start = arrival
    ? `我${flight ? `搭 ${flight} 落機，` : "落機之後，"}${input.airportReadyAt ? `預計 ${fullMomentLabel(input.airportReadyAt)} 出閘，` : ""}打算 ${fullMomentLabel(departureAt(input))} 夾車出發`
    : `我${dateLabel(input.date, today)}預計 ${input.time} 由${input.fromLabel}出發`;
  const details =
    input.rideKind === "airport"
      ? [input.luggage !== undefined ? `有 ${input.luggage} 個喼` : "", input.wait !== undefined ? (input.wait === 0 ? "想準時出發" : `最多可以等 ${input.wait} 分鐘`) : ""].filter(Boolean).join("，")
      : "時間可以再傾。";
  const description = `${start}。${details ? `${details.replace(/。$/, "")}。` : ""}有冇人同路想一齊分擔車費？😆`;
  return { title, description };
}
export function sampleJourneys(today: string): Journey[] {
  const rows: [
    string,
    string,
    string,
    string,
    string,
    CoverId,
    string,
    number,
    string?,
    number?,
  ][] = [
    [
      "香港機場",
      "屯門",
      "21:30",
      "今晚 CX734 落機，有冇人一齊返屯門？✈️",
      "Mandy",
      "boarding",
      "cat",
      0,
      "CX734",
      1,
    ],
    [
      "香港機場",
      "大埔",
      "22:15",
      "一個喼，一個人，搵個同路人返大埔 🧳",
      "阿謙",
      "night",
      "bear",
      0,
      "CX250",
      2,
    ],
    [
      "沙田",
      "香港機場",
      "21:50",
      "聽日凌晨 00:17 起飛，今晚一齊去機場？",
      "Yuna",
      "airport-sign",
      "rabbit",
      0,
      "",
      1,
    ],
    [
      "香港機場",
      "將軍澳",
      "18:45",
      "旅行完咗，一齊慢慢返屋企 🌅",
      "阿晴",
      "sunset",
      "fox",
      1,
      "UO623",
      1,
    ],
    [
      "香港機場",
      "元朗",
      "14:20",
      "下晝落機，有冇元朗友？",
      "Ken",
      "luggage",
      "frog",
      1,
      "",
      2,
    ],
    [
      "屯門",
      "香港機場",
      "09:15",
      "去旅行嘅第一程，就一齊啦 ☀️",
      "Chloe",
      "town",
      "bird",
      0,
      "",
      1,
    ],
    [
      "香港機場",
      "沙田",
      "20:40",
      "唔同航班都得，時間啱就一齊返",
      "阿樂",
      "harbour",
      "dog",
      0,
      "CX450",
      1,
    ],
    [
      "香港機場",
      "屯門",
      "17:30",
      "黃昏落機，順便識個同路人",
      "Iris",
      "sunset",
      "whale",
      1,
      "",
      1,
    ],
    [
      "屯門市廣場",
      "中環",
      "08:00",
      "聽朝返工，有冇人一齊夾車？🚕",
      "阿謙",
      "harbour",
      "bear",
      1,
    ],
    [
      "元朗",
      "尖沙咀",
      "19:00",
      "收工去尖沙咀，一齊行少啲路",
      "Mandy",
      "night",
      "cat",
      0,
    ],
    [
      "沙田",
      "中環",
      "08:30",
      "返工路上，有個伴都幾好 ☕",
      "Yuna",
      "bridge",
      "rabbit",
      1,
    ],
    [
      "將軍澳",
      "觀塘",
      "09:00",
      "朝早唔想逼，一齊去觀塘",
      "Ken",
      "town",
      "frog",
      0,
    ],
    [
      "香港機場",
      "屯門",
      "21:00",
      "夜晚返屯門，有冇人同路？",
      "阿晴",
      "night",
      "fox",
      0,
    ],
    [
      "屯門市廣場",
      "中環",
      "07:45",
      "每朝同一條路，不如一齊？",
      "Chloe",
      "sunset",
      "bird",
      1,
    ],
    [
      "沙田",
      "觀塘",
      "18:30",
      "收工後去觀塘食飯，搵個伴出發",
      "阿樂",
      "harbour",
      "dog",
      1,
    ],
  ];
  return rows.map((r, i) => ({
    id: `demo-${i + 1}`,
    fromLabel: r[0],
    toLabel: r[1],
    // In arrival examples the existing time is ready-to-leave, not departure.
    time:
      i < 8 && r[1] !== "香港機場"
        ? `${String(Math.floor((Number(r[2].slice(0, 2)) * 60 + Number(r[2].slice(3)) + 20) / 60)).padStart(2, "0")}:${String((Number(r[2].slice(3)) + 20) % 60).padStart(2, "0")}`
        : r[2],
    title: r[3],
    author: r[4],
    cover: r[5],
    avatar: r[6],
    date: addDays(today, r[7]),
    flight: r[8] || "",
    luggage: r[9] || 0,
    rideKind: i < 8 ? "airport" : i === 13 ? "recurring" : "one_off",
    direction:
      i < 8 ? (r[1] === "香港機場" ? "to_airport" : "from_airport") : null,
    airportReadyAt:
      i < 8 && r[1] !== "香港機場"
        ? `${addDays(today, r[7])}T${r[2]}`
        : undefined,
    scheduledFlightAt: i === 2
      ? `${addDays(today, 1)}T00:17`
      : i < 8 && r[1] !== "香港機場" && r[8]
        ? `${addDays(today, r[7])}T${String(Number(r[2].slice(0, 2)) - 1).padStart(2, "0")}:50`
        : undefined,
    interestCount: i % 3,
    offeredPlaces: 3,
    wait: 20,
    meeting:
      i < 8 && r[1] !== "香港機場"
        ? "一號客運大樓，抵港接機大堂 B"
        : `${r[0]}附近，詳細位置再傾`,
    description:
      i < 8
        ? `我預計 ${r[2]} 左右${r[1] === "香港機場" ? "出發去機場" : "拎完行李出到嚟"}，有 ${r[9] || 1} 個喼，可以等 15–20 分鐘。唔同航班都冇問題，時間同路線啱就一齊啦！😆`
        : "平時都係行呢條路，想搵人一齊分擔車費。時間同集合地點可以再傾，輕鬆啲出發。",
  }));
}
