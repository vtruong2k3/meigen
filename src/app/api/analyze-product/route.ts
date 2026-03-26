import { NextRequest, NextResponse } from "next/server";
import type { ProductAnalysis } from "@/types";

const CHAINHUB_CHAT_URL = process.env.CHAINHUB_GPT_URL!;
const API_KEY = process.env.BASE_API_KEY!;

const MODELS = ["gpt-4o", "gemini-2.0-flash"] as const;
const MAX_RETRIES = 1;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ── Step 1: Analyze the uploaded product image ── */

const ANALYSIS_SYSTEM_PROMPT = `# Role
You are a Food & Product Visual Analyst. Analyze images of food, drinks, and packaged products.

# Task
Given an image, extract:
1. **name**: Dish name, product name, or beverage name
2. **category**: One of "dish" | "beverage" | "dessert" | "snack" | "packaged"
3. **cuisine**: Origin or cuisine type (e.g., "Vietnamese", "Japanese")
4. **ingredients**: List of visible ingredients or components (3-8 items)
5. **colors**: Dominant colors (2-4 colors)
6. **brand**: Brand name if visible on packaging (null if no brand)
7. **description**: Brief 1-sentence description

# Output
Output ONLY valid JSON. No markdown, no filler. Example:
{"name":"Coca-Cola","category":"beverage","cuisine":"American","ingredients":["carbonated water","caramel color","sugar"],"colors":["red","white","dark brown"],"brand":"Coca-Cola","description":"Classic Coca-Cola can with iconic red branding and white wave logo"}`;

/* ── Step 2: Replace product details in the template prompt ── */

const REPLACE_SYSTEM_PROMPT = `# Role
You are a SURGICAL Prompt Editor. You perform precise find-and-replace edits on AI image generation prompts.

# Critical Principle
The template prompt is a MASTERPIECE that produces stunning results. Your job is to perform MINIMAL, SURGICAL edits — change ONLY the product-specific words. Everything else MUST stay EXACTLY THE SAME, word for word.

# What you MUST KEEP IDENTICAL (DO NOT CHANGE):
- Background color/style (e.g., "dark background" stays "dark background")
- Lighting setup (e.g., "cinematic studio lighting" stays exactly the same)
- Camera settings (e.g., "shallow depth of field" stays exactly the same)
- Visual effects (e.g., "Purple Splash" stays as splash effect, just change the splash color if needed)
- Composition/layout (e.g., "vertical", "centered" stays the same)
- Resolution, aspect ratio, quality settings
- Motion effects (e.g., "frozen mid-air", "levitating" stays the same)
- ALL structural formatting (JSON keys, indentation, section headers)

# What you SHOULD CHANGE (surgical replacements only):
- Product/dish NAME → replace with new product name
- Specific INGREDIENT names → replace with new product's ingredients
- Product-specific COLORS only where they describe the product itself
- Brand names → replace with new brand
- Product-specific textures/materials → adapt to new product
- Toppings/garnishes → adapt to fit new product

# Example of CORRECT adaptation:
Template: "Ice Cream Cone with Purple Splash... raspberries, blueberries floating... dark moody background"
New product: Bear Ice Cream Squishy (white, yellow, red, strawberry)
Result: "Bear Ice Cream Squishy with Red Splash... strawberries, stars floating... dark moody background"
→ Notice: SAME dark background, SAME splash effect, SAME floating concept, only product nouns changed

# Example of WRONG adaptation (DO NOT DO THIS):
Template: "Ice Cream Cone with Purple Splash... dark moody background"
WRONG: "Bear Ice Cream in a bright yellow studio... cute cartoon style..."
→ This is WRONG because it changed the background, style, and mood

# Output
Output ONLY the adapted prompt text. No explanation, no markdown wrapping, no commentary.`;


/* ── Vision API Call ─────────────────────────── */

async function callChat(
  model: string,
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userContent: any,
  maxTokens = 500,
): Promise<string | null> {
  const payload = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt);

    const res = await fetch(CHAINHUB_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    }

    if (!RETRYABLE_STATUS.has(res.status)) return null;
    console.warn(`[analyze-product] ${model} attempt ${attempt + 1} failed: ${res.status}`);
  }
  return null;
}

/* ── POST Handler ─────────────────────────────── */

/**
 * POST /api/analyze-product
 *
 * Mode 1 — Analyze only (no templatePrompt):
 *   Body: { imageUrl: string }
 *   Returns: { analysis: ProductAnalysis }
 *
 * Mode 2 — Analyze + Replace (with templatePrompt):
 *   Body: { imageUrl: string, templatePrompt: string }
 *   Returns: { analysis: ProductAnalysis, adaptedPrompt: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = body?.imageUrl as string | undefined;
    const templatePrompt = body?.templatePrompt as string | undefined;
    const manualFields = body?.manualFields as Record<string, string> | undefined;

    if (!API_KEY || !CHAINHUB_CHAT_URL) {
      return NextResponse.json({ error: "API not configured" }, { status: 500 });
    }

    // ═══ Mode 3: Manual fields (from edit form) ═══
    if (manualFields && templatePrompt) {
      console.log("[analyze-product] Manual mode — fields:", Object.keys(manualFields).join(", "));

      const manualReplaceInput = `CRITICAL: Your output must be almost IDENTICAL to the template below. You are doing a FIND-AND-REPLACE operation, NOT rewriting.

STEP 1: Copy the ENTIRE template below as-is — every single word, every line, every formatting character.
STEP 2: Find the OLD product-specific words and replace them with the NEW values from the user's fields.
STEP 3: Output the result. It should look 95%+ identical to the original template.

---TEMPLATE (copy this EXACTLY, then do find-replace)---
${templatePrompt}
---END TEMPLATE---

USER'S REPLACEMENT VALUES:
${Object.entries(manualFields).map(([key, val]) => `- ${key}: "${val}"`).join("\n")}

FIND-AND-REPLACE RULES:
- If product_name changed: find ALL mentions of the old product name → replace with new name
- If brand changed: find ALL mentions of the old brand → replace with new brand
- If ingredients changed: find ingredient words → replace with new ingredients
- If colors changed: find product-specific color words → replace with new colors
- If container changed: find container words (carton, bottle, can) → replace with new container

PRESERVATION RULES (DO NOT CHANGE THESE):
- Background description → keep EXACTLY as-is
- Lighting/camera/composition → keep EXACTLY as-is
- Visual effects (splash, floating, levitating) → keep the effect, just change what's floating
- Resolution, aspect ratio, style keywords → keep EXACTLY as-is
- ALL structural formatting → keep EXACTLY as-is

EXAMPLE:
Template: "Nestlé Chocolate Milk carton with brown chocolate splash, floating cocoa beans and chocolate pieces, dark brown gradient background"
User changes: product_name="Coca-Cola", brand="Coca-Cola", ingredients="ice cubes, lime slices", colors="red, white"
CORRECT output: "Coca-Cola can with red cola splash, floating ice cubes and lime slices, dark brown gradient background"
WRONG output: "Coca-Cola with red background and ice" (this changed background and rewrote everything)

Output the edited prompt ONLY. No explanation.`;

      let adaptedPrompt: string | null = null;
      for (const model of MODELS) {
        adaptedPrompt = await callChat(model, REPLACE_SYSTEM_PROMPT, manualReplaceInput, 4000);
        if (adaptedPrompt) {
          console.log(`[analyze-product] Manual adaptation via ${model}: OK`);
          break;
        }
      }

      if (!adaptedPrompt) {
        return NextResponse.json({ error: "Prompt adaptation failed" }, { status: 503 });
      }

      // Clean up markdown fences
      adaptedPrompt = adaptedPrompt
        .replace(/^```(?:json)?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();

      // Build a ProductAnalysis-like object from manual fields
      const analysis: ProductAnalysis = {
        name: manualFields.product_name || "Custom Product",
        category: "dish",
        cuisine: manualFields.cuisine || undefined,
        ingredients: manualFields.ingredients?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
        colors: manualFields.colors?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
        brand: manualFields.brand || undefined,
        description: `Manually edited from template`,
      };

      console.log(`[analyze-product] Manual adapted: ${adaptedPrompt.slice(0, 100)}...`);
      return NextResponse.json({ analysis, adaptedPrompt });
    }

    // ═══ Mode 1 & 2: Image-based analysis ═══
    if (!imageUrl) {
      return NextResponse.json({ error: "No imageUrl or manualFields provided" }, { status: 400 });
    }

    console.log("[analyze-product] Analyzing:", imageUrl.slice(0, 60) + "...");
    if (templatePrompt) {
      console.log("[analyze-product] Template prompt provided:", templatePrompt.slice(0, 80) + "...");
    }

    // ── Step 1: Analyze image with Vision ──
    let rawJson: string | null = null;
    for (const model of MODELS) {
      rawJson = await callChat(
        model,
        ANALYSIS_SYSTEM_PROMPT,
        [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: "Analyze this food/product image and return structured JSON." },
        ],
      );
      if (rawJson) {
        console.log(`[analyze-product] Analysis via ${model}: OK`);
        break;
      }
      console.warn(`[analyze-product] ${model} failed, trying next...`);
    }

    if (!rawJson) {
      return NextResponse.json({ error: "Vision analysis failed" }, { status: 503 });
    }

    // Parse analysis — strip markdown code fences if GPT wrapped them
    let analysis: ProductAnalysis;
    try {
      const cleanJson = rawJson
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleanJson);
      analysis = {
        name: parsed.name || "Unknown",
        category: parsed.category || "dish",
        cuisine: parsed.cuisine || undefined,
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        brand: parsed.brand || undefined,
        description: parsed.description || undefined,
      };
    } catch {
      console.error("[analyze-product] JSON parse error:", rawJson.slice(0, 300));
      return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
    }

    console.log(`[analyze-product] Detected: ${analysis.name} (${analysis.category})${analysis.brand ? ` by ${analysis.brand}` : ""}`);

    // If no template prompt, just return the analysis
    if (!templatePrompt) {
      return NextResponse.json({ analysis });
    }

    // ── Step 2: Replace product details in template ──
    const replaceInput = `Here is the TEMPLATE PROMPT that produces stunning images. Treat it as sacred — change as FEW words as possible:

---TEMPLATE START---
${templatePrompt}
---TEMPLATE END---

Here is the NEW PRODUCT to replace the original product in the template:
${JSON.stringify(analysis, null, 2)}

INSTRUCTIONS:
1. Go through the template line by line
2. Find words referencing the ORIGINAL product (name, ingredients, colors specific to the product)
3. Replace ONLY those specific words with the new product's details
4. DO NOT change: background, lighting, camera, composition, mood, effects, resolution, style
5. Keep the EXACT same prompt format and structure
6. Output the edited prompt — nothing else`;


    let adaptedPrompt: string | null = null;
    for (const model of MODELS) {
      adaptedPrompt = await callChat(model, REPLACE_SYSTEM_PROMPT, replaceInput, 2000);
      if (adaptedPrompt) {
        console.log(`[analyze-product] Adaptation via ${model}: OK`);
        break;
      }
      console.warn(`[analyze-product] Adaptation ${model} failed, trying next...`);
    }

    if (!adaptedPrompt) {
      // Fallback: return analysis without adapted prompt
      return NextResponse.json({ analysis, adaptedPrompt: null });
    }

    // Clean up: remove markdown code fences if the model wrapped it
    adaptedPrompt = adaptedPrompt
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    console.log(`[analyze-product] Adapted prompt: ${adaptedPrompt.slice(0, 100)}...`);
    return NextResponse.json({ analysis, adaptedPrompt });
  } catch (error) {
    console.error("[analyze-product] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

