// js/utils/auth.js

const Auth = (() => {
  const TOKEN_KEY = 'cbt_token';
  const USER_KEY  = 'cbt_user';

  return {
    setSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY,  JSON.stringify(user));
    },

    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
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
  };
})();
