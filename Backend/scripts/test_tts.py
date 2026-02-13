"""FAL OpenRouter: prompt formatında image gönderebilir miyiz?"""
import asyncio
import httpx
from app.config import get_settings

settings = get_settings()

TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

async def main():
    url = settings.fal_llm_url
    results = []
    
    # Test 1: prompt + image alanı ile
    async with httpx.AsyncClient(timeout=30.0) as client:
        r1 = await client.post(url, headers={**settings.fal_headers, "Content-Type": "application/json"},
            json={
                "model": "google/gemini-2.0-flash-001",
                "prompt": "Bu görselde ne var? Kısa cevap ver.",
                "system_prompt": "Görseli analiz et.",
                "image_url": f"data:image/png;base64,{TINY_PNG_B64}",
                "max_tokens": 100,
            })
        results.append(f"TEST 1 (prompt + image_url field):\nStatus: {r1.status_code}\n{r1.text[:500]}\n")
    
    # Test 2: prompt + images array ile
    async with httpx.AsyncClient(timeout=30.0) as client:
        r2 = await client.post(url, headers={**settings.fal_headers, "Content-Type": "application/json"},
            json={
                "model": "google/gemini-2.0-flash-001",
                "prompt": "Bu görselde ne var? Kısa cevap ver.",
                "system_prompt": "Görseli analiz et.",
                "images": [f"data:image/png;base64,{TINY_PNG_B64}"],
                "max_tokens": 100,
            })
        results.append(f"TEST 2 (prompt + images array):\nStatus: {r2.status_code}\n{r2.text[:500]}\n")
    
    # Test 3: prompt içine base64 göm
    async with httpx.AsyncClient(timeout=30.0) as client:
        r3 = await client.post(url, headers={**settings.fal_headers, "Content-Type": "application/json"},
            json={
                "model": "google/gemini-2.0-flash-001",
                "prompt": f"[img]data:image/png;base64,{TINY_PNG_B64}[/img]\nBu görselde ne var?",
                "system_prompt": "Görseli analiz et.",
                "max_tokens": 100,
            })
        results.append(f"TEST 3 (inline base64 in prompt):\nStatus: {r3.status_code}\n{r3.text[:500]}\n")
    
    # Test 4: prompt + input_images (FAL specific)
    async with httpx.AsyncClient(timeout=30.0) as client:
        r4 = await client.post(url, headers={**settings.fal_headers, "Content-Type": "application/json"},
            json={
                "model": "google/-2.0-flash-001",
                "prompt": "Bu görselde ne var? Kısa cevap ver.",
                "system_prompt": "Görseli analiz et.",
                "input_images": [{"url": f"data:image/png;base64,{TINY_PNG_B64}"}],
                "max_tokens": 100,
            })
        results.append(f"TEST 4 (prompt + input_images):\nStatus: {r4.status_code}\n{r4.text[:500]}\n")
    
    with open("vision_test_results.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(results))
    print("Done! Check vision_test_results.txt")

asyncio.run(main())
