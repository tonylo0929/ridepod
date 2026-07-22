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
  bg: string;
};

export const ANIMAL_AVATARS: AnimalAvatarOption[] = [
  { id: "frog", name: "Frog", asset: "/avatars/animals/frog.png", bg: "#DDF7D6" },
  { id: "cat", name: "Cat", asset: "/avatars/animals/cat.png", bg: "#E9D7FF" },
  { id: "fox", name: "Fox", asset: "/avatars/animals/fox.png", bg: "#FFE0B8" },
  { id: "rabbit", name: "Rabbit", asset: "/avatars/animals/rabbit.png", bg: "#FFD3D4" },
  { id: "bear", name: "Bear", asset: "/avatars/animals/bear.png", bg: "#FFE7A6" },
  { id: "bird", name: "Blue bird", asset: "/avatars/animals/bird.png", bg: "#D6F2FF" },
  { id: "whale", name: "Whale", asset: "/avatars/animals/whale.png", bg: "#CFF9FF" },
  { id: "dinosaur", name: "Dinosaur", asset: "/avatars/animals/dinosaur.png", bg: "#DDF8DC" },
  { id: "octopus", name: "Octopus", asset: "/avatars/animals/octopus.png", bg: "#E5D0FF" },
  { id: "dog", name: "Dog", asset: "/avatars/animals/dog.png", bg: "#FFD6BC" },
  { id: "duck", name: "Duck", asset: "/avatars/animals/duck.png", bg: "#FFF1A7" },
  { id: "raccoon", name: "Raccoon", asset: "/avatars/animals/raccoon.png", bg: "#E6E6F1" },
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
        "relative grid overflow-hidden rounded-full border border-white/20 bg-cover bg-center shadow-[inset_0_1px_0_rgba(255,255,255,0.42)]",
        className,
      )}
      style={{ backgroundColor: avatar.bg, backgroundImage: `url(${avatar.asset})` }}
      aria-label={label ?? `${avatar.name} avatar`}
      role="img"
    >
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
        "grid place-items-center rounded-full border border-[color-mix(in_srgb,var(--rp-primary)_68%,white_18%)] bg-[linear-gradient(180deg,#ffe59a,#f2c15b)] text-center font-black text-[#07111a] shadow-[0_10px_24px_rgba(242,193,91,0.24),inset_0_1px_0_rgba(255,255,255,0.55)]",
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
