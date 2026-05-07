/* ─────────────────────────────────────
   addMessage
───────────────────────────────────── */
function addMessage(text, type, isHTML = false) {
    const messages = document.getElementById("messages");
    const empty    = document.getElementById("emptyState");
    if (empty) empty.remove();

    if (type === "user") {
        const div = document.createElement("div");
        div.className   = "user";
        div.textContent = text;
        messages.appendChild(div);
    } else {
        const row    = document.createElement("div");
        row.className = "bot";

        const avatar       = document.createElement("div");
        avatar.className   = "bot-avatar";
        avatar.textContent = "🧠";

        const bubble     = document.createElement("div");
        bubble.className = "bot-bubble";

        if (isHTML) {
            bubble.innerHTML = text;
        } else {
            bubble.classList.add("typing-cursor");
            typingEffect(bubble, text, () => bubble.classList.remove("typing-cursor"));
        }

        row.appendChild(avatar);
        row.appendChild(bubble);
        messages.appendChild(row);
    }
    messages.scrollTop = messages.scrollHeight;
}

/* ─────────────────────────────────────
   typingEffect
───────────────────────────────────── */
function typingEffect(element, text, onDone) {
    let i = 0, accumulated = "";
    const messages = document.getElementById("messages");
    const interval = setInterval(() => {
        accumulated += text[i];
        element.textContent = accumulated;
        i++;
        messages.scrollTop = messages.scrollHeight;
        if (i >= text.length) {
            clearInterval(interval);
            if (onDone) onDone();
        }
    }, 14);
}

/* ─────────────────────────────────────
   File icon helper
───────────────────────────────────── */
function getFileIcon(filename) {
    const ext   = filename.split(".").pop().toLowerCase();
    const icons = { pdf: "📄", docx: "📝", pptx: "📊", txt: "📃" };
    return icons[ext] || "📄";
}

/* ─────────────────────────────────────
   Upload
───────────────────────────────────── */
function showFileSelected() {
    const fileInput   = document.getElementById("fileInput");
    const fileName    = document.getElementById("fileName");
    const errorBanner = document.getElementById("uploadError");

    errorBanner.style.display = "none";
    errorBanner.textContent   = "";

    const allowed = ["pdf", "docx", "pptx", "txt"];
    const files   = Array.from(fileInput.files);

    if (files.length === 0) {
        fileName.style.display = "none";
        return;
    }

    const invalid = files.filter(f => {
        const ext = f.name.split(".").pop().toLowerCase();
        return !allowed.includes(ext);
    });

    if (invalid.length > 0) {
        errorBanner.textContent   = `❌ Unsupported: ${invalid.map(f => f.name).join(", ")}. Only PDF, DOCX, PPTX, TXT allowed.`;
        errorBanner.style.display = "block";
        fileName.style.display    = "none";
        fileInput.value           = "";
        return;
    }

    fileName.innerHTML     = files.map(f =>
        `<span>${getFileIcon(f.name)} ${escapeHTML(f.name)}</span>`
    ).join("");
    fileName.style.display = "flex";
}

function uploadFile() {
    const fileInput   = document.getElementById("fileInput");
    const errorBanner = document.getElementById("uploadError");

    if (fileInput.files.length === 0) {
        alert("Please select a file first.");
        return;
    }
    if (errorBanner.style.display === "block") return;

    const btn  = document.getElementById("uploadBtn");
    btn.textContent = "⏳  Uploading…";
    btn.disabled    = true;

    const files    = Array.from(fileInput.files);
    let   pending  = files.length;
    let   anyError = false;

    files.forEach(file => {
        const form = new FormData();
        form.append("file", file);

        fetch("/upload", { method: "POST", body: form })
            .then(r => r.json())
            .then(d => {
                if (d.error) {
                    anyError = true;
                    addMessage(`❌ Failed to upload <strong>${escapeHTML(file.name)}</strong>: ${escapeHTML(d.error)}`, "bot", true);
                } else {
                    addMessage(`✅ <strong>${escapeHTML(file.name)}</strong> uploaded successfully!`, "bot", true);
                }
            })
            .catch(err => {
                anyError = true;
                addMessage(`❌ Upload error for <strong>${escapeHTML(file.name)}</strong>: ${escapeHTML(err.message)}`, "bot", true);
            })
            .finally(() => {
                pending--;
                if (pending === 0) {
                    btn.textContent = "↑  Upload to StudyAI";
                    btn.disabled    = false;

                    // ── FIX: refresh sidebar only — NO page reload ──
                    // location.reload() was wiping the entire chat.
                    // refreshFileList() rebuilds only the file list in
                    // the sidebar so the chat and quiz state are preserved.
                    if (!anyError) {
                        setTimeout(() => refreshFileList(), 1200);
                    }
                }
            });
    });
}

/* ─────────────────────────────────────
   Refresh file list without page reload
   Fetches /files and rebuilds the sidebar
   checkbox list — chat is never touched.
───────────────────────────────────── */
function refreshFileList() {
    fetch("/files")
        .then(r => r.json())
        .then(data => {
            const fileList = document.getElementById("fileList");
            if (!fileList) return;

            // Remember which files were already checked
            const previouslyChecked = new Set(
                Array.from(document.querySelectorAll(".file-checkbox:checked"))
                     .map(cb => cb.value)
            );

            // Rebuild the list
            fileList.innerHTML = "";

            (data.files || []).forEach((fname, idx) => {
                const container = document.createElement("div");
                container.className = "file-item-container";

                const checkbox       = document.createElement("input");
                checkbox.type        = "checkbox";
                checkbox.className   = "file-checkbox";
                checkbox.value       = fname;
                // Keep previously checked files checked;
                // auto-check the last (newly added) file
                checkbox.checked     = previouslyChecked.has(fname) ||
                                       idx === (data.files.length - 1);
                checkbox.onchange    = updateSelectedFiles;

                const label         = document.createElement("span");
                label.className     = "file-item";
                label.onclick       = () => previewFile(fname);
                label.innerHTML     = `${getFileIcon(fname)} ${escapeHTML(fname)}`;

                const delBtn        = document.createElement("button");
                delBtn.className    = "file-delete-btn";
                delBtn.title        = "Delete file";
                delBtn.textContent  = "🗑";
                delBtn.onclick      = (e) => {
                    e.stopPropagation();
                    if (delBtn.disabled) return;
                    delBtn.disabled   = true;
                    delBtn.textContent = "⏳";
                    deleteFile(fname);
                };

                container.appendChild(checkbox);
                container.appendChild(label);
                container.appendChild(delBtn);
                fileList.appendChild(container);
            });

            updateSelectedFiles();

            // Clear the filename preview and file input
            const fileName  = document.getElementById("fileName");
            const fileInput = document.getElementById("fileInput");
            if (fileName)  fileName.style.display = "none";
            if (fileInput) fileInput.value         = "";
        })
        .catch(err => {
            console.error("[refreshFileList] error:", err);
            addMessage("⚠️ Could not refresh file list. Please reload the page.", "bot");
        });
}

/* ─────────────────────────────────────
   Delete a file
───────────────────────────────────── */
const _deletingFiles = new Set();   // guard against double-calls

function deleteFile(fname) {
    if (_deletingFiles.has(fname)) return;   // already in progress

    if (!confirm(`Delete "${fname}"?\nThis cannot be undone.`)) {
        // Re-enable the button if user cancels
        const btns = document.querySelectorAll(".file-delete-btn");
        btns.forEach(b => { b.disabled = false; b.textContent = "🗑"; });
        return;
    }

    _deletingFiles.add(fname);

    fetch("/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ filename: fname })
    })
    .then(r => r.json())
    .then(d => {
        if (d.error) {
            addMessage(`❌ Could not delete <strong>${escapeHTML(fname)}</strong>: ${escapeHTML(d.error)}`, "bot", true);
        } else {
            addMessage(`🗑 <strong>${escapeHTML(fname)}</strong> deleted.`, "bot", true);
            refreshFileList();
        }
    })
    .catch(err => addMessage("❌ Delete error: " + err.message, "bot"))
    .finally(() => _deletingFiles.delete(fname));
}

/* ─────────────────────────────────────
   Ask
───────────────────────────────────── */
function askQuestion() {
    const input = document.getElementById("question");
    const q     = input.value.trim();
    if (!q) return;

    addMessage(q, "user");
    input.value = "";

    const thinkingRow       = document.createElement("div");
    thinkingRow.className   = "bot";
    thinkingRow.id          = "thinking";
    thinkingRow.innerHTML   = `
        <div class="bot-avatar">🧠</div>
        <div class="bot-bubble" style="color:var(--text-muted);font-style:italic;">
            Thinking…
        </div>`;
    document.getElementById("messages").appendChild(thinkingRow);
    document.getElementById("messages").scrollTop = 99999;

    fetch("/ask", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q, selected_files: getSelectedFiles() })
    })
    .then(r => r.json())
    .then(d => {
        document.getElementById("thinking")?.remove();
        addMessage(d.answer || d.error || "No response", "bot");
    })
    .catch(err => {
        document.getElementById("thinking")?.remove();
        addMessage("❌ Error: " + err.message, "bot");
    });
}

/* ─────────────────────────────────────
   Summary
───────────────────────────────────── */
function getSummary() {
    const selected = getSelectedFiles();
    addMessage(
        selected.length
            ? `📋 Summarising: <strong>${selected.map(escapeHTML).join(", ")}</strong>…`
            : "📋 Summarising all your documents…",
        "bot", true
    );

    fetch("/summary", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ selected_files: selected })
    })
    .then(r => r.json())
    .then(d => {
        const raw       = d.summary || d.error || "No summary available.";
        const formatted = raw
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/###\s?(.+)/g,    "<h4>$1</h4>")
            .replace(/\n/g,            "<br>");
        addMessage(formatted, "bot", true);
    })
    .catch(err => addMessage("❌ Error: " + err.message, "bot"));
}

/* ─────────────────────────────────────
   Quiz
───────────────────────────────────── */
let quizState = { sessionId: null, answered: false, selectedFiles: [] };

function getQuiz() {
    quizState.selectedFiles = getSelectedFiles();
    quizState.answered      = false;
    quizState.sessionId     = null;

    if (!quizState.selectedFiles.length) {
        addMessage("⚠️ Please tick at least one document in the sidebar before starting a quiz.", "bot");
        return;
    }

    addMessage(
        `🎯 Generating 10 questions for: <strong>${quizState.selectedFiles.map(escapeHTML).join(", ")}</strong>…`,
        "bot", true
    );

    fetch("/quiz/start", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ selected_files: quizState.selectedFiles })
    })
    .then(r => r.json())
    .then(d => {
        if (d.error) { addMessage("❌ " + d.error, "bot"); return; }
        quizState.sessionId = d.session_id;
        quizState.answered  = false;
        setTimeout(() => renderQuizQuestion(d), 100);
    })
    .catch(err => addMessage("❌ Error: " + err.message, "bot"));
}

function renderQuizQuestion(data) {
    addMessage(buildQuizHTML(data), "bot", true);
    attachQuizListeners(data.question_number, quizState.sessionId);
}

function buildQuizHTML(data) {
    const letters     = ["A", "B", "C", "D"];
    const optionsHTML = data.options.map((opt, i) => `
        <button class="quiz-opt-btn"
                data-answer="${escapeAttr(opt)}"
                data-qnum="${data.question_number}"
                data-session="${quizState.sessionId}">
            <span class="quiz-opt-key">${letters[i]}</span>
            ${escapeHTML(opt)}
        </button>`).join("");

    return `
        <div class="quiz-card">
            <div class="quiz-header">
                <span class="quiz-progress-text">Question ${data.question_number} / ${data.total_questions}</span>
                ${data.current_score !== undefined
                    ? `<span class="quiz-score-badge">Score: ${data.current_score}</span>`
                    : ""}
            </div>
            <div class="quiz-body">
                <div class="quiz-question">${escapeHTML(data.question)}</div>
                <div class="quiz-options" id="quizOpts_${quizState.sessionId}_${data.question_number}">
                    ${optionsHTML}
                </div>
            </div>
        </div>`;
}

function attachQuizListeners(qNum, sessionId) {
    setTimeout(() => {
        const container = document.getElementById(`quizOpts_${sessionId}_${qNum}`);
        if (!container) return;
        const buttons = container.querySelectorAll(".quiz-opt-btn");
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                if (quizState.answered || btn.dataset.session !== sessionId) return;
                quizState.answered = true;
                buttons.forEach(b => {
                    b.disabled            = true;
                    b.style.opacity       = "0.55";
                    b.style.cursor        = "default";
                    b.style.pointerEvents = "none";
                });
                btn.style.opacity       = "1";
                btn.style.borderColor   = "var(--accent2)";
                btn.style.pointerEvents = "auto";
                submitQuizAnswer(btn.dataset.answer);
            });
        });
    }, 80);
}

function submitQuizAnswer(answer) {
    fetch("/quiz/answer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ session_id: quizState.sessionId, answer })
    })
    .then(r => r.json())
    .then(d => renderQuizFeedback(d, answer))
    .catch(err => addMessage("❌ Error: " + err.message, "bot"));
}

function renderQuizFeedback(fb, selected) {
    const correct     = fb.is_correct;
    const borderCls   = correct ? "feedback-correct" : "feedback-wrong";
    const icon        = correct ? "✅" : "❌";
    const resultLabel = correct ? "Correct!" : "Wrong!";
    const resultColor = correct ? "var(--accent3)" : "var(--danger)";

    addMessage(`
        <div class="quiz-card ${borderCls}">
            <div class="quiz-header">
                <span style="color:${resultColor};font-weight:700;font-size:13px;">${icon} ${resultLabel}</span>
            </div>
            <div class="quiz-body" style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
                <div>
                    <span style="color:var(--text-muted);">Your answer: </span>
                    <span style="color:var(--text);">${escapeHTML(selected)}</span>
                </div>
                <div>
                    <span style="color:var(--text-muted);">Correct answer: </span>
                    <span style="color:var(--accent3);font-weight:600;">${escapeHTML(fb.correct_answer)}</span>
                </div>
                <div style="padding-top:8px;border-top:1px solid var(--border);
                            color:var(--text-muted);line-height:1.6;">
                    <strong style="color:var(--text);">Explanation:</strong><br>
                    ${escapeHTML(fb.explanation)}
                </div>
            </div>
        </div>`, "bot", true);

    if (fb.quiz_finished) {
        setTimeout(() => renderQuizScore(fb), 2800);
    } else {
        setTimeout(() => {
            quizState.answered = false;
            const next = fb.next_question || {};
            next.current_score = fb.final_score !== undefined
                ? fb.final_score : (fb.current_score || 0);
            renderQuizQuestion(next);
        }, 2800);
    }
}

function renderQuizScore(fb) {
    const pct   = parseFloat(fb.percentage).toFixed(1);
    const grade = pct >= 80 ? "A 🏆" : pct >= 60 ? "B 👍" : pct >= 20 ? "C — keep studying!" : "D — needs serious revision! 📖";
    const color = pct >= 80 ? "var(--accent3)" : pct >= 60 ? "var(--accent)" : pct >= 20 ? "var(--text-muted)" : "var(--danger)";

    addMessage(`
        <div class="quiz-card quiz-score-card">
            <div class="quiz-body">
                <div class="quiz-score-emoji">🎉</div>
                <div class="quiz-score-title">Quiz Complete!</div>
                <div class="quiz-score-number" style="color:${color}">
                    ${fb.final_score} / ${fb.total_questions}
                </div>
                <div class="quiz-score-grade">
                    ${pct}% — Grade: <strong style="color:${color}">${grade}</strong>
                </div>
                <button class="quiz-score-btn" onclick="getQuiz()">
                    🔄 Start New Quiz
                </button>
            </div>
        </div>`, "bot", true);
}

/* ─────────────────────────────────────
   File preview
───────────────────────────────────── */
function previewFile(name) {
    const ext = name.split(".").pop().toLowerCase();
    if (ext === "txt") {
        fetch(`/preview/${encodeURIComponent(name)}`)
            .then(r => r.text())
            .then(content => {
                document.getElementById("pdfTitle").textContent = name;
                document.getElementById("pdfViewer").classList.add("active");
                document.getElementById("pdfFrame").srcdoc =
                    `<pre style="font-family:monospace;padding:20px;white-space:pre-wrap;
                                 word-wrap:break-word;background:#0e1520;color:#e2eaf5;
                                 min-height:100vh;margin:0;">${escapeHTML(content)}</pre>`;
            });
    } else {
        document.getElementById("pdfTitle").textContent = name;
        document.getElementById("pdfViewer").classList.add("active");
        document.getElementById("pdfFrame").src = `/preview/${encodeURIComponent(name)}`;
    }
}

function closePDF() {
    document.getElementById("pdfViewer").classList.remove("active");
    document.getElementById("pdfFrame").src    = "";
    document.getElementById("pdfFrame").srcdoc = "";
}

/* ─────────────────────────────────────
   Selected files tracker
───────────────────────────────────── */
function updateSelectedFiles() {
    const checked = document.querySelectorAll(".file-checkbox:checked");
    const info    = document.getElementById("filesSelected");
    if (!info) return;
    info.textContent = checked.length
        ? `${checked.length} file${checked.length > 1 ? "s" : ""} selected`
        : "";
}

function getSelectedFiles() {
    return Array.from(document.querySelectorAll(".file-checkbox:checked"))
                .map(cb => cb.value);
}

/* ─────────────────────────────────────
   Helpers
───────────────────────────────────── */
function escapeHTML(str) {
    return String(str)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;");
}

function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
}

/* ─────────────────────────────────────
   Init empty state + sync file list
───────────────────────────────────── */
(function init() {
    // Sync sidebar from backend on every page load — no stale Jinja snapshot.
    refreshFileList();

    const messages = document.getElementById("messages");
    if (!messages || messages.children.length > 0) return;
    const es = document.createElement("div");
    es.id = "emptyState";
    es.style.cssText = [
        "flex:1","display:flex","flex-direction:column",
        "align-items:center","justify-content:center","gap:12px",
        "color:var(--text-muted)","text-align:center","padding:40px",
        "pointer-events:none","height:100%"
    ].join(";");
    es.innerHTML = `
        <div style="font-size:52px;opacity:0.25;">🧠</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;
                    font-weight:700;color:var(--text-dim);">
            Nothing here yet
        </div>
        <div style="font-size:13px;color:var(--text-dim);
                    max-width:260px;line-height:1.6;">
            Upload a PDF, DOCX, PPTX, or TXT file and start asking
            questions, get a summary, or take a quiz.
        </div>`;
    messages.appendChild(es);
})();