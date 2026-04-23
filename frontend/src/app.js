import { getUser, isLoggedIn } from './contexts/auth.js';
import { renderLogin }        from './pages/login.js';
import { renderDashboard }    from './pages/dashboard.js';
import { renderQuestions }    from './pages/teacher/questions.js';
import { renderExams }        from './pages/teacher/exams.js';
import { renderStudentExam }  from './pages/student/exam.js';
import { renderResults }      from './pages/student/results.js';

export function renderApp() {
  const app = document.getElementById('app');
  const route = window.location.hash.replace('#', '') || '/';

  if (!isLoggedIn()) {
    app.innerHTML = '';
    return renderLogin(app);
  }

  const user = getUser();
  const layout = buildLayout(user);
  app.innerHTML = layout;
  setActiveNav(route);

  const content = document.getElementById('page-content');
  routeTo(route, content, user);

  // Hash-based routing
  window.addEventListener('hashchange', () => {
    const newRoute = window.location.hash.replace('#', '') || '/';
    setActiveNav(newRoute);
    const c = document.getElementById('page-content');
    routeTo(newRoute, c, user);
  });
}

function routeTo(route, container, user) {
  if (route === '/' || route === '/dashboard') return renderDashboard(container, user);
  if (route === '/questions')    return renderQuestions(container, user);
  if (route === '/exams')        return renderExams(container, user);
  if (route === '/take-exam')    return renderStudentExam(container, user);
  if (route === '/results')      return renderResults(container, user);
  container.innerHTML = `<div class="card"><p>Page not found.</p></div>`;
}

function setActiveNav(route) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });
}

function buildLayout(user) {
  const isTeacher = ['super_admin','school_admin','exam_officer','subject_teacher','class_teacher'].includes(user.role);
  const isStudent = user.role === 'student';

  const navItems = isTeacher ? `
    <a class="nav-item" href="#/dashboard" data-route="/dashboard">
      <span class="icon">⊞</span> Dashboard
    </a>
    <div class="nav-section-title">Questions</div>
    <a class="nav-item" href="#/questions" data-route="/questions">
      <span class="icon">?</span> Question Bank
    </a>
    <div class="nav-section-title">Exams</div>
    <a class="nav-item" href="#/exams" data-route="/exams">
      <span class="icon">✎</span> Manage Exams
    </a>
  ` : `
    <a class="nav-item" href="#/dashboard" data-route="/dashboard">
      <span class="icon">⊞</span> Dashboard
    </a>
    <a class="nav-item" href="#/take-exam" data-route="/take-exam">
      <span class="icon">✎</span> Take Exam
    </a>
    <a class="nav-item" href="#/results" data-route="/results">
      <span class="icon">★</span> My Results
    </a>
  `;

  return `
    <div class="page-wrapper">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <h2>StackJunior</h2>
          <p>CBT Platform</p>
        </div>
        <nav class="sidebar-nav">
          ${navItems}
        </nav>
        <div class="sidebar-footer">
          <div style="font-weight:600;color:rgba(255,255,255,0.8)">${user.name}</div>
          <div style="margin-top:4px">${user.role.replace('_',' ')}</div>
          <button class="btn btn-outline btn-sm" style="margin-top:10px;color:white;border-color:rgba(255,255,255,0.3);width:100%"
            onclick="localStorage.removeItem('sj_token');localStorage.removeItem('sj_user');location.reload()">
            Logout
          </button>
        </div>
      </aside>
      <main class="main-content" id="page-content"></main>
    </div>
  `;
}
