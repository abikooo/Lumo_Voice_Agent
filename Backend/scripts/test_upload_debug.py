import requests

BASE_URL = "http://127.0.0.1:8000/api"

def test_get_notes():
    print("Testing GET /notes/...")
    try:
        r = requests.get(f"{BASE_URL}/notes/")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("Response:", r.json())
        else:
            print("Error:", r.text)
    except Exception as e:
        print(f"Request failed: {e}")

def test_upload():
    print("\nTesting POST /uploads/...")
    # Create a dummy file
    with open("test.txt", "w") as f:
        f.write("This is a test note content.")
    
    try:
        files = {'file': open('test.txt', 'rb')}
        r = requests.post(f"{BASE_URL}/uploads/", files=files)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            print("Response:", r.json())
        else:
            print("Error:", r.text)
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_get_notes()
    test_upload()
