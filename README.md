# 🚀 PrepForge

![PrepForge Banner](https://img.shields.io/badge/PrepForge-AI_Career_Copilot-4F46E5?style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![PostgreSQL](https://img.shields.io/badge/postgresql-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)

**🌐 Live Demo:** [https://prepforge.vercel.app]([https://prepforge.vercel.app](https://mock-interview-91bt.onrender.com/)) 

PrepForge is your ultimate AI-powered career preparation platform. Designed to help candidates excel in technical interviews, optimize their professional presence, and secure their dream jobs. It acts as an autonomous AI Career Copilot.

---

## 🌟 Key Features

PrepForge provides a comprehensive suite of tools spanning the entire interview and job hunting lifecycle:

- 🎙️ **AI Interviewer (Voice-to-Voice):** Practice behavioral and technical interviews via a real-time voice interface. The AI listens via your microphone, dictates questions aloud using the Web Speech API, and grades your responses out of 10.
- 📄 **Resume Analyzer:** Upload your resume (PDF) to receive an instant ATS compatibility score, identified strengths, missing skills, and actionable improvement tips tailored to your target role.
- 🔗 **LinkedIn Optimizer:** Upload your LinkedIn profile (PDF) and get a comprehensive optimization report, including a rewritten headline, improved summary, and critical skill gap analysis.
- 📝 **Cover Letter Generator:** Upload your resume and job description to instantly generate a highly tailored, compelling cover letter matching your desired tone.
- 🧠 **Aptitude Test Generator:** Generate challenging, category-specific multiple-choice questions (Logical, Quant, System Design, Verbal, DSA) tailored to specific target companies.
- 💻 **LeetCode Assistant:** Get non-spoilery hints, approach strategies, and time/space complexity analysis for any algorithmic problem without revealing the direct solution immediately.
- 📚 **Question Bank Generator:** Create a personalized list of high-quality, practical interview questions based on your target role, industry, and company.

---

## 🛠️ Tech Stack & Architecture

This project is structured as a scalable monorepo using **pnpm workspaces**.

- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, framer-motion, Lucide Icons.
- **Backend:** Node.js, Express, Drizzle ORM, pdf-parse (for processing Resume and LinkedIn PDFs).
- **Database:** PostgreSQL (via Supabase).
- **AI Models:** Llama-3.1-8b-instant (via Groq API) for core intelligence and incredibly fast response times.
- **Speech Models:** Whisper (STT) for flawless voice transcription. Native browser SpeechSynthesis for low-latency AI dictation.

### Directory Structure

```text
PrepForge/
├── artifacts/
│   ├── prepforge/      # The React + Vite Frontend application
│   └── api-server/     # The Express + Node.js Backend application
├── lib/
│   ├── api-zod/        # Shared Zod schemas for API validation
│   ├── db/             # Drizzle ORM database schema and connection
│   └── integrations-openai-ai-server/ # AI Integrations (Groq/Whisper)
└── package.json        # Monorepo root config
```

---

## 📦 Getting Started

### Prerequisites
- Node.js (v20+)
- pnpm (package manager)
- A [Groq API Key](https://console.groq.com/) for AI generation
- A PostgreSQL Database URL (e.g. [Supabase](https://supabase.com/))

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shreyas-chougale/PrepForge.git
   cd PrepForge
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/dbname"
   GROQ_API_KEY="your-groq-api-key"
   ```

4. **Initialize the Database:**
   Push the Drizzle schema to your PostgreSQL database to create the necessary user and session tables:
   ```bash
   pnpm run db:push
   ```

5. **Start the Development Server:**
   Launch both the frontend and backend simultaneously:
   ```bash
   pnpm run dev
   ```
   The frontend will be available at `http://localhost:5173` and the backend will run at `http://localhost:5000`.

---

## 🌐 Deployment

The monorepo structure makes it straightforward to deploy to modern cloud platforms:

- **Frontend (`artifacts/prepforge`):** Deploy seamlessly to **Vercel** or **Netlify**. Set the build command to `pnpm run build` and output directory to `dist`. Ensure you set the `VITE_API_URL` environment variable to point to your live backend URL.
- **Backend (`artifacts/api-server`):** Deploy to **Render**, **Heroku**, or **DigitalOcean**. The build script uses `esbuild` for an optimized, single-file deployment. 

*(Make sure to set the `DATABASE_URL` and `GROQ_API_KEY` environment variables on your production backend server!)*

---

*Built with ❤️ to help you land your dream job.*
