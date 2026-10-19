import type { HomeRide, AirportDirection } from "@/lib/home-ride-mock";

export type CoverId = "terminal" | "harbour" | "night" | "bridge" | "town" | "sunset";
export type Journey = Pick<HomeRide, "id" | "fromLabel" | "toLabel" | "seatsUsed" | "seatsTotal" | "rideKind"> & {
  title: string; description: string; date: string; time: string; author: string;
  avatar: string; cover: CoverId; direction: AirportDirection; flight: string;
  flightTime: string; luggage: number; wait: number; meeting: string; mine?: boolean;
};

export const covers: { id: CoverId; label: string }[] = [
  { id: "terminal", label: "機場日光" }, { id: "harbour", label: "維港藍調" },
  { id: "night", label: "城市夜色" }, { id: "bridge", label: "沿途海風" },
  { id: "town", label: "日常小城" }, { id: "sunset", label: "黃昏出走" },
];
export const corridors = ["全部路線", "屯門 → 中環", "元朗 → 尖沙咀", "沙田 → 中環", "將軍澳 → 觀塘", "機場 → 屯門"];

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
export function automaticCover(kind: Journey["rideKind"], time: string): CoverId {
  if (Number(time.slice(0, 2)) >= 19 || Number(time.slice(0, 2)) < 6) return "night";
  if (kind === "airport") return "terminal";
  if (Number(time.slice(0, 2)) >= 17) return "sunset";
  return "harbour";
}
export function generatePost(input: Pick<Journey, "rideKind" | "direction" | "fromLabel" | "toLabel" | "time" | "date" | "luggage" | "wait">, today: string) {
  const when = `${dateLabel(input.date, today)} ${input.time}`;
  const title = `${when} ${input.fromLabel}出發，有冇人一齊去${input.toLabel}？${input.rideKind === "airport" ? "✈️" : "🚕"}`;
  const arrival = input.rideKind === "airport" && input.direction === "from_airport";
  const description = `${arrival ? "我落機之後，" : "我"}預計${when}${arrival ? "左右出到機場" : `由${input.fromLabel}出發`}，${input.rideKind === "airport" ? `有 ${input.luggage} 個喼，可以等 ${input.wait} 分鐘。` : "時間可以再傾。"}有冇人同路想一齊分擔車費？😆`;
  return { title, description };
}
export function sampleJourneys(today: string): Journey[] {
  const rows: [string,string,string,string,string,CoverId,string,number,string?,number?][] = [
    ["香港機場","屯門","21:30","今晚落機，有冇人一齊返屯門？✈️","Mandy","terminal","cat",0,"CX734",1],
    ["香港機場","大埔","22:15","一個喼，一個人，搵個同路人返大埔 🧳","阿謙","night","bear",0,"CX250",2],
    ["沙田","香港機場","07:00","早機唔想轉幾程車，一齊出發？","Yuna","bridge","rabbit",1,"",1],
    ["香港機場","將軍澳","18:45","旅行完咗，一齊慢慢返屋企 🌅","阿晴","sunset","fox",1,"UO623",1],
    ["香港機場","元朗","14:20","下晝落機，有冇元朗友？","Ken","terminal","frog",1,"",2],
    ["屯門","香港機場","09:15","去旅行嘅第一程，就一齊啦 ☀️","Chloe","town","bird",0,"",1],
    ["香港機場","沙田","20:40","唔同航班都得，時間啱就一齊返","阿樂","harbour","dog",0,"CX450",1],
    ["香港機場","屯門","17:30","黃昏落機，順便識個同路人","Iris","sunset","whale",1,"",1],
    ["屯門市廣場","中環","08:00","聽朝返工，有冇人一齊夾車？🚕","阿謙","harbour","bear",1],
    ["元朗","尖沙咀","19:00","收工去尖沙咀，一齊行少啲路","Mandy","night","cat",0],
    ["沙田","中環","08:30","返工路上，有個伴都幾好 ☕","Yuna","bridge","rabbit",1],
    ["將軍澳","觀塘","09:00","朝早唔想逼，一齊去觀塘","Ken","town","frog",0],
    ["香港機場","屯門","21:00","夜晚返屯門，有冇人同路？","阿晴","night","fox",0],
    ["屯門市廣場","中環","07:45","每朝同一條路，不如一齊？","Chloe","sunset","bird",1],
    ["沙田","觀塘","18:30","收工後去觀塘食飯，搵個伴出發","阿樂","harbour","dog",1],
  ];
  return rows.map((r, i) => ({ id: `demo-${i+1}`, fromLabel: r[0], toLabel: r[1], time: r[2], title: r[3], author: r[4], cover: r[5], avatar: r[6], date: addDays(today, r[7]), flight: r[8] || "", luggage: r[9] || 0, rideKind: i < 8 ? "airport" : i === 13 ? "recurring" : "one_off", direction: i < 8 ? r[1] === "香港機場" ? "to_airport" : "from_airport" : null, flightTime: i < 8 && r[1] !== "香港機場" ? `${String(Number(r[2].slice(0,2)) - 1).padStart(2,"0")}:50` : "", seatsUsed: i % 3 + 1, seatsTotal: 4, wait: 20, meeting: i < 8 && r[1] !== "香港機場" ? "一號客運大樓，抵港接機大堂 B" : `${r[0]}附近，詳細位置再傾`, description: i < 8 ? `我預計 ${r[2]} 左右${r[1] === "香港機場" ? "出發去機場" : "拎完行李出到嚟"}，有 ${r[9] || 1} 個喼，可以等 15–20 分鐘。唔同航班都冇問題，時間同路線啱就一齊啦！😆` : "平時都係行呢條路，想搵人一齊分擔車費。時間同集合地點可以再傾，輕鬆啲出發。" }));
}
