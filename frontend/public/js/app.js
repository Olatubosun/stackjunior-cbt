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
  // Full-screen blue loader with a pen writing on paper, shown while we sign
  // the user in / prepare their exams.
  loaderHtml(message) {
    return `
      <div class="cbt-loader">
        <div class="cbt-loader__paper">
          <span class="cbt-loader__line cbt-loader__line--1"></span>
          <span class="cbt-loader__line cbt-loader__line--2"></span>
          <span class="cbt-loader__line cbt-loader__line--3"></span>
          <span class="cbt-loader__pen">✏️</span>
        </div>
        <p class="cbt-loader__text">${message || 'Preparing your exams…'}</p>
      </div>
      <style>
        .cbt-loader{position:fixed;inset:0;background:#0b2a6b;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:30px;z-index:9999}
        .cbt-loader__paper{position:relative;width:200px;height:250px;background:#fff;border-radius:10px;
          box-shadow:0 24px 60px rgba(0,0,0,.4);padding:34px 26px;box-sizing:border-box}
        .cbt-loader__line{display:block;height:11px;border-radius:6px;background:#d7e0f1;width:0;margin-bottom:23px}
        .cbt-loader__line--1{animation:cbtL1 4.5s ease-in-out infinite}
        .cbt-loader__line--2{animation:cbtL2 4.5s ease-in-out infinite}
        .cbt-loader__line--3{animation:cbtL3 4.5s ease-in-out infinite}
        .cbt-loader__pen{position:absolute;font-size:28px;line-height:1;animation:cbtPen 4.5s ease-in-out infinite}
        .cbt-loader__text{color:#cdd8f0;font-size:15px;letter-spacing:.3px;margin:0}
        @keyframes cbtL1{0%{width:0}22%{width:100%}100%{width:100%}}
        @keyframes cbtL2{0%,33%{width:0}55%{width:100%}100%{width:100%}}
        @keyframes cbtL3{0%,66%{width:0}88%{width:100%}100%{width:100%}}
        @keyframes cbtPen{
          0%{left:24px;top:26px}22%{left:168px;top:26px}
          23%,33%{left:24px;top:60px}55%{left:168px;top:60px}
          56%,66%{left:24px;top:94px}88%{left:168px;top:94px}
          100%{left:24px;top:26px}}
      </style>`;
  },

  async handleSso(token, returnUrl) {
    const app = document.getElementById('app');
    if (app) app.innerHTML = this.loaderHtml('Signing you in…');

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
