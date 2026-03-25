import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



/** Format prompt text — if it's JSON, extract the most readable form */
export function formatPromptText(text: string): string {
  const trimmed = text.trim();

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
        const label = formatKey(key);
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          lines.push(`${pad}${label}: ${val}`);
        } else if (Array.isArray(val)) {
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
    try { return JSON.parse(jsonStr); } catch { /* */ }
    const repaired = tryRepairAndParse(jsonStr);
    if (repaired) return repaired;
    try { return JSON.parse("[" + jsonStr); } catch { /* */ }
    try { return JSON.parse("[" + jsonStr + "]"); } catch { /* */ }
    return tryRepairAndParse("[" + jsonStr);
  }

  function formatParsed(parsed: unknown): string {
    const promptKeys = [
      "full_prompt_string", "full_prompt", "prompt_string",
      "prompt_text", "prompt", "assembled_prompt", "description", "text",
    ];

    function findPromptInObject(obj: Record<string, unknown>): string | null {
      for (const key of promptKeys) {
        if (typeof obj[key] === "string" && (obj[key] as string).length > 20) {
          return obj[key] as string;
        }
      }
      const keys = Object.keys(obj);
      if (keys.length === 1 && typeof obj[keys[0]] === "object" && obj[keys[0]] !== null && !Array.isArray(obj[keys[0]])) {
        return findPromptInObject(obj[keys[0]] as Record<string, unknown>);
      }
      return null;
    }

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const found = findPromptInObject(parsed as Record<string, unknown>);
      if (found) return found;
    }

    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      const promptTexts = parsed
        .map((item: Record<string, unknown>) => {
          const pt = item.prompt_text || item.full_prompt_string || item.prompt || item.description;
          const title = item.title;
          if (typeof pt === "string") return title ? `${title}: ${pt}` : pt;
          return null;
        })
        .filter(Boolean);
      if (promptTexts.length > 0) return promptTexts.join("\n\n");
    }

    return formatObject(parsed);
  }

  // Case 1: text starts with JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = parseJson(trimmed);
    if (parsed) return formatParsed(parsed);
  }

  // Case 2: text contains JSON embedded after some text (e.g. "Description... Prompt: { ... }")
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