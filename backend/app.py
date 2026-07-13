"""
PrepForge - AI Mock Interview backend (Flask + PostgreSQL + Google Gemini).

Run:
    python app.py

Environment variables required:
    DATABASE_URL          - PostgreSQL connection string
    GEMINI_API_KEY        - your Google Gemini API key
Optional:
    PORT                  - port to bind (default 5000)
"""
import json
import os
import re
import sys
import psycopg
import jwt
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
import pypdf
import io
import tenacity

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


# ─── Config ──────────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable is required.", file=sys.stderr)
    sys.exit(1)

# Gemini API configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print(
        "ERROR: GEMINI_API_KEY is required.",
        file=sys.stderr,
    )
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

PORT = int(os.environ.get("PORT", "5000"))
HOST = os.environ.get("HOST", "0.0.0.0")
JWT_SECRET = os.environ.get("JWT_SECRET", "prepforge-super-secret-key-123")

# Frontend lives one level up from backend/
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))


# ─── Database ────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg.connect(DATABASE_URL, autocommit=False)


def init_db():
    """Create tables and enums if they don't already exist."""
    schema = """
    DO $$ BEGIN
        CREATE TYPE experience_level AS ENUM ('junior', 'mid', 'senior', 'lead');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
        CREATE TYPE session_status AS ENUM ('in_progress', 'completed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        experience_level experience_level NOT NULL,
        status session_status NOT NULL DEFAULT 'in_progress',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS interview_questions (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        category TEXT NOT NULL,
        "order" INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interview_answers (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
        answer TEXT NOT NULL,
        score INTEGER NOT NULL,
        feedback TEXT NOT NULL,
        improved_answer TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(schema)
        conn.commit()


# ─── Gemini helpers ──────────────────────────────────────────────────────────

@tenacity.retry(
    wait=tenacity.wait_exponential(multiplier=1, min=2, max=10),
    stop=tenacity.stop_after_attempt(3),
    retry=tenacity.retry_if_exception_type(Exception),
    reraise=True
)
def ai_complete(prompt: str, max_tokens: int = 1024, response_mime_type: str = None) -> str:
    """Call Gemini API and return raw text. Retries on failure."""
    try:
        config = {
            "max_output_tokens": max_tokens,
            "temperature": 0.7,
        }
        if response_mime_type:
            config["response_mime_type"] = response_mime_type
            
        response = gemini_model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(**config)
        )
        return response.text or ""
    except Exception as e:
        raise Exception(f"Gemini API error: {str(e)}") from e


def safe_json_parse(text: str, fallback):
    """Strip markdown fences and parse JSON; fallback on failure."""
    try:
        # If response_mime_type worked, it should be pure JSON
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
        
    try:
        # Find json block using regex if present
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        if match:
            return json.loads(match.group(1))
        # If no fences, try finding array or object
        match = re.search(r'(\[.*\]|\{.*\})', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except (json.JSONDecodeError, ValueError):
        pass

    return fallback


# ─── Flask app ───────────────────────────────────────────────────────────────

app = Flask(__name__, static_folder=None)
CORS(app)

try:
    init_db()
except Exception as e:
    app.logger.error(f"Failed to initialize database: {e}")


# ─── Authentication ──────────────────────────────────────────────────────────

def require_auth(optional=False):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                if optional:
                    request.user = None
                    return f(*args, **kwargs)
                return jsonify({"error": "Missing or invalid token"}), 401
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                request.user = {"id": payload["user_id"], "email": payload["email"], "name": payload.get("name", "")}
            except jwt.ExpiredSignatureError:
                if optional:
                    request.user = None
                    return f(*args, **kwargs)
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                if optional:
                    request.user = None
                    return f(*args, **kwargs)
                return jsonify({"error": "Invalid token"}), 401
            return f(*args, **kwargs)
        return decorated
    return decorator

@app.route("/api/auth/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or not email or len(password) < 6:
        return jsonify({"error": "Name, valid email, and a password (min 6 chars) are required."}), 400

    password_hash = generate_password_hash(password)

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return jsonify({"error": "Email already exists"}), 409

            cur.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (name, email, password_hash)
            )
            user_id = cur.fetchone()[0]
            conn.commit()

        token = jwt.encode(
            {"user_id": user_id, "email": email, "name": name, "exp": datetime.utcnow() + timedelta(days=7)},
            JWT_SECRET, algorithm="HS256"
        )
        return jsonify({"token": token, "user": {"id": user_id, "name": name, "email": email}}), 201
    except Exception as e:
        app.logger.exception("Registration error: %s", e)
        return jsonify({"error": "Registration failed"}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()

        if not user or not check_password_hash(user[3], password):
            return jsonify({"error": "Invalid credentials"}), 401

        token = jwt.encode(
            {"user_id": user[0], "email": user[2], "name": user[1], "exp": datetime.utcnow() + timedelta(days=7)},
            JWT_SECRET, algorithm="HS256"
        )
        return jsonify({"token": token, "user": {"id": user[0], "name": user[1], "email": user[2]}}), 200
    except Exception as e:
        app.logger.exception("Login error: %s", e)
        return jsonify({"error": "Login failed"}), 500

@app.route("/api/auth/me", methods=["GET"])
@require_auth(optional=False)
def get_me():
    return jsonify({"user": request.user}), 200


# ─── Static frontend ─────────────────────────────────────────────────────────

@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:filename>")
def serve_static(filename):
    # API routes are handled below; this only serves frontend files
    full_path = os.path.join(FRONTEND_DIR, filename)
    if os.path.isfile(full_path):
        return send_from_directory(FRONTEND_DIR, filename)
    # Fallback to index.html for client-side routing
    return send_from_directory(FRONTEND_DIR, "index.html")


# ─── Health ──────────────────────────────────────────────────────────────────

@app.route("/api/healthz")
def health():
    return jsonify({"status": "ok"})


# ─── POST /api/interview/sessions — Create session + generate questions ──────

@app.route("/api/interview/sessions", methods=["POST"])
@require_auth(optional=True)
def create_session():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    role = (body.get("role") or "").strip()
    experience_level = body.get("experienceLevel")
    user_id = request.user["id"] if request.user else None

    if not name or not role or experience_level not in ("junior", "mid", "senior", "lead"):
        return jsonify({"error": "Invalid request: name, role and experienceLevel are required."}), 400

    # Generate 5 tailored questions via AI
    prompt = f"""You are an expert interviewer. Generate exactly 5 interview questions for a {experience_level}-level {role} candidate named {name}.

Return a JSON array with exactly 5 objects. Each object must have:
- "question": the interview question text
- "category": one of "Technical", "Behavioral", "Problem Solving", "System Design", or "Communication"

Mix different categories appropriately for the role and level.
Return ONLY the JSON array, no other text."""

    try:
        ai_text = ai_complete(prompt, max_tokens=2048)
        questions = safe_json_parse(ai_text, None)
    except Exception as e:
        app.logger.exception("AI question generation failed: %s", e)
        questions = None

    if not isinstance(questions, list) or len(questions) == 0:
        app.logger.info("Falling back to default questions due to API limit/error.")
        questions = [
            {"question": f"Tell me about your experience as a {role}.", "category": "Behavioral"},
            {"question": "What is the most challenging project you've worked on?", "category": "Problem Solving"},
            {"question": "How do you handle disagreements with team members?", "category": "Behavioral"},
            {"question": f"What are the core technical skills required for a {experience_level} {role}?", "category": "Technical"},
            {"question": "Where do you see your career heading in the next 5 years?", "category": "Behavioral"}
        ]

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO interview_sessions (user_id, name, role, experience_level) "
                "VALUES (%s, %s, %s, %s) RETURNING id, status, created_at",
                (user_id, name, role, experience_level),
            )
            row = cur.fetchone()
            session_id, status, created_at = row

            saved_questions = []
            for idx, q in enumerate(questions):
                cur.execute(
                    'INSERT INTO interview_questions (session_id, question, category, "order") '
                    'VALUES (%s, %s, %s, %s) RETURNING id',
                    (session_id, q.get("question", ""), q.get("category", "Technical"), idx + 1),
                )
                qid = cur.fetchone()[0]
                saved_questions.append({
                    "id": qid,
                    "sessionId": session_id,
                    "question": q.get("question", ""),
                    "category": q.get("category", "Technical"),
                    "order": idx + 1,
                })
            conn.commit()
    except Exception as e:
        app.logger.exception("DB insert failed: %s", e)
        return jsonify({"error": "Failed to create interview session"}), 500

    return jsonify({
        "id": session_id,
        "name": name,
        "role": role,
        "experienceLevel": experience_level,
        "status": status,
        "questions": saved_questions,
        "answers": [],
        "createdAt": created_at.isoformat(),
    }), 201


# ─── GET /api/interview/sessions/<id> ────────────────────────────────────────

@app.route("/api/interview/sessions/<int:session_id>", methods=["GET"])
def get_session(session_id):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, role, experience_level, status, created_at "
                "FROM interview_sessions WHERE id = %s",
                (session_id,),
            )
            session = cur.fetchone()
            if not session:
                return jsonify({"error": "Session not found"}), 404

            cur.execute(
                'SELECT id, session_id, question, category, "order" '
                'FROM interview_questions WHERE session_id = %s ORDER BY "order"',
                (session_id,),
            )
            questions = [
                {"id": r[0], "sessionId": r[1], "question": r[2], "category": r[3], "order": r[4]}
                for r in cur.fetchall()
            ]

            cur.execute(
                "SELECT id, session_id, question_id, answer, score, feedback, improved_answer, created_at "
                "FROM interview_answers WHERE session_id = %s",
                (session_id,),
            )
            answers = [
                {
                    "id": r[0],
                    "sessionId": r[1],
                    "questionId": r[2],
                    "answer": r[3],
                    "score": r[4],
                    "feedback": r[5],
                    "improvedAnswer": r[6],
                    "createdAt": r[7].isoformat(),
                }
                for r in cur.fetchall()
            ]

        return jsonify({
            "id": session[0],
            "name": session[1],
            "role": session[2],
            "experienceLevel": session[3],
            "status": session[4],
            "questions": questions,
            "answers": answers,
            "createdAt": session[5].isoformat(),
        })
    except Exception as e:
        app.logger.exception("Fetch session failed: %s", e)
        return jsonify({"error": "Failed to fetch session"}), 500


# ─── POST /api/interview/sessions/<id>/answers — Submit answer + AI eval ─────

@app.route("/api/interview/sessions/<int:session_id>/answers", methods=["POST"])
def submit_answer(session_id):
    body = request.get_json(silent=True) or {}
    question_id = body.get("questionId")
    answer = (body.get("answer") or "").strip()

    if not isinstance(question_id, int) or not answer:
        return jsonify({"error": "questionId (int) and answer (string) are required."}), 400

    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT role, experience_level FROM interview_sessions WHERE id = %s",
                (session_id,),
            )
            sess = cur.fetchone()
            if not sess:
                return jsonify({"error": "Session not found"}), 404
            role, experience_level = sess

            cur.execute(
                "SELECT question, category FROM interview_questions WHERE id = %s AND session_id = %s",
                (question_id, session_id),
            )
            q = cur.fetchone()
            if not q:
                return jsonify({"error": "Question not found"}), 404
            question_text, category = q

        eval_prompt = f"""You are an expert interviewer evaluating a candidate's answer for a {experience_level}-level {role} position.

Question: {question_text}
Category: {category}
Candidate's Answer: {answer}

Evaluate this answer and return a JSON object with exactly these fields:
- "score": integer from 0 to 10 (0=terrible, 5=acceptable, 10=perfect)
- "feedback": string with 2-3 sentences of specific, constructive feedback
- "improvedAnswer": string with a better version of the answer (2-4 sentences)

Return ONLY the JSON object, no other text."""

        try:
            ai_text = ai_complete(eval_prompt, max_tokens=1024)
        except Exception as e:
            app.logger.exception("AI evaluation failed: %s", e)
            ai_text = "{}"

        fallback = {
            "score": 5,
            "feedback": "(API Fallback) We couldn't evaluate your answer due to high API usage or a network error. Please try again or provide a longer answer.",
            "improvedAnswer": f"A strong answer would include specific examples from your experience, demonstrate technical depth appropriate for a {experience_level} {role}, and clearly articulate your thought process.",
        }
        evaluation = safe_json_parse(ai_text, fallback)

        # Sanitize score robustly in case AI outputs "8/10" instead of 8
        try:
            raw_score = str(evaluation.get("score", "5"))
            match = re.search(r'(\d+)', raw_score)
            if match:
                score = int(match.group(1))
            else:
                score = 5
        except Exception:
            score = 5
        score = max(0, min(10, score))

        feedback = str(evaluation.get("feedback") or fallback["feedback"])
        improved_answer = str(evaluation.get("improvedAnswer") or fallback["improvedAnswer"])

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO interview_answers (session_id, question_id, answer, score, feedback, improved_answer) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (session_id, question_id, answer, score, feedback, improved_answer),
            )
            answer_id = cur.fetchone()[0]
            conn.commit()

        return jsonify({
            "answerId": answer_id,
            "score": score,
            "feedback": feedback,
            "improvedAnswer": improved_answer,
        })
    except Exception as e:
        app.logger.exception("Submit answer failed: %s", e)
        return jsonify({"error": "Failed to evaluate answer"}), 500


# ─── POST /api/interview/sessions/<id>/complete — Finalize + summary ─────────

@app.route("/api/interview/sessions/<int:session_id>/complete", methods=["POST"])
def complete_session(session_id):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT role, experience_level FROM interview_sessions WHERE id = %s",
                (session_id,),
            )
            sess = cur.fetchone()
            if not sess:
                return jsonify({"error": "Session not found"}), 404
            role, experience_level = sess

            cur.execute(
                "SELECT id, session_id, question_id, answer, score, feedback, improved_answer, created_at "
                "FROM interview_answers WHERE session_id = %s ORDER BY id",
                (session_id,),
            )
            rows = cur.fetchall()

        if not rows:
            return jsonify({"error": "No answers submitted yet"}), 400

        answers = [
            {
                "id": r[0],
                "sessionId": r[1],
                "questionId": r[2],
                "answer": r[3],
                "score": r[4],
                "feedback": r[5],
                "improvedAnswer": r[6],
                "createdAt": r[7].isoformat(),
            }
            for r in rows
        ]
        total_score = sum(a["score"] for a in answers)
        max_score = len(answers) * 10
        percentage = round((total_score / max_score) * 100) if max_score > 0 else 0

        feedback_lines = "\n".join(
            f"Answer {i + 1}: Score {a['score']}/10 — {a['feedback']}" for i, a in enumerate(answers)
        )
        summary_prompt = f"""You are an expert interviewer. A {experience_level}-level {role} candidate just completed a mock interview.

Their scores and feedback:
{feedback_lines}

Overall percentage: {percentage}%

Return a JSON object with exactly these fields:
- "strengths": array of 2-3 short strings (specific strengths demonstrated)
- "weaknesses": array of 2-3 short strings (areas needing improvement)
- "overallFeedback": string with 2-3 sentences of encouraging overall assessment

Return ONLY the JSON object, no other text."""

        try:
            ai_text = ai_complete(summary_prompt, max_tokens=512)
        except Exception as e:
            app.logger.exception("AI summary failed: %s", e)
            ai_text = "{}"

        fallback = {
            "strengths": ["Completed all interview questions", "Engaged with technical topics"],
            "weaknesses": ["Could provide more specific examples", "Consider expanding on technical depth"],
            "overallFeedback": f"You scored {percentage}% overall. Keep practicing to improve your interview skills!",
        }
        summary = safe_json_parse(ai_text, fallback)
        strengths = summary.get("strengths") or fallback["strengths"]
        weaknesses = summary.get("weaknesses") or fallback["weaknesses"]
        overall_feedback = summary.get("overallFeedback") or fallback["overallFeedback"]

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE interview_sessions SET status = 'completed' WHERE id = %s",
                (session_id,),
            )
            conn.commit()

        return jsonify({
            "sessionId": session_id,
            "totalScore": total_score,
            "maxScore": max_score,
            "percentage": percentage,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "overallFeedback": overall_feedback,
            "answers": answers,
        })
    except Exception as e:
        app.logger.exception("Complete session failed: %s", e)
        return jsonify({"error": "Failed to complete session"}), 500


# ─── MEGA PROJECT TOOLS ──────────────────────────────────────────────────────

@app.route("/api/tools/ats-scan", methods=["POST"])
@require_auth(optional=False)
def ats_scan():
    if "resume" not in request.files or "job_description" not in request.form:
        return jsonify({"error": "PDF resume and job_description are required."}), 400

    resume_file = request.files["resume"]
    jd_text = request.form["job_description"].strip()

    if resume_file.filename == "" or not resume_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Invalid file. Please upload a PDF."}), 400

    if not jd_text:
        return jsonify({"error": "Job description cannot be empty."}), 400

    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(resume_file.read()))
        resume_text = ""
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
    except Exception as e:
        app.logger.exception("Failed to parse PDF: %s", e)
        return jsonify({"error": "Failed to read PDF. Ensure it is not corrupted or password-protected."}), 400

    prompt = f"""You are an elite Technical Recruiter and ATS (Applicant Tracking System) simulator.
I am providing a candidate's Resume and a target Job Description.

Resume Text:
{resume_text}

Job Description:
{jd_text}

Analyze the resume against the job description and return a JSON object with EXACTLY these fields:
- "matchScore": integer from 0 to 100 representing the ATS match percentage
- "missingKeywords": array of strings (crucial skills or keywords in the JD that are missing from the resume)
- "matchingKeywords": array of strings (skills in both)
- "formattingFeedback": string (1-2 sentences on resume structure and ATS readability)
- "linkedinOptimization": string (2-3 sentences advising how to update their LinkedIn "About" or "Experience" sections to attract recruiters for this specific role)

Return ONLY the JSON object, no other text."""

    try:
        ai_text = ai_complete(prompt, max_tokens=1500)
    except Exception as e:
        app.logger.exception("ATS scan AI failed: %s", e)
        return jsonify({"error": "AI analysis failed."}), 500

    fallback = {
        "matchScore": 0,
        "missingKeywords": ["Failed to analyze"],
        "matchingKeywords": [],
        "formattingFeedback": "We couldn't analyze the formatting due to an API error.",
        "linkedinOptimization": "Please try again later."
    }
    result = safe_json_parse(ai_text, fallback)
    return jsonify(result), 200

@app.route("/api/tools/resume-builder", methods=["POST"])
@require_auth(optional=False)
def resume_builder():
    if "resume" not in request.files or "job_description" not in request.form:
        return jsonify({"error": "PDF resume and job_description are required."}), 400

    resume_file = request.files["resume"]
    jd_text = request.form["job_description"].strip()

    if resume_file.filename == "" or not resume_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Invalid file. Please upload a PDF."}), 400

    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(resume_file.read()))
        resume_text = ""
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
    except Exception as e:
        app.logger.exception("Failed to parse PDF: %s", e)
        return jsonify({"error": "Failed to read PDF."}), 400

    prompt = rf"""You are an elite Resume Writer. Your task is to rewrite the candidate's resume to perfectly match the provided Job Description, and output it in the famous LaTeX 'Jake's Resume' format.

Candidate's Original Resume:
{resume_text}

Target Job Description:
{jd_text}

Instructions:
1. Rewrite the experience bullet points using strong action verbs and metrics.
2. Tailor the skills section to include keywords from the Job Description.
3. Keep it strictly to ONE page.
4. Output the complete, compilable LaTeX code based strictly on the standard Jake's Resume template. Do NOT include any markdown formatting or code blocks (like ```latex). JUST output the raw LaTeX code starting with \documentclass and ending with \end{{document}}.

Return ONLY the raw LaTeX string."""

    try:
        # Use plain text response, not json
        ai_text = ai_complete(prompt, max_tokens=3000)
        # Strip markdown fences if Gemini added them anyway
        ai_text = re.sub(r'^```[a-zA-Z]*\n', '', ai_text)
        ai_text = re.sub(r'\n```$', '', ai_text)
        return jsonify({"latex": ai_text.strip()}), 200
    except Exception as e:
        app.logger.exception("Resume builder AI failed: %s", e)
        return jsonify({"error": "AI generation failed."}), 500

@app.route("/api/tools/cover-letter", methods=["POST"])
@require_auth(optional=False)
def cover_letter():
    if "resume" not in request.files or "job_description" not in request.form:
        return jsonify({"error": "PDF resume and job_description are required."}), 400

    resume_file = request.files["resume"]
    jd_text = request.form["job_description"].strip()

    try:
        pdf_reader = pypdf.PdfReader(io.BytesIO(resume_file.read()))
        resume_text = ""
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
    except Exception as e:
        return jsonify({"error": "Failed to read PDF."}), 400

    prompt = f"""You are an expert Career Coach. Write a highly professional, engaging, and personalized cover letter for the candidate based on their resume and the target Job Description.

Candidate's Resume:
{resume_text}

Target Job Description:
{jd_text}

Instructions:
1. Do not use generic buzzwords. Draw specific connections between the candidate's experience and the job's requirements.
2. Keep it to 3-4 paragraphs.
3. Use standard business letter formatting (include placeholder [Company Name], etc. if missing).

Return ONLY the plain text of the cover letter."""

    try:
        ai_text = ai_complete(prompt, max_tokens=1000)
        return jsonify({"coverLetter": ai_text.strip()}), 200
    except Exception as e:
        app.logger.exception("Cover letter AI failed: %s", e)
        return jsonify({"error": "AI generation failed."}), 500

@app.route("/api/tools/leetcode", methods=["POST"])
@require_auth(optional=False)
def leetcode_assistant():
    body = request.get_json(silent=True) or {}
    problem = (body.get("problem") or "").strip()
    code = (body.get("code") or "").strip()
    language = (body.get("language") or "python").strip()

    if not problem or not code:
        return jsonify({"error": "Problem description and code are required."}), 400

    prompt = f"""You are an expert LeetCode Interviewer at a FAANG company.
The candidate is solving the following problem:
{problem}

Here is their current {language} code:
```
{code}
```

Instructions:
1. DO NOT give them the direct answer or the full corrected code.
2. Provide a JSON object evaluating their approach.
3. Include time/space complexity analysis (Big O).
4. Point out edge cases they missed.
5. Give a progressive hint to guide them.

Return ONLY a JSON object with these EXACT fields:
- "complexity": string (e.g. "Time: O(N), Space: O(1)")
- "edgeCases": array of strings
- "feedback": string (2-3 sentences analyzing their approach)
- "hint": string (a guiding hint)"""

    try:
        ai_text = ai_complete(prompt, max_tokens=1000)
    except Exception as e:
        app.logger.exception("LeetCode AI failed: %s", e)
        return jsonify({"error": "AI analysis failed."}), 500

    fallback = {
        "complexity": "Unknown",
        "edgeCases": ["Could not evaluate edge cases"],
        "feedback": "An API error occurred.",
        "hint": "Try breaking down the problem into smaller steps."
    }
    result = safe_json_parse(ai_text, fallback)
    return jsonify(result), 200


# ─── Entrypoint ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    app.run(host=HOST, port=PORT, debug=False, threaded=True)
