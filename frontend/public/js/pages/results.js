// js/pages/results.js

const ResultsPage = {
  render() {
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">${Auth.isTeacher() ? 'Results Management' : 'My Results'}</h1>
            <p class="page-subtitle">
              ${Auth.isTeacher()
                ? 'Review AI-marked answers, add feedback, and release results to students'
                : 'View your released exam results'}
            </p>
          </div>
        </div>

        ${Auth.isTeacher() ? `
          <!-- Status filter tabs for teacher -->
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="ResultsPage.filter('all')"        id="f-all">All</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('pending')"    id="f-pending">Pending</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('ai_marked')"  id="f-ai">AI Marked</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('teacher_reviewed')" id="f-reviewed">Reviewed</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('released')"   id="f-released">Released</button>
          </div>
        ` : ''}

        <div class="card">
          <div id="results-list">
            <div style="text-align:center;padding:40px">
              <div class="spinner" style="margin:auto"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _allResults: [],
  _filter: 'all',

  async init() {
    Navbar.setActive('results');
    await this.load();
  },

  async load() {
    try {
      const data         = await Api.getResults();
      this._allResults   = data.results || [];
      this.renderList();
    } catch (err) {
      Toast.error('Failed to load results');
    }
  },

  filter(status) {
    this._filter = status;
    ['all','pending','ai','reviewed','released'].forEach(k => {
      const btn = document.getElementById(`f-${k}`);
      if (btn) btn.className = 'btn btn-sm ' + (k === status || (k === 'ai' && status === 'ai_marked') ? 'btn-primary' : 'btn-outline');
    });
    this.renderList();
  },

  renderList() {
    let results = this._allResults;
    if (this._filter !== 'all') {
      results = results.filter(r => r.status === this._filter);
    }

    if (!results.length) {
      Helpers.setHTML('results-list', `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>No results found</h3>
          <p>${Auth.isTeacher() ? 'No results match this filter' : 'No released results yet'}</p>
        </div>
      `);
      return;
    }

    Helpers.setHTML('results-list', `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${Auth.isTeacher() ? '<th>Student</th>' : ''}
              <th>Exam</th>
              <th>Subject</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr>
                ${Auth.isTeacher() ? `<td><strong>${r.student?.name || '-'}</strong><br>
                  <span style="font-size:12px;color:var(--muted)">${r.student?.class || ''}</span></td>` : ''}
                <td>${r.exam?.title || '-'}</td>
                <td>${r.exam?.subject || '-'}</td>
                <td>
                  <strong>${r.totalScore || 0}</strong>
                  <span style="color:var(--muted)">/${r.totalMarks || 0}</span>
                  <span style="font-size:12px;color:var(--muted);margin-left:4px">(${r.percentage || 0}%)</span>
                </td>
                <td>
                  <span class="badge ${r.passed ? 'badge-green' : 'badge-red'}">
                    ${Helpers.gradeFromPercent(r.percentage || 0)}
                  </span>
                </td>
                <td>
                  <span class="badge ${Helpers.badgeForStatus(r.status)}">
                    ${r.status?.replace('_', ' ')}
                  </span>
                </td>
                <td style="font-size:13px">${Helpers.formatDate(r.createdAt)}</td>
                <td>
                  <button class="btn btn-outline btn-sm"
                          onclick="App.navigate('result-detail','${r.id}')">
                    ${Auth.isTeacher() ? 'Review' : 'View'}
                  </button>
                  ${Auth.isTeacher() && r.status === 'teacher_reviewed' ? `
                    <button class="btn btn-green btn-sm"
                            onclick="ResultsPage.release('${r.id}')">Release</button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="font-size:13px;color:var(--muted);margin-top:12px">${results.length} result(s)</p>
    `);
  },

  async release(id) {
    Modal.confirm({
      title:    'Release Result',
      message:  'Release this result to the student? They will be able to view it immediately.',
      onConfirm: async () => {
        try {
          await Api.releaseResult(id, {});
          Toast.success('Result released to student');
          this.load();
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });
  }
};
