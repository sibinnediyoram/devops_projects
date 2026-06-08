import asyncio
from contextlib import asynccontextmanager

# Added Response and status to support proper HTTP 503 on /ready
from fastapi import FastAPI, Response, status


# Fixed: replaced deprecated @app.on_event("startup") with lifespan context manager.
# Fixed: replaced blocking time.sleep() with non-blocking asyncio.sleep()
#        so the event loop is not blocked during startup.
# Added: app.is_ready flag to track startup state for the readiness probe.
@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.sleep(5)
    app.is_ready = True
    yield
    app.is_ready = False


# Fixed: lifespan passed to FastAPI instead of using on_event decorator.
app = FastAPI(lifespan=lifespan)
app.is_ready = False  # initialised False until startup completes


@app.get("/hello")
async def hello():
    # Fixed: removed unnecessary f-string prefix from "Hello!"
    return {"message": "Hello!"}


# Fixed: /ready and /alive were sharing a single handler — split into two
# separate functions with distinct semantics:
#   /ready  → readiness probe: returns 503 until app finishes startup,
#             so Kubernetes withholds traffic until the app is ready.
#   /alive  → liveness probe: always returns 200 to confirm the process
#             is running; a failure here triggers a pod restart.
@app.get("/ready")
async def ready():
    if app.is_ready:
        return {"message": "ready"}
    return Response(
        content='{"message": "not ready"}',
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        media_type="application/json",
    )


@app.get("/alive")
async def alive():
    return {"message": "alive"}
