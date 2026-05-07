# 🎓 Student Assistant

A web-based AI-powered student assistant application built with a Python/Flask backend and a simple HTML/CSS/JS frontend. It allows students to upload documents and interact with an intelligent assistant.

---

## 📁 Project Structure

```
student-assistent/
├── backend/
│   ├── main.py               # Flask application entry point
│   ├── .env                  # Backend environment variables (not committed)
│   ├── requirements.txt      # Python dependencies
│   └── uploads/              # Uploaded files storage (not committed)
│
├── frontend/
│   ├── static/
│   │   ├── script.js         # Frontend JavaScript
│   │   └── style.css         # Styling
│   ├── templates/
│   │   └── index.html        # Main HTML page
│   └── uploads/              # Frontend upload handling (not committed)
│
├── venv/                     # Python virtual environment (not committed)
├── app.py                    # Main app runner
├── requirements.txt          # Project dependencies
└── .gitignore                # Git ignore rules
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.14+
- pip

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/532003Bhuvan/Student-Assistent.git
   cd student-assistent
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv

   # On Windows
   venv\Scripts\activate

   # On Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**

   Create a `.env` file in the `backend/` folder:
   ```env
   API_KEY=your_api_key_here
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

6. Open your browser and go to `http://localhost:5000`

---

## 🛠️ Tech Stack

| Layer    | Technology        |
|----------|-------------------|
| Backend  | Python, Flask     |
| Frontend | HTML, CSS, JavaScript |
| AI/LLM   | (groq)   |

---

## 📄 Features

- 📤 Upload documents (PDFs, DOCX)
- 🤖 AI-powered question answering
- 💬 Interactive chat interface
- 📚 Student-focused assistant

---

## ⚙️ Environment Variables

| Variable  | Description              |
|-----------|--------------------------|
| `API_KEY` | Your AI provider API key |

> ⚠️ Never commit your `.env` file. It is already added to `.gitignore`.

---

## 📝 License

This project is for educational purposes.
