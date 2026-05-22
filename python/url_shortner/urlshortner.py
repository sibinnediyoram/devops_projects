import secrets
import string

# In-memory store: short_code -> original_url
_store = {}

ALPHABET = string.ascii_lowercase + string.digits
CODE_LENGTH = 6
BASE = "http://localhost:5000"

def generate_code() -> str:
    """Generate a unique 6-character alphanumeric short code."""
    while True:
        code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
        if code not in _store:
            return code


def shorten(long_url: str) -> str:
    """Replace everything after the first '/' (post-domain) with a short code."""
    code = generate_code()
    _store[code] = long_url
    return f"{BASE}/{code}"


def get_original(short_url: str) -> str:
    """Return the original URL for a given short URL."""
    code = short_url.split("/")[-1]
    if code not in _store:
        raise KeyError(f"No URL found for code: '{code}'")
    return _store[code]


# --- Demo ---
if __name__ == "__main__":
    long = input("Enter a long URL: ")
    short = shorten(long)
    original = get_original(short)

    print(f"Original : {long}")
    print(f"Shortened: {short}")
    print(f"Resolved : {original}")