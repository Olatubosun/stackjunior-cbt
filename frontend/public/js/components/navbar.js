// js/components/navbar.js

const Navbar = {
  render() {
    const user   = Auth.getUser();
    if (!user) return '';

    const teacherLinks = Auth.isTeacher() ? `
      <li><a href="#" data-page="questions">Question Bank</a></li>
      <li><a href="#" data-page="ai-generate">AI Generate</a></li>
      <li><a href="#" data-page="exams">Exams</a></li>
      <li><a href="#" data-page="results">Results</a></li>
    ` : '';

    const studentLinks = Auth.isStudent() ? `
      <li><a href="#" data-page="exams">My Exams</a></li>
      <li><a href="#" data-page="results">My Results</a></li>
    ` : '';

    return `
      <nav class="navbar">
        <div class="navbar-brand">
          <div><span>Stack</span>Junior CBT</div>
          ${user.schoolName ? `<div class="navbar-school">${user.schoolName}</div>` : ''}
        </div>
        <ul class="navbar-nav">
          <li><a href="#" data-page="dashboard">Dashboard</a></li>
          ${teacherLinks}
          ${studentLinks}
        </ul>
        <div class="navbar-user">
          <span class="user-name">${user.name}</span>
          <span class="badge ${Helpers.roleBadge(user.role)}">${user.role.replace('_', ' ')}</span>
          <button class="btn-logout" id="btn-logout">Logout</button>
        </div>
      </nav>
    `;
  },

  init() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-logout') {
        Auth.clearSession();
        App.navigate('login');
      }

      const pageLink = e.target.closest('[data-page]');
      if (pageLink) {
        e.preventDefault();
        const page = pageLink.dataset.page;
        App.navigate(page);
      }
    });
  },

  setActive(page) {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  }
};
