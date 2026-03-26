import { NextRequest, NextResponse } from "next/server";

const CHAINHUB_CHAT_URL = process.env.CHAINHUB_GPT_URL!;
const API_KEY = process.env.BASE_API_KEY!;

/**
 * POST /api/describe
 * Nhận URL ảnh từ gallery → GPT-4o vision phân tích → trả prompt mô tả chi tiết
 * 
 * System prompt: MeiGen Blueprint Method (Visual Logic Analyst)
 */

const VISION_SYSTEM_PROMPT = `# Role
You are a Senior Visual Logic Analyst specializing in reverse-engineering imagery for AI image generation.

# Analysis Protocol (The "Blueprint" Method)
1. Technical Precision: Translate vibes into lighting and composition techniques. Use terms like "chiaroscuro," "atmospheric haze," "subsurface scattering."
2. Quantifiable & Spatial Logic: Define spatial relationships. Estimate parameters: "50mm prime lens at f/1.4."
3. Material & Sensory Physics: Not just "wet ground" but "asphalt slick with rain, reflecting distorted neon signs."
4. Cohesive Narrative: The prompt must read like a director's script.

# Subject Focus
- Person: describe face shape, eye color/shape, nose bridge, lip shape, skin tone/texture, hair color/style/length, makeup, expression, pose
- Clothing & accessories: materials, colors, patterns, textures
- Background: setting, depth, objects, atmosphere
- Lighting: direction, quality (soft/hard), color temperature, shadows
- Camera: angle, lens type, depth of field, focus
- Style: photorealistic, illustration, 3D render, etc.

# Output
Output Part 1 (Narrative Specification) as one continuous paragraph (100-200 words). Be specific and technical.
Then output Part 2 (Technical Metadata):
- Visual Style: [type]
- Key Elements: [3-5 items]
- Lighting & Color: [details]
- Composition/Camera: [details]

Output ONLY the prompt. No conversational filler.`;

const MODELS = ["gpt-4o", "gemini-3.1-flash-lite-preview", "gemini-2.0-flash"] as const;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callVisionAPI(
  model: string,
  imageUrl: string,
): Promise<{ ok: true; description: string } | { ok: false; status: number; error: string }> {
  const payload = {
    model,
    max_tokens: 600,
    messages: [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          { type: "text", text: "Analyze this image and generate a detailed prompt that could recreate it using the Blueprint Method." },
        ],
      },
    ],
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
      console.log(`[API /describe] Retry ${attempt}/${MAX_RETRIES} for ${model} after ${delayMs}ms...`);
      await sleep(delayMs);
    }

    console.log(`[API /describe] Calling ${model} vision (attempt ${attempt + 1}), imageUrl: ${imageUrl.slice(0, 60)}...`);

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
      const description: string = data?.choices?.[0]?.message?.content?.trim() || "";
      if (!description) {
        return { ok: false, status: 500, error: "No description returned from vision model" };
      }
      return { ok: true, description };
    }

    const errText = await res.text();
    console.error(`[API /describe] ${model} error (attempt ${attempt + 1}):`, res.status, errText);

    // If not retryable, bail immediately
    if (!RETRYABLE_STATUS.has(res.status)) {
      return { ok: false, status: res.status, error: `Vision API error: ${res.status}` };
    }
  }

  return { ok: false, status: 503, error: `${model} unavailable after ${MAX_RETRIES + 1} attempts` };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = body?.imageUrl as string | undefined;

    if (!imageUrl) {
      return NextResponse.json({ error: "No imageUrl provided" }, { status: 400 });
    }

    if (!API_KEY || !CHAINHUB_CHAT_URL) {
      return NextResponse.json({ error: "API not configured" }, { status: 500 });
    }

    // Try each model in order, fallback on retryable errors
    for (const model of MODELS) {
      const result = await callVisionAPI(model, imageUrl);

      if (result.ok) {
        console.log(`[API /describe] Success (${model}):`, result.description.slice(0, 80) + "...");
        return NextResponse.json({ description: result.description });
      }

      // Non-retryable error → return immediately
      if (!RETRYABLE_STATUS.has(result.status)) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      console.warn(`[API /describe] ${model} failed, trying next model...`);
    }

    return NextResponse.json({ error: "All vision models unavailable" }, { status: 503 });
  } catch (error) {
    console.error("[API /describe] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
