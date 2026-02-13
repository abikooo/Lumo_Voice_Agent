import requests
import json
import os

# Ensure we are in the right directory or use absolute paths?
# We will run this from Backend/scripts/

API_URL = "http://localhost:8000/api/voice/speak-stream"

def test_tts():
    print(f"Testing TTS at {API_URL}...")
    
    payload = {
        "text": "Merhaba, bu bir ses testi denemesidir.",
        "response_format": "mp3"
    }
    
    try:
        response = requests.post(API_URL, json=payload, stream=True)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("Response headers:", response.headers)
            content_length = 0
            with open("test_output.mp3", "wb") as f:
                for chunk in response.iter_content(chunk_size=1024):
                    if chunk:
                        f.write(chunk)
                        content_length += len(chunk)
            print(f"Success! Saved test_output.mp3 ({content_length} bytes)")
        else:
            print("Error response:", response.text)
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_tts()
