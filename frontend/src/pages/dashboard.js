export function renderDashboard(container, user) {
  const isTeacher = user.role !== 'student';

  container.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Dashboard</h1>
        <p>Welcome back, ${user.name}</p>
      </div>
    </div>

    <div class="stats-grid">
      ${isTeacher ? `
        <div class="stat-card">
          <div class="stat-value" id="stat-questions">-</div>
          <div class="stat-label">Questions in Bank</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-value" id="stat-exams">-</div>
          <div class="stat-label">Exams Created</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value" id="stat-results">-</div>
          <div class="stat-label">Results Pending</div>
        </div>
      ` : `
        <div class="stat-card">
          <div class="stat-value" id="stat-taken">-</div>
          <div class="stat-label">Exams Taken</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-value" id="stat-avg">-</div>
          <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value" id="stat-passed">-</div>
          <div class="stat-label">Passed</div>
        </div>
      `}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${isTeacher ? 'Quick Actions' : 'Available Exams'}</h3>
        </div>
        ${isTeacher ? `
          <div class="flex-col gap-2">
            <a href="#/questions" class="btn btn-primary">Add Questions to Bank</a>
            <a href="#/exams" class="btn btn-outline">Create New Exam</a>
          </div>
        ` : `
          <div id="available-exams">
            <div class="spinner"></div>
          </div>
        `}
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recent Activity</h3>
        </div>
        <p style="color:#9CA3AF;font-size:14px">No recent activity to show.</p>
      </div>
    </div>
  `;
}
