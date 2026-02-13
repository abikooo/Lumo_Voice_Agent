import asyncio
import os
import httpx
import json
from dotenv import load_dotenv

load_dotenv()

FAL_KEY = os.getenv("FAL_KEY")
# Adding /generate for non-streaming
URL = "https://fal.run/freya-mypsdi253hbk/freya-tts/generate" 

async def test_fal_url():
    print(f"Testing Fal.ai Non-Streaming: {URL}")
    
    headers = {
        "Authorization": f"Key {FAL_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "input": "Bu bir URL bazlı ses testidir.",
        "voice": "ali",
        "response_format": "mp3"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(URL, headers=headers, json=payload)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response JSON: {json.dumps(data, indent=2)}")
                if "audio" in data and "url" in data["audio"]:
                    print(f"SUCCESS! Audio URL: {data['audio']['url']}")
                else:
                    print("FAILURE: No audio URL in response")
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_fal_url())
