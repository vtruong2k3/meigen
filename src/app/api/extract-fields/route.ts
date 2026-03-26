import { NextRequest, NextResponse } from "next/server";

const CHAINHUB_CHAT_URL = process.env.CHAINHUB_GPT_URL!;
const API_KEY = process.env.BASE_API_KEY!;
const MODEL = "gpt-4o";

const EXTRACT_SYSTEM_PROMPT = `# Role
You are a Prompt Analyst. You analyze AI image generation prompts and extract EDITABLE FIELDS — the parts a user could realistically change to create a different product/scene while keeping the same visual style.

# Task
Given a template prompt, identify 4-8 key editable fields. Focus on PRODUCT-SPECIFIC details, NOT style/lighting/camera settings.

# Fields to extract:
1. **product_name** — The main dish/drink/product name (ALWAYS include this)
2. **ingredients** — Key ingredients, toppings, or components visible in the scene
3. **colors** — Product-specific colors (NOT background/lighting colors)
4. **brand** — Brand name if mentioned (skip if not relevant)
5. **cuisine** — Cuisine type or origin
6. **garnish** — Decorative elements related to the product
7. **container** — Plate, cup, bowl, packaging type
8. **background_elements** — Floating/surrounding elements related to the product

# Rules
- Extract the CURRENT VALUE from the template for each field
- For "list" type fields (ingredients, colors, garnish), join items with ", "
- Only include fields that are actually present or implied in the prompt
- DO NOT extract style/lighting/camera/composition fields — those must stay fixed

# Output
Output ONLY valid JSON array. No markdown, no filler. Example:
[
  {"field":"product_name","label":"Product Name","value":"Chicken Biryani","type":"text","placeholder":"e.g. Pho bo, Pizza Margherita"},
  {"field":"ingredients","label":"Ingredients","value":"basmati rice, chicken, cardamom, cloves","type":"list","placeholder":"e.g. noodles, beef, herbs"},
  {"field":"colors","label":"Product Colors","value":"golden, brown, green","type":"list","placeholder":"e.g. red, white, brown"},
  {"field":"cuisine","label":"Cuisine","value":"Indian","type":"text","placeholder":"e.g. Vietnamese, Italian"},
  {"field":"container","label":"Container/Plate","value":"ceramic plate","type":"text","placeholder":"e.g. bowl, wooden board"}
]`;

export async function POST(request: NextRequest) {
  try {
    const { templatePrompt } = await request.json();

    if (!templatePrompt) {
      return NextResponse.json({ error: "No templatePrompt provided" }, { status: 400 });
    }

    if (!API_KEY || !CHAINHUB_CHAT_URL) {
      return NextResponse.json({ error: "API not configured" }, { status: 500 });
    }

    console.log("[extract-fields] Analyzing template:", templatePrompt.slice(0, 80) + "...");

    const res = await fetch(CHAINHUB_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        messages: [
          { role: "system", content: EXTRACT_SYSTEM_PROMPT },
          { role: "user", content: `Analyze this template prompt and extract editable fields:\n\n${templatePrompt}` },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[extract-fields] API error:", res.status);
      return NextResponse.json({ error: "AI analysis failed" }, { status: res.status });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    // Strip markdown code fences
    const cleanJson = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const fields = JSON.parse(cleanJson);
    console.log("[extract-fields] Extracted", fields.length, "fields");
    return NextResponse.json({ fields });
  } catch (error) {
    console.error("[extract-fields] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
