import { LocalStorage } from "@raycast/api";
import { ValueEntry, ValueType } from "./types";

const STORAGE_KEY = "entries";

let storageLock: Promise<void> = Promise.resolve();

function isValidValueType(type: unknown): type is ValueType {
  return (
    typeof type === "string" &&
    ["string", "number", "url", "email", "json", "color"].includes(type)
  );
}

function isValidEntry(entry: unknown): entry is ValueEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.label === "string" &&
    typeof e.value === "string" &&
    isValidValueType(e.type) &&
    typeof e.createdAt === "number" &&
    typeof e.updatedAt === "number"
  );
}

export async function getAllEntries(): Promise<ValueEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const release = storageLock.then(() => {});
  let resolveLock: () => void;
  storageLock = new Promise((resolve) => {
    resolveLock = resolve;
  });
  await release;
  try {
    return await operation();
  } finally {
    resolveLock!();
  }
}

export async function saveEntry(entry: ValueEntry): Promise<void> {
  await withLock(async () => {
    const entries = await getAllEntries();
    entries.push(entry);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  });
}

export async function updateEntry(updated: ValueEntry): Promise<void> {
  await withLock(async () => {
    const entries = await getAllEntries();
    const idx = entries.findIndex((e) => e.id === updated.id);
    if (idx !== -1) {
      entries[idx] = updated;
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  });
}

export async function deleteEntry(id: string): Promise<void> {
  await withLock(async () => {
    const entries = await getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  });
}
