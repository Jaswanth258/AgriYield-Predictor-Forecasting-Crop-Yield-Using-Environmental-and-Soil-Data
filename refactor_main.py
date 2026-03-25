import codecs
from pathlib import Path

content = codecs.open("backend/app/main.py", "r", "utf-8").read()
parts = content.split("# ─── Endpoints ───────────────────────────────────────────────────────────────")

if len(parts) == 2:
    new_endpoints = parts[1].replace("@app.", "@api_router.")
    final_content = parts[0] + "# ─── Endpoints ───────────────────────────────────────────────────────────────\n\napi_router = APIRouter()\n" + new_endpoints
    
    final_content += """
app.include_router(api_router, prefix="/api")

frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_static(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        return FileResponse(frontend_dist / "index.html")
"""
    
    final_content = final_content.replace("from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks", 
                                        "from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, BackgroundTasks")
    
    codecs.open("backend/app/main.py", "w", "utf-8").write(final_content)
    print("Success")
else:
    print("Could not find the Endpoints marker!")
