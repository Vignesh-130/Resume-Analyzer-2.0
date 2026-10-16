const analyzeBtn =
  document.getElementById("analyzeBtn");

const resultDiv =
  document.getElementById("result");

const errorDiv =
  document.getElementById("errorMessage");

const loadingButtonHtml = `
<div class="flex items-center justify-center gap-2">
    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
    </svg>
    <span>Analyzing Resume...</span>
</div>
`;

const resetButton = () => {
  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = "🔍 Analyze Resume";
};

const showError = (message) => {
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
};

const clearError = () => {
  errorDiv.textContent = "";
  errorDiv.classList.add("hidden");
};

const setLoading = (isLoading) => {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.innerHTML = isLoading
    ? loadingButtonHtml
    : "🔍 Analyze Resume";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const cleanSuggestion = (value) =>
  String(value ?? "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// =========================
// ANALYZE BUTTON
// =========================

analyzeBtn.addEventListener(
  "click",
  async function () {

    clearError();

    const jobDescription =
      document
        .getElementById("jobDescription")
        .value
        .trim();

    const fileInput =
      document.getElementById("resumeFile");

    const file =
      fileInput.files[0];

    if (!file) {
      showError("Please upload a resume file.");
      return;
    }

    if (!jobDescription) {
      showError("Please paste a job description.");
      return;
    }

    const uploadUrl = "/upload";

    // =========================
    // FORM DATA
    // =========================

    const formData =
      new FormData();

    formData.append(
      "resume",
      file
    );

    formData.append(
      "jobDescription",
      jobDescription
    );

    try {

      // =========================
      // FETCH API
      // =========================

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error || response.statusText || "Backend Error"
        );
      }

      // =========================
      // SHOW RESULTS
      // =========================

      resultDiv.classList.remove("hidden");
      resultDiv.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      // =========================
      // FILE INFO
      // =========================

      document.getElementById(
        "fileName"
      ).innerText =
        data.file_name || "";

      document.getElementById(
        "resumePreview"
      ).innerText =
        data.extracted_text || "";

      // =========================
      // SKILL BADGES
      // =========================

      function renderBadges(
        skills,
        color
      ) {

        if (!skills.length) {

          return `
            <p class="text-gray-400 text-sm">
              No skills detected
            </p>
          `;

        }

        return skills.map(skill => `

          <span class="
            px-3 py-1 rounded-full
            text-xs font-medium border
            ${color}
          ">
            ${escapeHtml(skill)}
          </span>

        `).join("");

      }

      // Technical

      document.getElementById(
        "technicalSkills"
      ).innerHTML =

        renderBadges(
          data.technical_skills,
          "bg-cyan-500/20 border-cyan-400 text-cyan-300"
        );

      // Soft

      document.getElementById(
        "softSkills"
      ).innerHTML =

        renderBadges(
          data.soft_skills,
          "bg-pink-500/20 border-pink-400 text-pink-300"
        );

      // Tools

      document.getElementById(
        "toolSkills"
      ).innerHTML =

        renderBadges(
          data.tool_skills,
          "bg-yellow-500/20 border-yellow-400 text-yellow-300"
        );

      // =========================
      // ATS READABILITY
      // =========================

      let ats=data.ats_readability;

      let label="";

      if(ats>=90)
      label="Excellent";

      else if(ats>=75)
      label="Good";

      else
      label="Needs Improvement";

      document.getElementById("atsReadability").innerHTML=`

      <div class="text-4xl font-bold text-green-400">

      ${ats}%

      </div>



      <p class="text-green-300 mt-2">

      ${label}

      </p>

      `;

      // =========================
      // FORMATTING ISSUES
      // =========================

      const issues =
        data.formatting_issues || [];

      document.getElementById(
        "formattingIssues"
      ).innerHTML =

        issues.length

          ? `
            <ul class="
              list-disc list-inside
              text-red-300 space-y-2
            ">
              ${issues.map(issue => `
                <li>${escapeHtml(issue)}</li>
              `).join("")}
            </ul>
          `

          : `
            <p class="text-green-400">
              No formatting issues found
            </p>
          `;

      // =========================
      // SKILLS SUMMARY
      // =========================

      document.getElementById(
        "skills"
      ).innerHTML = `

        <div class="space-y-4">

          <div>

            <h3 class="
              text-green-300
              font-semibold
              mb-2
            ">
              Found Skills
            </h3>

            <p class="text-sm">
              ${escapeHtml(data.found_skills.join(", ") || "No skills detected")}
            </p>

          </div>

          <div>

            <h3 class="
              text-red-300
              font-semibold
              mb-2
            ">
              Missing Skills
            </h3>

            <p class="text-sm">
              ${escapeHtml(data.missing_skills.join(", ") || "No missing skills detected")}
            </p>

          </div>

        </div>

      `;

      // =========================
      // AI SUGGESTIONS
      // =========================

      const suggestionsArray =
      Array.isArray(data.suggestions)
      ? data.suggestions
      : [];

      document.getElementById("suggestions").innerHTML = `

      <h3 class="text-xl font-bold text-cyan-300 mb-5">

      🤖 AI Suggestions

      </h3>

      <div class="space-y-4">

      ${suggestionsArray.length ?

      suggestionsArray.map((item, index) => `

      <div class="border-l-4 border-cyan-500 bg-cyan-500/10 rounded-xl p-4 shadow-md hover:bg-cyan-500/20 transition">

      <div class="flex items-center gap-2">


      <h4 class="font-semibold text-cyan-300">

      Suggestion ${index + 1}

      </h4>

      </div>

      <p class="text-gray-300 mt-3 leading-relaxed">

      ${escapeHtml(cleanSuggestion(item)).replace(/\n/g, "<br>")}

      </p>

      </div>

      `).join("")

      :

      `<p class="text-green-400">

      No suggestions. Resume looks good.

      </p>`

      }

      </div>

      `;

      // =========================
      // DESTROY OLD CHARTS
      // =========================

      if (window.skillsChartInstance) {
        window.skillsChartInstance.destroy();
      }

      if (window.strengthChartInstance) {
        window.strengthChartInstance.destroy();
      }

      // =========================
      // COMMON OPTIONS
      // =========================

      const commonOptions = {

        responsive: true,

        maintainAspectRatio: false,

        plugins:{

        legend:{
        display:false
        }

        }

      };

      // =========================
      // SKILLS BAR CHART
      // =========================

      window.skillsChartInstance =
        new Chart(
          document.getElementById(
            "skillsChart"
          ),
          {

            type: "bar",

            data: {

            labels:[
            "Matched Skills",
            "Missing Skills"
            ],

              datasets: [{

                data: [

                  Math.max(
                    0,
                    (data.required_skills || []).length -
                      (data.missing_skills || []).length
                  ),

                  data.missing_skills.length

                ],

                backgroundColor: [

                  "#22c55e",
                  "#ef4444"

                ],

                borderRadius: 8

              }]

            },

            options: commonOptions

          }
        );

        const foundCount = Math.max(
          0,
          (data.required_skills || []).length -
            (data.missing_skills || []).length
        );
const missingCount = data.missing_skills.length;

document.getElementById("skillStats").innerHTML = `

<div class="flex-1 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">

    <div class="text-4xl mb-2">✅</div>

    <div class="text-sm text-gray-400">
        Found Skills
    </div>

    <div class="text-4xl font-bold text-green-400 mt-2">
        ${foundCount}
    </div>

</div>

<div class="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">

    <div class="text-4xl mb-2">❌</div>

    <div class="text-sm text-gray-400">
        Missing Skills
    </div>

    <div class="text-4xl font-bold text-red-400 mt-2">
        ${missingCount}
    </div>

</div>

`;

        analyzeBtn.disabled = false;

      analyzeBtn.innerHTML = `
      🔍 Analyze Resume
      `;

      // =========================
      // MISSING SKILLS CHART
      // =========================

        document.getElementById("missingSkillsBadges").innerHTML =
        data.missing_skills.length
        ?
        data.missing_skills.map(skill=>`

        <span class="
        px-3
        py-2
        rounded-full
        bg-red-500/20
        border
        border-red-400
        text-red-300
        font-medium">

        ${escapeHtml(skill)}

        </span>

        `).join("")
        :
        `
        <span class="text-green-400">
        No Missing Skills
        </span>
        `;

      // =========================
      // STRENGTH CHART
      // =========================

      let score = parseFloat(data.score || 0);
      if (!Number.isFinite(score)) {
        score = 0;
      }
      score = Math.max(0, Math.min(100, score));

      document.getElementById("scoreValue").innerHTML =
        `${score}%`;

      let status = "";

      if (score >= 85)
        status = "Excellent Match";
      else if (score >= 70)
        status = "Good Match";
      else if (score >= 50)
        status = "Average Match";
      else
        status = "Needs Improvement";

      document.getElementById("scoreStatus").innerHTML =
        status;

      const chartScore = score;

      window.strengthChartInstance =
        new Chart(
          document.getElementById(
            "strengthChart"
          ),
          {

            type: "doughnut",

            data: {

              datasets: [{
              label: "",

                data: [

                  score,
                  100 - score

                ],

                backgroundColor: [

                  "#22c55e",
                  "#1e293b"

                ],

                borderWidth: 0

              }]

            },

            options: {

              responsive: true,

              maintainAspectRatio: false,

              cutout: "70%",

              plugins: {

                legend: {
                  display: false
                }

              }

            }

          }
        );

    }

    catch (error) {
      console.error(error);
      showError(error.message || "Unable to reach the backend.");
    }
    finally {
      setLoading(false);
    }

  }
);

// =========================
// FILE NAME DISPLAY
// =========================

document
  .getElementById("resumeFile")
  .addEventListener(
    "change",
    function () {

      const file =
        this.files[0];

      document.getElementById(
        "selectedFile"
      ).innerText =

        file
          ? `Selected: ${file.name}`
          : "";

    }
  );

// =========================
// BATCH RESUME SCREENING
// Separate inputs and results from the single-resume workflow.
// =========================
const batchFileInput = document.getElementById("batchResumeFiles");
const batchAnalyzeButton = document.getElementById("analyzeBatchBtn");
const batchErrorDiv = document.getElementById("batchErrorMessage");
const batchResultsSection = document.getElementById("batchResults");
const batchResultsBody = document.getElementById("batchResultsBody");
const batchDetailsDiv = document.getElementById("batchCandidateDetails");
const batchSearch = document.getElementById("batchSearch");
const batchStatusFilter = document.getElementById("batchStatusFilter");
let latestBatchResults = [];
let latestShortlistCount = 5;
let batchStatusChartInstance = null;
let batchScoreChartInstance = null;
const BATCH_HISTORY_KEY = "resumeAnalyzerBatchHistoryV1";

function readBatchHistory() {
  try { const value = JSON.parse(localStorage.getItem(BATCH_HISTORY_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch (_) { return []; }
}

function renderBatchHistory() {
  const history = readBatchHistory();
  const body = document.getElementById("batchHistoryBody");
  const empty = document.getElementById("batchHistoryEmpty");
  body.innerHTML = history.map(item => `<tr class="border-t border-white/10"><td class="p-2 whitespace-nowrap">${escapeHtml(new Date(item.timestamp).toLocaleString())}</td><td class="p-2">${Number(item.uploaded)||0}</td><td class="p-2">${Number(item.analyzed)||0}</td><td class="p-2 text-emerald-200">${Number(item.selected)||0}</td><td class="p-2">${Number(item.eligible)||0}</td><td class="p-2 text-amber-200">${Number(item.lowMatch)||0}</td><td class="p-2 text-red-200">${Number(item.failed)||0}</td></tr>`).join("");
  empty.classList.toggle("hidden", history.length > 0);
}

function saveBatchHistory(data) {
  // Aggregate-only history: never persist candidate names, resume text, or job descriptions.
  const entry = { timestamp: new Date().toISOString(), uploaded: data.total_uploaded, analyzed: data.successful, selected: data.selected, eligible: data.eligible_not_selected, lowMatch: data.low_match, failed: data.failed };
  try { localStorage.setItem(BATCH_HISTORY_KEY, JSON.stringify([entry, ...readBatchHistory()].slice(0, 25))); } catch (_) {}
  renderBatchHistory();
}

function renderBatchCharts(data) {
  if (typeof Chart === "undefined") return;
  if (batchStatusChartInstance) batchStatusChartInstance.destroy();
  if (batchScoreChartInstance) batchScoreChartInstance.destroy();
  batchStatusChartInstance = new Chart(document.getElementById("batchStatusChart"), { type: "doughnut", data: { labels: ["Selected", "Eligible not selected", "Low match", "Failed"], datasets: [{ data: [data.selected || 0, data.eligible_not_selected || 0, data.low_match || 0, data.failed || 0], backgroundColor: ["#34d399", "#38bdf8", "#fbbf24", "#f87171"], borderColor: "#0f172a", borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#e5e7eb", padding: 14 } } } } });
  const successful = (data.results || []).filter(item => item.status === "success");
  const labels = ["0–19", "20–39", "40–59", "60–79", "80–100"]; const counts = [0,0,0,0,0];
  successful.forEach(item => { const score = Math.max(0, Math.min(100, Number(item.match_score) || 0)); counts[score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4]++; });
  batchScoreChartInstance = new Chart(document.getElementById("batchScoreChart"), { type: "bar", data: { labels, datasets: [{ label: "Candidates", data: counts, backgroundColor: "#818cf8", borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,.06)" } }, y: { beginAtZero: true, ticks: { precision: 0, color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,.06)" } } }, plugins: { legend: { display: false } } } });
}

renderBatchHistory();
document.getElementById("clearBatchHistory").addEventListener("click", () => { try { localStorage.removeItem(BATCH_HISTORY_KEY); } catch (_) {} renderBatchHistory(); });

batchFileInput.addEventListener("change", () => {
  const files = Array.from(batchFileInput.files || []);
  document.getElementById("batchSelectedFiles").textContent = files.length
    ? `${files.length} resume(s) selected${files.length > 20 ? " — maximum is 20" : ""}.`
    : "No resumes selected yet.";
});

function renderBatchRows() {
  const query = batchSearch.value.trim().toLowerCase();
  const filter = batchStatusFilter.value;
  const visible = latestBatchResults.filter(item => {
    const nameMatches = String(item.file_name || "").toLowerCase().includes(query);
    const status = item.screening_status || (item.status === "success" ? "eligible_not_selected" : "failed");
    return nameMatches && (filter === "all" || filter === status);
  });
  if (!visible.length) {
    batchResultsBody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-gray-400">No candidates match this search/filter.</td></tr>';
    return;
  }
  batchResultsBody.innerHTML = visible.map(item => {
    const isSuccess = item.status === "success";
    const status = item.screening_status || (isSuccess ? "eligible_not_selected" : "failed");
    const labels = { selected: "Selected", eligible_not_selected: "Eligible but Not Selected", low_match: "Low Match", failed: "Processing Failed" };
    const classes = { selected: "bg-emerald-500/15 text-emerald-200", eligible_not_selected: "bg-sky-500/15 text-sky-200", low_match: "bg-amber-500/15 text-amber-200", failed: "bg-red-500/15 text-red-200" };
    return `<tr class="border-b border-white/10 hover:bg-white/5 align-top">
      <td class="p-3 font-semibold">${isSuccess ? `#${item.rank}` : "—"}</td>
      <td class="p-3"><div class="max-w-xs break-all font-medium">${escapeHtml(item.file_name)}</div>${item.error ? `<p class="mt-1 text-xs text-red-300">${escapeHtml(item.error)}</p>` : ""}</td>
      <td class="p-3">${isSuccess ? `<span class="font-bold text-cyan-200">${Number(item.match_score).toFixed(0)}%</span><div class="mt-2 h-1.5 w-24 rounded-full bg-white/10"><div class="h-1.5 rounded-full bg-cyan-400" style="width:${Math.max(0,Math.min(100,Number(item.match_score)||0))}%"></div></div>` : "—"}</td>
      <td class="p-3">${isSuccess ? `${Number(item.ats_readability).toFixed(0)}%` : "—"}</td>
      <td class="p-3"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status] || classes.failed}">${labels[status] || labels.failed}</span></td>
      <td class="p-3 text-xs leading-5 text-gray-300 min-w-56">${escapeHtml(item.selection_explanation || item.error || "No explanation available.")}</td>
      <td class="p-3">${isSuccess ? `<button type="button" class="batch-details-button rounded-lg bg-cyan-700 px-3 py-2 font-medium hover:bg-cyan-600" data-file="${encodeURIComponent(item.file_name)}">View Details</button>` : "—"}</td>
    </tr>`;
  }).join("");
  batchResultsBody.querySelectorAll(".batch-details-button").forEach(button => {
    button.addEventListener("click", () => {
      const item = latestBatchResults.find(candidate => candidate.file_name === decodeURIComponent(button.dataset.file));
      if (item) renderCandidateDetails(item);
    });
  });
}

function renderCandidateDetails(item) {
  const candidateStatus = item.screening_status || (item.rank <= latestShortlistCount ? "selected" : "eligible_not_selected");
  const statusLabel = ({ selected: "Selected", eligible_not_selected: "Eligible but Not Selected", low_match: "Low Match" })[candidateStatus] || "Processing Failed";
  const statusClass = candidateStatus === "selected" ? "bg-emerald-500/15 text-emerald-200" : candidateStatus === "low_match" ? "bg-amber-500/15 text-amber-200" : "bg-sky-500/15 text-sky-200";
  const suggestions = (item.suggestions || []).map(s => `<li class="ml-5 list-disc text-gray-300">${escapeHtml(s)}</li>`).join("") || '<li class="ml-5 list-disc text-gray-300">No suggestions returned.</li>';
  const technicalSet = new Set((item.technical_skills || []).map(x => String(x).toLowerCase()));
  const softSet = new Set((item.soft_skills || []).map(x => String(x).toLowerCase()));
  const toolsSet = new Set((item.tool_skills || []).map(x => String(x).toLowerCase()));
  const skillClass = skill => technicalSet.has(String(skill).toLowerCase()) ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : softSet.has(String(skill).toLowerCase()) ? "bg-pink-500/20 border-pink-400 text-pink-300" : toolsSet.has(String(skill).toLowerCase()) ? "bg-yellow-500/20 border-yellow-400 text-yellow-300" : "bg-cyan-500/20 border-cyan-400 text-cyan-300";
  const skills = (values, empty) => (values || []).length ? values.map(skill => `<span class="px-3 py-1 rounded-full text-xs font-medium border ${skillClass(skill)}">${escapeHtml(skill)}</span>`).join("") : `<span class="text-gray-400">${empty}</span>`;
  const categorizedSkills = (values, empty) => (values || []).length ? values.map(skill => { const cat = (item.required_skill_categories || {})[skill] || (item.required_skill_categories || {})[String(skill).toLowerCase()] || "technical"; const cls = cat === "soft" ? "bg-pink-500/20 border-pink-400 text-pink-300" : cat === "tools" ? "bg-yellow-500/20 border-yellow-400 text-yellow-300" : skillClass(skill); return `<span class="px-3 py-1 rounded-full text-xs font-medium border ${cls}">${escapeHtml(skill)}</span>`; }).join("") : `<span class="text-gray-400">${empty}</span>`;
  batchDetailsDiv.innerHTML = `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs uppercase tracking-wider text-cyan-300">Candidate details · Rank #${item.rank}</p><h3 class="mt-1 break-all text-xl font-bold">${escapeHtml(item.file_name)}</h3><p class="mt-2 text-sm text-gray-400">Detailed analysis generated for the batch job description.</p></div><span class="self-start rounded-full px-3 py-1 text-sm font-semibold ${statusClass}">${statusLabel}</span></div>
    <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div class="rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-4"><p class="text-sm text-gray-400">Job Match</p><p class="mt-1 text-3xl font-bold text-cyan-200">${Number(item.match_score).toFixed(0)}%</p></div><div class="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4"><p class="text-sm text-gray-400">ATS Readability</p><p class="mt-1 text-3xl font-bold text-emerald-200">${Number(item.ats_readability).toFixed(0)}%</p></div><div class="rounded-xl border border-purple-300/20 bg-purple-500/10 p-4"><p class="text-sm text-gray-400">Overall Score</p><p class="mt-1 text-3xl font-bold text-purple-200">${Number(item.overall_score).toFixed(0)}%</p></div></div>
    <div class="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2"><section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-emerald-200">Matched Skills</h4><div class="mt-3 flex flex-wrap gap-2">${categorizedSkills(item.matched_skills,"No matched skills detected")}</div></section><section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-amber-200">Missing Skills</h4><div class="mt-3 flex flex-wrap gap-2">${categorizedSkills(item.missing_skills,"No missing skills reported")}</div></section><section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-pink-200">Technical Skills</h4><div class="mt-3 flex flex-wrap gap-2">${skills(item.technical_skills,"None detected")}</div></section><section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-yellow-200">Formatting Issues</h4><ul class="mt-3 space-y-1">${(item.formatting_issues || []).length ? item.formatting_issues.map(issue => `<li class="ml-5 list-disc text-gray-300">${escapeHtml(issue)}</li>`).join("") : '<li class="text-gray-400">No formatting issues reported.</li>'}</ul></section><section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-fuchsia-200">Tools & Soft Skills</h4><p class="mt-2 text-xs uppercase tracking-wide text-gray-400">Tools</p><div class="mt-2 flex flex-wrap gap-2">${skills(item.tool_skills,"None detected")}</div><p class="mt-3 text-xs uppercase tracking-wide text-gray-400">Soft skills</p><div class="mt-2 flex flex-wrap gap-2">${skills(item.soft_skills,"None detected")}</div></section></div>
    <section class="mt-5 rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-cyan-200">Improvement Suggestions</h4><ul class="mt-3 space-y-2">${suggestions}</ul></section>
    <div class="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
      <section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-violet-200">Keyword Density (count in resume)</h4><div class="mt-3 overflow-x-auto"><table class="min-w-full text-left text-sm"><thead><tr class="text-gray-400"><th class="py-2 pr-4">Required keyword</th><th class="py-2">Count</th></tr></thead><tbody>${Object.entries(item.keyword_density || {}).map(([keyword,count]) => `<tr class="border-t border-white/10"><td class="py-2 pr-4">${escapeHtml(keyword)}</td><td class="py-2">${Number(count)||0}</td></tr>`).join("") || '<tr><td colspan="2" class="py-2 text-gray-400">No required keywords were detected.</td></tr>'}</tbody></table></div></section>
      <section class="rounded-xl border border-white/10 p-4"><h4 class="font-semibold text-sky-200">Resume Sections & Contact Signals</h4><div class="mt-3 grid grid-cols-2 gap-2 text-sm">${Object.entries(item.resume_sections || {}).map(([name,found]) => `<div class="rounded-lg bg-white/5 p-2">${escapeHtml(name.replace(/_/g," "))}: <span class="${found ? "text-emerald-300" : "text-amber-300"}">${found ? "Detected" : "Not detected"}</span></div>`).join("") || '<p class="text-gray-400">Section data unavailable.</p>'}${Object.entries(item.contact_info || {}).map(([name,found]) => `<div class="rounded-lg bg-white/5 p-2">${escapeHtml(name)}: <span class="${found ? "text-emerald-300" : "text-amber-300"}">${found ? "Detected" : "Not detected"}</span></div>`).join("")}</div></section>
    </div>
    <section class="mt-5 rounded-xl border border-violet-300/20 bg-violet-500/5 p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 class="font-semibold text-violet-200">AI Career & Skill Recommendations</h4><p class="mt-1 text-xs text-gray-400">Uses detected skill gaps to suggest a learning plan. AI output is advisory; verify course details independently.</p></div><div class="flex gap-2"><select id="careerGuidanceLanguage" class="rounded-lg border border-white/20 bg-slate-900 p-2 text-sm text-white"><option value="en">English</option><option value="te">తెలుగు</option><option value="hi">हिन्दी</option></select><button type="button" id="generateCareerGuidance" class="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold hover:bg-violet-600">Generate roadmap</button></div></div><div id="careerGuidanceOutput" class="mt-4 space-y-4"><p class="text-sm text-gray-400">Choose a language and generate recommendations for this candidate.</p></div></section>
    <section class="mt-5 rounded-xl border border-white/10 p-4"><h4 class="font-semibold">Resume Preview</h4><p class="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">${escapeHtml(item.extracted_text || "Preview is not available.")}</p></section>
    <div class="mt-5 flex flex-wrap gap-3"><button type="button" id="backToBatchResults" class="rounded-xl border border-white/20 px-4 py-2.5 font-semibold hover:bg-white/10">← Back to Screening Results</button></div>`;
  batchDetailsDiv.classList.remove("hidden");
  document.getElementById("backToBatchResults").addEventListener("click", () => {
    batchDetailsDiv.classList.add("hidden");
    batchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("generateCareerGuidance").addEventListener("click", async () => {
    const button = document.getElementById("generateCareerGuidance");
    const output = document.getElementById("careerGuidanceOutput");
    const language = document.getElementById("careerGuidanceLanguage").value;
    button.disabled = true; button.textContent = "Generating...";
    output.innerHTML = '<p class="text-sm text-gray-300">Preparing skill-gap recommendations…</p>';
    try {
      const response = await fetch("/career-guidance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missingSkills: item.missing_skills || [], matchedSkills: item.matched_skills || [], matchScore: item.match_score || 0, jobDescription: document.getElementById("batchJobDescription").value, language }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate recommendations.");
      const roadmap = (data.roadmap || []).map((step, index) => `<li class="ml-5 list-decimal text-sm text-gray-200">${escapeHtml(step)}</li>`).join("");
      const courses = (data.courses || []).map(course => `<div class="rounded-lg border border-white/10 bg-black/20 p-3"><p class="font-medium text-cyan-200">${escapeHtml(course.topic)}</p><p class="mt-1 text-sm text-gray-300">${escapeHtml(course.recommendation)}</p></div>`).join("");
      output.innerHTML = `<section><h5 class="font-semibold text-cyan-200">Job suitability explanation</h5><p class="mt-2 text-sm leading-6 text-gray-200">${escapeHtml(data.suitability || "No explanation available.")}</p></section><section><h5 class="font-semibold text-cyan-200">Suggested learning roadmap</h5><ol class="mt-2 space-y-2">${roadmap || '<li class="text-gray-400">No roadmap available.</li>'}</ol></section><section><h5 class="font-semibold text-cyan-200">Course and practice recommendations</h5><div class="mt-2 grid gap-2 md:grid-cols-2">${courses || '<p class="text-gray-400">No course recommendations available.</p>'}</div></section><p class="text-xs text-gray-500">${data.source === "ai_or_fallback" ? "AI-assisted when configured; otherwise rule-based fallback." : "Rule-based guidance (Groq API key not configured or AI unavailable)."} Recommendations are suggestions, not a hiring decision.</p>`;
    } catch (error) { output.innerHTML = `<p class="text-sm text-red-300">${escapeHtml(error.message || "Career guidance unavailable.")}</p>`; }
    finally { button.disabled = false; button.textContent = "Generate roadmap"; }
  });
  batchDetailsDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

batchSearch.addEventListener("input", renderBatchRows);
batchStatusFilter.addEventListener("change", renderBatchRows);
document.getElementById("exportBatchCsv").addEventListener("click", () => {
  if (!latestBatchResults.length) return;
  const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [["Rank","Resume","Match Score","ATS Readability","Overall Score","Screening Status","Explanation","Matched Skills","Missing Skills","Error"]];
  latestBatchResults.forEach(item => rows.push([item.rank ?? "", item.file_name, item.match_score ?? "", item.ats_readability ?? "", item.overall_score ?? "", item.screening_status || item.status, item.selection_explanation || "", (item.matched_skills || []).join("; "), (item.missing_skills || []).join("; "), item.error || ""]));
  const csv = rows.map(row => row.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url; link.download = "resume-screening-results.csv"; link.click(); URL.revokeObjectURL(url);
});

batchAnalyzeButton.addEventListener("click", async () => {
  batchErrorDiv.textContent = "";
  batchErrorDiv.classList.add("hidden");
  batchResultsSection.classList.add("hidden");
  batchDetailsDiv.classList.add("hidden");
  const files = Array.from(batchFileInput.files || []);
  const jobDescription = document.getElementById("batchJobDescription").value.trim();
  const requested = Number.parseInt(document.getElementById("shortlistCount").value, 10);
  if (!files.length) return showBatchError("Please select at least one resume for multiple-resume screening.");
  if (files.length > 20) return showBatchError("You can upload at most 20 resumes at a time.");
  if (!jobDescription) return showBatchError("Please paste the job description in the Multiple Resume Screening section.");
  if (!Number.isInteger(requested) || requested < 1 || requested > 20) return showBatchError("Enter a shortlist count from 1 to 20.");
  if (requested > files.length) return showBatchError(`You selected ${files.length} resumes, so the shortlist count cannot exceed ${files.length}.`);
  const allowedExtensions = /\.(pdf|docx)$/i;
  const tooLarge = files.find(file => file.size > 5 * 1024 * 1024);
  const invalid = files.find(file => !allowedExtensions.test(file.name));
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (tooLarge) return showBatchError(`"${tooLarge.name}" exceeds the 5 MB per-resume limit.`);
  if (invalid) return showBatchError(`"${invalid.name}" is not a PDF or DOCX file.`);
  if (totalSize > 52 * 1024 * 1024) return showBatchError("The total selected file size exceeds 52 MB.");

  const originalText = batchAnalyzeButton.textContent;
  batchAnalyzeButton.disabled = true;
  batchAnalyzeButton.textContent = "Screening resumes... Please wait";
  try {
    const formData = new FormData();
    const minMatchScore = Number(document.getElementById("minMatchScore").value);
    const minMatchedSkills = Number.parseInt(document.getElementById("minMatchedSkills").value, 10);
    if (!Number.isFinite(minMatchScore) || minMatchScore < 0 || minMatchScore > 100) throw new Error("Minimum job-match score must be between 0 and 100.");
    if (!Number.isInteger(minMatchedSkills) || minMatchedSkills < 0 || minMatchedSkills > 50) throw new Error("Minimum matched skills must be a whole number from 0 to 50.");
    formData.append("jobDescription", jobDescription);
    formData.append("shortlistCount", String(requested));
    formData.append("minMatchScore", String(minMatchScore));
    formData.append("minMatchedSkills", String(minMatchedSkills));
    files.forEach(file => formData.append("resumes", file));
    const response = await fetch("/upload-batch", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Batch screening failed.");
    latestShortlistCount = requested;
    latestBatchResults = (data.results || []).map(item => ({ ...item }));
    document.getElementById("batchSummary").textContent = `${data.total_uploaded} uploaded · ${data.successful} analyzed · ${data.selected} selected · ${data.eligible_not_selected} eligible but not selected · ${data.low_match} low match · ${data.failed} processing failed (including duplicates). Rules: match score ≥ ${minMatchScore}% and matched skills ≥ ${minMatchedSkills}; selected candidates are the highest-ranked eligible resumes up to ${requested}.`;
    document.getElementById("batchProcessedCount").textContent = data.successful;
    document.getElementById("batchShortlistedCount").textContent = data.selected;
    document.getElementById("batchEligibleCount").textContent = data.eligible_not_selected;
    document.getElementById("batchLowMatchCount").textContent = data.low_match;
    document.getElementById("batchFailedCount").textContent = data.failed;
    renderBatchRows();
    renderBatchCharts(data);
    saveBatchHistory(data);
    batchResultsSection.classList.remove("hidden");
    batchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showBatchError(error.message || "Unable to reach the backend.");
  } finally {
    batchAnalyzeButton.disabled = false;
    batchAnalyzeButton.textContent = originalText;
  }
});
function showBatchError(message) {
  batchErrorDiv.textContent = message;
  batchErrorDiv.classList.remove("hidden");
}
