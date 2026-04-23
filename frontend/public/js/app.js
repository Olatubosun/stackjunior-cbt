// js/app.js
// Main SPA router — maps page names to page objects

const App = {
  currentPage: null,

  pages: {
    'login':           LoginPage,
    'register':        RegisterPage,
    'dashboard':       DashboardPage,
    'questions':       QuestionsPage,
    'create-question': CreateQuestionPage,
    'ai-generate':     AiGeneratePage,
    'exams':           ExamsPage,
    'create-exam':     CreateExamPage,
    'take-exam':       TakeExamPage,
    'results':         ResultsPage,
    'result-detail':   ResultDetailPage,
  },

  // Navigate to a named page, optionally passing an id param
  navigate(page, param = null) {
    if (!Auth.isLoggedIn() && !['login', 'register'].includes(page)) {
      page = 'login';
    }
    if (Auth.isLoggedIn() && ['login', 'register'].includes(page)) {
      page = 'dashboard';
    }

    const pageObj = this.pages[page];
    if (!pageObj) {
      console.warn(`Unknown page: ${page}`);
      return;
    }

    this.currentPage = page;
    const app = document.getElementById('app');

    // Render HTML
    app.innerHTML = pageObj.render(param);

    // Init page logic
    if (pageObj.init) pageObj.init(param);

    // Reinitialise navbar click delegation
    Navbar.init();

    // Scroll to top
    window.scrollTo(0, 0);
  },

  init() {
    Navbar.init();
    // Determine starting page
    if (Auth.isLoggedIn()) {
      this.navigate('dashboard');
    } else {
      this.navigate('login');
    }
  }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
