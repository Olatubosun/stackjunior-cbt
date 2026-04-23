import { examService } from '../../services/api.js';

export async function renderExams(container, user) {
  container.innerHTML = `
    <div class="topbar">
      <div><h1>Exams</h1><p>Create and manage exams</p></div>
      <div class="topbar-actions">
        <button class="btn btn-primary btn-sm" id="btn-create-exam">+ Create Exam</button>
      </div>
    </div>
    <div class="card" id="exams-list"><div class="spinner"></div></div>
  `;

  document.getElementById('btn-create-exam').addEventListener('click', showCreateForm);
  loadExams(container);
}

async function loadExams(container) {
  const el = document.getElementById('exams-list');
  try {
    const { exams } = await examService.list();
    el.innerHTML = exams.length ? `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Title</th><th>Subject</th><th>Class</th>
            <th>Duration</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${exams.map(e => `
              <tr>
                <td style="font-weight:600">${e.title}</td>
                <td>${e.subject}</td>
                <td>${e.classLevel}</td>
                <td>${e.duration} min</td>
                <td><span class="badge badge-${statusColor(e.status)}">${e.status}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm">View</button>
                  ${e.status === 'draft' ? `<button class="btn btn-gold btn-sm" style="margin-left:4px"
                    onclick="publishExam('${e._id}')">Publish</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `<p style="color:#9CA3AF">No exams yet. Create your first exam.</p>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function statusColor(s) {
  return { draft:'gold', published:'blue', active:'green', closed:'purple' }[s] || 'blue';
}

window.publishExam = async (id) => {
  try {
    await examService.publish(id);
    location.reload();
  } catch (err) { alert(err.message); }
};

function showCreateForm() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100';
  modal.innerHTML = `
    <div class="card" style="width:500px;max-width:90vw">
      <div class="card-header">
        <h3 class="card-title">Create New Exam</h3>
        <button class="btn btn-outline btn-sm" id="close-exam-modal">X</button>
      </div>
      <div id="create-alert"></div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Title</label>
          <input id="ex-title" class="form-control" placeholder="Mid-term Exam" />
        </div>
        <div class="form-group">
          <label class="form-label">Subject</label>
          <input id="ex-subject" class="form-control" placeholder="Biology" />
        </div>
        <div class="form-group">
          <label class="form-label">Class Level</label>
          <input id="ex-class" class="form-control" placeholder="SS2" />
        </div>
        <div class="form-group">
          <label class="form-label">Duration (minutes)</label>
          <input id="ex-duration" class="form-control" type="number" value="60" />
        </div>
        <div class="form-group">
          <label class="form-label">Total Marks</label>
          <input id="ex-marks" class="form-control" type="number" value="100" />
        </div>
        <div class="form-group">
          <label class="form-label">Pass Mark (%)</label>
          <input id="ex-pass" class="form-control" type="number" value="40" />
        </div>
      </div>
      <button id="btn-save-exam" class="btn btn-primary w-full">Create Exam</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#close-exam-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-save-exam').addEventListener('click', async () => {
    const btn = modal.querySelector('#btn-save-exam');
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
      await examService.create({
        title:      modal.querySelector('#ex-title').value,
        subject:    modal.querySelector('#ex-subject').value,
        classLevel: modal.querySelector('#ex-class').value,
        duration:   parseInt(modal.querySelector('#ex-duration').value),
        totalMarks: parseInt(modal.querySelector('#ex-marks').value),
        passMark:   parseInt(modal.querySelector('#ex-pass').value),
      });
      modal.remove();
      location.reload();
    } catch (err) {
      modal.querySelector('#create-alert').innerHTML =
        `<div class="alert alert-error">${err.message}</div>`;
      btn.disabled = false; btn.textContent = 'Create Exam';
    }
  });
}
