from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import health
from app.routers import voice
from app.routers import notes
from app.routers import history
from app.routers import uploads
from app.routers import auth
from app.database import create_db_and_tables

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="LumoAI Backend API - Voice AI Education Assistant",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "chrome-extension://*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api") # Auth first
app.include_router(health.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
    }
