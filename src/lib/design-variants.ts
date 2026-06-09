export const designVariantSlugs = [
  "fintech",
  "community",
  "travel",
  "premium",
  "campus",
  "commuter",
  "access",
  "night",
] as const;

export type DesignVariantSlug = (typeof designVariantSlugs)[number];

export type DesignVariant = {
  slug: DesignVariantSlug;
  name: string;
  bestFor: string;
  tone: string;
  headline: string;
  subhead: string;
  navLabel: string;
  bg: string;
  shell: string;
  sidebar: string;
  panel: string;
  card: string;
  mutedCard: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  border: string;
  button: string;
  ghost: string;
  badge: string;
  success: string;
  warning: string;
  radius: string;
  shadow: string;
};

export const designVariants: Record<DesignVariantSlug, DesignVariant> = {
  fintech: {
    slug: "fintech",
    name: "Fintech",
    bestFor: "Trust and payments",
    tone: "Structured, crisp, money-lock first",
    headline: "Seat authorizations before anyone books.",
    subhead:
      "A calm, banking-grade RidePod concept where deposits, authorizations, and lock deadlines are always visible.",
    navLabel: "Fintech",
    bg: "bg-[#f6f8fb]",
    shell: "bg-[#f6f8fb]",
    sidebar: "bg-white text-slate-950 border-slate-200",
    panel: "bg-white border-slate-200",
    card: "bg-white border-slate-200",
    mutedCard: "bg-slate-50 border-slate-200",
    text: "text-slate-950",
    muted: "text-slate-500",
    accent: "bg-[#2563eb]",
    accentText: "text-[#2563eb]",
    accentSoft: "bg-blue-50 text-blue-700 border-blue-100",
    border: "border-slate-200",
    button: "bg-slate-950 text-white hover:bg-slate-800",
    ghost: "bg-white text-slate-950 border-slate-200",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    radius: "rounded-lg",
    shadow: "shadow-sm",
  },
  community: {
    slug: "community",
    name: "Community",
    bestFor: "Nervous first-time users",
    tone: "Warm, social, people-centered",
    headline: "Ride with people who planned ahead.",
    subhead:
      "A friendlier RidePod direction that makes group context, verified members, and shared expectations feel human.",
    navLabel: "Community",
    bg: "bg-[#fff8f1]",
    shell: "bg-[#fff8f1]",
    sidebar: "bg-[#fffdf9] text-stone-950 border-orange-100",
    panel: "bg-[#fffdf9] border-orange-100",
    card: "bg-white border-orange-100",
    mutedCard: "bg-[#fff1e3] border-orange-100",
    text: "text-stone-950",
    muted: "text-stone-600",
    accent: "bg-[#e66f2a]",
    accentText: "text-[#d85f1d]",
    accentSoft: "bg-orange-50 text-orange-700 border-orange-100",
    border: "border-orange-100",
    button: "bg-[#235c4d] text-white hover:bg-[#1d4f42]",
    ghost: "bg-white text-stone-950 border-orange-100",
    badge: "bg-[#fff1e3] text-stone-700 border-orange-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    radius: "rounded-3xl",
    shadow: "shadow-[0_16px_40px_rgba(90,60,30,0.10)]",
  },
  travel: {
    slug: "travel",
    name: "Travel",
    bestFor: "Airport and event rides",
    tone: "Itinerary-led, route-forward, trip planning",
    headline: "Your shared ride itinerary, locked in.",
    subhead:
      "A travel-planning concept with route hierarchy, boarding-card details, and timeline confidence for airport/event pods.",
    navLabel: "Travel",
    bg: "bg-[#eef7fb]",
    shell: "bg-[#eef7fb]",
    sidebar: "bg-[#082f49] text-white border-sky-900",
    panel: "bg-white border-sky-100",
    card: "bg-white border-sky-100",
    mutedCard: "bg-sky-50 border-sky-100",
    text: "text-slate-950",
    muted: "text-slate-600",
    accent: "bg-[#0284c7]",
    accentText: "text-[#0369a1]",
    accentSoft: "bg-sky-50 text-sky-800 border-sky-100",
    border: "border-sky-100",
    button: "bg-[#0f766e] text-white hover:bg-[#115e59]",
    ghost: "bg-white text-slate-950 border-sky-100",
    badge: "bg-[#e0f2fe] text-sky-800 border-sky-100",
    success: "bg-teal-50 text-teal-700 border-teal-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    radius: "rounded-2xl",
    shadow: "shadow-[0_18px_45px_rgba(3,105,161,0.12)]",
  },
  premium: {
    slug: "premium",
    name: "Premium",
    bestFor: "Professional commuters",
    tone: "Darker, luxury transfer, reliability-led",
    headline: "Verified shared transfers for serious schedules.",
    subhead:
      "A premium direction with private-car cues, member reliability, and high-confidence host workflows.",
    navLabel: "Premium",
    bg: "bg-[#080808]",
    shell: "bg-[#080808]",
    sidebar: "bg-[#0f0f0f] text-zinc-100 border-zinc-800",
    panel: "bg-[#111111] border-zinc-800",
    card: "bg-[#151515] border-zinc-800",
    mutedCard: "bg-[#1d1b17] border-[#3a3020]",
    text: "text-zinc-50",
    muted: "text-zinc-400",
    accent: "bg-[#c8a15a]",
    accentText: "text-[#d8b875]",
    accentSoft: "bg-[#251f15] text-[#e9cf93] border-[#3b3120]",
    border: "border-zinc-800",
    button: "bg-[#d8b875] text-black hover:bg-[#efcf86]",
    ghost: "bg-[#151515] text-zinc-100 border-zinc-800",
    badge: "bg-zinc-900 text-zinc-300 border-zinc-700",
    success: "bg-emerald-950 text-emerald-300 border-emerald-800",
    warning: "bg-[#302411] text-[#e9cf93] border-[#4a3719]",
    radius: "rounded-xl",
    shadow: "shadow-[0_22px_60px_rgba(0,0,0,0.35)]",
  },
  campus: {
    slug: "campus",
    name: "Campus",
    bestFor: "College students",
    tone: "Energetic, low-cost, shareable",
    headline: "Split the ride, keep your plans easy.",
    subhead:
      "A youthful RidePod concept with quick sharing, low-cost cues, and social proof for students and campus groups.",
    navLabel: "Campus",
    bg: "bg-[#f7ffe8]",
    shell: "bg-[#f7ffe8]",
    sidebar: "bg-white text-zinc-950 border-lime-200",
    panel: "bg-white border-lime-200",
    card: "bg-white border-lime-200",
    mutedCard: "bg-[#ebff9d] border-lime-200",
    text: "text-zinc-950",
    muted: "text-zinc-600",
    accent: "bg-[#84cc16]",
    accentText: "text-[#4d7c0f]",
    accentSoft: "bg-lime-100 text-lime-800 border-lime-200",
    border: "border-lime-200",
    button: "bg-[#111827] text-white hover:bg-black",
    ghost: "bg-white text-zinc-950 border-lime-200",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
    success: "bg-lime-100 text-lime-800 border-lime-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    radius: "rounded-2xl",
    shadow: "shadow-[8px_8px_0_rgba(17,24,39,0.14)]",
  },
  commuter: {
    slug: "commuter",
    name: "Commuter",
    bestFor: "Daily work routes",
    tone: "Fast, compact, schedule-first",
    headline: "Repeat routes without rebuilding the plan.",
    subhead:
      "A compact RidePod concept for people who need the same morning and evening routes to feel predictable.",
    navLabel: "Commuter",
    bg: "bg-[#f4f6f2]",
    shell: "bg-[#f4f6f2]",
    sidebar: "bg-[#20312c] text-white border-[#314a42]",
    panel: "bg-white border-[#d9e2db]",
    card: "bg-white border-[#d9e2db]",
    mutedCard: "bg-[#e8efe9] border-[#d9e2db]",
    text: "text-[#13201c]",
    muted: "text-[#52645d]",
    accent: "bg-[#2f6f5e]",
    accentText: "text-[#2f6f5e]",
    accentSoft: "bg-[#e1f2eb] text-[#24594b] border-[#c6dfd4]",
    border: "border-[#d9e2db]",
    button: "bg-[#2f6f5e] text-white hover:bg-[#25594b]",
    ghost: "bg-white text-[#13201c] border-[#d9e2db]",
    badge: "bg-[#edf2ee] text-[#344840] border-[#d9e2db]",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    radius: "rounded-xl",
    shadow: "shadow-[0_18px_40px_rgba(47,111,94,0.12)]",
  },
  access: {
    slug: "access",
    name: "Access",
    bestFor: "Accessibility support",
    tone: "Clear, reassuring, support-aware",
    headline: "Shared rides with access needs visible early.",
    subhead:
      "An accessibility-led concept where luggage, step-free needs, pickup support, and host responsibilities are clear before joining.",
    navLabel: "Access",
    bg: "bg-[#f8f7ff]",
    shell: "bg-[#f8f7ff]",
    sidebar: "bg-[#221f3f] text-white border-[#393362]",
    panel: "bg-white border-[#ddd8ff]",
    card: "bg-white border-[#ddd8ff]",
    mutedCard: "bg-[#efecff] border-[#ddd8ff]",
    text: "text-[#17142b]",
    muted: "text-[#5e5875]",
    accent: "bg-[#6d5dfc]",
    accentText: "text-[#5b4ee8]",
    accentSoft: "bg-[#ece9ff] text-[#4f46c6] border-[#d8d2ff]",
    border: "border-[#ddd8ff]",
    button: "bg-[#17142b] text-white hover:bg-[#2a244d]",
    ghost: "bg-white text-[#17142b] border-[#ddd8ff]",
    badge: "bg-[#f2f0ff] text-[#514a70] border-[#ddd8ff]",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-violet-50 text-violet-700 border-violet-200",
    radius: "rounded-2xl",
    shadow: "shadow-[0_18px_45px_rgba(109,93,252,0.14)]",
  },
  night: {
    slug: "night",
    name: "Night",
    bestFor: "Late events and nightlife",
    tone: "High-contrast, live-status, safety-forward",
    headline: "Late rides with live confidence checks.",
    subhead:
      "A night-ride concept for concerts, dinners, and late work exits where pickup readiness and member signals stay prominent.",
    navLabel: "Night",
    bg: "bg-[#090b10]",
    shell: "bg-[#090b10]",
    sidebar: "bg-[#11141c] text-white border-[#252b37]",
    panel: "bg-[#121722] border-[#283241]",
    card: "bg-[#171d29] border-[#283241]",
    mutedCard: "bg-[#1f2330] border-[#343a49]",
    text: "text-[#f8fafc]",
    muted: "text-[#aeb8c7]",
    accent: "bg-[#21b8a8]",
    accentText: "text-[#5ce1d5]",
    accentSoft: "bg-[#102d2e] text-[#80eee4] border-[#1d5554]",
    border: "border-[#283241]",
    button: "bg-[#21b8a8] text-[#061014] hover:bg-[#48d8ca]",
    ghost: "bg-[#171d29] text-[#f8fafc] border-[#283241]",
    badge: "bg-[#202736] text-[#c9d3df] border-[#343d4e]",
    success: "bg-emerald-950 text-emerald-300 border-emerald-800",
    warning: "bg-[#3a2b16] text-[#f6d38b] border-[#5a431d]",
    radius: "rounded-xl",
    shadow: "shadow-[0_24px_70px_rgba(0,0,0,0.38)]",
  },
};

export function getDesignVariant(slug: string) {
  return designVariants[slug as DesignVariantSlug];
}
