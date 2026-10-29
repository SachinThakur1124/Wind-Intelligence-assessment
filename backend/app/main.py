import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("wind-intelligence")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Wind Intelligence Backend Service...")
    logger.info(f"Elexon API Base URL: {settings.ELEXON_BASE_URL}")
    logger.info(f"Default Day-Ahead Decision Cutoff: {settings.DEFAULT_CUTOFF_TIME} UTC")
    logger.info(f"CORS Allowed Origins: {settings.CORS_ORIGINS}")
    yield
    logger.info("Shutting down Wind Intelligence Backend Service...")


app = FastAPI(
    title="Wind Intelligence — UK Wind Forecast Accuracy API",
    description="High-precision analytics on day-ahead wind forecast accuracy versus actual national wind generation outturns using Elexon BMRS.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(router)


@app.get("/")
def root():
    return {
        "service": "Wind Intelligence API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
