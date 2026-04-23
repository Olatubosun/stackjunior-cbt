import { examService, resultService } from '../../services/api.js';

let examState = {
  exam: null, result: null, current: 0,
  answers: {}, timer: null, timeLeft: 0, flagged: new Set(),
};

export async function renderStudentExam(container, user) {
  container.innerHTML = `
    <div class="topbar">
      <div><h1>Available Exams</h1><p>Select an exam to begin</p></div>
    </div>
    <div id="exam-list-wrap"><div class="spinner"></div></div>
  `;
  try {
    const { exams } = await examService.list();
    const active = exams.filter(e => ['published','active'].includes(e.status));
    const wrap = document.getElementById('exam-list-wrap');
    if (!active.length) {
      wrap.innerHTML = `<div class="card"><p style="color:#9CA3AF">No exams available right now.</p></div>`;
      return;
    }
    wrap.innerHTML = `
      <div class="grid-2">
        ${active.map(e => `
          <div class="card" style="border-top:4px solid var(--blue)">
            <h3 style="font-size:18px;font-weight:700;color:var(--navy)">${e.title}</h3>
            <p style="color:#9CA3AF;margin:6px 0 16px;font-size:14px">
              ${e.subject}  |  ${e.classLevel}  |  ${e.duration} mins  |  ${e.totalMarks} marks
            </p>
            <button class="btn btn-primary w-full" onclick="startExam('${e._id}')">Start Exam</button>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    document.getElementById('exam-list-wrap').innerHTML =
      `<div class="alert alert-error">${err.message}</div>`;
  }

  window.startExam = async (examId) => {
    try {
      const [{ exam }, { result }] = await Promise.all([
        examService.get(examId), resultService.start(examId),
      ]);
      examState = { exam, result, current: 0, answers: {},
                    timeLeft: exam.duration * 60, flagged: new Set() };
      renderExamInterface(container, user);
    } catch (err) { alert(err.message); }
  };
}

function renderExamInterface(container, user) {
  const { exam } = examState;
  container.innerHTML = `
    <div class="exam-layout">
      <div class="exam-main" id="question-area"></div>
      <div class="exam-sidebar-right">
        <div class="exam-timer" id="timer-box">
          <div class="label">Time Remaining</div>
          <div class="time" id="timer-display">--:--</div>
        </div>
        <div class="card" style="margin-bottom:12px">
          <div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:10px">
            Questions (${exam.questions.length})
          </div>
          <div class="question-nav" id="q-nav">
            ${exam.questions.map((_, i) => `
              <button class="q-nav-btn${i === 0 ? ' current' : ''}" data-idx="${i}"
                onclick="jumpTo(${i})">${i+1}</button>
            `).join('')}
          </div>
        </div>
        <div style="font-size:12px;color:#9CA3AF;margin-bottom:12px">
          <span style="display:inline-block;width:12px;height:12px;background:var(--blue);border-radius:2px"></span> Answered &nbsp;
          <span style="display:inline-block;width:12px;height:12px;background:var(--gold);border-radius:2px"></span> Flagged
        </div>
        <button class="btn btn-danger w-full" id="btn-submit">Submit Exam</button>
      </div>
    </div>
  `;

  window.jumpTo = (idx) => { examState.current = idx; renderQuestion(); };
  document.getElementById('btn-submit').addEventListener('click', submitExam);
  startTimer();
  renderQuestion();
}

function renderQuestion() {
  const { exam, current, answers, flagged } = examState;
  const q   = exam.questions[current];
  const ans = answers[q._id];

  document.getElementById('question-area').innerHTML = `
    <div class="question-card">
      <div class="question-number">
        Question ${current + 1} of ${exam.questions.length}
        <button class="btn btn-outline btn-sm" style="float:right"
          onclick="toggleFlag('${q._id}')">
          ${flagged.has(q._id) ? 'Unflag' : 'Flag for Review'}
        </button>
      </div>
      <div class="question-text">${q.questionText}</div>
      ${q.type === 'multiple_choice' || q.type === 'true_false' ? `
        <div class="options-list">
          ${q.options.map((opt, oi) => `
            <div class="option-item${ans === opt._id ? ' selected' : ''}"
              onclick="selectAnswer('${q._id}', '${opt._id}')">
              <div class="option-letter">${String.fromCharCode(65+oi)}</div>
              <div>${opt.text}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <textarea class="form-control" rows="6" placeholder="Type your answer here..."
          id="theory-ans"
          onchange="selectAnswer('${q._id}', this.value)"
        >${ans || ''}</textarea>
      `}
      <div class="flex justify-between mt-4">
        <button class="btn btn-outline btn-sm" ${current === 0 ? 'disabled' : ''}
          onclick="jumpTo(${current - 1})">Previous</button>
        <button class="btn btn-primary btn-sm"
          ${current === exam.questions.length - 1 ? 'disabled' : ''}
          onclick="jumpTo(${current + 1})">Next</button>
      </div>
    </div>
  `;

  document.querySelectorAll('.q-nav-btn').forEach((btn, i) => {
    const qid = exam.questions[i]._id;
    btn.classList.toggle('current',   i === current);
    btn.classList.toggle('answered',  !!answers[qid] && !flagged.has(qid));
    btn.classList.toggle('flagged',   flagged.has(qid));
  });
}

window.selectAnswer = (qid, val) => {
  examState.answers[qid] = val;
  renderQuestion();
};

window.toggleFlag = (qid) => {
  if (examState.flagged.has(qid)) examState.flagged.delete(qid);
  else examState.flagged.add(qid);
  renderQuestion();
};

function startTimer() {
  clearInterval(examState.timer);
  examState.timer = setInterval(() => {
    examState.timeLeft--;
    const m = String(Math.floor(examState.timeLeft / 60)).padStart(2,'0');
    const s = String(examState.timeLeft % 60).padStart(2,'0');
    const el = document.getElementById('timer-display');
    if (el) el.textContent = `${m}:${s}`;
    const box = document.getElementById('timer-box');
    if (box) box.classList.toggle('warning', examState.timeLeft < 300);
    if (examState.timeLeft <= 0) { clearInterval(examState.timer); submitExam(); }
  }, 1000);
}

async function submitExam() {
  clearInterval(examState.timer);
  if (!confirm('Are you sure you want to submit your exam?')) {
    startTimer(); return;
  }
  const { result, exam, answers } = examState;
  const ansArr = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
  const timeUsed = exam.duration * 60 - examState.timeLeft;
  try {
    const { result: submitted } = await resultService.submit(result._id, { answers: ansArr, timeUsed });
    renderResultSummary(submitted);
  } catch (err) { alert(err.message); }
}

function renderResultSummary(result) {
  document.getElementById('question-area').closest('.exam-layout').outerHTML = `
    <div class="card text-center" style="max-width:500px;margin:0 auto">
      <h2 style="color:var(--navy);margin-bottom:20px">Exam Submitted!</h2>
      <div class="result-score-circle">
        <div class="score">${result.percentage}%</div>
        <div class="label">${result.grade}</div>
      </div>
      <p style="font-size:18px;font-weight:700;color:${result.passed ? 'var(--green)' : 'var(--red)'}">
        ${result.passed ? 'PASSED' : 'FAILED'}
      </p>
      <p style="color:#9CA3AF;margin-top:8px">
        Score: ${result.totalScore} marks  |
        Time: ${Math.floor(result.timeUsed/60)}m ${result.timeUsed%60}s
      </p>
      <a href="#/results" class="btn btn-primary mt-4">View Full Results</a>
    </div>
  `;
}
