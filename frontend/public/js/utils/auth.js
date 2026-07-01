// js/utils/auth.js

const Auth = (() => {
  const TOKEN_KEY  = 'cbt_token';
  const USER_KEY   = 'cbt_user';
  const RETURN_KEY = 'cbt_return_url'; // where to send the user on logout (SSO)

  return {
    setSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY,  JSON.stringify(user));
    },

    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(RETURN_KEY);
    },

    // Return URL handling for SSO entry. Only StackJunior origins are accepted
    // so a crafted ?return= can't turn the CBT into an open redirect.
    isSafeReturnUrl(url) {
      try {
        const u = new URL(url);
        return (u.protocol === 'https:' || u.protocol === 'http:')
          && (u.hostname === 'stackjunior.com' || u.hostname.endsWith('.stackjunior.com'));
      } catch { return false; }
    },
    setReturnUrl(url) {
      if (this.isSafeReturnUrl(url)) localStorage.setItem(RETURN_KEY, url);
    },
    getReturnUrl() {
      const url = localStorage.getItem(RETURN_KEY);
      return url && this.isSafeReturnUrl(url) ? url : null;
    },

    getToken() { return localStorage.getItem(TOKEN_KEY); },

    getUser() {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    },

    isLoggedIn() { return !!this.getToken(); },

    hasRole(...roles) {
      const user = this.getUser();
      return user && roles.includes(user.role);
    },

    isTeacher()  { return this.hasRole('subject_teacher', 'class_teacher', 'exam_officer', 'school_admin', 'super_admin'); },
    isStudent()  { return this.hasRole('student'); },
    isAdmin()    { return this.hasRole('school_admin', 'super_admin'); },
    // Only exam officers and admins approve/publish exams.
    canPublish() { return this.hasRole('exam_officer', 'school_admin', 'super_admin'); },
  };
})();
