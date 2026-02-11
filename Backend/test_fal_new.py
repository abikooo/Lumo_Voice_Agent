"""
FAL OpenRouter VISION Endpoint Test (v4 - Correct Image)
Endpoint: openrouter/router/vision
"""
import asyncio
import httpx
import base64
import os
import json
from app.config import get_settings

settings = get_settings()

# Correct image (Math Problem)
IMG_PATH = r'C:\Users\batuh\.gemini\antigravity\brain\1ef3f5ce-1466-4030-98bd-69ffcf741541\media__1770810145500.png'
OUTPUT_FILE = r'C:\Users\batuh\Desktop\LumoAI\Backend\fal_vision_result_4.txt'

with open(IMG_PATH, "rb") as f:
    IMG_B64 = base64.b64encode(f.read()).decode("utf-8")
    DATA_URI = f"data:image/png;base64,{IMG_B64}"

async def main():
    print(f"Testing FAL Vision Endpoint with correct image: {IMG_PATH}")
    url = "https://fal.run/openrouter/router/vision"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            print(f"Sending request to {url} with image_urls list...")
            r1 = await client.post(url, headers={**settings.fal_headers, "Content-Type": "application/json"},
                json={
                    "model": "google/gemini-2.0-flash-001",
                    "prompt": "Bu görseldeki matematik sorusunu çöz. Adım adım anlat.",
                    "image_urls": [DATA_URI],
                })
            
            print(f"Status: {r1.status_code}")
            result_text = ""
            
            if r1.status_code == 200:
                print("Success! Saving response...")
                result_text = json.dumps(r1.json(), indent=2, ensure_ascii=False)
            else:
                print(f"Error! {r1.text}")
                result_text = f"Error ({r1.status_code}): {r1.text}"
            
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                f.write(result_text)
                
        except Exception as e:
            print(f"Exception: {e}")
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                f.write(f"Exception: {str(e)}")

asyncio.run(main())
