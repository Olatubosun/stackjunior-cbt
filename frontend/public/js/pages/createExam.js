// js/pages/createExam.js

const CreateExamPage = {
  examId: null,
  selectedQuestions: [],

  render(id = null) {
    this.examId = id;
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">${id ? 'Edit Exam' : 'Create Exam'}</h1>
            <p class="page-subtitle">Configure your exam settings and select questions</p>
          </div>
          <button class="btn btn-outline" onclick="App.navigate('exams')">Back</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start">
          <!-- Left: exam settings -->
          <div>
            <div class="card" style="margin-bottom:16px">
              <h3 class="card-title" style="margin-bottom:16px">Exam Details</h3>
              <form id="exam-form">
                <div class="form-group">
                  <label>Exam Title *</label>
                  <input type="text" id="ex-title" placeholder="e.g. First Term Mathematics Exam" required />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Subject *</label>
                    <input type="text" id="ex-subject" placeholder="e.g. Mathematics" required />
                  </div>
                  <div class="form-group">
                    <label>Class *</label>
                    <select id="ex-class-id" required>
                      <option value="">Loading classes...</option>
                    </select>
                    <small id="ex-class-hint" style="display:block;margin-top:4px;color:var(--muted);font-size:12px"></small>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Exam Type *</label>
                    <select id="ex-type">
                      <option value="classwork">Class Work</option>
                      <option value="homework">Home Work</option>
                      <option value="test" selected>Test</option>
                      <option value="examination">Examination</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Duration (minutes) *</label>
                    <input type="number" id="ex-duration" value="60" min="5" required />
                  </div>
                  <div class="form-group">
                    <label>Pass Mark (%)</label>
                    <input type="number" id="ex-passmark" value="50" min="1" max="100" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Student Instructions</label>
                  <textarea id="ex-instructions" rows="3"
                    placeholder="Instructions shown to students before the exam starts..."></textarea>
                </div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
                  <input type="checkbox" id="ex-randomise" checked style="width:auto" />
                  <label for="ex-randomise" style="margin:0;font-weight:400;cursor:pointer">
                    Randomise question order for each student
                  </label>
                </div>
                <button type="submit" class="btn btn-primary btn-lg">
                  ${this.examId ? 'Update Exam' : 'Save Exam'}
                </button>
              </form>
            </div>

            <!-- Selected Questions -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Selected Questions
                  <span id="q-count" class="badge badge-blue" style="margin-left:8px">0</span>
                </h3>
                <span id="total-marks" style="font-weight:700;color:var(--green)">0 marks total</span>
              </div>
              <div id="selected-questions-list">
                <div class="empty-state" style="padding:30px">
                  <div class="empty-icon">📝</div>
                  <p>No questions selected. Pick from the bank on the right.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: question bank picker -->
          <div class="card" style="position:sticky;top:80px">
            <h3 class="card-title" style="margin-bottom:12px">Pick from Question Bank</h3>
            <div class="form-group" style="margin-bottom:8px">
              <input type="text" id="pick-subject" placeholder="Filter by subject..."
                     oninput="CreateExamPage.loadBank()" />
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <select id="pick-type" onchange="CreateExamPage.loadBank()" style="flex:1">
                <option value="">All Types</option>
                <option value="multiple_choice">MCQ</option>
                <option value="theory">Theory</option>
                <option value="essay">Essay</option>
                <option value="true_false">T/F</option>
                <option value="fill_blank">Fill</option>
              </select>
            </div>
            <div id="bank-list" style="max-height:480px;overflow-y:auto">
              <div style="text-align:center;padding:20px">
                <div class="spinner" style="margin:auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async init(id = null) {
    Navbar.setActive('exams');
    this.examId            = id;
    this.selectedQuestions = [];

    await Promise.all([this.loadBank(), this.loadClasses()]);

    document.getElementById('exam-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });

    if (id) await this.loadExam(id);
  },

  async loadClasses() {
    const sel  = document.getElementById('ex-class-id');
    const hint = document.getElementById('ex-class-hint');
    if (!sel) return;
    try {
      const data = await Api.getMyClasses();
      this._classes = data.classes || [];
      if (!this._classes.length) {
        sel.innerHTML = '<option value="">No classes available</option>';
        if (hint) hint.textContent = 'No classes are linked to your school. Please log in via Stackjunior to sync classes.';
        return;
      }
      sel.innerHTML = '<option value="">-- Select class --</option>'
        + this._classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (hint) hint.textContent = '';
    } catch (err) {
      sel.innerHTML = '<option value="">Failed to load classes</option>';
      if (hint) hint.textContent = err.message;
    }
  },

  async loadBank() {
    const subject = document.getElementById('pick-subject')?.value || '';
    const type    = document.getElementById('pick-type')?.value    || '';
    let params    = '?';
    if (subject) params += `subject=${encodeURIComponent(subject)}&`;
    if (type)    params += `type=${type}&`;

    try {
      const data      = await Api.getQuestions(params);
      const questions = data.questions || [];
      const typeLabel = { multiple_choice:'MCQ', true_false:'T/F', fill_blank:'Fill',
                          short_answer:'Short', theory:'Theory', essay:'Essay' };

      Helpers.setHTML('bank-list', questions.length ? questions.map(q => {
        const selected = this.selectedQuestions.some(s => s.id === q.id);
        return `
          <div style="padding:10px;border:1.5px solid ${selected ? 'var(--green)' : 'var(--border)'};
                      border-radius:6px;margin-bottom:8px;cursor:pointer;background:${selected ? '#D1FAE5' : 'var(--white)'}"
               onclick="CreateExamPage.toggleQuestion(${JSON.stringify(q).replace(/"/g,'&quot;')})">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span class="badge badge-blue" style="font-size:11px">${typeLabel[q.type] || q.type}</span>
              <span style="font-size:12px;color:var(--muted)">${(() => { const m = q.markingGuide?.maxMarks ?? q.marks ?? 1; return `${m} mark${m > 1 ? 's' : ''}`; })()}</span>
            </div>
            <p style="font-size:13px;color:var(--navy);margin:0">${Helpers.truncate(q.questionText, 80)}</p>
            <p style="font-size:11px;color:var(--muted);margin:4px 0 0">${q.subject} | ${q.topic}</p>
          </div>
        `;
      }).join('') : '<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No questions found</p>');
    } catch (err) {
      Toast.error('Failed to load question bank');
    }
  },

  toggleQuestion(q) {
    const idx = this.selectedQuestions.findIndex(s => s.id === q.id);
    if (idx >= 0) {
      this.selectedQuestions.splice(idx, 1);
    } else {
      this.selectedQuestions.push(q);
    }
    this.renderSelected();
    this.loadBank();
  },

  renderSelected() {
    const total = this.selectedQuestions.reduce((s, q) => s + (q.markingGuide?.maxMarks ?? q.marks ?? 1), 0);
    Helpers.setText('q-count',     this.selectedQuestions.length);
    Helpers.setText('total-marks', `${total} marks total`);

    if (!this.selectedQuestions.length) {
      Helpers.setHTML('selected-questions-list', `
        <div class="empty-state" style="padding:30px">
          <div class="empty-icon">📝</div>
          <p>No questions selected. Pick from the bank on the right.</p>
        </div>
      `);
      return;
    }

    const typeLabel = { multiple_choice:'MCQ', true_false:'T/F', fill_blank:'Fill',
                        short_answer:'Short', theory:'Theory', essay:'Essay' };
    Helpers.setHTML('selected-questions-list', `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${this.selectedQuestions.map((q, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;
                      background:var(--light-bg);border-radius:6px">
            <span style="font-weight:700;color:var(--navy);min-width:24px">${i + 1}.</span>
            <div style="flex:1">
              <p style="margin:0;font-size:13px;font-weight:600">${Helpers.truncate(q.questionText, 60)}</p>
              <span class="badge badge-blue" style="font-size:11px">${typeLabel[q.type] || q.type}</span>
              <span style="font-size:11px;color:var(--muted);margin-left:6px">${q.markingGuide?.maxMarks ?? q.marks ?? 1} mark(s)</span>
            </div>
            <button class="btn btn-danger btn-sm" style="padding:3px 8px"
                    onclick="CreateExamPage.removeQuestion('${q.id}')">x</button>
          </div>
        `).join('')}
      </div>
    `);
  },

  removeQuestion(id) {
    this.selectedQuestions = this.selectedQuestions.filter(q => q.id !== id);
    this.renderSelected();
    this.loadBank();
  },

  async loadExam(id) {
    try {
      const { exam } = await Api.getExam(id);
      Helpers.el('ex-title').value        = exam.title        || '';
      Helpers.el('ex-subject').value      = exam.subject      || '';
      Helpers.el('ex-duration').value     = exam.duration     || 60;
      Helpers.el('ex-passmark').value     = exam.passMark     || 50;
      if (document.getElementById('ex-type')) document.getElementById('ex-type').value = exam.examType || 'test';
      Helpers.el('ex-instructions').value = exam.instructions || '';
      Helpers.el('ex-randomise').checked  = exam.randomise !== false;
      const classSel = document.getElementById('ex-class-id');
      if (classSel && exam.classId) classSel.value = exam.classId;
      this.selectedQuestions = exam.questions || [];
      this.renderSelected();
    } catch (err) {
      Toast.error('Failed to load exam');
    }
  },

  async save() {
    if (!this.selectedQuestions.length) {
      Toast.warning('Please select at least one question');
      return;
    }
    const btn = document.querySelector('#exam-form button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Saving...';

    const totalMarks = this.selectedQuestions.reduce((s, q) => s + (q.markingGuide?.maxMarks ?? q.marks ?? 1), 0);

    const classId  = document.getElementById('ex-class-id')?.value || '';
    const classSel = document.getElementById('ex-class-id');
    const className = classSel?.options[classSel.selectedIndex]?.text || '';
    if (!classId) {
      Toast.warning('Please pick a class.');
      btn.disabled = false;
      btn.textContent = this.examId ? 'Update Exam' : 'Save Exam';
      return;
    }

    try {
      const body = {
        title:        Helpers.el('ex-title').value,
        subject:      Helpers.el('ex-subject').value,
        classId,
        classLevel:   className,
        examType:     document.getElementById('ex-type')?.value || 'test',
        duration:     parseInt(Helpers.el('ex-duration').value),
        passMark:     parseInt(Helpers.el('ex-passmark').value),
        instructions: Helpers.el('ex-instructions').value,
        randomise:    Helpers.el('ex-randomise').checked,
        questions:    this.selectedQuestions.map(q => q.id),
        totalMarks,
      };

      if (this.examId) {
        await Api.updateExam(this.examId, body);
        Toast.success('Exam updated');
      } else {
        await Api.createExam(body);
        Toast.success('Exam created');
      }
      App.navigate('exams');
    } catch (err) {
      Toast.error(err.message);
      btn.disabled    = false;
      btn.textContent = this.examId ? 'Update Exam' : 'Save Exam';
    }
  }
};
