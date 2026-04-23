const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('sj_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};

// ── Auth ────────────────────────────────────────────────────
export const authService = {
  login:    (creds)  => api.post('/auth/login', creds),
  register: (data)   => api.post('/auth/register', data),
  me:       ()       => api.get('/auth/me'),
};

// ── Questions ───────────────────────────────────────────────
export const questionService = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/questions${qs ? '?' + qs : ''}`);
  },
  get:    (id)     => api.get(`/questions/${id}`),
  create: (data)   => api.post('/questions', data),
  update: (id, d)  => api.put(`/questions/${id}`, d),
  delete: (id)     => api.delete(`/questions/${id}`),
};

// ── Exams ────────────────────────────────────────────────────
export const examService = {
  list:    ()       => api.get('/exams'),
  get:     (id)     => api.get(`/exams/${id}`),
  create:  (data)   => api.post('/exams', data),
  update:  (id, d)  => api.put(`/exams/${id}`, d),
  publish: (id)     => api.patch(`/exams/${id}/publish`),
};

// ── Results ──────────────────────────────────────────────────
export const resultService = {
  start:         (examId)  => api.post('/results/start', { examId }),
  submit:        (id, d)   => api.post(`/results/${id}/submit`, d),
  myResults:     ()        => api.get('/results/my'),
  examResults:   (examId)  => api.get(`/results/exam/${examId}`),
  release:       (id, d)   => api.patch(`/results/${id}/release`, d),
};

// ── AI ───────────────────────────────────────────────────────
export const aiService = {
  generateFromPrompt:  (data) => api.post('/ai/generate/prompt', data),
  generateFromContent: (data) => api.post('/ai/generate/content', data),
  saveGenerated:       (data) => api.post('/ai/generate/save', data),
  getFeedback:         (data) => api.post('/ai/feedback', data),
};
