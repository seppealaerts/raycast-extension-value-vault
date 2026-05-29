export type ValueType = "string" | "number" | "url" | "email" | "json" | "color";

export interface ValueEntry {
  id: string;
  label: string;
  value: string;
  type: ValueType;
  createdAt: number;
  updatedAt: number;
}

export const VALUE_TYPE_OPTIONS: { value: ValueType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "json", label: "JSON" },
  { value: "color", label: "Color" },
];

export function detectType(value: string): ValueType {
  if (/^https?:\/\/.+/.test(value)) {
    return "url";
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "email";
  }
  try {
    JSON.parse(value);
    return "json";
  } catch {
    /* not JSON */
  }
  if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
    return "number";
  }
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())) {
    return "color";
  }
  return "string";
}

export function parseValueType(value: string): ValueType | null {
  const match = VALUE_TYPE_OPTIONS.find((opt) => opt.value === value);
  return match ? match.value : null;
}
