"""
Entry point for the FastAPI server.
Run with: python3 -m backend.api.server
"""

import uvicorn
from dotenv import load_dotenv

load_dotenv()

from backend.api.routes import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
