import { LocalStorage } from "@raycast/api";
import { ValueEntry } from "./types";

const STORAGE_KEY = "entries";

export async function getAllEntries(): Promise<ValueEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function saveEntry(entry: ValueEntry): Promise<void> {
  const entries = await getAllEntries();
  entries.push(entry);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function updateEntry(updated: ValueEntry): Promise<void> {
  const entries = await getAllEntries();
  const idx = entries.findIndex((e) => e.id === updated.id);
  if (idx !== -1) {
    entries[idx] = updated;
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await getAllEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
