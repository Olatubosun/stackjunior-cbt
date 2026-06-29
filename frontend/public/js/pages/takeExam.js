// js/pages/takeExam.js

const TakeExamPage = {
  exam:      null,
  questions: [],
  answers:   {},
  timer:     null,
  timeLeft:  0,

  render(examId) {
    this._examId = examId;
    return `
      <div id="exam-container">
        <div style="text-align:center;padding:60px">
          <div class="spinner" style="margin:auto;margin-bottom:16px"></div>
          <p style="color:var(--muted)">Loading exam...</p>
        </div>
      </div>
    `;
  },

  async init(examId) {
    this._examId = examId;
    try {
      // Start the attempt (creates the Result) and load the exam + questions.
      const [startRes, examRes] = await Promise.all([
        Api.startExam(examId),
        Api.getExam(examId),
      ]);
      this._resultId = startRes.result.id;
      this.exam      = examRes.exam;
      this.questions = examRes.exam.questions || [];
      this.answers   = {};
      this.timeLeft  = this.exam.duration * 60;
      this.renderExam();
      this.startTimer();
    } catch (err) {
      Helpers.setHTML('exam-container', `
        <div style="text-align:center;padding:60px">
          <div style="font-size:48px;margin-bottom:16px">⚠️</div>
          <h3 style="color:var(--navy)">${err.message}</h3>
          <button class="btn btn-primary" style="margin-top:16px" onclick="App.navigate('exams')">
            Back to Exams
          </button>
        </div>
      `);
    }
  },

  renderExam() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <!-- Sticky exam header with timer -->
      <div class="exam-header">
        <div>
          <div style="font-size:16px;font-weight:700">${this.exam.title}</div>
          <div style="font-size:12px;opacity:0.7">${this.exam.subject} | ${this.questions.length} questions</div>
        </div>
        <div style="text-align:center">
          <div class="exam-timer" id="exam-timer">00:00</div>
          <div style="font-size:11px;opacity:0.7">Time Remaining</div>
        </div>
        <div style="text-align:right">
          <div id="progress-label" style="font-size:13px;opacity:0.8">0 / ${this.questions.length} answered</div>
          <div class="progress-bar" style="width:160px;margin-top:6px">
            <div class="progress-fill" id="progress-fill" style="width:0%"></div>
          </div>
        </div>
      </div>

      <!-- Instructions -->
      ${this.exam.instructions ? `
        <div style="background:var(--light-blue);border-left:4px solid var(--blue);padding:14px 20px;font-size:14px">
          <strong>Instructions:</strong> ${this.exam.instructions}
        </div>
      ` : ''}

      <!-- Questions -->
      <div style="max-width:800px;margin:24px auto;padding:0 20px" id="questions-area">
        ${this.questions.map((q, i) => this.renderQuestion(q, i)).join('')}
      </div>

      <!-- Submit button -->
      <div style="max-width:800px;margin:0 auto 40px;padding:0 20px">
        <button class="btn btn-primary btn-lg btn-block" onclick="TakeExamPage.confirmSubmit()">
          Submit Exam
        </button>
      </div>
    `;
  },

  renderQuestion(q, index) {
    const typeLabel = {
      multiple_choice: 'Multiple Choice', true_false: 'True / False',
      fill_blank: 'Fill in the Blank',    short_answer: 'Short Answer',
      theory: 'Theory',                   essay: 'Essay'
    };

    const optionsHTML = () => {
      // Both multiple-choice and true/false carry options (with stable _id,
      // which is what the server grades on).
      if (['multiple_choice', 'true_false'].includes(q.type) && q.options?.length) {
        return `
          <ul class="options-list">
            ${q.options.map(opt => `
              <li class="option-item" id="opt-${q.id}-${opt._id}"
                  onclick="TakeExamPage.selectOption('${q.id}','${opt._id}',this)">
                <span class="option-label">${opt.label || ''}</span>
                <span>${opt.text}</span>
              </li>
            `).join('')}
          </ul>
        `;
      }
      return `
        <textarea id="ans-${q.id}" rows="${q.type === 'essay' ? 8 : q.type === 'theory' ? 6 : 2}"
          placeholder="${q.type === 'essay' ? 'Write your essay here...' : q.type === 'theory' ? 'Write your answer here...' : 'Your answer'}"
          style="width:100%;margin-top:4px"
          oninput="TakeExamPage.saveTextAnswer('${q.id}',this.value)"></textarea>
      `;
    };

    return `
      <div class="question-card" id="qcard-${q.id}">
        <div class="question-number">
          Question ${index + 1} of ${this.questions.length}
          <span class="badge badge-blue" style="margin-left:8px">${typeLabel[q.type]}</span>
          <span class="badge badge-grey" style="margin-left:4px">${q.marks} mark${q.marks > 1 ? 's' : ''}</span>
        </div>
        <div class="question-text">${q.questionText}</div>
        ${optionsHTML()}
      </div>
    `;
  },

  selectOption(questionId, value, el) {
    // Remove selected from siblings
    el.closest('ul').querySelectorAll('.option-item').forEach(li => li.classList.remove('selected'));
    el.classList.add('selected');
    this.answers[questionId] = value;
    this.updateProgress();
    document.getElementById(`qcard-${questionId}`)?.classList.add('answered');
  },

  saveTextAnswer(questionId, value) {
    this.answers[questionId] = value;
    this.updateProgress();
    if (value.trim()) {
      document.getElementById(`qcard-${questionId}`)?.classList.add('answered');
    } else {
      document.getElementById(`qcard-${questionId}`)?.classList.remove('answered');
    }
  },

  updateProgress() {
    const answered = Object.keys(this.answers).filter(k => this.answers[k]?.toString().trim()).length;
    const total    = this.questions.length;
    const pct      = Math.round((answered / total) * 100);
    Helpers.setText('progress-label', `${answered} / ${total} answered`);
    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = `${pct}%`;
  },

  startTimer() {
    this.updateTimerDisplay();
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        Toast.warning('Time is up! Submitting automatically...');
        setTimeout(() => this.submit(), 2000);
      }
    }, 1000);
  },

  updateTimerDisplay() {
    const el = document.getElementById('exam-timer');
    if (!el) return;
    el.textContent = Helpers.formatDuration(this.timeLeft);
    if (this.timeLeft <= 300) el.classList.add('warning');
  },

  confirmSubmit() {
    const answered  = Object.keys(this.answers).filter(k => this.answers[k]?.toString().trim()).length;
    const unanswered = this.questions.length - answered;

    Modal.confirm({
      title:    'Submit Exam',
      message:  unanswered > 0
        ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
        : 'Are you sure you want to submit your exam? You cannot change your answers after submission.',
      onConfirm: () => this.submit()
    });
  },

  async submit() {
    clearInterval(this.timer);
    Helpers.showSpinner();
    try {
      const answers = this.questions.map(q => ({
        questionId: q.id,
        answer:     this.answers[q.id] || ''
      }));
      const timeUsed = Math.max(0, this.exam.duration * 60 - this.timeLeft);
      const data = await Api.submitExam(this._resultId, { answers, timeUsed });
      Helpers.hideSpinner();
      this.showResults(data.result);
    } catch (err) {
      Helpers.hideSpinner();
      Toast.error('Submission failed: ' + err.message);
    }
  },

  showResults(result) {
    const pct   = result.percentage || 0;
    const grade = Helpers.gradeFromPercent(pct);
    const pass  = result.passed;

    document.getElementById('app').innerHTML = `
      ${Navbar.render()}
      <div class="main-content" style="max-width:600px;margin:0 auto">
        <div class="card" style="text-align:center;padding:40px">
          <h2 style="font-size:22px;font-weight:700;color:var(--navy);margin-bottom:24px">
            Exam Submitted!
          </h2>
          <div class="result-score-circle ${pass ? 'pass' : 'fail'}">
            <div class="result-score-pct">${pct}%</div>
            <div class="result-score-label">Grade ${grade}</div>
          </div>
          <div style="display:flex;justify-content:center;gap:24px;margin-bottom:24px;flex-wrap:wrap">
            <div>
              <div style="font-size:24px;font-weight:700;color:var(--navy)">${result.totalScore}</div>
              <div style="font-size:12px;color:var(--muted)">Score</div>
            </div>
            <div>
              <div style="font-size:24px;font-weight:700;color:var(--navy)">${this.exam?.totalMarks ?? ''}</div>
              <div style="font-size:12px;color:var(--muted)">Total Marks</div>
            </div>
            <div>
              <div style="font-size:24px;font-weight:700;color:var(--navy)">
                ${Helpers.formatDuration(result.timeUsed || 0)}
              </div>
              <div style="font-size:12px;color:var(--muted)">Time Taken</div>
            </div>
          </div>
          <span class="badge ${pass ? 'badge-green' : 'badge-red'}" style="font-size:15px;padding:8px 20px">
            ${pass ? 'PASSED' : 'FAILED'}
          </span>
          <p style="color:var(--muted);font-size:14px;margin-top:16px">
            Your results will be reviewed by your teacher and released soon.
          </p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
            <button class="btn btn-primary" onclick="App.navigate('results')">View My Results</button>
            <button class="btn btn-outline" onclick="App.navigate('dashboard')">Dashboard</button>
          </div>
        </div>
      </div>
    `;
    Navbar.init();
  }
};
