// js/pages/register.js

const RegisterPage = {
  render() {
    return `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1><span>Stack</span>Junior CBT</h1>
            <p>Create your account</p>
          </div>
          <form id="register-form">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="reg-name" placeholder="Your full name" required />
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" id="reg-email" placeholder="you@school.com" required />
            </div>
            <div class="form-group">
              <label>Password</label>
              <div class="password-wrap">
                <input type="password" id="reg-password" placeholder="Min 6 characters" required />
                <button type="button" class="pwd-toggle" aria-label="Show password"
                        onclick="RegisterPage.togglePassword('reg-password', this)">Show</button>
              </div>
            </div>
            <div class="form-group">
              <label>I am a</label>
              <select id="reg-role">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="exam_officer">Exam Officer</option>
                <option value="school_admin">School Admin</option>
              </select>
            </div>
            <div class="form-group" id="teacher-type-group" style="display:none">
              <label>Teacher Type</label>
              <select id="reg-teacher-type">
                <option value="subject_teacher">Subject Teacher</option>
                <option value="class_teacher">Class Teacher</option>
              </select>
            </div>
            <div class="form-group" id="class-group">
              <label>Class Level</label>
              <select id="reg-class">
                <option value="">-- Select class --</option>
                <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                <option>SS 1</option><option>SS 2</option><option>SS 3</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg">Create Account</button>
          </form>
          <p style="text-align:center;margin-top:18px;font-size:13px;color:#6B7280">
            Already have an account? <a href="#" data-page="login">Sign in</a>
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

  init() {
    const roleSelect       = document.getElementById('reg-role');
    const classGroup       = document.getElementById('class-group');
    const teacherTypeGroup = document.getElementById('teacher-type-group');

    const refreshFields = () => {
      classGroup.style.display       = roleSelect.value === 'student' ? '' : 'none';
      teacherTypeGroup.style.display = roleSelect.value === 'teacher' ? '' : 'none';
    };
    roleSelect?.addEventListener('change', refreshFields);
    refreshFields();

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creating account...';

      // If "Teacher" is chosen, send the specific teacher subtype to the backend
      const uiRole = document.getElementById('reg-role').value;
      const role   = uiRole === 'teacher'
        ? document.getElementById('reg-teacher-type').value
        : uiRole;

      try {
        const data = await Api.register({
          name:       document.getElementById('reg-name').value,
          email:      document.getElementById('reg-email').value,
          password:   document.getElementById('reg-password').value,
          role,
          classLevel: document.getElementById('reg-class').value,
        });
        Auth.setSession(data.token, data.user);
        Toast.success('Account created successfully!');
        App.navigate('dashboard');
      } catch (err) {
        Toast.error(err.message);
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
};
