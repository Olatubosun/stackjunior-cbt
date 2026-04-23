import { questionService, aiService } from '../../services/api.js';

export async function renderQuestions(container, user) {
  container.innerHTML = `
    <div class="topbar">
      <div><h1>Question Bank</h1><p>Manage and create questions</p></div>
      <div class="topbar-actions">
        <button class="btn btn-outline btn-sm" id="btn-ai-generate">AI Generate</button>
        <button class="btn btn-primary btn-sm" id="btn-add-manual">+ Add Manually</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card" style="margin-bottom:20px">
      <div class="flex gap-4" style="flex-wrap:wrap">
        <input id="filter-subject" class="form-control" placeholder="Subject" style="width:140px"/>
        <input id="filter-topic"   class="form-control" placeholder="Topic"   style="width:140px"/>
        <select id="filter-type"   class="form-control" style="width:160px">
          <option value="">All Types</option>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="theory">Theory</option>
          <option value="essay">Essay</option>
          <option value="true_false">True/False</option>
          <option value="fill_blank">Fill in Blank</option>
          <option value="short_answer">Short Answer</option>
        </select>
        <select id="filter-source" class="form-control" style="width:160px">
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="ai_generated">AI Generated</option>
          <option value="scanned">Scanned</option>
          <option value="external_exam">External Exam</option>
        </select>
        <button class="btn btn-primary btn-sm" id="btn-filter">Filter</button>
      </div>
    </div>

    <!-- AI Generate Modal -->
    <div id="ai-modal" class="hidden" style="
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;z-index:100">
      <div class="card" style="width:480px;max-width:90vw;max-height:90vh;overflow-y:auto">
        <div class="card-header">
          <h3 class="card-title">AI Question Generator</h3>
          <button id="close-ai-modal" class="btn btn-outline btn-sm">X</button>
        </div>
        <div id="ai-modal-content">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Subject</label>
              <input id="ai-subject" class="form-control" placeholder="e.g. Biology" />
            </div>
            <div class="form-group">
              <label class="form-label">Topic</label>
              <input id="ai-topic" class="form-control" placeholder="e.g. Photosynthesis" />
            </div>
            <div class="form-group">
              <label class="form-label">Class Level</label>
              <input id="ai-class" class="form-control" placeholder="e.g. SS2" />
            </div>
            <div class="form-group">
              <label class="form-label">Difficulty</label>
              <select id="ai-difficulty" class="form-control">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Question Type</label>
              <select id="ai-type" class="form-control">
                <option value="multiple_choice">Multiple Choice</option>
                <option value="theory">Theory</option>
                <option value="essay">Essay</option>
                <option value="true_false">True/False</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">How Many?</label>
              <input id="ai-count" class="form-control" type="number" value="5" min="1" max="20" />
            </div>
          </div>
          <div id="ai-alert"></div>
          <button id="btn-ai-run" class="btn btn-primary w-full">Generate Questions</button>
          <div id="ai-preview" class="hidden" style="margin-top:20px">
            <h4 style="margin-bottom:12px;color:var(--navy)">Preview — Review before saving</h4>
            <div id="ai-preview-list"></div>
            <button id="btn-save-ai" class="btn btn-gold w-full mt-4">Save All to Bank</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Questions Table -->
    <div class="card">
      <div id="questions-table">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  loadQuestions();

  document.getElementById('btn-filter').addEventListener('click', loadQuestions);
  document.getElementById('btn-ai-generate').addEventListener('click', () => {
    document.getElementById('ai-modal').classList.remove('hidden');
  });
  document.getElementById('close-ai-modal').addEventListener('click', () => {
    document.getElementById('ai-modal').classList.add('hidden');
  });
  document.getElementById('btn-ai-run').addEventListener('click', runAiGenerate);
}

async function loadQuestions() {
  const el = document.getElementById('questions-table');
  el.innerHTML = '<div class="spinner"></div>';
  try {
    const params = {
      subject:  document.getElementById('filter-subject')?.value,
      topic:    document.getElementById('filter-topic')?.value,
      type:     document.getElementById('filter-type')?.value,
      source:   document.getElementById('filter-source')?.value,
    };
    Object.keys(params).forEach(k => !params[k] && delete params[k]);
    const { questions, total } = await questionService.list(params);
    el.innerHTML = renderTable(questions, total);
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function renderTable(questions, total) {
  if (!questions.length) return `<p style="color:#9CA3AF;padding:20px">No questions found.</p>`;
  return `
    <div style="margin-bottom:12px;font-size:13px;color:#9CA3AF">${total} questions total</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Question</th><th>Subject</th><th>Topic</th>
            <th>Type</th><th>Difficulty</th><th>Source</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${questions.map(q => `
            <tr>
              <td style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${q.questionText}
              </td>
              <td>${q.subject}</td>
              <td>${q.topic}</td>
              <td><span class="badge badge-blue">${q.type.replace('_',' ')}</span></td>
              <td><span class="badge badge-${q.difficulty === 'easy' ? 'green' : q.difficulty === 'hard' ? 'red' : 'gold'}">${q.difficulty}</span></td>
              <td><span class="badge badge-purple">${q.source.replace('_',' ')}</span></td>
              <td>
                <button class="btn btn-outline btn-sm">Edit</button>
                <button class="btn btn-danger btn-sm" style="margin-left:4px">Del</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

let generatedQuestions = [];

async function runAiGenerate() {
  const btn     = document.getElementById('btn-ai-run');
  const alertEl = document.getElementById('ai-alert');
  btn.disabled  = true;
  btn.textContent = 'Generating...';
  alertEl.innerHTML = '';

  try {
    const { questions } = await aiService.generateFromPrompt({
      subject:    document.getElementById('ai-subject').value,
      topic:      document.getElementById('ai-topic').value,
      classLevel: document.getElementById('ai-class').value,
      difficulty: document.getElementById('ai-difficulty').value,
      type:       document.getElementById('ai-type').value,
      count:      parseInt(document.getElementById('ai-count').value),
    });
    generatedQuestions = questions;
    const preview = document.getElementById('ai-preview');
    const list    = document.getElementById('ai-preview-list');
    list.innerHTML = questions.map((q, i) => `
      <div class="card" style="margin-bottom:10px;border-left:4px solid var(--blue)">
        <p style="font-weight:600;color:var(--navy)">${i+1}. ${q.questionText}</p>
        ${q.options ? `<div style="margin-top:8px">${q.options.map(o =>
          `<span style="margin-right:8px;font-size:13px;color:${o.isCorrect ? 'var(--green)' : 'var(--gray-600)'}">${o.isCorrect ? '✓' : '·'} ${o.text}</span>`
        ).join('')}</div>` : ''}
        ${q.explanation ? `<p style="margin-top:6px;font-size:12px;color:var(--gray-400)">Explanation: ${q.explanation}</p>` : ''}
      </div>
    `).join('');
    preview.classList.remove('hidden');
    document.getElementById('btn-save-ai').addEventListener('click', saveGeneratedQuestions);
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Questions';
  }
}

async function saveGeneratedQuestions() {
  const btn = document.getElementById('btn-save-ai');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await aiService.saveGenerated({
      questions:  generatedQuestions,
      subject:    document.getElementById('ai-subject').value,
      topic:      document.getElementById('ai-topic').value,
      classLevel: document.getElementById('ai-class').value,
      difficulty: document.getElementById('ai-difficulty').value,
    });
    document.getElementById('ai-modal').classList.add('hidden');
    loadQuestions();
  } catch (err) {
    document.getElementById('ai-alert').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
    btn.disabled = false; btn.textContent = 'Save All to Bank';
  }
}
