import { resultService } from '../../services/api.js';

export async function renderResults(container, user) {
  container.innerHTML = `
    <div class="topbar"><div><h1>My Results</h1><p>View your exam results</p></div></div>
    <div id="results-wrap"><div class="spinner"></div></div>
  `;
  try {
    const { results } = await resultService.myResults();
    const wrap = document.getElementById('results-wrap');
    if (!results.length) {
      wrap.innerHTML = `<div class="card"><p style="color:#9CA3AF">No results available yet.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="grid-2">
        ${results.map(r => `
          <div class="card" style="border-top:4px solid ${r.passed ? 'var(--green)' : 'var(--red)'}">
            <h3 style="font-weight:700;color:var(--navy)">${r.exam?.title || 'Exam'}</h3>
            <p style="color:#9CA3AF;font-size:13px;margin:4px 0 16px">${r.exam?.subject || ''}</p>
            <div class="flex justify-between" style="margin-bottom:12px">
              <div>
                <div style="font-size:28px;font-weight:800;color:var(--navy)">${r.percentage}%</div>
                <div style="font-size:12px;color:#9CA3AF">Score</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:28px;font-weight:800;color:var(--navy)">${r.grade}</div>
                <div style="font-size:12px;color:#9CA3AF">Grade</div>
              </div>
            </div>
            <span class="badge badge-${r.passed ? 'green' : 'red'}" style="margin-bottom:12px">
              ${r.passed ? 'PASSED' : 'FAILED'}
            </span>
            ${r.teacherFeedback ? `
              <div style="background:var(--gray-50);border-radius:8px;padding:12px;margin-top:8px">
                <div style="font-size:12px;font-weight:600;color:var(--gray-600)">Teacher Comment</div>
                <div style="font-size:13px;margin-top:4px">${r.teacherFeedback}</div>
              </div>
            ` : ''}
            ${r.aiFeedback?.recommendations?.length ? `
              <div style="background:#E8F0FC;border-radius:8px;padding:12px;margin-top:8px">
                <div style="font-size:12px;font-weight:600;color:var(--blue)">AI Recommendations</div>
                <ul style="font-size:13px;margin-top:6px;padding-left:16px">
                  ${r.aiFeedback.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    document.getElementById('results-wrap').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
  }
}
