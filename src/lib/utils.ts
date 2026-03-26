import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



/** Format prompt text — if it's JSON, extract the most readable form */
export function formatPromptText(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();

  // Try to clean non-standard whitespace (like \u00A0) which breaks JSON.parse
  const cleanJson = (str: string) => str.replace(/\u00A0/g, " ");

  /** Try to repair truncated JSON by appending missing closing brackets */
  function tryRepairAndParse(str: string): unknown | null {
    let braces = 0, brackets = 0;
    let inString = false, escape = false;
    for (const ch of str) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") braces++;
      if (ch === "}") braces--;
      if (ch === "[") brackets++;
      if (ch === "]") brackets--;
    }
    let repaired = str.replace(/,\s*$/, "");
    repaired += "]".repeat(Math.max(0, brackets)) + "}".repeat(Math.max(0, braces));
    try { return JSON.parse(repaired); } catch { return null; }
  }

  function formatKey(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatObject(obj: unknown, indent = 0): string {
    const pad = "  ".repeat(indent);
    const lines: string[] = [];

    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
      return `${obj}`;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === "string" || typeof item === "number") {
          lines.push(`${pad}• ${item}`);
        } else if (typeof item === "object" && item !== null) {
          lines.push(formatObject(item, indent));
        }
      }
      return lines.join("\n");
    }

    if (typeof obj === "object" && obj !== null) {
      for (const [key, val] of Object.entries(obj)) {
        // Skip purely technical IDs or internal flags
        if (key === "id" || key === "version" || key === "type" && typeof val !== "string") continue;

        const label = formatKey(key);
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          lines.push(`${pad}${label}: ${val}`);
        } else if (Array.isArray(val)) {
          if (val.length === 0) continue;
          lines.push(`${pad}${label}:`);
          for (const item of val) {
            if (typeof item === "string" || typeof item === "number") {
              lines.push(`${pad}  • ${item}`);
            } else if (typeof item === "object" && item !== null) {
              lines.push(formatObject(item, indent + 1));
            }
          }
        } else if (typeof val === "object" && val !== null) {
          lines.push(`${pad}${label}:`);
          lines.push(formatObject(val, indent + 1));
        }
      }
    }
    return lines.join("\n");
  }

  function parseJson(jsonStr: string): unknown | null {
    const cleaned = cleanJson(jsonStr);
    try { return JSON.parse(cleaned); } catch { /* */ }
    
    // Check if it's a list of objects without []
    if (cleaned.startsWith("{")) {
      try { return JSON.parse("[" + cleaned + "]"); } catch { /* */ }
      const repairedArray = tryRepairAndParse("[" + cleaned + "]");
      if (repairedArray) return repairedArray;
    }

    return tryRepairAndParse(cleaned);
  }

  /** Known prompt keys — ordered by priority */
  const promptKeys = [
    "full_prompt_string", "full_prompt", "assembled_prompt", 
    "prompt_text", "prompt_string", "prompt", "description", "text", "image_prompt"
  ];

  /** Recursively search for a usable prompt string inside an object */
  function findPromptInObject(obj: Record<string, unknown>, depth = 0): string | null {
    if (depth > 4) return null;
    
    // 1. Check direct prompt keys
    for (const key of promptKeys) {
      const val = obj[key];
      if (typeof val === "string" && val.length > 10) return val;
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        const nested = findPromptInObject(val as Record<string, unknown>, depth + 1);
        if (nested) return nested;
      }
    }

    // 2. If it's a single key wrapper, go deeper regardless of key name
    const keys = Object.keys(obj);
    if (keys.length === 1) {
      const val = obj[keys[0]];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        return findPromptInObject(val as Record<string, unknown>, depth + 1);
      }
    }

    return null;
  }

  /** Extract array of prompt items from an object that wraps an array */
  function findPromptArray(obj: Record<string, unknown>): Array<Record<string, unknown>> | null {
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
        const first = val[0] as Record<string, unknown>;
        if (first.prompt_text || first.full_prompt_string || first.prompt || first.description || first.title) {
          return val as Array<Record<string, unknown>>;
        }
      }
    }
    return null;
  }

  function formatPromptArray(arr: Array<Record<string, unknown>>): string | null {
    const promptTexts = arr
      .map((item) => {
        const pt = item.full_prompt_string || item.prompt_text || item.prompt || item.description || item.text;
        const title = item.title || item.name;
        if (typeof pt === "string") return title ? `### ${title}\n${pt}` : pt;
        // If item itself is a structured object, format it
        return formatObject(item);
      })
      .filter(Boolean);
    return promptTexts.length > 0 ? promptTexts.join("\n\n") : null;
  }

  function formatParsed(parsed: unknown): string {
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const found = findPromptInObject(obj);
      if (found) return found;

      const promptArr = findPromptArray(obj);
      if (promptArr) {
        const result = formatPromptArray(promptArr);
        if (result) return result;
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === "object") {
        const result = formatPromptArray(parsed as Array<Record<string, unknown>>);
        if (result) return result;
      }
    }

    return formatObject(parsed);
  }

  // Case 1: text starts with JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = parseJson(trimmed);
    if (parsed) return formatParsed(parsed);
  }

  // Case 2: text contains JSON embedded
  const jsonStart = trimmed.search(/\n\s*\{/);
  if (jsonStart !== -1) {
    const prefixText = trimmed.slice(0, jsonStart).trim();
    const jsonPart = trimmed.slice(jsonStart).trim();
    const parsed = parseJson(jsonPart);
    if (parsed) {
      const formattedJson = formatParsed(parsed);
      return prefixText + "\n\n" + formattedJson;
    }
  }

  return text;
}