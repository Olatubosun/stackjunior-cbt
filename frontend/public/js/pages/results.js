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
          <!-- Status filter tabs -->
          <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
            <span style="font-size:12px;color:var(--muted);min-width:52px">Status:</span>
            <button class="btn btn-primary btn-sm" onclick="ResultsPage.filter('all')"       id="f-all">All</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('submitted')" id="f-submitted">Submitted</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('marked')"    id="f-marked">Marked</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filter('released')"  id="f-released">Released</button>
          </div>
          <!-- Exam-type filter tabs -->
          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
            <span style="font-size:12px;color:var(--muted);min-width:52px">Type:</span>
            <button class="btn btn-primary btn-sm" onclick="ResultsPage.filterType('all')"          id="ft-all">All</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filterType('classwork')"    id="ft-classwork">Class Work</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filterType('homework')"     id="ft-homework">Home Work</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filterType('test')"         id="ft-test">Test</button>
            <button class="btn btn-outline btn-sm" onclick="ResultsPage.filterType('examination')"  id="ft-examination">Examination</button>
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
  _typeFilter: 'all',

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
    ['all','submitted','marked','released'].forEach(k => {
      const btn = document.getElementById(`f-${k}`);
      if (btn) btn.className = 'btn btn-sm ' + (k === status ? 'btn-primary' : 'btn-outline');
    });
    this.renderList();
  },

  filterType(type) {
    this._typeFilter = type;
    ['all','classwork','homework','test','examination'].forEach(k => {
      const btn = document.getElementById(`ft-${k}`);
      if (btn) btn.className = 'btn btn-sm ' + (k === type ? 'btn-primary' : 'btn-outline');
    });
    this.renderList();
  },

  _shownResults() {
    let results = this._allResults;
    if (this._filter !== 'all')     results = results.filter(r => r.status === this._filter);
    if (this._typeFilter !== 'all') results = results.filter(r => (r.exam?.examType || 'test') === this._typeFilter);
    return results;
  },

  renderList() {
    const results = this._shownResults();

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

    if (Auth.isTeacher()) this._renderTeacherList(results);
    else                  this._renderStudentList(results);
  },

  _scoreCell(r) {
    return `<strong>${r.totalScore || 0}</strong><span style="color:var(--muted)">/${r.totalMarks || 0}</span>
      <span style="font-size:12px;color:var(--muted);margin-left:4px">(${r.percentage || 0}%)</span>`;
  },

  _renderStudentList(results) {
    Helpers.setHTML('results-list', `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Exam</th><th>Subject</th><th>Score</th><th>Grade</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${results.map(r => `
              <tr>
                <td>${r.exam?.title || '-'}</td>
                <td>${r.exam?.subject || '-'}</td>
                <td>${this._scoreCell(r)}</td>
                <td><span class="badge ${r.passed ? 'badge-green' : 'badge-red'}">${Helpers.gradeFromPercent(r.percentage || 0)}</span></td>
                <td style="font-size:13px">${Helpers.formatDate(r.createdAt)}</td>
                <td><button class="btn btn-outline btn-sm" onclick="App.navigate('result-detail','${r.id}')">View</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="font-size:13px;color:var(--muted);margin-top:12px">${results.length} result(s)</p>
    `);
  },

  _typeLabel(t) {
    return ({ classwork: 'Class Work', homework: 'Home Work', test: 'Test', examination: 'Examination' })[t] || 'Test';
  },

  _renderTeacherList(results) {
    // Group by class (the exam's class level) — a result dashboard per class.
    const groups = {};
    results.forEach(r => {
      const cls = r.exam?.classLevel || 'Unassigned';
      (groups[cls] = groups[cls] || []).push(r);
    });

    const pendingAll = results.filter(r => r.status !== 'released').length;
    const toolbar = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <span style="font-size:13px;color:var(--muted)">
          ${results.length} result(s)${this._typeFilter !== 'all' ? ` · ${this._typeLabel(this._typeFilter)}` : ''}
        </span>
        ${pendingAll
          ? `<button class="btn btn-green btn-sm" onclick="ResultsPage.releaseShown()">Release all shown (${pendingAll})</button>`
          : ''}
      </div>`;

    const html = Object.keys(groups).sort().map(cls => {
      const rows = groups[cls];
      const pending = rows.filter(r => r.status !== 'released').length;
      return `
        <div style="margin-bottom:26px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <h3 style="font-size:16px;font-weight:700;color:var(--navy);margin:0">
              ${cls} <span style="color:var(--muted);font-weight:400;font-size:13px">(${rows.length} result${rows.length === 1 ? '' : 's'})</span>
            </h3>
            ${pending
              ? `<button class="btn btn-green btn-sm" onclick="ResultsPage.releaseClass('${this._esc(cls)}')">Release all (${pending})</button>`
              : '<span style="font-size:12px;color:var(--green)">All released</span>'}
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Grade</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td><strong>${r.student?.name || '-'}</strong></td>
                    <td>${r.exam?.title || '-'}
                      <br><span class="badge badge-grey" style="font-size:10px">${this._typeLabel(r.exam?.examType)}</span></td>
                    <td>${this._scoreCell(r)}</td>
                    <td><span class="badge ${r.passed ? 'badge-green' : 'badge-red'}">${Helpers.gradeFromPercent(r.percentage || 0)}</span></td>
                    <td><span class="badge ${Helpers.badgeForStatus(r.status)}">${r.status?.replace('_', ' ')}</span></td>
                    <td style="font-size:13px">${Helpers.formatDate(r.createdAt)}</td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="App.navigate('result-detail','${r.id}')">Review</button>
                      ${r.status !== 'released' ? `<button class="btn btn-green btn-sm" onclick="ResultsPage.release('${r.id}')">Release</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    Helpers.setHTML('results-list', toolbar + html);
  },

  _esc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); },

  async releaseShown() {
    const ids = this._shownResults().filter(r => r.status !== 'released').map(r => r.id);
    if (!ids.length) return;
    Modal.confirm({
      title:   'Release Results',
      message: `Release ${ids.length} result(s)? Students will be able to see their scores.`,
      onConfirm: async () => {
        try {
          const data = await Api.releaseBulk(ids);
          Toast.success(`Released ${data.released} result(s)`);
          this.load();
        } catch (err) { Toast.error(err.message); }
      }
    });
  },

  async releaseClass(cls) {
    const ids = this._allResults
      .filter(r => (r.exam?.classLevel || 'Unassigned') === cls && r.status !== 'released')
      .map(r => r.id);
    if (!ids.length) return;
    Modal.confirm({
      title: 'Release Class Results',
      message: `Release ${ids.length} result(s) for ${cls}? Students will be able to see their scores.`,
      onConfirm: async () => {
        try {
          const data = await Api.releaseBulk(ids);
          Toast.success(`Released ${data.released} result(s)`);
          this.load();
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });
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
