import { SEEDREAM_MODEL_NAMES, SEEDREAM_V3_MODEL_NAMES } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

// Legacy ChainHub API (old polling-based endpoint)
const CHAINHUB_API_URL = process.env.CHAINHUB_API!!;
const CHAINHUB_API_KEY = process.env.CHAINHUB_API_KEY!!;

// New Seedream API (synchronous endpoint)
const BASE_API_URL = process.env.BASE_API!!;
const BASE_API_KEY = process.env.BASE_API_KEY!!;

/** Convert uploaded File to base64 data URI */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = file.type || "image/png";
  return `data:${mimeType};base64,${base64}`;
}

/** Upload image File to tmpfiles.org and return a temporary URL.
 *  Sora API does NOT support base64 for I2I — only image URLs work.
 *  tmpfiles.org provides free temporary file hosting (files expire after ~60 min).
 */
async function uploadToTempUrl(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`tmpfiles.org upload failed: ${res.status}`);
  }

  const json = await res.json();
  // tmpfiles.org returns { data: { url: "https://tmpfiles.org/12345/image.jpg" } }
  // We need to convert to direct download URL: "https://tmpfiles.org/dl/12345/image.jpg"
  const pageUrl: string = json.data?.url;
  if (!pageUrl) throw new Error("No URL from tmpfiles.org");

  const directUrl = pageUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
  console.log(`[API /generate] Uploaded to temp URL: ${directUrl} (${(file.size / 1024).toFixed(0)} KB)`);
  return directUrl;
}

/** Map pixel dimensions to Seedream size string */
function toSeedreamSize(width: number, height: number): string {
  if (width >= 2048 || height >= 2048) return "2K";
  return `${width}x${height}`;
}

/** Fetch with retry for 500/503 errors */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delay = 3000,
  timeoutMs = 120_000,
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      // Retry on 500/503 (server-side transient errors)
      if ((response.status === 500 || response.status === 503) && i < retries) {
        const errPreview = await response.text().catch(() => "");
        console.log(`[API /generate] Got ${response.status}, retrying in ${delay}ms... (attempt ${i + 2}/${retries + 1}) error: ${errPreview.slice(0, 200)}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (i < retries) {
        console.log(`[API /generate] Fetch error (attempt ${i + 1}/${retries + 1}): ${err instanceof Error ? err.message : err}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  // Should not reach here, but just in case
  return fetch(url, options);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const model = formData.get("model") as string | null;
    const width = parseInt(formData.get("width") as string) || 1024;
    const height = parseInt(formData.get("height") as string) || 1024;
    const quality = formData.get("quality") as string;
    const orientation = formData.get("orientation") as string;
    const image = formData.get("image") as File | null;
    const image_2 = formData.get("image_2") as File | null;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // ── Seedream models → new synchronous JSON API ──
    if (model && SEEDREAM_MODEL_NAMES.includes(model)) {
      if (!BASE_API_KEY) {
        return NextResponse.json({ error: "Seedream API key not configured" }, { status: 500 });
      }

      const isV3 = SEEDREAM_V3_MODEL_NAMES.includes(model);
      const isEdit = model === "doubao-seededit-3-0-i2i-250628";
      const isSoraImage = model === "sora_image";

      // Build JSON payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        model,
        prompt,
      };

      if (isSoraImage) {
        // Sora Image: only supports 3 fixed sizes: 1024x1024, 1024x1536, 1536x1024
        // Frontend (ASPECT_TO_SIZE) already sends correct dimensions, but validate as safety net
        const validSoraSizes = ["1024x1024", "1024x1536", "1536x1024"];
        const requestedSize = `${width}x${height}`;

        if (validSoraSizes.includes(requestedSize)) {
          payload.size = requestedSize;
        } else {
          // Fallback: map by orientation
          if (height > width) payload.size = "1024x1536";
          else if (width > height) payload.size = "1536x1024";
          else payload.size = "1024x1024";
          console.warn(`[API /generate] Sora: unsupported size ${requestedSize}, mapped to ${payload.size}`);
        }

        payload.n = 1;
        if (image) {
          // Sora does NOT support base64 for I2I — only URLs work.
          // Upload to temp hosting, get URL, send that instead.
          try {
            payload.image = await uploadToTempUrl(image);
          } catch (uploadErr) {
            console.error("[API /generate] Sora temp upload failed, falling back to base64:", uploadErr);
            payload.image = await fileToBase64(image);
          }
        }
        console.log(`[API /generate] Sora payload: model=${model}, size=${payload.size}, hasImage=${!!image}, imageType=${payload.image ? (payload.image.startsWith("http") ? "URL" : "base64") : 'none'}`);
      } else {
        // Seedream family models
        payload.response_format = "url";
        payload.watermark = isV3 ? true : false;

        // Size
        if (isEdit) {
          payload.size = "adaptive";
        } else if (isV3) {
          if (height > width) {
            payload.size = "1024x1536";
          } else if (width > height) {
            payload.size = "1536x1024";
          } else {
            payload.size = "1024x1024";
          }
        } else {
          payload.size = toSeedreamSize(width, height);
          payload.output_format = "png";
        }

        // V3-specific params
        if (isV3) {
          payload.guidance_scale = isEdit ? 5.5 : 2.5;
          payload.seed = -1;
        }

        // Image(s) for I2I — upload to temp URL (more reliable than base64)
        if (image && image_2) {
          try {
            const [url_1, url_2] = await Promise.all([uploadToTempUrl(image), uploadToTempUrl(image_2)]);
            payload.image = [url_1, url_2];
          } catch {
            console.warn("[API /generate] Temp upload failed, falling back to base64");
            const [b64_1, b64_2] = await Promise.all([fileToBase64(image), fileToBase64(image_2)]);
            payload.image = [b64_1, b64_2];
          }
        } else if (image) {
          try {
            payload.image = await uploadToTempUrl(image);
          } catch {
            console.warn("[API /generate] Temp upload failed, falling back to base64");
            payload.image = await fileToBase64(image);
          }
        }
      }

      // Log payload (truncate prompt and image for readability)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logPayload: Record<string, any> = { ...payload, prompt: prompt.slice(0, 80) + (prompt.length > 80 ? "..." : "") };
      if (logPayload.image && typeof logPayload.image === "string" && logPayload.image.startsWith("data:")) {
        logPayload.image = `[base64 ${(logPayload.image.length / 1024).toFixed(0)}KB]`;
      }
      console.log(`[API /generate] Sending ${model} payload:`, JSON.stringify(logPayload));

      // Sora: use 3 retries with 5s delay (more tolerant of transient 500 errors)
      const retries = isSoraImage ? 3 : 2;
      const retryDelay = isSoraImage ? 5000 : 3000;

      const response = await fetchWithRetry(BASE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BASE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, retries, retryDelay);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[API /generate] API error:", response.status, errorText);
        return NextResponse.json(
          { error: `API error: ${response.status} - ${errorText}` },
          { status: response.status }
        );
      }

      // Seedream returns {data: [{url: "..."}]} directly
      const data = await response.json();
      return NextResponse.json(data);
    }

    // ── Legacy ChainHub models → old FormData + polling API ──
    if (!CHAINHUB_API_KEY) {
      return NextResponse.json({ error: "ChainHub API key not configured" }, { status: 500 });
    }

    const apiFormData = new FormData();
    apiFormData.append("prompt", prompt);
    apiFormData.append("width", width.toString());
    apiFormData.append("height", height.toString());
    apiFormData.append("quality", quality || "sd");
    apiFormData.append("orientation", orientation || "portrait");

    if (image) apiFormData.append("image", image);
    if (image_2) apiFormData.append("image_2", image_2);

    const response = await fetch(CHAINHUB_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${CHAINHUB_API_KEY}` },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API /generate] ChainHub error:", response.status, errorText);
      return NextResponse.json(
        { error: `ChainHub API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
