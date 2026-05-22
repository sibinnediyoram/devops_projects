import string
import random
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="URL Shortener")

url_to_code: dict[str, str] = {}
code_to_url: dict[str, str] = {}


class ShortenRequest(BaseModel):
    url: HttpUrl


class ShortenResponse(BaseModel):
    short_code: str
    short_url: str


def _generate_code() -> str:
    while True:
        code = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        if code not in code_to_url:
            return code


@app.post("/shorten", response_model=ShortenResponse)
def shorten(request: ShortenRequest):
    long_url = str(request.url)
    if long_url in url_to_code:
        code = url_to_code[long_url]
    else:
        code = _generate_code()
        url_to_code[long_url] = code
        code_to_url[code] = long_url
    return ShortenResponse(short_code=code, short_url=f"http://localhost:8000/{code}")


@app.get("/{short_code}")
def redirect(short_code: str):
    long_url = code_to_url.get(short_code)
    if not long_url:
        raise HTTPException(status_code=404, detail="Short URL not found")
    return RedirectResponse(url=long_url)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
