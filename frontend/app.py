from flask import Flask, render_template, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

BACKEND_URL   = os.getenv("BACKEND_URL")
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt"}

def allowed_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

def mime_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return {
        ".pdf":  "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt":  "text/plain",
    }.get(ext, "application/octet-stream")


# ── Home ──────────────────────────────────────────────
# No longer fetches files here — the JS refreshFileList()
# call on page load populates the sidebar dynamically.
@app.route("/")
def home():
    return render_template("index.html")


# ── Files ─────────────────────────────────────────────
# This route is what refreshFileList() in script.js calls.
# It proxies to the FastAPI backend and returns the file list.
@app.route("/files")
def files():
    try:
        res = requests.get(f"{BACKEND_URL}/files")
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"files": [], "error": str(e)})


# ── Upload ────────────────────────────────────────────
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file selected"})

    if not allowed_file(file.filename):
        ext = os.path.splitext(file.filename)[1].lower() or "(none)"
        return jsonify({
            "error": f"'{ext}' files are not supported. Please upload PDF, DOCX, PPTX, or TXT."
        })

    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    with open(path, "rb") as f:
        resp = requests.post(
            f"{BACKEND_URL}/upload",
            files={"file": (file.filename, f, mime_type(file.filename))}
        )

    result = resp.json()
    if "error" in result:
        return jsonify({"error": result["error"]})

    return jsonify({"status": "ok"})


# ── Ask ───────────────────────────────────────────────
@app.route("/ask", methods=["POST"])
def ask():
    body           = request.json or {}
    question       = body.get("question", "")
    selected_files = body.get("selected_files", [])
    res = requests.post(
        f"{BACKEND_URL}/query",
        json={"question": question, "selected_files": selected_files}
    )
    return jsonify(res.json())


# ── Summary ───────────────────────────────────────────
@app.route("/summary", methods=["POST"])
def summary():
    body           = request.json or {}
    selected_files = body.get("selected_files", [])
    res = requests.post(
        f"{BACKEND_URL}/summary",
        json={"selected_files": selected_files}
    )
    return jsonify(res.json())


# ── Quiz ──────────────────────────────────────────────
@app.route("/quiz/start", methods=["POST"])
def quiz_start():
    body           = request.json or {}
    selected_files = body.get("selected_files", [])
    res = requests.post(
        f"{BACKEND_URL}/quiz/start",
        json={"selected_files": selected_files}
    )
    return jsonify(res.json())

@app.route("/quiz/answer", methods=["POST"])
def quiz_answer():
    body = request.json or {}
    res  = requests.post(f"{BACKEND_URL}/quiz/answer", json=body)
    return jsonify(res.json())


# ── Delete ────────────────────────────────────────────
@app.route("/delete", methods=["POST"])
def delete():
    body     = request.json or {}
    filename = body.get("filename", "").strip()
    if not filename:
        return jsonify({"error": "No filename provided"})

    try:
        res = requests.post(f"{BACKEND_URL}/delete", json={"filename": filename})
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": str(e)})


# ── Preview ───────────────────────────────────────────
@app.route("/preview/<filename>")
def preview(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


if __name__ == "__main__":
    app.run(debug=True)