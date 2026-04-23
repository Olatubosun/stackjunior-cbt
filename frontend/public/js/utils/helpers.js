// js/utils/helpers.js

const Helpers = {

  formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  },

  formatDateTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  gradeFromPercent(pct) {
    if (pct >= 70) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 45) return 'D';
    if (pct >= 40) return 'E';
    return 'F';
  },

  badgeForStatus(status) {
    const map = {
      draft:            'badge-grey',
      scheduled:        'badge-blue',
      active:           'badge-green',
      closed:           'badge-red',
      pending:          'badge-grey',
      ai_marked:        'badge-blue',
      teacher_reviewed: 'badge-gold',
      released:         'badge-green',
    };
    return map[status] || 'badge-grey';
  },

  roleBadge(role) {
    const map = {
      super_admin:  'badge-red',
      school_admin: 'badge-purple',
      teacher:      'badge-blue',
      student:      'badge-green',
    };
    return map[role] || 'badge-grey';
  },

  truncate(str, len = 60) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  },

  el(id)    { return document.getElementById(id); },
  qs(sel)   { return document.querySelector(sel); },
  qsa(sel)  { return document.querySelectorAll(sel); },

  show(id)  { const e = document.getElementById(id); if (e) e.style.display = ''; },
  hide(id)  { const e = document.getElementById(id); if (e) e.style.display = 'none'; },
  toggle(id){ const e = document.getElementById(id); if (e) e.style.display = e.style.display === 'none' ? '' : 'none'; },

  setHTML(id, html) { const e = document.getElementById(id); if (e) e.innerHTML = html; },
  setText(id, text) { const e = document.getElementById(id); if (e) e.textContent = text; },

  showSpinner() {
    let el = document.getElementById('spinner-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'spinner-overlay';
      el.className = 'spinner-overlay';
      el.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  },

  hideSpinner() {
    const el = document.getElementById('spinner-overlay');
    if (el) el.style.display = 'none';
  },
};
