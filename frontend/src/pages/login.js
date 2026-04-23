import { authService } from '../services/api.js';
import { setUser }     from '../contexts/auth.js';
import { renderApp }   from '../app.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <h1>Stack<span>Junior</span></h1>
          <p>CBT Platform - Sign in to continue</p>
        </div>
        <div id="login-alert"></div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input id="email" type="email" class="form-control" placeholder="your@email.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input id="password" type="password" class="form-control" placeholder="Enter password" />
        </div>
        <button id="login-btn" class="btn btn-primary w-full btn-lg" style="margin-top:8px">
          Sign In
        </button>
        <p style="text-align:center;margin-top:16px;font-size:13px;color:#9CA3AF">
          StackJunior CBT Platform &copy; 2026
        </p>
      </div>
    </div>
  `;

  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const alertEl  = document.getElementById('login-alert');
  const btn      = document.getElementById('login-btn');

  if (!email || !password) {
    alertEl.innerHTML = `<div class="alert alert-error">Please enter email and password.</div>`;
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Signing in...';
  alertEl.innerHTML = '';

  try {
    const { token, user } = await authService.login({ email, password });
    setUser(user, token);
    renderApp();
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
}
