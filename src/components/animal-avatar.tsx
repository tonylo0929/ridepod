"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/components/ui";

export type AnimalAvatarId =
  | "frog"
  | "cat"
  | "fox"
  | "rabbit"
  | "bear"
  | "bird"
  | "whale"
  | "dinosaur"
  | "octopus"
  | "dog"
  | "duck"
  | "raccoon";

export type RidePodAvatarType = "animal" | "initials" | "uploaded";

export type RidePodAvatarPreference = {
  avatarType: RidePodAvatarType;
  animalAvatarId: AnimalAvatarId | null;
};

export type AnimalAvatarOption = {
  id: AnimalAvatarId;
  name: string;
  asset: string;
  fallback: string;
  bg: string;
  accent: string;
  text: string;
};

export const ANIMAL_AVATARS: AnimalAvatarOption[] = [
  { id: "frog", name: "Frog", asset: "/avatars/animals/frog.svg", fallback: "FR", bg: "#DDF7D6", accent: "#72B72D", text: "Frog" },
  { id: "cat", name: "Cat", asset: "/avatars/animals/cat.svg", fallback: "CA", bg: "#E9D7FF", accent: "#7E858C", text: "Cat" },
  { id: "fox", name: "Fox", asset: "/avatars/animals/fox.svg", fallback: "FX", bg: "#FFE0B8", accent: "#F06B18", text: "Fox" },
  { id: "rabbit", name: "Rabbit", asset: "/avatars/animals/rabbit.svg", fallback: "RB", bg: "#FFD3D4", accent: "#FFF7F0", text: "Bun" },
  { id: "bear", name: "Bear", asset: "/avatars/animals/bear.svg", fallback: "BR", bg: "#FFE7A6", accent: "#9D6027", text: "Bear" },
  { id: "bird", name: "Blue bird", asset: "/avatars/animals/bird.svg", fallback: "BD", bg: "#D6F2FF", accent: "#55AEE6", text: "Bird" },
  { id: "whale", name: "Whale", asset: "/avatars/animals/whale.svg", fallback: "WH", bg: "#CFF9FF", accent: "#1F80C5", text: "Whale" },
  { id: "dinosaur", name: "Dinosaur", asset: "/avatars/animals/dinosaur.svg", fallback: "DI", bg: "#DDF8DC", accent: "#4DAE45", text: "Dino" },
  { id: "octopus", name: "Octopus", asset: "/avatars/animals/octopus.svg", fallback: "OC", bg: "#E5D0FF", accent: "#9A60D3", text: "Octo" },
  { id: "dog", name: "Dog", asset: "/avatars/animals/dog.svg", fallback: "DG", bg: "#FFD6BC", accent: "#A86B34", text: "Dog" },
  { id: "duck", name: "Duck", asset: "/avatars/animals/duck.svg", fallback: "DK", bg: "#FFF1A7", accent: "#F7C72F", text: "Duck" },
  { id: "raccoon", name: "Raccoon", asset: "/avatars/animals/raccoon.svg", fallback: "RC", bg: "#E6E6F1", accent: "#74767D", text: "Raccoon" },
];

const animalAvatarById = new Map(ANIMAL_AVATARS.map((avatar) => [avatar.id, avatar]));
const avatarPreferencePrefix = "ridepod:avatar-preference:";
const avatarPreferenceEvent = "ridepod:avatar-preference-changed";

export function getAnimalAvatar(id?: string | null) {
  if (!id) return null;
  return animalAvatarById.get(id as AnimalAvatarId) ?? null;
}

export function getDemoAnimalAvatarId(name?: string | null): AnimalAvatarId | null {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "mark") return "frog";
  if (normalized === "yuna") return "cat";
  if (normalized === "mandy") return "fox";
  if (normalized === "ken") return "bear";
  if (normalized === "iris") return "rabbit";
  return null;
}

function avatarStorageKey(profileId: string) {
  return `${avatarPreferencePrefix}${profileId}`;
}

function isRidePodAvatarType(value: unknown): value is RidePodAvatarType {
  return value === "animal" || value === "initials" || value === "uploaded";
}

function normalizeAvatarPreference(value: unknown): RidePodAvatarPreference {
  if (!value || typeof value !== "object") {
    return { avatarType: "initials", animalAvatarId: null };
  }

  const record = value as Record<string, unknown>;
  const avatarType = isRidePodAvatarType(record.avatarType) ? record.avatarType : "initials";
  const animalAvatarId =
    typeof record.animalAvatarId === "string" && getAnimalAvatar(record.animalAvatarId)
      ? (record.animalAvatarId as AnimalAvatarId)
      : null;

  return {
    avatarType,
    animalAvatarId: avatarType === "animal" ? animalAvatarId : null,
  };
}

function readAvatarPreference(profileId?: string | null): RidePodAvatarPreference {
  if (!profileId || typeof window === "undefined") {
    return { avatarType: "initials", animalAvatarId: null };
  }

  try {
    const raw = window.localStorage.getItem(avatarStorageKey(profileId));
    return normalizeAvatarPreference(raw ? JSON.parse(raw) : null);
  } catch {
    return { avatarType: "initials", animalAvatarId: null };
  }
}

export function saveAvatarPreference(profileId: string, preference: RidePodAvatarPreference) {
  if (typeof window === "undefined") return;

  const normalized = normalizeAvatarPreference(preference);
  window.localStorage.setItem(avatarStorageKey(profileId), JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(avatarPreferenceEvent, { detail: { profileId, preference: normalized } }));
}

function avatarPreferenceSnapshot(profileId?: string | null) {
  return JSON.stringify(readAvatarPreference(profileId));
}

function parseAvatarPreferenceSnapshot(snapshot: string) {
  try {
    return normalizeAvatarPreference(JSON.parse(snapshot));
  } catch {
    return { avatarType: "initials", animalAvatarId: null } satisfies RidePodAvatarPreference;
  }
}

export function useRidePodAvatarPreference(profileId?: string | null) {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (!profileId || typeof window === "undefined") return () => {};

      function sync(event?: Event) {
        if (event instanceof CustomEvent && event.detail?.profileId && event.detail.profileId !== profileId) {
          return;
        }
        onStoreChange();
      }

      window.addEventListener("storage", sync);
      window.addEventListener(avatarPreferenceEvent, sync);

      return () => {
        window.removeEventListener("storage", sync);
        window.removeEventListener(avatarPreferenceEvent, sync);
      };
    },
    () => avatarPreferenceSnapshot(profileId),
    () => JSON.stringify({ avatarType: "initials", animalAvatarId: null } satisfies RidePodAvatarPreference),
  );
  const preference = useMemo(() => parseAvatarPreferenceSnapshot(snapshot), [snapshot]);

  function setPreference(nextPreference: RidePodAvatarPreference) {
    if (!profileId) {
      return;
    }
    saveAvatarPreference(profileId, nextPreference);
  }

  return [preference, setPreference] as const;
}

export function AnimalAvatar({
  id,
  className,
  label,
}: {
  id: AnimalAvatarId;
  className?: string;
  label?: string;
}) {
  const avatar = getAnimalAvatar(id) ?? ANIMAL_AVATARS[0];

  return (
    <span
      className={cn(
        "relative grid overflow-hidden rounded-full border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]",
        className,
      )}
      style={{ background: `radial-gradient(circle at 32% 24%, #ffffffcc 0 13%, ${avatar.bg} 14% 100%)` }}
      aria-label={label ?? `${avatar.name} avatar`}
      role="img"
    >
      <span
        className="absolute bottom-[-12%] left-1/2 grid h-[76%] w-[76%] -translate-x-1/2 place-items-center rounded-full text-center text-[10px] font-black leading-none text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
        style={{
          background: `linear-gradient(180deg, color-mix(in_srgb, ${avatar.accent} 82%, #ffffff) 0%, ${avatar.accent} 100%)`,
          color: avatar.id === "rabbit" ? "#2e2a2a" : "#ffffff",
        }}
      >
        <span className="drop-shadow-[0_1px_0_rgba(0,0,0,0.22)]">{avatar.text}</span>
      </span>
      <span className="absolute left-[25%] top-[34%] h-[9%] w-[9%] rounded-full bg-[#15191f]" />
      <span className="absolute right-[25%] top-[34%] h-[9%] w-[9%] rounded-full bg-[#15191f]" />
      <span className="absolute left-[19%] top-[52%] h-[9%] w-[13%] rounded-full bg-[#ff9db0]" />
      <span className="absolute right-[19%] top-[52%] h-[9%] w-[13%] rounded-full bg-[#ff9db0]" />
      <span className="absolute left-1/2 top-[48%] h-[8%] w-[18%] -translate-x-1/2 rounded-b-full border-b-2 border-[#17191f]" />
      <span className="sr-only">{avatar.name}</span>
    </span>
  );
}

export function RidePodAvatar({
  avatarUrl,
  avatarPreference,
  initials,
  displayName,
  className,
}: {
  avatarUrl?: string | null;
  avatarPreference: RidePodAvatarPreference;
  initials: string;
  displayName: string;
  className?: string;
}) {
  const cleanAvatarUrl = avatarUrl?.trim();
  const selectedAnimal = avatarPreference.avatarType === "animal" ? getAnimalAvatar(avatarPreference.animalAvatarId) : null;
  const showUploaded = avatarPreference.avatarType === "uploaded" && cleanAvatarUrl;

  if (selectedAnimal) {
    return <AnimalAvatar id={selectedAnimal.id} className={className} label={`${displayName} ${selectedAnimal.name} avatar`} />;
  }

  if (showUploaded) {
    return (
      <span
        className={cn(
          "grid place-items-center overflow-hidden rounded-full bg-[var(--rp-gradient-primary)] bg-cover bg-center text-transparent",
          className,
        )}
        style={{ backgroundImage: `url(${cleanAvatarUrl})` }}
      >
        <span className="sr-only">{displayName}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-[var(--rp-gradient-primary)] text-center font-black text-[var(--rp-primary-text)]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function AnimalAvatarPicker({
  selectedId,
  onSelect,
}: {
  selectedId: AnimalAvatarId | null;
  onSelect: (id: AnimalAvatarId) => void;
}) {
  const selectedAvatar = useMemo(() => getAnimalAvatar(selectedId), [selectedId]);

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {ANIMAL_AVATARS.map((avatar) => {
        const selected = selectedAvatar?.id === avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            aria-label={`Choose ${avatar.name} avatar`}
            aria-pressed={selected}
            className={cn(
              "relative grid min-h-28 place-items-center gap-2 rounded-2xl border bg-[var(--rp-card-soft)] p-2 text-xs font-black text-[var(--rp-text)] transition hover:border-[var(--rp-border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67e8f9]",
              selected
                ? "border-[var(--rp-primary)] shadow-[0_0_0_2px_rgba(103,232,249,0.4),0_18px_30px_rgba(0,0,0,0.24)]"
                : "border-[var(--rp-border)]",
            )}
          >
            <AnimalAvatar id={avatar.id} className="h-16 w-16 text-[9px]" />
            <span>{avatar.name}</span>
            {selected ? (
              <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
