export function getUser() {
  const u = localStorage.getItem('sj_user');
  return u ? JSON.parse(u) : null;
}

export function setUser(user, token) {
  localStorage.setItem('sj_user',  JSON.stringify(user));
  localStorage.setItem('sj_token', token);
}

export function isLoggedIn() {
  return !!localStorage.getItem('sj_token');
}

export function logout() {
  localStorage.removeItem('sj_user');
  localStorage.removeItem('sj_token');
}
