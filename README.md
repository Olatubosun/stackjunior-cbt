# StackJunior CBT Platform

AI-Powered Computer Based Testing platform for schools.

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and OpenAI API key
npm run dev
```
Backend runs on: **http://localhost:5000**

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: **http://localhost:3000**

### 3. Open browser at http://localhost:3000

---

## Project Structure

```
stackjunior-cbt/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/         (User, Question, Exam, Result)
│   ├── controllers/    (auth, question, exam, result, ai)
│   └── routes/         (auth, questions, exams, results, ai)
│
└── frontend/
    ├── server.js
    ├── .env.example
    └── public/
        ├── index.html
        ├── css/main.css
        └── js/
            ├── utils/      (api.js, auth.js, helpers.js)
            ├── components/ (navbar.js, modal.js, toast.js)
            └── pages/      (login, register, dashboard, questions,
                             createQuestion, aiGenerate, exams,
                             createExam, takeExam, results, resultDetail)
```

---

## .env Variables

```
# backend/.env
PORT=5000
MONGO_URI=mongodb://localhost:27017/stackjunior_cbt
JWT_SECRET=any_long_secret_string
JWT_EXPIRE=7d
OPENAI_API_KEY=sk-your-openai-key
NODE_ENV=development
```

---

## User Roles
- **super_admin** — full access
- **school_admin** — manage school, staff, students
- **teacher**      — questions, exams, marking, results
- **student**      — take exams, view released results
