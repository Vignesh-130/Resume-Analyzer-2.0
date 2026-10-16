# Resume Analyzer 2.0

### AI-Powered Resume Analysis, Candidate Screening & Career Guidance

Resume Analyzer 2.0 is a web application that evaluates resumes against job descriptions, helps recruiters compare multiple candidates, and provides personalized skill-gap and career-learning recommendations.

The system combines individual resume analysis with batch candidate screening while keeping resume readability separate from job-specific matching.

## Features

### 1. Single Resume Analysis
- Upload resumes in PDF and DOCX formats.
- Analyze a resume against a job description.
- Calculate resume readability and job-match scores.
- Identify matched and missing skills.
- Categorize technical skills, soft skills, and tools.
- Detect formatting issues and provide improvement suggestions.
- Display analysis charts and AI-assisted suggestions when configured.

### 2. Batch Candidate Screening
- Upload multiple resumes for a job opening.
- Configure the number of candidates to shortlist.
- Set job-related eligibility criteria.
- Rank candidates by job-match score.
- Categorize results as Selected, Eligible but Not Selected, Low Match, or Processing Failed.
- Search, filter, and review candidate rankings.
- Display explanations for selection outcomes.

### 3. Candidate Details, Reports & Dashboard
- Open an individual candidate's detailed analysis from the batch results.
- Review readability and match scores, skills, keyword counts, formatting issues, and suggestions.
- Export candidate rankings and screening results to CSV.
- View batch statistics and match-score distributions.
- Review recent batch-processing history.

### 4. Security, Performance & Testing
- Keep API keys in environment variables rather than source code.
- Validate supported file types and apply upload-size limits.
- Limit batch-processing concurrency and handle individual file failures.
- Avoid storing uploaded resumes in the repository.
- Run automated tests for scoring consistency and screening behavior.

### 5. AI Career & Skill Recommendations
- Identify skill gaps against job requirements.
- Generate staged learning roadmaps and course-topic suggestions.
- Explain job suitability using job-related evidence.
- Provide career guidance in English, Telugu, and Hindi.
- Use Groq-powered assistance when configured, with fallback guidance when it is unavailable.

## Technology Stack

- **Backend:** Node.js, Express
- **Frontend:** HTML, CSS, JavaScript
- **Resume parsing:** PDF and DOCX parsing libraries
- **Charts:** Chart.js
- **AI assistance:** Groq API (optional)
- **Testing:** Node.js test scripts
- **Optional service:** Python-based AI components

## Getting Started

### Prerequisites
- Node.js and npm
- Git
- A Groq API key, if AI-powered recommendations are required

### Installation

Clone the repository:

```bash
git clone https://github.com/Vignesh-130/Resume-Analyzer-2.0.git
cd Resume-Analyzer-2.0
```

Install dependencies:

```bash
npm install
```

Create a local `.env` file in the project root:

```dotenv
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

Replace the placeholder with your own API key. Never commit the populated `.env` file.

Start the application:

```bash
npm start
```

Open the local URL shown in the terminal. If the server uses port 3000, the address is typically `http://localhost:3000`.

### Run Tests

```bash
npm test
```

Tests provide repeatable checks of supported functionality. Passing automated tests does not establish real-world hiring accuracy or guarantee production security.

## Configuration and Privacy

- Keep `.env` out of Git using `.gitignore`.
- Use `.env.example` to document required environment variables without real secrets.
- Do not commit real resumes, extracted personal information, API keys, or private logs.
- Review the project's data-retention and access-control requirements before processing real candidate data.
- Treat match scores and generated career guidance as decision-support information, not definitive hiring decisions.

## Project Limitations

Resume extraction and scoring can be affected by document layout, missing information, and the quality of the job description. Recommendations should be reviewed by a person, and eligibility criteria should be relevant to the role and applied consistently.

## Future Improvements

- More comprehensive automated and integration tests
- Improved accessibility and responsive design
- Persistent, privacy-conscious recruiter history
- Expanded skill taxonomies and verified learning resources
- Further evaluation of recommendation quality and fairness

## Author

**Vignesh Pettlu**

GitHub: https://github.com/Vignesh-130

---

*Resume Analyzer 2.0 is an educational software project intended to support resume improvement and recruitment workflows. It does not guarantee employment, candidate suitability, or hiring outcomes.*
