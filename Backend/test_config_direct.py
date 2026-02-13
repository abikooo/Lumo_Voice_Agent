import asyncio
import httpx
import base64
import json
import sys
import os

# Add parrent dir to path so we can import app
sys.path.append(os.getcwd())

from app.config import get_settings

async def test_with_config():
    settings = get_settings()
    url = f"https://fal.run/{settings.TTS_STREAM_ENDPOINT}"
    
    print(f"Testing with Settings Class")
    print(f"URL: {url}")
    print(f"Key used: |{settings.FAL_KEY[:5]}...{settings.FAL_KEY[-5:]}|")
    
    headers = {
        "Authorization": f"Key {settings.FAL_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "input": "Evet, seni duyabiliyorum.",
        "voice": "ali",
        "response_format": "mp3",
        "speed": 1.0
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            print(f"Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error: {await response.read()}")
                return

            all_zeros = True
            count = 0
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:])
                    if "audio" in data:
                        b64 = data["audio"]
                        if "," in b64: b64 = b64.split(",")[1]
                        chunk = base64.b64decode(b64)
                        if any(b != 0 for b in chunk):
                            all_zeros = False
                        count += 1
            
            if all_zeros:
                print("RESULT: STILL SILENCE (Zeros)")
            else:
                print("RESULT: SUCCESS (Valid Sound)")

if __name__ == "__main__":
    asyncio.run(test_with_config())
