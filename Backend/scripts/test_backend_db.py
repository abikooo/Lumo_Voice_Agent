import httpx
import asyncio

BASE_URL = "http://localhost:8000/api"

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Create Note
        print("Creating Note...")
        r = await client.post(f"{BASE_URL}/notes/", json={
            "title": "Test Note",
            "content": "This is a test note from script.",
            "color": "#F6E05E",
            "tags": "test,script"
        })
        print(f"Create Note Status: {r.status_code}")
        if r.status_code == 200:
            print(f"Note: {r.json()}")
        else:
            print(f"Error: {r.text}")

        # 2. List Notes
        print("\nListing Notes...")
        r = await client.get(f"{BASE_URL}/notes/")
        print(f"List Notes Status: {r.status_code}")
        print(f"Notes: {r.json()}")

        # 3. List History
        print("\nListing History...")
        r = await client.get(f"{BASE_URL}/history/sessions")
        print(f"History Status: {r.status_code}")
        print(f"Sessions: {r.json()}")

if __name__ == "__main__":
    asyncio.run(main())
