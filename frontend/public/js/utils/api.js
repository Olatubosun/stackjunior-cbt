// js/utils/api.js
// Central API client — all fetch calls go through here

// Resolved at runtime from config.js (window.CBT_CONFIG), with a local-dev
// fallback so the SPA still works if served without the config endpoint.
const API_BASE =
  (typeof window !== 'undefined' && window.CBT_CONFIG && window.CBT_CONFIG.apiBase)
  || 'http://localhost:5000/api';

const Api = (() => {

  const getHeaders = () => {
    const token = localStorage.getItem('cbt_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const request = async (method, path, body = null) => {
    const options = { method, headers: getHeaders() };
    if (body) options.body = JSON.stringify(body);
    const res  = await fetch(`${API_BASE}${path}`, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
    return data;
  };

  return {
    get:    (path)        => request('GET',    path),
    post:   (path, body)  => request('POST',   path, body),
    put:    (path, body)  => request('PUT',    path, body),
    delete: (path)        => request('DELETE', path),

    // ── Auth ───────────────────────────────────────────────
    login:    (body)  => request('POST', '/auth/login',    body),
    register: (body)  => request('POST', '/auth/register', body),
    ssoLogin: (token) => request('POST', '/auth/sso',      { token }),
    getMe:    ()      => request('GET',  '/auth/me'),

    // ── Questions ──────────────────────────────────────────
    getQuestions:    (params = '') => request('GET',    `/questions${params}`),
    getQuestion:     (id)          => request('GET',    `/questions/${id}`),
    createQuestion:  (body)        => request('POST',   '/questions', body),
    updateQuestion:  (id, body)    => request('PUT',    `/questions/${id}`, body),
    deleteQuestion:  (id)          => request('DELETE', `/questions/${id}`),
    bulkImport:      (body)        => request('POST',   '/questions/bulk', body),

    // ── Exams ──────────────────────────────────────────────
    getExams:       ()           => request('GET',    '/exams'),
    getReadyExams:  ()           => request('GET',    '/exams/ready'),
    getExam:     (id)            => request('GET',    `/exams/${id}`),
    createExam:  (body)          => request('POST',   '/exams', body),
    updateExam:  (id, body)      => request('PUT',    `/exams/${id}`, body),
    publishExam: (id)            => request('PATCH',  `/exams/${id}/publish`),
    deleteExam:  (id)            => request('DELETE', `/exams/${id}`),
    startExam:   (examId)         => request('POST',   '/results/start', { examId }),
    submitExam:  (resultId, body) => request('POST',   `/results/${resultId}/submit`, body),

    // ── Results ────────────────────────────────────────────
    getResults:       ()                 => request('GET', '/results'),
    getResult:        (id)               => request('GET', `/results/${id}`),
    markAnswer:       (rid, aid, body)   => request('PATCH', `/results/${rid}/answers/${aid}`, body),
    releaseResult:    (id, body)         => request('PATCH', `/results/${id}/release`, body),
    getExamAnalytics: (examId)           => request('GET', `/results/exam/${examId}/analytics`),

    // ── Schools / Classes ──────────────────────────────────
    getMySchool:        ()        => request('GET', '/schools/me'),
    getMyClasses:       ()        => request('GET', '/schools/me/classes'),
    getSchoolClasses:   (id)      => request('GET', `/schools/${id}/classes`),

    // ── AI ─────────────────────────────────────────────────
    aiGenerateQuestions:    (body) => request('POST', '/ai/generate-questions', body),
    aiGenerateFromText:     (body) => request('POST', '/ai/generate-from-text', body),
    aiGenerateExternalExam: (body) => request('POST', '/ai/external-exam',      body),
    aiScanPaper:            (body) => request('POST', '/ai/scan-paper',         body),
    aiMarkAnswer:        (body) => request('POST', '/ai/mark-answer',         body),
    aiGenerateFeedback:  (body) => request('POST', '/ai/generate-feedback',   body),
  };
})();
