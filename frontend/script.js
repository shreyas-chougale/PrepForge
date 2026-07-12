/* ──────────────────────────────────────────────────────────────────────────
   PrepForge — Vanilla JS app (Home / Interview / Results)
   ────────────────────────────────────────────────────────────────────────── */

// API base — relative path lets the same backend serve frontend + API.
// Override by setting window.API_BASE before this script loads.
const API_BASE = (typeof window.API_BASE === "string" ? window.API_BASE : "");

// ─── Lucide icon helper ───────────────────────────────────────────────────

const ICON = (name, attrs = "") => `<i data-lucide="${name}" ${attrs}></i>`;

function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
}


// ─── HTML escaping helper ─────────────────────────────────────────────────

function esc(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


// ─── API wrapper ──────────────────────────────────────────────────────────

const api = {
    async createSession(data) {
        const headers = { "Content-Type": "application/json" };
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/interview/sessions`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to create session");
        }
        return r.json();
    },
    async getSession(id) {
        const r = await fetch(`${API_BASE}/api/interview/sessions/${id}`);
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to fetch session");
        }
        return r.json();
    },
    async submitAnswer(id, data) {
        const headers = { "Content-Type": "application/json" };
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/interview/sessions/${id}/answers`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to submit answer");
        }
        return r.json();
    },
    async completeSession(id) {
    async completeSession(id) {
        const headers = { "Content-Type": "application/json" };
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/interview/sessions/${id}/complete`, {
            method: "POST",
            headers,
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to complete session");
        }
        return r.json();
    },
    async login(email, password) {
        const r = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Login failed");
        }
        return r.json();
    },
    async register(name, email, password) {
        const r = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Registration failed");
        }
        return r.json();
    },
    async scanATS(formData) {
        const headers = {};
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/tools/ats-scan`, {
            method: "POST",
            headers,
            body: formData,
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "ATS Scan failed");
        }
        return r.json();
    },
    async buildResume(formData) {
        const headers = {};
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/tools/resume-builder`, {
            method: "POST",
            headers,
            body: formData,
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Resume building failed");
        }
        return r.json();
    },
    async generateCoverLetter(formData) {
        const headers = {};
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/tools/cover-letter`, {
            method: "POST",
            headers,
            body: formData,
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Cover letter generation failed");
        }
        return r.json();
    },
    async evaluateLeetcode(data) {
        const headers = { "Content-Type": "application/json" };
        if (Auth.token) headers["Authorization"] = `Bearer ${Auth.token}`;
        const r = await fetch(`${API_BASE}/api/tools/leetcode`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });
        if (!r.ok) {
            const errJson = await r.json().catch(() => ({}));
            throw new Error(errJson.error || "Evaluation failed");
        }
        return r.json();
    }
};

// ─── Auth State ───────────────────────────────────────────────────────────

const Auth = {
    token: localStorage.getItem("prepforge_token"),
    user: JSON.parse(localStorage.getItem("prepforge_user") || "null"),
    set(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem("prepforge_token", token);
        localStorage.setItem("prepforge_user", JSON.stringify(user));
    },
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem("prepforge_token");
        localStorage.removeItem("prepforge_user");
        navigate("#/login");
    }
};


// ─── Score color helper ───────────────────────────────────────────────────

function scoreClass(score) {
    if (score >= 8) return "score-high";
    if (score >= 5) return "score-mid";
    return "score-low";
}


// ─── Voice (Web Speech API) ───────────────────────────────────────────────

const Voice = (() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SR;
    let recognition = null;
    const state = {
        isListening: false,
        isSpeaking: false,
        transcript: "",
        interim: "",
        error: null,
    };
    let silenceTimer = null;
    let autoSubmitCallback = null;
    
    const listeners = new Set();
    function notify() { listeners.forEach((cb) => cb({ ...state })); }
    function on(cb) { listeners.add(cb); return () => listeners.delete(cb); }
    function setAutoSubmit(cb) { autoSubmitCallback = cb; }

    function startListening() {
        if (!supported) {
            state.error = "Speech recognition is not supported in your browser. Try Chrome or Edge.";
            notify();
            return;
        }
        state.error = null;
        state.transcript = "";
        state.interim = "";

        recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => { state.isListening = true; notify(); };
        recognition.onresult = (e) => {
            clearTimeout(silenceTimer);
            let final = "", interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) final += r[0].transcript + " ";
                else interim += r[0].transcript;
            }
            if (final) state.transcript += final;
            state.interim = interim;
            notify();
            
            silenceTimer = setTimeout(() => {
                if (state.isListening && (state.transcript.trim() || state.interim.trim())) {
                    stopListening();
                    if (autoSubmitCallback) autoSubmitCallback();
                }
            }, 3000);
        };
        recognition.onerror = (e) => {
            clearTimeout(silenceTimer);
            if (e.error === "not-allowed") state.error = "Microphone access denied. Please allow microphone permissions and try again.";
            else if (e.error === "no-speech") state.error = "No speech detected. Please try speaking again.";
            else if (e.error !== "aborted") state.error = `Voice error: ${e.error}. Please try again.`;
            state.isListening = false;
            notify();
        };
        recognition.onend = () => { 
            clearTimeout(silenceTimer);
            state.isListening = false; 
            state.interim = ""; 
            notify(); 
        };
        recognition.start();
    }

    function stopListening() {
        if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
        state.isListening = false;
        state.interim = "";
        notify();
    }

    function speak(text) {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.92; u.pitch = 1.0; u.volume = 1.0; u.lang = "en-US";
        u.onstart = () => { state.isSpeaking = true; notify(); };
        u.onend = () => { state.isSpeaking = false; notify(); };
        u.onerror = () => { state.isSpeaking = false; notify(); };
        window.speechSynthesis.speak(u);
    }
    function stopSpeaking() {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        state.isSpeaking = false;
        notify();
    }
    function clearTranscript() { state.transcript = ""; state.interim = ""; notify(); }

    return { supported, state, on, startListening, stopListening, speak, stopSpeaking, clearTranscript, setAutoSubmit };
})();


// ─── Hash router ──────────────────────────────────────────────────────────

const app = document.getElementById("app");

function navigate(hash) {
    if (location.hash !== hash) location.hash = hash;
    else route();
}

function route() {
    Voice.stopSpeaking();
    Voice.stopListening();

    const h = (location.hash || "#/").slice(1);
    const m1 = h.match(/^\/interview\/(\d+)$/);
    const m2 = h.match(/^\/results\/(\d+)$/);
    if (h === "/login") renderLogin();
    else if (h === "/register") renderRegister();
    else if (m1) renderInterview(parseInt(m1[1], 10));
    else if (m2) renderResults(parseInt(m2[1], 10));
    else if (h === "/ats") renderATS();
    else if (h === "/resume") renderResumeBuilder();
    else if (h === "/cover-letter") renderCoverLetter();
    else if (h === "/leetcode") renderLeetcode();
    else renderHome();
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);


// ─── AUTH pages ───────────────────────────────────────────────────────────

function renderLogin() {
    app.innerHTML = `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
        <div class="card p-6 sm:p-8 w-full max-w-md">
            <div class="text-center mb-6">
                <div class="brand-icon w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4">
                    ${ICON("hammer", 'class="w-6 h-6 text-white"')}
                </div>
                <h2 class="text-2xl font-bold">Welcome Back</h2>
                <p class="text-sm text-muted-foreground mt-1">Sign in to access your AI Career Dashboard</p>
            </div>
            <form id="login-form" class="space-y-4">
                <div>
                    <label class="text-sm font-semibold text-foreground block mb-1">Email</label>
                    <input class="input" type="email" name="email" required placeholder="name@example.com">
                </div>
                <div>
                    <label class="text-sm font-semibold text-foreground block mb-1">Password</label>
                    <input class="input" type="password" name="password" required placeholder="••••••••">
                </div>
                <button type="submit" id="login-submit" class="btn btn-primary w-full">Sign In</button>
            </form>
            <p class="text-center text-sm text-muted-foreground mt-6">
                Don't have an account? <a href="#/register" class="text-primary hover:underline">Sign up</a>
            </p>
        </div>
    </div>`;
    refreshIcons();

    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("login-submit");
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Signing in...`;
        
        try {
            const fd = new FormData(e.target);
            const data = await api.login(fd.get("email"), fd.get("password"));
            Auth.set(data.token, data.user);
            navigate("#/");
        } catch (err) {
            btn.disabled = false;
            btn.textContent = "Sign In";
            alert(err.message);
        }
    });
}

function renderRegister() {
    app.innerHTML = `
    <div class="min-h-screen bg-background flex items-center justify-center p-4">
        <div class="card p-6 sm:p-8 w-full max-w-md">
            <div class="text-center mb-6">
                <div class="brand-icon w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4">
                    ${ICON("hammer", 'class="w-6 h-6 text-white"')}
                </div>
                <h2 class="text-2xl font-bold">Create Account</h2>
                <p class="text-sm text-muted-foreground mt-1">Start your journey to placement readiness</p>
            </div>
            <form id="register-form" class="space-y-4">
                <div>
                    <label class="text-sm font-semibold text-foreground block mb-1">Full Name</label>
                    <input class="input" type="text" name="name" required placeholder="Jane Doe">
                </div>
                <div>
                    <label class="text-sm font-semibold text-foreground block mb-1">Email</label>
                    <input class="input" type="email" name="email" required placeholder="name@example.com">
                </div>
                <div>
                    <label class="text-sm font-semibold text-foreground block mb-1">Password</label>
                    <input class="input" type="password" name="password" required minlength="6" placeholder="Min 6 characters">
                </div>
                <button type="submit" id="register-submit" class="btn btn-primary w-full">Create Account</button>
            </form>
            <p class="text-center text-sm text-muted-foreground mt-6">
                Already have an account? <a href="#/login" class="text-primary hover:underline">Sign in</a>
            </p>
        </div>
    </div>`;
    refreshIcons();

    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("register-submit");
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Creating...`;
        
        try {
            const fd = new FormData(e.target);
            const data = await api.register(fd.get("name"), fd.get("email"), fd.get("password"));
            Auth.set(data.token, data.user);
            navigate("#/");
        } catch (err) {
            btn.disabled = false;
            btn.textContent = "Create Account";
            alert(err.message);
        }
    });
}

function renderATS() {
    if (!Auth.user) { navigate("#/login"); return; }
    const content = `
    <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3 mb-6">
            <div class="bg-primary-10 p-3 rounded-xl shrink-0">
                ${ICON("file", 'class="w-6 h-6 text-primary"')}
            </div>
            <div>
                <h2 class="text-xl sm:text-2xl font-bold">ATS Scanner & LinkedIn Optimizer</h2>
                <p class="text-xs sm:text-sm text-muted-foreground">See how your resume performs against a job description.</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-6 bg-card">
                <form id="ats-form" class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-sm font-semibold block">Upload Resume (PDF)</label>
                        <input type="file" name="resume" accept=".pdf" required class="input py-2 cursor-pointer" style="line-height:1.2;">
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-semibold block">Job Description</label>
                        <textarea name="job_description" required rows="6" class="textarea" placeholder="Paste the job description here..."></textarea>
                    </div>
                    <button type="submit" id="ats-submit" class="btn btn-primary w-full">
                        <span id="ats-submit-label">Scan Resume</span>
                    </button>
                </form>
            </div>
            
            <div class="card p-6 bg-card" id="ats-results" style="display:none;">
                <!-- Results will be injected here -->
            </div>
        </div>
    </div>`;
    renderDashboardLayout(content, "ats");

    document.getElementById("ats-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById("ats-submit");
        const label = document.getElementById("ats-submit-label");
        const resultsDiv = document.getElementById("ats-results");
        
        btn.disabled = true;
        label.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Analyzing with AI...`;
        
        try {
            const formData = new FormData(form);
            const res = await api.scanATS(formData);
            
            // Render results
            let scoreColor = "text-success";
            if (res.matchScore < 70) scoreColor = "text-warning";
            if (res.matchScore < 40) scoreColor = "text-destructive";

            const mkHTML = (res.missingKeywords || []).map(k => `<span class="badge" style="background:hsl(var(--destructive)/0.1); color:hsl(var(--destructive));">${esc(k)}</span>`).join("");
            const tkHTML = (res.matchingKeywords || []).map(k => `<span class="badge" style="background:hsl(var(--success)/0.1); color:hsl(var(--success));">${esc(k)}</span>`).join("");

            resultsDiv.innerHTML = `
                <div class="text-center mb-6">
                    <div class="text-5xl font-black ${scoreColor}">${res.matchScore}%</div>
                    <div class="text-sm font-semibold text-muted-foreground mt-1">ATS Match Score</div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-bold flex items-center gap-2 mb-2">${ICON("check", "w-4 h-4 text-success")} Matching Keywords</h4>
                        <div class="flex flex-wrap gap-2">${tkHTML || "<span class='text-xs text-muted-foreground'>None found</span>"}</div>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold flex items-center gap-2 mb-2">${ICON("x", "w-4 h-4 text-destructive")} Missing Keywords</h4>
                        <div class="flex flex-wrap gap-2">${mkHTML || "<span class='text-xs text-muted-foreground'>None missing!</span>"}</div>
                    </div>
                    <div class="p-3 bg-muted rounded-lg border border-border">
                        <h4 class="text-sm font-bold mb-1">Formatting Feedback</h4>
                        <p class="text-sm text-muted-foreground">${esc(res.formattingFeedback)}</p>
                    </div>
                    <div class="p-3 bg-primary-10 rounded-lg border border-primary-10">
                        <h4 class="text-sm font-bold text-primary mb-1">LinkedIn Optimization</h4>
                        <p class="text-sm text-foreground">${esc(res.linkedinOptimization)}</p>
                    </div>
                </div>
            `;
            resultsDiv.style.display = "block";
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            label.textContent = "Scan Resume";
        }
    });
}

function renderResumeBuilder() {
    if (!Auth.user) { navigate("#/login"); return; }
    const content = `
    <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3 mb-6">
            <div class="bg-primary-10 p-3 rounded-xl shrink-0">
                ${ICON("user", 'class="w-6 h-6 text-primary"')}
            </div>
            <div>
                <h2 class="text-xl sm:text-2xl font-bold">Overleaf Resume Builder</h2>
                <p class="text-xs sm:text-sm text-muted-foreground">Generate an ATS-beating Jake's Resume formatted in LaTeX.</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-6 bg-card">
                <form id="resume-form" class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-sm font-semibold block">Upload Current Resume (PDF)</label>
                        <input type="file" name="resume" accept=".pdf" required class="input py-2 cursor-pointer" style="line-height:1.2;">
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-semibold block">Target Job Description</label>
                        <textarea name="job_description" required rows="6" class="textarea" placeholder="Paste the exact JD to tailor the resume..."></textarea>
                    </div>
                    <button type="submit" id="resume-submit" class="btn btn-primary w-full">
                        <span id="resume-submit-label">Generate Jake's Resume LaTeX</span>
                    </button>
                    <p class="text-xs text-muted-foreground text-center">This takes ~15-20 seconds. It rewrites your resume using strong metrics.</p>
                </form>
            </div>
            
            <div class="card p-6 bg-card flex flex-col" id="resume-results" style="display:none; max-height: 600px;">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold">Raw LaTeX Code</h3>
                    <button type="button" id="copy-latex-btn" class="btn btn-sm btn-outline">Copy to Clipboard</button>
                </div>
                <div class="flex-1 overflow-hidden rounded-lg border border-border">
                    <textarea id="latex-output" class="w-full h-full p-4 font-mono text-xs bg-muted text-foreground resize-none" readonly style="min-height:300px;"></textarea>
                </div>
                <div class="mt-4 text-center">
                    <a href="https://www.overleaf.com/project" target="_blank" class="text-sm text-primary hover:underline">Open Overleaf to compile this code</a>
                </div>
            </div>
        </div>
    </div>`;
    renderDashboardLayout(content, "resume");

    document.getElementById("resume-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById("resume-submit");
        const label = document.getElementById("resume-submit-label");
        const resultsDiv = document.getElementById("resume-results");
        const latexOutput = document.getElementById("latex-output");
        
        btn.disabled = true;
        label.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Writing Resume...`;
        
        try {
            const formData = new FormData(form);
            const res = await api.buildResume(formData);
            
            latexOutput.value = res.latex;
            resultsDiv.style.display = "flex";
            
            document.getElementById("copy-latex-btn").onclick = () => {
                navigator.clipboard.writeText(res.latex);
                const copyBtn = document.getElementById("copy-latex-btn");
                copyBtn.textContent = "Copied!";
                setTimeout(() => copyBtn.textContent = "Copy to Clipboard", 2000);
            };

            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            label.textContent = "Generate Jake's Resume LaTeX";
        }
    });
}

function renderCoverLetter() {
    if (!Auth.user) { navigate("#/login"); return; }
    const content = `
    <div class="max-w-4xl mx-auto">
        <div class="flex items-center gap-3 mb-6">
            <div class="bg-primary-10 p-3 rounded-xl shrink-0">
                ${ICON("file", 'class="w-6 h-6 text-primary"')}
            </div>
            <div>
                <h2 class="text-xl sm:text-2xl font-bold">AI Cover Letter Generator</h2>
                <p class="text-xs sm:text-sm text-muted-foreground">Generate tailored cover letters based on the Job Description.</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-6 bg-card">
                <form id="cl-form" class="space-y-4">
                    <div class="space-y-2">
                        <label class="text-sm font-semibold block">Upload Resume (PDF)</label>
                        <input type="file" name="resume" accept=".pdf" required class="input py-2 cursor-pointer" style="line-height:1.2;">
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-semibold block">Target Job Description</label>
                        <textarea name="job_description" required rows="6" class="textarea" placeholder="Paste the JD here..."></textarea>
                    </div>
                    <button type="submit" id="cl-submit" class="btn btn-primary w-full">
                        <span id="cl-submit-label">Generate Cover Letter</span>
                    </button>
                </form>
            </div>
            
            <div class="card p-6 bg-card flex flex-col" id="cl-results" style="display:none; max-height: 600px;">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold">Your Cover Letter</h3>
                    <button type="button" id="copy-cl-btn" class="btn btn-sm btn-outline">Copy</button>
                </div>
                <div class="flex-1 overflow-hidden rounded-lg border border-border">
                    <textarea id="cl-output" class="w-full h-full p-4 font-sans text-sm bg-muted text-foreground resize-none" readonly style="min-height:300px;"></textarea>
                </div>
            </div>
        </div>
    </div>`;
    renderDashboardLayout(content, "cover-letter");

    document.getElementById("cl-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById("cl-submit");
        const label = document.getElementById("cl-submit-label");
        const resultsDiv = document.getElementById("cl-results");
        const clOutput = document.getElementById("cl-output");
        
        btn.disabled = true;
        label.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Writing...`;
        
        try {
            const formData = new FormData(form);
            const res = await api.generateCoverLetter(formData);
            
            clOutput.value = res.coverLetter;
            resultsDiv.style.display = "flex";
            
            document.getElementById("copy-cl-btn").onclick = () => {
                navigator.clipboard.writeText(res.coverLetter);
                const copyBtn = document.getElementById("copy-cl-btn");
                copyBtn.textContent = "Copied!";
                setTimeout(() => copyBtn.textContent = "Copy", 2000);
            };
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            label.textContent = "Generate Cover Letter";
        }
    });
}

function renderLeetcode() {
    if (!Auth.user) { navigate("#/login"); return; }
    const content = `
    <div class="max-w-6xl mx-auto h-full flex flex-col">
        <div class="flex items-center gap-3 mb-6">
            <div class="bg-primary-10 p-3 rounded-xl shrink-0">
                ${ICON("code", 'class="w-6 h-6 text-primary"')}
            </div>
            <div>
                <h2 class="text-xl sm:text-2xl font-bold">LeetCode Interview Assistant</h2>
                <p class="text-xs sm:text-sm text-muted-foreground">Practice with an AI interviewer who gives hints instead of answers.</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            <div class="card p-6 bg-card flex flex-col h-[600px] overflow-hidden">
                <form id="lc-form" class="space-y-4 flex flex-col h-full">
                    <div class="space-y-2 flex-1 flex flex-col min-h-0">
                        <label class="text-sm font-semibold block">Problem Description</label>
                        <textarea name="problem" required class="textarea flex-1" placeholder="Paste LeetCode problem here..."></textarea>
                    </div>
                    <div class="space-y-2 flex-1 flex flex-col min-h-0">
                        <label class="text-sm font-semibold block">Your Code</label>
                        <textarea name="code" required class="textarea font-mono text-sm flex-1" placeholder="Paste your code here..."></textarea>
                    </div>
                    <div class="space-y-2 shrink-0">
                        <label class="text-sm font-semibold block">Language</label>
                        <input name="language" required class="input" value="Python">
                    </div>
                    <button type="submit" id="lc-submit" class="btn btn-primary w-full shrink-0">
                        <span id="lc-submit-label">Ask Interviewer</span>
                    </button>
                </form>
            </div>
            
            <div class="card p-6 bg-card flex flex-col h-[600px] overflow-y-auto" id="lc-results" style="display:none;">
                <h3 class="font-bold text-xl mb-6">Interviewer Feedback</h3>
                <div class="space-y-6">
                    <div class="p-4 bg-muted rounded-xl">
                        <h4 class="text-sm font-bold mb-2 flex items-center gap-2">${ICON("zap", "w-4 h-4 text-primary")} Complexity Analysis</h4>
                        <p class="text-sm font-mono text-foreground" id="lc-complexity"></p>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold mb-2 flex items-center gap-2">${ICON("target", "w-4 h-4 text-secondary")} Code Review</h4>
                        <p class="text-sm text-foreground leading-relaxed" id="lc-feedback"></p>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold mb-2 flex items-center gap-2">${ICON("x", "w-4 h-4 text-destructive")} Missing Edge Cases</h4>
                        <ul class="list-disc pl-5 text-sm text-foreground space-y-1" id="lc-edges"></ul>
                    </div>
                    <div class="p-4 bg-primary-10 rounded-xl border border-primary-10">
                        <h4 class="text-sm font-bold text-primary mb-2 flex items-center gap-2">${ICON("sparkles", "w-4 h-4")} Progressive Hint</h4>
                        <p class="text-sm text-foreground" id="lc-hint"></p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    renderDashboardLayout(content, "leetcode");

    document.getElementById("lc-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById("lc-submit");
        const label = document.getElementById("lc-submit-label");
        const resultsDiv = document.getElementById("lc-results");
        
        btn.disabled = true;
        label.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Analyzing...`;
        
        try {
            const fd = new FormData(form);
            const res = await api.evaluateLeetcode({
                problem: fd.get("problem"),
                code: fd.get("code"),
                language: fd.get("language")
            });
            
            document.getElementById("lc-complexity").textContent = res.complexity;
            document.getElementById("lc-feedback").textContent = res.feedback;
            document.getElementById("lc-hint").textContent = res.hint;
            
            const edgesUl = document.getElementById("lc-edges");
            edgesUl.innerHTML = (res.edgeCases || []).map(e => `<li>${esc(e)}</li>`).join("");
            
            resultsDiv.style.display = "flex";
            if (window.innerWidth < 1024) {
                resultsDiv.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            label.textContent = "Ask Interviewer";
        }
    });
}

// ─── DASHBOARD LAYOUT ─────────────────────────────────────────────────────

function renderDashboardLayout(contentHTML, activeId) {
    const navItems = [
        { id: "home", href: "#/", icon: "briefcase", label: "Mock Interview" },
        { id: "ats", href: "#/ats", icon: "file", label: "ATS Scanner" },
        { id: "resume", href: "#/resume", icon: "user", label: "Resume Builder" },
        { id: "cover-letter", href: "#/cover-letter", icon: "file", label: "Cover Letter" },
        { id: "leetcode", href: "#/leetcode", icon: "code", label: "LeetCode Assistant" },
    ];

    const navHTML = navItems.map(item => `
        <a href="${item.href}" class="nav-item ${activeId === item.id ? 'active' : ''}">
            ${ICON(item.icon, 'class="w-5 h-5"')}
            ${item.label}
        </a>
    `).join("");

    app.innerHTML = `
    <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
            <div class="flex items-center gap-3 mb-2">
                <div class="brand-icon w-10 h-10 rounded-lg flex items-center justify-center">
                    ${ICON("hammer", 'class="w-5 h-5 text-white"')}
                </div>
                <h1 class="text-xl font-bold tracking-tight">PrepForge</h1>
            </div>
            
            <nav class="sidebar-nav">
                ${navHTML}
            </nav>
            
            <div class="mt-auto pt-4 border-t border-border">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-full bg-primary-10 text-primary flex items-center justify-center font-bold">
                        ${esc(Auth.user.name.charAt(0).toUpperCase())}
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-sm font-bold truncate">${esc(Auth.user.name)}</p>
                        <p class="text-xs text-muted-foreground truncate">${esc(Auth.user.email)}</p>
                    </div>
                </div>
                <button onclick="Auth.logout()" class="btn btn-outline w-full btn-sm">
                    Log out
                </button>
            </div>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <!-- Mobile Header -->
            <header class="sm:hidden p-4 border-b border-border bg-background flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="brand-icon w-8 h-8 rounded-lg flex items-center justify-center">
                        ${ICON("hammer", 'class="w-4 h-4 text-white"')}
                    </div>
                    <h1 class="text-lg font-bold">PrepForge</h1>
                </div>
                <button onclick="document.getElementById('sidebar').classList.toggle('open')" class="btn btn-sm">
                    ☰
                </button>
            </header>
            
            <div class="p-4 sm:p-8 flex-1">
                ${contentHTML}
            </div>
        </main>
    </div>`;
    refreshIcons();
}

// ─── HOME page ────────────────────────────────────────────────────────────

function renderHome() {
    if (!Auth.user) {
        navigate("#/login");
        return;
    }

    const content = `
    <div class="max-w-3xl">
        <!-- Form card -->
        <div class="fade-in">
            <div class="card p-6 sm:p-8 bg-card">
                <div class="flex items-center gap-3 mb-6" style="margin-bottom:2rem;">
                    <div class="bg-primary-10 p-3 rounded-xl shrink-0">
                        ${ICON("briefcase", 'class="w-6 h-6 text-primary"')}
                    </div>
                    <div>
                        <h2 class="text-xl sm:text-2xl font-bold">Start Mock Interview</h2>
                        <p class="text-xs sm:text-sm text-muted-foreground">Practice real-world scenarios</p>
                    </div>
                </div>

                <form id="home-form" class="space-y-5">
                    <input type="hidden" name="name" value="${esc(Auth.user.name)}">
                    <div class="space-y-2">
                        <label class="text-sm font-semibold text-foreground block">Target Role</label>
                        <input class="input" name="role" required placeholder="e.g. Senior React Developer">
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-semibold text-foreground block">Experience Level</label>
                        <div class="select-wrapper">
                            <select class="select" name="experienceLevel">
                                <option value="junior">Junior (0-2 years)</option>
                                <option value="mid" selected>Mid-level (3-5 years)</option>
                                <option value="senior">Senior (5-8 years)</option>
                                <option value="lead">Lead / Principal (8+ years)</option>
                            </select>
                            <svg class="chev" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                    </div>
                    <button type="submit" id="home-submit" class="btn btn-primary btn-lg w-full" style="margin-top:0.5rem;">
                        <span id="home-submit-label">Start Interview</span>
                    </button>
                    <p class="text-center text-xs text-muted-foreground">Questions take about 5-10 seconds to generate.</p>
                </form>
            </div>
        </div>
    </div>`;

    renderDashboardLayout(content, "home");

    const form = document.getElementById("home-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("home-submit");
        const label = document.getElementById("home-submit-label");
        btn.disabled = true;
        label.innerHTML = `<span class="spinner-sm" style="margin-right:.5rem;display:inline-block;vertical-align:middle"></span>Generating Questions...`;
        const fd = new FormData(form);
        try {
            const data = await api.createSession({
                name: fd.get("name").trim(),
                role: fd.get("role").trim(),
                experienceLevel: fd.get("experienceLevel"),
            });
            navigate(`#/interview/${data.id}`);
        } catch (err) {
            console.error(err);
            label.textContent = "Start Interview";
            btn.disabled = false;
            alert(err.message || "Failed to start interview. Please try again.");
        }
    });
}


// ─── INTERVIEW page ───────────────────────────────────────────────────────

const interviewState = {
    sessionId: null,
    session: null,
    messages: [],          // [{id, role, kind, ...}]
    nextQuestionIndex: 0,
    isLast: false,
    isSubmitting: false,
    textInput: "",
    voiceUnsub: null,
    initialized: false,
};

function resetInterviewState(id) {
    Object.assign(interviewState, {
        sessionId: id,
        session: null,
        messages: [],
        nextQuestionIndex: 0,
        isLast: false,
        isSubmitting: false,
        textInput: "",
        initialized: false,
    });
    if (interviewState.voiceUnsub) interviewState.voiceUnsub();
    interviewState.voiceUnsub = Voice.on(() => updateInterviewVoiceUI());
}

async function renderInterview(id) {
    resetInterviewState(id);

    app.innerHTML = `
    <div class="chat-page">
        <div class="flex items-center justify-center" style="min-height:100vh;flex-direction:column">
            <div class="spinner mb-4"></div>
            <p class="text-muted-foreground font-medium pulse-soft">Loading interview session...</p>
        </div>
    </div>`;

    try {
        const session = await api.getSession(id);
        interviewState.session = session;

        if (session.status === "completed") {
            navigate(`#/results/${id}`);
            return;
        }

        // Build initial chat history from server data
        const initMsgs = [];
        let nextIdx = 0;
        for (let i = 0; i < session.questions.length; i++) {
            const q = session.questions[i];
            const ans = session.answers.find((a) => a.questionId === q.id);
            initMsgs.push({ id: `q-${q.id}`, role: "ai", kind: "question", question: q, num: i + 1 });
            if (ans) {
                const isLast = i === session.questions.length - 1;
                initMsgs.push({ id: `a-${ans.id}`, role: "user", kind: "answer", text: ans.answer });
                initMsgs.push({
                    id: `e-${ans.id}`,
                    role: "ai",
                    kind: "evaluation",
                    evaluation: { score: ans.score, feedback: ans.feedback, improvedAnswer: ans.improvedAnswer },
                    isLast,
                });
                nextIdx = i + 1;
            } else {
                nextIdx = i;
                break;
            }
        }
        interviewState.messages = initMsgs;
        interviewState.nextQuestionIndex = nextIdx;
        interviewState.initialized = true;

        renderInterviewShell();

        // Speak last unanswered question on initial load
        const last = initMsgs[initMsgs.length - 1];
        if (last && last.role === "ai" && last.kind === "question") {
            setTimeout(() => Voice.speak(`Question ${last.num}: ${last.question.question}`), 600);
        }
    } catch (err) {
        console.error(err);
        app.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
            ${ICON("alert-circle", 'class="w-16 h-16 text-destructive mb-4"')}
            <h2 class="text-2xl font-bold mb-2">Session Not Found</h2>
            <p class="text-muted-foreground mb-6">We couldn't load this interview session.</p>
            <button class="btn btn-primary" onclick="navigate('#/')">Return Home</button>
        </div>`;
        refreshIcons();
    }
}

function renderInterviewShell() {
    const s = interviewState.session;
    const totalQ = s.questions.length;

    app.innerHTML = `
    <div class="chat-page">
        <!-- Header -->
        <div class="chat-header">
            <div class="max-w-3xl">
                <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="min-w-0 flex-1">
                        <h1 class="text-sm sm:text-lg font-bold font-display text-foreground truncate">${esc(s.role)} Interview</h1>
                        <p class="text-muted-foreground text-xs truncate">${esc(s.name)} · ${esc(s.experienceLevel)}</p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0" id="header-controls"></div>
                </div>
                <div class="rounded-full overflow-hidden h-2" style="background:hsl(var(--border));height:0.375rem">
                    <div class="progress-fill" id="progress-fill" style="width:0%"></div>
                </div>
            </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages">
            <div class="max-w-3xl space-y-6">
                <div class="text-center py-4">
                    <div class="pill"><span style="display:inline-flex;align-items:center;gap:.375rem">${ICON("bot", 'class="w-3 h-3"')} PrepForge AI Coach · ${totalQ} Questions</span></div>
                </div>
                <div id="messages-container" class="space-y-6"></div>
                <div id="messages-end"></div>
            </div>
        </div>

        <!-- Input bar -->
        <div class="chat-input-bar">
            <div class="max-w-3xl space-y-3">
                <div id="voice-error" class="hidden flex items-start gap-2 text-xs text-destructive p-3 rounded-xl border" style="background:hsl(var(--destructive)/0.1);border-color:hsl(var(--destructive)/0.2)"></div>
                <div id="recording-indicator" class="hidden flex items-center justify-center gap-2 text-xs text-destructive mb-2">
                    <span class="dot-pulse"></span>
                    <span class="shrink-0 font-bold">Recording...</span>
                    <span id="interim-text" class="text-muted-foreground italic truncate max-w-sm"></span>
                </div>
                <div id="input-row" class="flex justify-center">
                    <button id="mic-btn" class="icon-btn w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105" style="background:hsl(var(--primary)); color:hsl(var(--primary-foreground)); ${Voice.supported ? "" : "display:none"}" title="Click to speak your answer" type="button">
                        ${ICON("mic", 'class="w-8 h-8"')}
                    </button>
                </div>
                <p class="text-xs text-center text-muted-foreground mt-2" style="opacity:.8">${
                    Voice.supported
                        ? `<span class="font-semibold">Click the mic to speak your answer.</span><br/>It will automatically submit when you stop speaking for 3 seconds.`
                        : "Voice input is not supported in this browser. Please use Chrome or Edge."
                }</p>
            </div>
        </div>
    </div>`;

    refreshIcons();
    bindInterviewEvents();
    renderMessages();
    updateInterviewVoiceUI();
    updateProgress();
}

function bindInterviewEvents() {
    const micBtn = document.getElementById("mic-btn");

    Voice.setAutoSubmit(() => {
        if (canSubmitAnswer()) {
            handleSubmitAnswer();
        }
    });

    micBtn?.addEventListener("click", () => {
        if (Voice.state.isListening) Voice.stopListening();
        else { Voice.clearTranscript(); interviewState.textInput = ""; Voice.startListening(); }
    });
}

function canSubmitAnswer() {
    const last = interviewState.messages[interviewState.messages.length - 1];
    const awaiting = last && last.role === "ai" && last.kind === "question";
    return interviewState.textInput.trim().length > 0 && !interviewState.isSubmitting && awaiting;
}

function updateInputRowState() {
    const last = interviewState.messages[interviewState.messages.length - 1];
    const awaiting = last && last.role === "ai" && last.kind === "question";
    const mic = document.getElementById("mic-btn");
    if (mic) {
        mic.disabled = interviewState.isSubmitting || !awaiting;
        if (mic.disabled) {
            mic.style.opacity = "0.5";
            mic.style.cursor = "not-allowed";
        } else {
            mic.style.opacity = "1";
            mic.style.cursor = "pointer";
        }
    }
}

function updateInterviewVoiceUI() {
    // Sync transcript into state while listening
    if (Voice.state.isListening) {
        const combined = Voice.state.transcript + Voice.state.interim;
        interviewState.textInput = combined;
    }

    // Mic button visual
    const mic = document.getElementById("mic-btn");
    if (mic) {
        if (Voice.state.isListening) {
            mic.style.background = "hsl(var(--destructive))";
            mic.innerHTML = ICON("mic-off", 'class="w-8 h-8 text-white"');
            mic.classList.add("recording-pulse");
        } else {
            mic.style.background = "hsl(var(--primary))";
            mic.innerHTML = ICON("mic", 'class="w-8 h-8 text-white"');
            mic.classList.remove("recording-pulse");
        }
        refreshIcons();
    }

    // Recording indicator
    const rec = document.getElementById("recording-indicator");
    if (rec) {
        rec.classList.toggle("hidden", !Voice.state.isListening);
        const interim = document.getElementById("interim-text");
        if (interim) interim.textContent = Voice.state.interim ? `"${Voice.state.interim}"` : "";
    }

    // Voice error banner
    const errEl = document.getElementById("voice-error");
    if (errEl) {
        if (Voice.state.error) {
            errEl.classList.remove("hidden");
            errEl.innerHTML = `${ICON("alert-circle", 'class="w-4 h-4 shrink-0" style="margin-top:.125rem"')}<span>${esc(Voice.state.error)}</span>`;
            refreshIcons();
        } else errEl.classList.add("hidden");
    }

    // Header "Stop speaking" button
    renderHeaderControls();
}

function renderHeaderControls() {
    const c = document.getElementById("header-controls");
    if (!c) return;
    const s = interviewState.session;
    const answered = s.answers.length;
    const total = s.questions.length;
    const pending = interviewState.messages.some((m) => m.kind === "typing" || m.kind === "evaluation") ? 1 : 0;
    const count = Math.min(answered + pending, total);
    c.innerHTML = `
        ${Voice.state.isSpeaking ? `<button class="pill" id="stop-speak-btn" style="cursor:pointer">${ICON("volume-x", 'class="w-3 h-3"')}<span class="sm:inline" style="display:none">Stop</span></button>` : ""}
        <span class="pill primary">${count} / ${total}</span>
        <button class="pill" id="quit-btn">${ICON("rotate-ccw", 'class="w-3 h-3"')}<span class="sm:inline" style="display:none">Quit</span></button>
    `;
    refreshIcons();
    document.getElementById("quit-btn")?.addEventListener("click", () => navigate("#/"));
    document.getElementById("stop-speak-btn")?.addEventListener("click", () => Voice.stopSpeaking());
}

function updateProgress() {
    const s = interviewState.session;
    const fill = document.getElementById("progress-fill");
    if (!fill || !s) return;
    const answered = s.answers.length;
    const total = s.questions.length;
    const pending = interviewState.messages.some((m) => m.kind === "typing" || m.kind === "evaluation") ? 1 : 0;
    const pct = Math.min(((answered + pending) / total) * 100, 100);
    fill.style.width = `${pct}%`;
    renderHeaderControls();
}

function renderMessages() {
    const c = document.getElementById("messages-container");
    if (!c) return;
    c.innerHTML = interviewState.messages.map(renderMessage).join("");
    refreshIcons();

    // Wire up evaluation "Next" buttons
    interviewState.messages.forEach((m) => {
        if (m.kind === "evaluation") {
            const btn = document.getElementById(`next-${m.id}`);
            if (btn) btn.addEventListener("click", () => handleNext(m.isLast));
        }
        if (m.kind === "question") {
            const btn = document.getElementById(`replay-${m.id}`);
            if (btn) btn.addEventListener("click", () => {
                if (Voice.state.isSpeaking) Voice.stopSpeaking();
                else Voice.speak(`Question ${m.num}: ${m.question.question}`);
            });
        }
    });

    document.getElementById("messages-end")?.scrollIntoView({ behavior: "smooth" });
}

function renderMessage(m) {
    if (m.role === "ai" && m.kind === "question") {
        return `
        <div class="fade-in flex items-start gap-3">
            <div class="avatar">${ICON("bot", 'class="w-5 h-5"')}</div>
            <div class="chat-bubble">
                <div class="flex items-center justify-between gap-3 mb-3">
                    <span class="badge">${esc(m.question.category)} · Q${m.num}</span>
                    <button id="replay-${m.id}" class="text-muted-foreground" style="background:none;border:none;cursor:pointer" title="Replay question">
                        ${ICON(Voice.state.isSpeaking ? "volume-x" : "volume-2", 'class="w-4 h-4"')}
                    </button>
                </div>
                <p class="text-foreground font-medium leading-relaxed">${esc(m.question.question)}</p>
            </div>
        </div>`;
    }
    if (m.role === "ai" && m.kind === "typing") {
        return `
        <div class="fade-in flex items-start gap-3">
            <div class="avatar">${ICON("bot", 'class="w-5 h-5"')}</div>
            <div class="chat-bubble">
                <div class="flex items-center gap-1 px-1 py-1">
                    <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
                </div>
            </div>
        </div>`;
    }
    if (m.role === "ai" && m.kind === "evaluation") {
        const ev = m.evaluation;
        const tier = ev.score >= 8 ? "Excellent response!" : ev.score >= 5 ? "Good, with room to improve." : "Needs more detail.";
        return `
        <div class="fade-in flex items-start gap-3">
            <div class="avatar">${ICON("bot", 'class="w-5 h-5"')}</div>
            <div class="chat-bubble" style="max-width:90%;padding:0;overflow:hidden">
                <div class="flex items-center gap-4 p-5" style="border-bottom:1px solid hsl(var(--border)/0.5)">
                    <div class="score-circle ${scoreClass(ev.score)}">${ev.score}/10</div>
                    <div>
                        <p class="font-bold text-foreground">Answer Evaluated</p>
                        <p class="text-xs text-muted-foreground" style="margin-top:.125rem">${tier}</p>
                    </div>
                </div>
                <div class="p-5 space-y-4">
                    <div>
                        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Feedback</p>
                        <p class="text-sm text-foreground leading-relaxed">${esc(ev.feedback)}</p>
                    </div>
                    <div class="improved-box">
                        <p class="text-xs font-semibold text-primary flex items-center gap-2 mb-2">
                            ${ICON("sparkles", 'class="w-3 h-3"')} Improved Answer Example
                        </p>
                        <p class="text-xs text-foreground leading-relaxed">${esc(ev.improvedAnswer)}</p>
                    </div>
                    <div class="flex justify-end" style="padding-top:.25rem">
                        <button id="next-${m.id}" class="btn btn-primary btn-sm">
                            ${m.isLast ? "View Final Results" : "Next Question"}
                            ${ICON("arrow-right", 'class="w-4 h-4" style="margin-left:.375rem"')}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }
    if (m.role === "user" && m.kind === "answer") {
        const initial = (interviewState.session.name || "?").charAt(0).toUpperCase();
        return `
        <div class="fade-in flex items-start gap-3" style="justify-content:flex-end">
            <div class="chat-bubble-user">
                <p class="text-sm leading-relaxed whitespace-pre-wrap">${esc(m.text)}</p>
            </div>
            <div class="avatar avatar-user">${esc(initial)}</div>
        </div>`;
    }
    return "";
}

async function handleSubmitAnswer() {
    const text = (interviewState.textInput || "").trim();
    if (!text || interviewState.isSubmitting || !interviewState.session) return;

    if (Voice.state.isListening) Voice.stopListening();
    if (Voice.state.isSpeaking) Voice.stopSpeaking();
    Voice.clearTranscript();

    // Find latest question
    const questionMsg = [...interviewState.messages].reverse()
        .find((m) => m.role === "ai" && m.kind === "question");
    if (!questionMsg) return;

    const totalQ = interviewState.session.questions.length;
    const answeredNow = interviewState.session.answers.length + 1;
    interviewState.isLast = answeredNow >= totalQ;
    interviewState.isSubmitting = true;

    interviewState.messages.push(
        { id: `a-${Date.now()}`, role: "user", kind: "answer", text },
        { id: "typing", role: "ai", kind: "typing" }
    );
    interviewState.textInput = "";
    document.getElementById("text-input").value = "";
    renderMessages();
    updateProgress();
    updateInputRowState();

    try {
        const evalResult = await api.submitAnswer(interviewState.sessionId, {
            questionId: questionMsg.question.id,
            answer: text,
        });
        // Optimistically add to local session.answers so progress count is right
        interviewState.session.answers.push({
            id: evalResult.answerId,
            sessionId: interviewState.sessionId,
            questionId: questionMsg.question.id,
            answer: text,
            score: evalResult.score,
            feedback: evalResult.feedback,
            improvedAnswer: evalResult.improvedAnswer,
        });
        // Replace typing with evaluation
        interviewState.messages = interviewState.messages.filter((m) => m.kind !== "typing");
        interviewState.messages.push({
            id: `e-${Date.now()}`,
            role: "ai",
            kind: "evaluation",
            evaluation: { score: evalResult.score, feedback: evalResult.feedback, improvedAnswer: evalResult.improvedAnswer },
            isLast: interviewState.isLast,
        });
    } catch (err) {
        console.error(err);
        interviewState.messages = interviewState.messages.filter((m) => m.kind !== "typing");
        alert("Failed to evaluate answer. Please try again.");
    } finally {
        interviewState.isSubmitting = false;
        renderMessages();
        updateProgress();
        updateInputRowState();
    }
}

function handleNext(isLast) {
    if (isLast) { navigate(`#/results/${interviewState.sessionId}`); return; }
    const s = interviewState.session;
    const nextIdx = interviewState.nextQuestionIndex + 1;
    interviewState.nextQuestionIndex = nextIdx;
    const nextQ = s.questions[nextIdx];
    if (!nextQ) return;

    interviewState.messages.push({ id: `q-${nextQ.id}`, role: "ai", kind: "question", question: nextQ, num: nextIdx + 1 });
    renderMessages();
    updateInputRowState();
    setTimeout(() => Voice.speak(`Question ${nextIdx + 1}: ${nextQ.question}`), 300);
    setTimeout(() => document.getElementById("text-input")?.focus(), 400);
}


// ─── RESULTS page ─────────────────────────────────────────────────────────

async function renderResults(id) {
    Voice.stopSpeaking();
    Voice.stopListening();

    app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-background">
        <div class="spinner mb-4"></div>
        <p class="text-muted-foreground font-medium pulse-soft">Analyzing your performance...</p>
    </div>`;

    let results;
    try {
        results = await api.completeSession(id);
    } catch (err) {
        console.error(err);
        app.innerHTML = `
        <div class="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
            ${ICON("alert-triangle", 'class="w-16 h-16 text-destructive mb-4"')}
            <h2 class="text-2xl font-bold mb-2">Error Loading Results</h2>
            <p class="text-muted-foreground mb-6">We couldn't finalize your interview session.</p>
            <button class="btn btn-primary" onclick="navigate('#/')">Return Home</button>
        </div>`;
        refreshIcons();
        return;
    }

    const pct = results.percentage;
    const radius = 65;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (pct / 100) * circ;

    app.innerHTML = `
    <div class="min-h-screen" style="background:hsl(var(--muted)/0.3);padding:2rem 1rem">
        <div class="max-w-5xl space-y-6">

            <div class="flex flex-col items-start justify-between gap-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <div class="brand-icon w-7 h-7 rounded-lg flex items-center justify-center">
                            ${ICON("hammer", 'class="w-3 h-3 text-white"')}
                        </div>
                        <span class="text-xs sm:text-sm font-bold text-muted-foreground tracking-wide">PrepForge</span>
                    </div>
                    <h1 class="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">Interview Results</h1>
                    <p class="text-muted-foreground text-sm" style="margin-top:.125rem">Detailed performance breakdown</p>
                </div>
                <button class="btn btn-outline btn-sm" onclick="navigate('#/')">
                    ${ICON("rotate-ccw", 'class="w-3.5 h-3.5" style="margin-right:.5rem"')} Start New Session
                </button>
            </div>

            <div class="results-summary-grid">
                <!-- Score Card -->
                <div class="card p-8 flex flex-col items-center text-center" style="background:linear-gradient(135deg,hsl(var(--card)),hsl(var(--primary)/0.05));position:relative;overflow:hidden">
                    <div style="position:absolute;top:1rem;right:1rem;color:hsl(var(--primary)/0.2)">
                        ${ICON("trophy", 'class="w-12 h-12"')}
                    </div>
                    <div class="gauge-wrap">
                        <svg viewBox="0 0 160 160" width="160" height="160">
                            <circle class="gauge-track" cx="80" cy="80" r="${radius}"></circle>
                            <circle class="gauge-fill" cx="80" cy="80" r="${radius}"
                                stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
                        </svg>
                        <div class="gauge-text">${pct}%</div>
                    </div>
                    <h3 class="font-bold text-xl mb-1">Overall Score</h3>
                    <p class="text-muted-foreground text-sm">${results.totalScore} out of ${results.maxScore} points</p>
                </div>

                <!-- Strengths/Weaknesses -->
                <div class="card p-6 flex flex-col" style="height:100%">
                    <h3 class="font-bold text-lg mb-4">Overall Feedback</h3>
                    <p class="text-muted-foreground leading-relaxed mb-6">${esc(results.overallFeedback)}</p>
                    <div class="strengths-grid" style="margin-top:auto">
                        <div>
                            <h4 class="flex items-center gap-2 font-semibold text-success mb-3">
                                ${ICON("trending-up", 'class="w-5 h-5"')} Key Strengths
                            </h4>
                            <ul class="space-y-2">
                                ${(results.strengths || []).map((s) => `
                                <li class="flex items-start gap-2 text-sm text-foreground">
                                    <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:hsl(var(--success));margin-top:.375rem"></span>
                                    ${esc(s)}
                                </li>`).join("")}
                            </ul>
                        </div>
                        <div>
                            <h4 class="flex items-center gap-2 font-semibold text-warning mb-3">
                                ${ICON("alert-triangle", 'class="w-5 h-5"')} Areas to Improve
                            </h4>
                            <ul class="space-y-2">
                                ${(results.weaknesses || []).map((w) => `
                                <li class="flex items-start gap-2 text-sm text-foreground">
                                    <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:hsl(var(--warning));margin-top:.375rem"></span>
                                    ${esc(w)}
                                </li>`).join("")}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Q&A -->
            <div>
                <h3 class="text-2xl font-bold mb-6 font-display">Detailed Review</h3>
                <div class="space-y-4" id="qa-list">
                    ${results.answers.map((ans, idx) => `
                    <div class="qa-item">
                        <button class="qa-header" data-idx="${idx}">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="score-circle ${scoreClass(ans.score)}" style="width:2.5rem;height:2.5rem;font-size:.875rem;border-width:2px">${ans.score}</div>
                                <div class="min-w-0">
                                    <h4 class="font-bold text-foreground text-sm sm:text-base">Question ${idx + 1}</h4>
                                    <p class="text-xs sm:text-sm text-muted-foreground truncate" style="max-width:200px">
                                        ${esc(ans.answer.substring(0, 60))}...
                                    </p>
                                </div>
                            </div>
                            ${ICON("chevron-down", 'class="chev-icon w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0"')}
                        </button>
                        <div class="qa-body hidden" id="qa-body-${idx}">
                            <div class="space-y-4">
                                <div>
                                    <span class="badge mb-2" style="display:inline-block;margin-bottom:.5rem">Your Answer</span>
                                    <p class="text-foreground p-3 rounded-xl text-xs sm:text-sm leading-relaxed" style="background:hsl(var(--muted)/0.3)">${esc(ans.answer)}</p>
                                </div>
                                <div class="results-detail-grid">
                                    <div>
                                        <h5 class="font-semibold text-foreground mb-2 text-sm">Feedback</h5>
                                        <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">${esc(ans.feedback)}</p>
                                    </div>
                                    <div class="improved-box">
                                        <h5 class="font-semibold text-primary mb-2 text-sm">Improved Version</h5>
                                        <p class="text-xs sm:text-sm text-foreground leading-relaxed">${esc(ans.improvedAnswer)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`).join("")}
                </div>
            </div>

        </div>
    </div>`;

    refreshIcons();

    // Q&A toggles
    document.querySelectorAll(".qa-header").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = btn.dataset.idx;
            const body = document.getElementById(`qa-body-${idx}`);
            const chev = btn.querySelector(".chev-icon");
            const isHidden = body.classList.contains("hidden");
            // Close all
            document.querySelectorAll(".qa-body").forEach((b) => b.classList.add("hidden"));
            document.querySelectorAll(".chev-icon").forEach((c) => c.classList.remove("open"));
            // Open this one if it was closed
            if (isHidden) { body.classList.remove("hidden"); chev.classList.add("open"); }
        });
    });

    // Confetti for >= 70%
    if (pct >= 70 && window.confetti) {
        const end = Date.now() + 3000;
        const colors = ["#6366f1", "#8b5cf6", "#ec4899"];
        const frame = () => {
            window.confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
            window.confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
            if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
    }
}


// Expose navigate globally so onclick="navigate(...)" works in error states
window.navigate = navigate;
