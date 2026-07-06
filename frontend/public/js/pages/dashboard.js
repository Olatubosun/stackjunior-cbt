// js/pages/dashboard.js

const DashboardPage = {
  render() {
    const user = Auth.getUser();
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Welcome back, ${user?.name}</p>
          </div>
        </div>
        <div class="stats-grid" id="dashboard-stats">
          <div class="stat-card"><div class="spinner" style="width:24px;height:24px;margin:auto"></div></div>
        </div>
        <div id="dashboard-content"></div>
      </div>
    `;
  },

  async init() {
    Navbar.setActive('dashboard');
    const user = Auth.getUser();

    if (Auth.isTeacher()) {
      await this.loadTeacherDashboard();
    } else {
      await this.loadStudentDashboard();
    }
  },

  async loadTeacherDashboard() {
    try {
      const [qRes, eRes, rRes] = await Promise.all([
        Api.getQuestions(),
        Api.getExams(),
        Api.getResults(),
      ]);

      const pending = rRes.results?.filter(r => r.status !== 'released').length || 0;

      Helpers.setHTML('dashboard-stats', `
        <div class="stat-card">
          <div class="stat-value">${qRes.total ?? qRes.count ?? 0}</div>
          <div class="stat-label">Questions in Bank</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-value">${eRes.count || 0}</div>
          <div class="stat-label">Total Exams</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value">${eRes.exams?.filter(e => e.status === 'active').length || 0}</div>
          <div class="stat-label">Active Exams</div>
        </div>
        <div class="stat-card red">
          <div class="stat-value">${pending}</div>
          <div class="stat-label">Results Pending Review</div>
        </div>
      `);

      const recentExams = (eRes.exams || []).slice(0, 5);
      Helpers.setHTML('dashboard-content', `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Exams</h3>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('exams')">View All</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Title</th><th>Subject</th><th>Class</th>
                <th>Status</th><th>Created</th>
              </tr></thead>
              <tbody>
                ${recentExams.length ? recentExams.map(ex => `
                  <tr style="cursor:pointer" onclick="App.navigate('exams')">
                    <td><strong>${ex.title}</strong></td>
                    <td>${ex.subject}</td>
                    <td>${ex.classLevel}</td>
                    <td><span class="badge ${Helpers.badgeForStatus(ex.status)}">${ex.status}</span></td>
                    <td>${Helpers.formatDate(ex.createdAt)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" style="text-align:center;color:#999">No exams yet</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
          <div class="card" style="cursor:pointer" onclick="App.navigate('questions')">
            <h3 class="card-title" style="margin-bottom:8px">Question Bank</h3>
            <p style="color:#6B7280;font-size:13px">Add, edit, and manage all your exam questions. Generate with AI or scan from paper.</p>
            <div style="margin-top:14px;display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="App.navigate('questions')">View Bank</button>
              <button class="btn btn-gold btn-sm"    onclick="App.navigate('ai-generate')">AI Generate</button>
            </div>
          </div>
          <div class="card" style="cursor:pointer" onclick="App.navigate('results')">
            <h3 class="card-title" style="margin-bottom:8px">Results to Review</h3>
            <p style="color:#6B7280;font-size:13px">Review AI-marked answers, add feedback, and release results to students.</p>
            <div style="margin-top:14px">
              <button class="btn btn-green btn-sm" onclick="App.navigate('results')">Review Results</button>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      Toast.error('Failed to load dashboard');
    }
  },

  async loadStudentDashboard() {
    // A student with no class can't be shown any exams (strict class scoping).
    if (!Auth.getUser()?.classId) {
      Helpers.setHTML('dashboard-stats', `
        <div class="stat-card"><div class="stat-value">0</div><div class="stat-label">Available Exams</div></div>
        <div class="stat-card green"><div class="stat-value">0</div><div class="stat-label">Completed Exams</div></div>
        <div class="stat-card gold"><div class="stat-value">0%</div><div class="stat-label">Average Score</div></div>
      `);
      Helpers.setHTML('dashboard-content', `
        <div class="card">
          <div class="empty-state" style="padding:44px">
            <div class="empty-icon">🏫</div>
            <h3>No class assigned yet</h3>
            <p>You haven't been added to a class, so there are no exams to show.<br>
               Please contact your school to be assigned to a class — your exams will appear here once you are.</p>
          </div>
        </div>
      `);
      return;
    }
    try {
      const [eRes, rRes] = await Promise.all([
        Api.getExams(),
        Api.getResults(),
      ]);

      const avgScore = rRes.results?.length
        ? Math.round(rRes.results.reduce((s, r) => s + r.percentage, 0) / rRes.results.length)
        : 0;

      Helpers.setHTML('dashboard-stats', `
        <div class="stat-card">
          <div class="stat-value">${eRes.count || 0}</div>
          <div class="stat-label">Available Exams</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value">${rRes.count || 0}</div>
          <div class="stat-label">Completed Exams</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-value">${avgScore}%</div>
          <div class="stat-label">Average Score</div>
        </div>
      `);

      const available = (eRes.exams || []).slice(0, 4);
      Helpers.setHTML('dashboard-content', `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Available Exams</h3>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('exams')">View All</button>
          </div>
          ${available.length ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
              ${available.map(ex => `
                <div class="card" style="border-left:4px solid var(--blue);cursor:pointer"
                     onclick="App.navigate('take-exam','${ex.id}')">
                  <div style="font-weight:700;margin-bottom:4px">${ex.title}</div>
                  <div style="font-size:12px;color:#6B7280">${ex.subject} | ${ex.classLevel}</div>
                  <div style="font-size:12px;margin-top:8px">
                    <span class="badge badge-blue">${ex.duration} min</span>
                  </div>
                  <button class="btn btn-primary btn-sm btn-block" style="margin-top:12px"
                          onclick="event.stopPropagation();App.navigate('take-exam','${ex.id}')">
                    Start Exam
                  </button>
                </div>
              `).join('')}
            </div>
          ` : `<div class="empty-state"><div class="empty-icon">📋</div><h3>No exams available</h3><p>Check back soon for new exams</p></div>`}
        </div>
      `);
    } catch (err) {
      Toast.error('Failed to load dashboard');
    }
  }
};
