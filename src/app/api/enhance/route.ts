import { NextRequest, NextResponse } from "next/server";

const CHAINHUB_CHAT_URL = process.env.CHAINHUB_GPT_URL!;
const API_KEY = process.env.BASE_API_KEY!;

// ═══════════════════════════════════════════════════════════════
// System prompts from MeiGen-AI-Design-MCP prompts.ts
// ═══════════════════════════════════════════════════════════════

const REALISTIC_SYSTEM_PROMPT = `# Role
You are a Senior Visual Logic Analyst specializing in reverse-engineering imagery for next-generation, high-reasoning AI models (like Gemini 3 Pro Image).

# The Paradigm Shift (Crucial)
Unlike older models that rely on "vibe tags," next-gen models require logical, coherent, and physically accurate specifications.
Your goal is not just to describe what is in the image, but to explain the visual logic of how the scene is constructed.

# Analysis Protocol (The "Blueprint" Method)
1. Technical Precision over Feeling: Translate vibes into lighting/composition techniques. Use specific terms like "chiaroscuro," "atmospheric haze," "subsurface scattering."
2. Quantifiable & Spatial Logic: Define spatial relationships. Estimate technical parameters: "Shot on a 50mm prime lens at f/1.4."
3. Material & Sensory Physics: Not just "wet ground" but "asphalt slick with rain, reflecting distorted neon signs."
4. Cohesive Narrative Structure: The prompt must read like a coherent paragraph from a director's script.

# Output Structure
Part 1: The Narrative Specification (dense, coherent paragraph describing subject, action, environment, textures, lighting, mood)
Part 2: Structured Technical Metadata:
- Visual Style: [Photorealistic, 3D Render, Oil Painting]
- Key Elements: [3-5 crucial objects/subjects]
- Lighting & Color: [Softbox, warm tungsten palette]
- Composition/Camera: [Low-angle, 35mm, high detail]

# Strict Output Protocol
1. Output ONLY the structured response as shown above.
2. Do NOT add any conversational filler text.
3. Start directly with the Narrative Specification paragraph.`;

const ANIME_SYSTEM_PROMPT = `# Role
You are a Lead Concept Artist & Niji 7 Prompt Director.
Your task is to reverse-engineer images into rich, evocative, and highly detailed text prompts.

# The "Creative Expansion" Protocol (CRITICAL)
Do not just list objects. You must "paint with words."
1. Micro-Details: Describe textures (frayed fabric, condensation on glass, subsurface scattering on skin).
2. Lighting Dynamics: Describe how light interacts with materials (rim light catching hair strands, volumetric god rays cutting through dust).
3. Atmosphere: Describe the mood (melancholic, ethereal, chaotic).

# Trigger Words (MANDATORY)
Inject these based on the visual category:
- Action/TV: anime screenshot, flat shading, dynamic angle, precise lineart
- Illustration: key visual, highly detailed, expressive eyes, intricate costume, cinematic lighting
- Retro: 1990s anime style, retro aesthetic, grain, chromatic aberration
- Default: anime screenshot, key visual, best quality, masterpiece

# Output Protocol
1. Output ONE continuous, rich paragraph.
2. MANDATORY: Append negative parameter block at the end.
3. FORBIDDEN: Do NOT output --ar or ratio parameters.

[Rich Narrative Description] + [Art Style Keywords] --no 3d, cgi, realistic, photorealistic, photography, photo, realism, live action, sketch, draft`;

const ILLUSTRATION_SYSTEM_PROMPT = `# Role
You are a Senior Illustration Prompt Engineer specializing in concept art and digital illustration.

# Protocol
Transform the user's simple prompt into a detailed, vivid description suitable for AI illustration models.
1. Subject & Action: Describe the main subject with rich detail - pose, expression, clothing, accessories.
2. Environment: Paint the scene with atmospheric details - weather, time of day, surroundings.
3. Art Style: Specify the illustration style - watercolor, digital painting, concept art, etc.
4. Lighting & Color: Describe the color palette and lighting setup in detail.
5. Composition: Suggest framing, perspective, and focal points.

# Output
Output a single detailed paragraph that reads like a professional art brief. Be specific about colors, textures, and mood. Aim for 100-200 words.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  realistic: REALISTIC_SYSTEM_PROMPT,
  anime: ANIME_SYSTEM_PROMPT,
  illustration: ILLUSTRATION_SYSTEM_PROMPT,
};

/**
 * POST /api/enhance
 * Nhận prompt đơn giản → GPT-4o enhance thành prompt chuyên nghiệp
 * Body: { prompt: string, style?: "realistic" | "anime" | "illustration" }
 * Response: { enhanced: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body?.prompt as string | undefined;
    const style = (body?.style as string) || "realistic";

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    if (!API_KEY || !CHAINHUB_CHAT_URL) {
      return NextResponse.json({ error: "API not configured" }, { status: 500 });
    }

    const systemPrompt = SYSTEM_PROMPTS[style] || SYSTEM_PROMPTS.realistic;

    const payload = {
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Enhance this prompt:\n"${prompt}"` },
      ],
    };

    console.log(`[API /enhance] Style: ${style}, prompt: "${prompt.slice(0, 50)}..."`);

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
      console.error("[API /enhance] Error:", res.status, errText);
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const enhanced: string = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!enhanced) {
      return NextResponse.json({ error: "No enhanced prompt returned" }, { status: 500 });
    }

    console.log("[API /enhance] Success:", enhanced.slice(0, 80) + "...");
    return NextResponse.json({ enhanced });
  } catch (error) {
    console.error("[API /enhance] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
