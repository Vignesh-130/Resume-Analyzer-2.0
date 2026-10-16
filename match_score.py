import os
import sys
import json

# 🚫 Hide warnings/logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
sys.stderr = open(os.devnull, 'w')
sys.stdout.flush()

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load model
model = SentenceTransformer('all-MiniLM-L6-v2')

import re

def normalize(text):
    # Lowercase + remove special chars
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s+.#]', ' ', text)
    return text


def analyze_resume(resume_text, job_description):

    skills_db = [
        "python", "java", "c++", "machine learning", "deep learning",
        "nlp", "data analysis", "sql", "mongodb", "aws", "docker",
        "kubernetes", "react", "node js", "javascript", "html", "css",
        "tensorflow", "pytorch", "pandas", "numpy", "excel", "power bi",
        "cyber security", "networking", "linux", "git"
    ]

    resume_text = normalize(resume_text)
    job_description = normalize(job_description)

    resume_skills = set()
    job_skills = set()

    # 🔍 Extract skills (word-level match)
    for skill in skills_db:
        if skill in resume_text:
            resume_skills.add(skill)

        if skill in job_description:
            job_skills.add(skill)

    # 🧠 Handle synonyms manually (important)
    if "ml" in job_description:
        job_skills.add("machine learning")
    if "ml" in resume_text:
        resume_skills.add("machine learning")

    if "node.js" in job_description:
        job_skills.add("node js")
    if "node.js" in resume_text:
        resume_skills.add("node js")

    # 🎯 Missing skills
    missing_skills = list(job_skills - resume_skills)

    # 💡 Suggestions
    suggestions = []

    if missing_skills:
        suggestions.append(
            "Add missing technical skills: " + ", ".join(missing_skills[:5])
        )

    if len(resume_text) < 300:
        suggestions.append("Add more projects and detailed experience")

    suggestions.append("Use action verbs like developed, built, optimized")

    return missing_skills[:10], suggestions


def calculate_match_score(resume_text, job_description):
    embeddings = model.encode([resume_text, job_description])
    similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    return float(round(similarity * 100, 2))  # 🔥 FIX float32 issue


if __name__ == "__main__":
    resume = sys.argv[1]
    job = sys.argv[2]

    score = calculate_match_score(resume, job)
    missing_skills, suggestions = analyze_resume(resume, job)

    output = {
        "score": score,
        "missing_skills": missing_skills,
        "suggestions": suggestions
    }

    print(json.dumps(output))