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

  async init() {
    Navbar.init();

    // SSO entry: StackJunior redirects an authenticated user here with ?token=
    // (and optionally &return= to send them back to on logout).
    const params   = new URLSearchParams(window.location.search);
    const ssoToken = params.get('token');
    if (ssoToken) {
      await this.handleSso(ssoToken, params.get('return'));
      return;
    }

    // Determine starting page
    if (Auth.isLoggedIn()) {
      this.navigate('dashboard');
    } else {
      this.navigate('login');
    }
  },

  // Exchange a StackJunior SSO token for a local CBT session, then land the
  // user on their dashboard. The token is scrubbed from the URL either way so
  // it can't be bookmarked, shared or replayed.
  async handleSso(token, returnUrl) {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML =
        '<div class="auth-page"><div class="auth-card">' +
        '<div class="auth-logo"><h1><span>Stack</span>Junior CBT</h1></div>' +
        '<p style="text-align:center;color:#6B7280">Signing you in…</p>' +
        '</div></div>';
    }

    const scrubUrl = () =>
      window.history.replaceState({}, document.title,
        window.location.pathname + window.location.hash);

    try {
      const data = await Api.ssoLogin(token);
      if (!data?.token || !data?.user) throw new Error('Unexpected response from server.');
      Auth.setSession(data.token, data.user);
      // Remember where to send the user when they log out (back to StackJunior).
      if (returnUrl) Auth.setReturnUrl(returnUrl);
      // Refresh the stored user so fields like schoolName populate
      try {
        const me = await Api.getMe();
        if (me?.user) Auth.setSession(data.token, me.user);
      } catch { /* non-fatal */ }
      scrubUrl();
      if (window.Toast) Toast.success(`Welcome, ${data.user.name}!`);
      this.navigate('dashboard');
    } catch (err) {
      Auth.clearSession();
      scrubUrl();
      this.navigate('login');
      if (window.Toast) Toast.error(err.message || 'Single sign-on failed. Please log in.');
    }
  },

  // Log out. For users who arrived via StackJunior SSO, send them back to
  // StackJunior instead of showing the standalone CBT login page. Falls back to
  // the referring StackJunior page, then to the local login form.
  logout() {
    let dest = Auth.getReturnUrl();
    if (!dest && document.referrer && Auth.isSafeReturnUrl(document.referrer)) {
      dest = document.referrer;
    }
    // Final fallback: the configured StackJunior web app, so SSO users never
    // get stranded on the standalone CBT login page.
    if (!dest && window.CBT_CONFIG && window.CBT_CONFIG.stackjuniorUrl) {
      dest = window.CBT_CONFIG.stackjuniorUrl;
    }
    Auth.clearSession();
    if (dest) {
      window.location.href = dest;
      return;
    }
    this.navigate('login');
  }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
