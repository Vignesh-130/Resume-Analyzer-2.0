# \# 🚀 Resume Analyzer 2.0

# \### AI-Powered Resume Intelligence, Candidate Screening \& Career Development

# 

# \*\*Transform resumes into actionable career insights.\*\*

# 

# Resume Analyzer 2.0 is an AI-assisted web application designed to help job seekers understand their resume quality and job compatibility while helping recruiters organize and screen multiple candidates. It combines ATS-style resume analysis, skill-gap identification, candidate ranking, interactive dashboards, and multilingual career guidance in one platform.

# 

# The system separates \*\*resume readability\*\* from \*\*job-specific match scoring\*\*, helping users understand both how clearly their resume is structured and how closely its skills align with a target job description.

# 

# \---

# 

# \## ✨ Key Highlights

# 

# \- 📄 \*\*Resume Intelligence\*\* — Analyze PDF and DOCX resumes against job descriptions.

# \- 🎯 \*\*ATS-Style Scoring\*\* — Evaluate resume readability and job-match compatibility separately.

# \- 🔍 \*\*Skill-Gap Analysis\*\* — Identify matched skills and missing job-related skills.

# \- 👥 \*\*Batch Candidate Screening\*\* — Process, categorize, and rank multiple resumes.

# \- 📊 \*\*Interactive Dashboard\*\* — Explore candidate statistics and match-score distributions.

# \- 📁 \*\*Candidate Reports\*\* — Review individual results and export screening data to CSV.

# \- 🧠 \*\*AI-Assisted Career Guidance\*\* — Generate skill-development suggestions and learning roadmaps.

# \- 🌐 \*\*Multilingual Guidance\*\* — Provide career guidance in English, Telugu, and Hindi.

# \- 🔐 \*\*Security-Aware Design\*\* — Keep API credentials in environment variables and apply upload controls.

# 

# \---

# 

# \## 🧩 Project Modules

# 

# \### 1. Resume Analysis Engine

# 

# Evaluates an individual resume against a target job description.

# 

# \- Supports PDF and DOCX resume uploads.

# \- Calculates an ATS-style job-match score.

# \- Calculates resume readability separately from job matching.

# \- Identifies matched and missing skills.

# \- Highlights formatting and ATS readability concerns.

# \- Provides resume improvement suggestions, with optional Groq AI assistance.

# 

# \### 2. Batch Screening \& Candidate Ranking

# 

# Simplifies the initial review of multiple candidates for a job.

# 

# \- Accepts multiple resumes and a common job description.

# \- Ranks successfully analyzed candidates by job-match score.

# \- Applies configurable selection thresholds.

# \- Categorizes candidates as \*\*Selected\*\*, \*\*Eligible but Not Selected\*\*, \*\*Low Match\*\*, or \*\*Processing Failed\*\*.

# \- Supports candidate search, status filtering, and selection explanations.

# \- Helps make screening more organized and repeatable.

# 

# \### 3. Candidate Details, Reports \& Dashboard

# 

# Provides a consolidated view of screening results.

# 

# \- Displays individual candidate analysis details.

# \- Shows scores, matched skills, missing skills, and improvement suggestions.

# \- Visualizes candidate categories and match-score distributions.

# \- Exports batch screening results to CSV.

# \- Maintains a browser-based history of batch processing summaries.

# 

# \### 4. Security, Performance \& Testing

# 

# Introduces safeguards and automated checks for the application workflow.

# 

# \- Restricts supported resume formats and upload sizes.

# \- Processes batch uploads sequentially to manage workload.

# \- Applies HTTP security headers and appropriate response-cache controls.

# \- Keeps API credentials outside source code.

# \- Uses automated tests and a synthetic resume fixture to check core scoring and screening behavior.

# 

# \### 5. AI Career \& Skill Recommendations

# 

# Connects resume analysis with practical skill-development guidance.

# 

# \- Identifies potential skill gaps relative to a target job.

# \- Generates personalized learning-roadmap suggestions.

# \- Recommends relevant course topics for further learning.

# \- Provides career guidance in English, Telugu, and Hindi.

# \- Uses deterministic fallback guidance when the Groq API is not configured.

# \- Displays categorized skill badges consistently across analysis screens.

# 

# \---

# 

# \## 🛠️ Technology Stack

# 

# | Component | Technologies |

# |---|---|

# | Frontend | HTML5, CSS3, JavaScript |

# | Backend | Node.js, Express.js |

# | Visualization | Chart.js |

# | AI integration | Groq API (optional) |

# | Resume processing | PDF and DOCX parsing |

# | Testing | Node.js test scripts, synthetic DOCX fixture |

# | Version control | Git and GitHub |

# 

# \*\*Architecture note:\*\* The default application workflow uses the Node.js backend. The optional Python AI service is not part of the default Node.js request path.

# 

# \---

# 

# \## ⚙️ Getting Started

# 

# \### Prerequisites

# 

# Install the following before running the project:

# 

# \- Node.js and npm

# \- Git

# \- A modern web browser

# \- A Groq API key, only if you want to enable Groq-powered assistance

# 

# \### 1. Clone the repository

# 

# ```bash

# git clone https://github.com/Vignesh-130/Resume-Analyzer-2.0.git

# cd Resume-Analyzer-2.0

# ```

# 

# \### 2. Install dependencies

# 

# ```bash

# npm install

# ```

# 

# \### 3. Configure environment variables

# 

# Create a local `.env` file in the project root, using `.env.example` as a reference.

# 

# ```env

# GROQ\_API\_KEY=your\_groq\_api\_key\_here

# PORT=3000

# ```

# 

# Replace the placeholder with your own API key. Keep `.env` private and never commit it to GitHub. If the application supports fallback guidance without a key, you can test that workflow before configuring Groq.

# 

# \### 4. Start the application

# 

# ```bash

# npm start

# ```

# 

# Open the local address displayed in your terminal. If the server uses port 3000, it will typically be:

# 

# `http://localhost:3000`

# 

# \### 5. Run automated tests

# 

# ```bash

# npm test

# ```

# 

# The committed synthetic resume fixture supports repeatable testing without using private candidate resumes. Tests provide baseline checks; they do not establish real-world hiring accuracy or guarantee production security.

# 

# \---

# 

# \## 🔒 Privacy, Security \& Responsible Use

# 

# \- Keep API keys and other secrets out of source control.

# \- Use resumes only with appropriate permission.

# \- Avoid sharing confidential candidate information in logs or public repositories.

# \- Review AI-generated suggestions before acting on them.

# \- Treat match scores and screening categories as decision-support information, not final hiring decisions.

# \- Evaluate screening rules for job relevance and fairness.

# 

# \---

# 

# \## 🎯 Project Objectives

# 

# 1\. Improve understanding of resume readability and job-description compatibility.

# 2\. Identify relevant skill gaps to guide targeted learning.

# 3\. Organize batch resume screening through configurable ranking and categorization.

# 4\. Present screening results through clear reports and visual summaries.

# 5\. Connect resume analysis with multilingual career-development guidance.

# 

# \## 🔮 Future Enhancements

# 

# \- Expand resume parsing and skill extraction.

# \- Improve the relevance of learning-roadmap recommendations.

# \- Add broader evaluation datasets and fairness testing.

# \- Improve deployment monitoring, accessibility, and user experience.

# \- Explore additional career paths and skill-demand analysis.

# 

# \---

# 

# \## 👨‍💻 Author

# 

# \*\*Vignesh Pettlu\*\*

# Final-Year B.Tech Project

# 

# \*\*Project:\*\* Resume Analyzer 2.0

# 

# \---

# 

# \*Resume Analyzer 2.0 is an educational project intended to support resume improvement, candidate screening, and career planning. It does not guarantee employment or replace human judgment.\*

