"""
🧪 Tool Test Models — Kiểm tra tất cả models Image & Video
Dựa theo exam.md để gọi đúng API format cho từng model.

Chạy:
  python test_models.py                    # Test tất cả
  python test_models.py --image            # Chỉ test image
  python test_models.py --video            # Chỉ test video
  python test_models.py --video --poll     # Test video + chờ kết quả
  python test_models.py --model seedream-5 # Test model cụ thể
"""

import httpx
import yaml
import os
import json
import time
import asyncio
import argparse
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.yaml"
OUTPUT_DIR = SCRIPT_DIR / "test_results"

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

API_KEY = config["external_apis"]["api_key"]
BASE_URL = config["external_apis"]["base_url"]

# ── Sample data từ exam.md ──
# Image URLs dùng trong examples của ChainHub docs
SAMPLE_IMAGE = "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_5_imageToimage.png"
SEEDEDIT_IMAGE = "https://ark-project.tos-cn-beijing.volces.com/doc_image/seededit_i2i.jpeg"
MULTI_IMAGE_1 = "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_1.png"
MULTI_IMAGE_2 = "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_5_imagesToimage_2.png"
VIDEO_REF_1 = "https://filesystem.site/cdn/20250612/VfgB5ubjInVt8sG6rzMppxnu7gEfde.png"
VIDEO_REF_2 = "https://filesystem.site/cdn/20250612/998IGmUiM2koBGZM3UnZeImbPBNIUL.png"

# ── Terminal colors ──
G = "\033[92m"   # Green
R = "\033[91m"   # Red
Y = "\033[93m"   # Yellow
C = "\033[96m"   # Cyan
B = "\033[1m"    # Bold
D = "\033[2m"    # Dim
X = "\033[0m"    # Reset


def ts():
    return datetime.now().strftime("%H:%M:%S")

def ok(msg):   print(f"{D}[{ts()}]{X} {G}✅ {msg}{X}")
def fail(msg): print(f"{D}[{ts()}]{X} {R}❌ {msg}{X}")
def info(msg): print(f"{D}[{ts()}]{X} {C}ℹ️  {msg}{X}")
def warn(msg): print(f"{D}[{ts()}]{X} {Y}⚠️  {msg}{X}")
def header(msg):
    print(f"\n{B}{'═'*60}")
    print(f"  {msg}")
    print(f"{'═'*60}{X}\n")


# ═══════════════════════════════════════════════════════════════
# IMAGE TESTS — Exact payloads từ exam.md
# ═══════════════════════════════════════════════════════════════

async def call_api(client, method, url, **kwargs):
    """Wrapper gọi API, trả về (status_code, response_data, elapsed)"""
    start = time.time()
    try:
        if method == "POST":
            resp = await client.post(url, **kwargs)
        else:
            resp = await client.get(url, **kwargs)
        elapsed = round(time.time() - start, 2)
        try:
            data = resp.json()
        except Exception:
            data = resp.text
        return resp.status_code, data, elapsed
    except Exception as e:
        elapsed = round(time.time() - start, 2)
        return -1, str(e), elapsed


# ── Seedream 5.0/4.5/4.0 T2I ──
# exam.md: POST /v1/images/generations, JSON body
# Params: model, prompt, size("2K"), output_format("png"), watermark(false)
async def test_seedream_modern_t2i(client, model_name):
    url = f"{BASE_URL}/images/generations"
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": model_name,
        "prompt": "A cute cat sitting on a window sill, soft golden hour lighting",
        "size": "1024x1024",
        "output_format": "png",
        "watermark": False
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── Seedream 5.0/4.5/4.0 I2I ──
# exam.md: POST /v1/images/generations, JSON body
# Params: model, prompt, image(URL), size("2K"), output_format, response_format, watermark
async def test_seedream_modern_i2i(client, model_name):
    url = f"{BASE_URL}/images/generations"
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": model_name,
        "prompt": "Transform to anime style illustration with vibrant colors",
        "image": SAMPLE_IMAGE,
        "size": "1024x1024",
        "output_format": "png",
        "response_format": "url",
        "watermark": False
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── Seedream 3.0 T2I ──
# exam.md: POST /v1/images/generations, JSON body
# Params: model, prompt, response_format, size("1024x1024"), seed, guidance_scale, watermark
# KHÔNG có output_format
async def test_seedream3_t2i(client):
    url = f"{BASE_URL}/images/generations"
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "doubao-seedream-3-0-t2i-250415",
        "prompt": "A cat with fisheye lens effect, distorted facial features",
        "response_format": "url",
        "size": "1024x1024",
        "seed": 12,
        "guidance_scale": 2.5,
        "watermark": True
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── SeedEdit 3.0 I2I ──
# exam.md: POST /v1/images/generations, JSON body
# Params: model, prompt, image(URL), response_format, size("adaptive"), seed, guidance_scale, watermark
# KHÔNG có output_format
async def test_seededit3_i2i(client):
    url = f"{BASE_URL}/images/generations"
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "doubao-seededit-3-0-i2i-250628",
        "prompt": "Change bubbles into heart shapes",
        "image": SEEDEDIT_IMAGE,
        "response_format": "url",
        "size": "adaptive",
        "seed": 21,
        "guidance_scale": 5.5,
        "watermark": True
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── Grok-3 T2I ──
# exam.md: POST /v1/images/generations, JSON body
# Params: model("grok-3-image"), prompt, size("960x960")
async def test_grok3_t2i(client):
    url = f"{BASE_URL}/images/generations"
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "grok-3-image",
        "prompt": "a cute cat sitting on grass",
        "size": "960x960"
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── Grok-3 I2I (Edit) ──
# exam.md: POST /v1/images/edits, MULTIPART FORM
# Params: model("grok-3-image"), prompt, image(file upload)
async def test_grok3_i2i(client):
    url = f"{BASE_URL}/images/edits"
    headers = {"Authorization": f"Bearer {API_KEY}"}

    # Download sample image trước rồi upload dạng file
    info("  Downloading sample image for Grok edit...")
    img_status, img_data, _ = await call_api(client, "GET", SAMPLE_IMAGE)
    if img_status != 200:
        return -1, "Failed to download sample image for Grok edit", 0

    from io import BytesIO
    files = {"image": ("test.png", BytesIO(img_data if isinstance(img_data, bytes) else b""), "image/png")}
    data = {"model": "grok-3-image", "prompt": "Add a small yellow duck next to the subject"}

    # Phải dùng raw response vì img_data là bytes
    start = time.time()
    try:
        # Re-download as raw bytes
        raw_resp = await client.get(SAMPLE_IMAGE)
        files = {"image": ("test.png", BytesIO(raw_resp.content), "image/png")}
        resp = await client.post(url, headers=headers, data=data, files=files)
        elapsed = round(time.time() - start, 2)
        try:
            resp_data = resp.json()
        except Exception:
            resp_data = resp.text
        return resp.status_code, resp_data, elapsed
    except Exception as e:
        elapsed = round(time.time() - start, 2)
        return -1, str(e), elapsed


# ═══════════════════════════════════════════════════════════════
# VIDEO TESTS — Exact payloads từ exam.md
# ═══════════════════════════════════════════════════════════════

# ── Veo 3.1 Flash ──
# exam.md: POST /v1/videos, MULTIPART FORM
# Params: model, prompt, seconds, size("16x9"), watermark, input_reference(file/optional)
async def test_veo_flash(client):
    url = f"{BASE_URL}/videos"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    data = {
        "model": "veo_3_1-fast",
        "prompt": "A golden retriever running on a beach at sunset",
        "seconds": "5",
        "size": "16x9",
        "watermark": "false"
    }
    return await call_api(client, "POST", url, headers=headers, data=data)


# ── Veo 3.1 Components ──
# exam.md: POST /v1/video/create, JSON body
# Params: prompt, model, images(array of URLs), enhance_prompt, enable_upsample, aspect_ratio
async def test_veo_components(client):
    url = f"{BASE_URL}/video/create"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    payload = {
        "prompt": "The cow flies up to the sky with rainbow trail",
        "model": "veo3.1-components",
        "images": [VIDEO_REF_1, VIDEO_REF_2],
        "enhance_prompt": True,
        "enable_upsample": True,
        "aspect_ratio": "16:9"
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── Veo 3 Fast Frames ──
# exam.md: POST /v1/video/create, JSON body
# Params: prompt, model, images(array, ảnh đầu + ảnh cuối), enhance_prompt, enable_upsample, aspect_ratio
async def test_veo_fast_frames(client):
    url = f"{BASE_URL}/video/create"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    payload = {
        "prompt": "Smooth transition from scene 1 to scene 2",
        "model": "veo3-fast-frames",
        "images": [VIDEO_REF_1, VIDEO_REF_2],
        "enhance_prompt": True,
        "enable_upsample": True,
        "aspect_ratio": "16:9"
    }
    return await call_api(client, "POST", url, headers=headers, json=payload)


# ── Video Status Query ──
# exam.md: GET /v1/video/query?id={task_id}
async def poll_video(client, task_id, max_wait=180):
    url = f"{BASE_URL}/video/query"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json"
    }
    start = time.time()
    attempt = 0
    while time.time() - start < max_wait:
        attempt += 1
        status_code, data, _ = await call_api(client, "GET", url, headers=headers, params={"id": task_id})
        if status_code == 200 and isinstance(data, dict):
            status = data.get("status", "")
            info(f"  Poll #{attempt}: status={status}")
            if status in ("completed", "success", "done"):
                return "completed", data
            elif status in ("failed", "error"):
                return "failed", data
            # Nếu có video_url trực tiếp
            if data.get("video_url") or data.get("url"):
                return "completed", data
        elif status_code != 200:
            warn(f"  Poll #{attempt}: HTTP {status_code}")
        await asyncio.sleep(5)
    return "timeout", None


# ═══════════════════════════════════════════════════════════════
# TEST DEFINITIONS — Map từ config.yaml models
# ═══════════════════════════════════════════════════════════════

ALL_TESTS = [
    # ── Seedream 5.0 ──
    {"name": "Seedream 5.0 T2I", "model": "doubao-seedream-5-0-260128", "type": "t2i", "category": "image",
     "run": lambda c: test_seedream_modern_t2i(c, "doubao-seedream-5-0-260128")},
    {"name": "Seedream 5.0 I2I", "model": "doubao-seedream-5-0-260128", "type": "i2i", "category": "image",
     "run": lambda c: test_seedream_modern_i2i(c, "doubao-seedream-5-0-260128")},

    # ── Seedream 4.5 ──
    {"name": "Seedream 4.5 T2I", "model": "doubao-seedream-4-5-251128", "type": "t2i", "category": "image",
     "run": lambda c: test_seedream_modern_t2i(c, "doubao-seedream-4-5-251128")},
    {"name": "Seedream 4.5 I2I", "model": "doubao-seedream-4-5-251128", "type": "i2i", "category": "image",
     "run": lambda c: test_seedream_modern_i2i(c, "doubao-seedream-4-5-251128")},

    # ── Seedream 4.0 ──
    {"name": "Seedream 4.0 T2I", "model": "doubao-seedream-4-0-250828", "type": "t2i", "category": "image",
     "run": lambda c: test_seedream_modern_t2i(c, "doubao-seedream-4-0-250828")},
    {"name": "Seedream 4.0 I2I", "model": "doubao-seedream-4-0-250828", "type": "i2i", "category": "image",
     "run": lambda c: test_seedream_modern_i2i(c, "doubao-seedream-4-0-250828")},

    # ── Seedream 3.0 (khác params!) ──
    {"name": "Seedream 3.0 T2I", "model": "doubao-seedream-3-0-t2i-250415", "type": "t2i", "category": "image",
     "run": lambda c: test_seedream3_t2i(c)},

    # ── SeedEdit 3.0 (khác params!) ──
    {"name": "SeedEdit 3.0 I2I", "model": "doubao-seededit-3-0-i2i-250628", "type": "i2i", "category": "image",
     "run": lambda c: test_seededit3_i2i(c)},

    # ── Grok-3 ──
    {"name": "Grok-3 T2I", "model": "grok-3-image", "type": "t2i", "category": "image",
     "run": lambda c: test_grok3_t2i(c)},
    {"name": "Grok-3 I2I (Edit)", "model": "grok-3-image-edit", "type": "i2i", "category": "image",
     "run": lambda c: test_grok3_i2i(c)},

    # ── Video Models ──
    {"name": "Veo 3.1 Flash", "model": "veo_3_1-fast", "type": "video", "category": "video",
     "run": lambda c: test_veo_flash(c)},
    {"name": "Veo 3.1 Components", "model": "veo3.1-components", "type": "video", "category": "video",
     "run": lambda c: test_veo_components(c)},
    {"name": "Veo 3 Fast Frames", "model": "veo3-fast-frames", "type": "video", "category": "video",
     "run": lambda c: test_veo_fast_frames(c)},
]


def get_image_url(data):
    """Extract image URL from response"""
    if not isinstance(data, dict):
        return None
    # {"data": [{"url": "..."}]}
    if "data" in data and isinstance(data["data"], list):
        for item in data["data"]:
            if isinstance(item, dict) and "url" in item:
                return item["url"]
            if isinstance(item, dict) and "b64_json" in item:
                return "(b64 received)"
    if "url" in data:
        return data["url"]
    return None


def get_task_id(data):
    """Extract video task ID from response"""
    if not isinstance(data, dict):
        return None
    for key in ["id", "task_id", "video_id"]:
        if key in data:
            return data[key]
    return None


# ═══════════════════════════════════════════════════════════════
# MAIN RUNNER
# ═══════════════════════════════════════════════════════════════

async def run_tests(run_image, run_video, model_filter=None, poll_videos=False):
    results = []
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Filter tests
    tests = []
    for t in ALL_TESTS:
        if model_filter:
            if model_filter.lower() not in t["model"].lower() and model_filter.lower() not in t["name"].lower():
                continue
        elif t["category"] == "image" and not run_image:
            continue
        elif t["category"] == "video" and not run_video:
            continue
        tests.append(t)

    if not tests:
        fail(f"Không tìm thấy test nào khớp filter")
        return

    info(f"Sẽ chạy {len(tests)} tests\n")

    async with httpx.AsyncClient(timeout=120.0) as client:
        for i, t in enumerate(tests, 1):
            cat_icon = "🎨" if t["category"] == "image" else "🎬"
            info(f"[{i}/{len(tests)}] {cat_icon} {t['name']} ({t['model']})")

            status_code, data, elapsed = await t["run"](client)

            result = {
                "name": t["name"],
                "model": t["model"],
                "type": t["type"],
                "category": t["category"],
                "time": f"{elapsed}s",
            }

            if status_code == 200:
                if t["category"] == "image":
                    img_url = get_image_url(data)
                    url_preview = str(img_url)[:80] + "..." if img_url else "(no url)"
                    ok(f"{t['name']} — {elapsed}s — {url_preview}")
                    result["status"] = "PASS"
                    result["image_url"] = img_url
                else:
                    task_id = get_task_id(data)
                    ok(f"{t['name']} — {elapsed}s — task_id: {task_id}")
                    result["status"] = "SUBMITTED"
                    result["task_id"] = task_id

                    if poll_videos and task_id:
                        info(f"  Polling video (max 3 min)...")
                        poll_status, poll_data = await poll_video(client, task_id, max_wait=180)
                        if poll_status == "completed":
                            v_url = None
                            if poll_data:
                                v_url = poll_data.get("video_url") or poll_data.get("url")
                            ok(f"  Video done! {str(v_url)[:80]}")
                            result["status"] = "COMPLETED"
                            result["video_url"] = v_url
                        elif poll_status == "timeout":
                            warn(f"  Timeout — video still processing")
                            result["status"] = "PROCESSING"
                        else:
                            fail(f"  Video failed")
                            result["status"] = "VIDEO_FAILED"
            else:
                error_preview = str(data)[:200]
                fail(f"{t['name']} — HTTP {status_code} — {error_preview}")
                result["status"] = f"FAIL({status_code})"
                result["error"] = error_preview

            results.append(result)

            # Delay giữa các request tránh rate limit
            if i < len(tests):
                await asyncio.sleep(2)

    # ── Summary ──
    header("📊 KẾT QUẢ TỔNG HỢP")
    passed = sum(1 for r in results if r["status"] in ("PASS", "SUBMITTED", "COMPLETED"))
    failed = sum(1 for r in results if "FAIL" in r["status"])
    other = len(results) - passed - failed

    print(f"  {'#':<4} {'Model':<30} {'Type':<6} {'Status':<16} {'Time':<8}")
    print(f"  {'─'*4} {'─'*30} {'─'*6} {'─'*16} {'─'*8}")
    for i, r in enumerate(results, 1):
        s = r['status']
        if "FAIL" in s:
            color = R
        elif s in ("PASS", "COMPLETED"):
            color = G
        else:
            color = Y
        print(f"  {i:<4} {r['name']:<30} {r['type']:<6} {color}{s:<16}{X} {r['time']:<8}")

    print(f"\n  {G}✅ Passed: {passed}{X}  {R}❌ Failed: {failed}{X}  {Y}⏳ Other: {other}{X}  | Total: {len(results)}")

    # Save JSON
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = OUTPUT_DIR / f"test_{stamp}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "api_base": BASE_URL,
            "total": len(results),
            "passed": passed,
            "failed": failed,
            "results": results,
        }, f, indent=2, ensure_ascii=False)
    info(f"Results saved: {out_file}")


def main():
    parser = argparse.ArgumentParser(
        description="🧪 Test tool — Kiểm tra tất cả AI models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ví dụ:
  python test_models.py                    # Test tất cả models
  python test_models.py --image            # Chỉ test image models
  python test_models.py --video            # Chỉ test video models
  python test_models.py --video --poll     # Test video + chờ kết quả
  python test_models.py --model seedream-5 # Test model cụ thể
  python test_models.py --model grok       # Test tất cả Grok models
  python test_models.py --model veo        # Test tất cả Veo models
        """)
    parser.add_argument("--image", action="store_true", help="Chỉ test image models")
    parser.add_argument("--video", action="store_true", help="Chỉ test video models")
    parser.add_argument("--all", action="store_true", help="Test tất cả (mặc định)")
    parser.add_argument("--model", type=str, default=None, help="Lọc model (partial match)")
    parser.add_argument("--poll", action="store_true", help="Chờ video hoàn thành")

    args = parser.parse_args()

    # Mặc định test tất cả
    if not args.image and not args.video and not args.all and args.model is None:
        args.all = True

    run_image = args.all or args.image
    run_video = args.all or args.video

    header("🧪 TOOL TEST — AI Models")
    info(f"API: {BASE_URL}")
    info(f"Key: {API_KEY[:12]}...{API_KEY[-4:]}")
    info(f"Image: {run_image} | Video: {run_video} | Poll: {args.poll}")
    if args.model:
        info(f"Filter: '{args.model}'")

    asyncio.run(run_tests(run_image, run_video, args.model, args.poll))


if __name__ == "__main__":
    main()
