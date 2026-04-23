// js/pages/login.js

const LoginPage = {
  render() {
    return `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1><span>Stack</span>Junior CBT</h1>
            <p>AI-Powered Examination Platform</p>
          </div>
          <form id="login-form">
            <div class="form-group">
              <label>Email or Username</label>
              <input type="text" id="login-email" placeholder="you@school.com or your username"
                     autocomplete="username" required />
            </div>
            <div class="form-group">
              <label>Password</label>
              <div class="password-wrap">
                <input type="password" id="login-password" placeholder="Your password" required />
                <button type="button" class="pwd-toggle" aria-label="Show password"
                        onclick="LoginPage.togglePassword('login-password', this)">Show</button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg">Sign In</button>
          </form>
          <p style="text-align:center;margin-top:18px;font-size:13px;color:#6B7280">
            Don't have an account? 
            <a href="#" data-page="register">Register here</a>
          </p>
        </div>
      </div>
    `;
  },

  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Show' : 'Hide';
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  },

  async init() {
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('login-email').value.trim();
      const password   = document.getElementById('login-password').value;
      const btn        = e.target.querySelector('button[type="submit"]');

      if (!identifier || !password) {
        Toast.warning('Please enter both your email/username and password.');
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Signing in...';

      try {
        const data = await Api.login({ identifier, email: identifier, password });
        if (!data?.token || !data?.user) {
          throw new Error('Unexpected response from server.');
        }
        Auth.setSession(data.token, data.user);
        // Refresh the stored user so fields like schoolName populate
        try {
          const me = await Api.getMe();
          if (me?.user) Auth.setSession(data.token, me.user);
        } catch { /* non-fatal */ }
        Toast.success(`Welcome back, ${data.user.name}!`);
        App.navigate('dashboard');
      } catch (err) {
        // Wipe any stale session so the next attempt starts clean
        Auth.clearSession();
        Toast.error(err.message || 'Login failed. Please try again.');
        btn.disabled    = false;
        btn.textContent = 'Sign In';
        document.getElementById('login-password').value = '';
      }
    });
  }
};
