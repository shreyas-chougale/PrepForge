# PrepForge

PrepForge is your ultimate AI-powered career preparation platform. Designed to help candidates excel in technical interviews, optimize their professional presence, and secure their dream jobs.

## 🚀 Features

PrepForge provides a comprehensive suite of tools spanning the entire interview lifecycle:

- **AI Interviewer (Voice-to-Voice):** Practice behavioral and technical interviews via a real-time voice interface. The AI listens, dictates questions, and grades your responses.
- **Aptitude Test Generator:** Generate challenging, category-specific multiple-choice questions (Logical, Quant, System Design, Verbal, DSA) tailored to specific target companies.
- **LeetCode Assistant:** Get non-spoilery hints, approach strategies, and time/space complexity analysis for any algorithmic problem without revealing the direct solution immediately.
- **Question Bank Generator:** Create a personalized list of high-quality, practical interview questions based on your target role, industry, and company.
- **Resume Analyzer:** Upload your resume (PDF) to receive an instant ATS compatibility score, identified strengths, missing skills, and actionable improvement tips based on your target role.
- **LinkedIn Optimizer:** Upload your LinkedIn profile (PDF) and get a comprehensive optimization report, including a rewritten headline, improved summary, and critical skill gap analysis.
- **Cover Letter Generator:** Upload your resume and job description to instantly generate a highly tailored, compelling cover letter matching your desired tone.

## 🛠️ Tech Stack

This project is a monorepo built with:

- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend:** Node.js, Express, Drizzle ORM
- **Database:** Supabase (PostgreSQL)
- **AI Models:** Llama-3.1-8b-instant (via Groq API) for core intelligence
- **Speech Models:** Whisper (STT) for voice transcription

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (package manager)
- A Groq API Key
- A Supabase Database URL

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd PrepForge
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following keys:
   ```env
   DATABASE_URL="your-supabase-connection-string"
   GROQ_API_KEY="your-groq-api-key"
   ```

4. **Initialize the Database:**
   ```bash
   pnpm run db:push
   ```

5. **Start the Development Server:**
   ```bash
   pnpm run dev
   ```
   The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## 🌐 Deployment

The monorepo structure makes it straightforward to deploy:

- **Frontend (`artifacts/prepforge`):** Can be deployed seamlessly to Vercel or Netlify.
- **Backend (`artifacts/api-server`):** Can be deployed to Render, Heroku, or DigitalOcean App Platform.

Make sure to set the `DATABASE_URL` and `GROQ_API_KEY` environment variables on your production servers!
