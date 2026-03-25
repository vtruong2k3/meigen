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

    const payload = {
      model: "gpt-4o",
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

    console.log("[API /describe] Calling GPT-4o vision, imageUrl:", imageUrl.slice(0, 60) + "...");

    const res = await fetch(CHAINHUB_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[API /describe] Vision API error:", res.status, errText);
      return NextResponse.json({ error: `Vision API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const description: string = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!description) {
      return NextResponse.json({ error: "No description returned from GPT-4o" }, { status: 500 });
    }

    console.log("[API /describe] Success:", description.slice(0, 80) + "...");
    return NextResponse.json({ description });
  } catch (error) {
    console.error("[API /describe] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
