// js/pages/createQuestion.js

const CreateQuestionPage = {
  questionId: null,

  render(id = null) {
    this.questionId = id;
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">${id ? 'Edit Question' : 'Add Question'}</h1>
            <p class="page-subtitle">Fill in the question details below</p>
          </div>
          <button class="btn btn-outline" onclick="App.navigate('questions')">Back</button>
        </div>

        <div class="card">
          <form id="question-form">
            <div class="form-row">
              <div class="form-group">
                <label>Subject *</label>
                <input type="text" id="q-subject" placeholder="e.g. Mathematics" required />
              </div>
              <div class="form-group">
                <label>Topic *</label>
                <input type="text" id="q-topic" placeholder="e.g. Algebra" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Class Level *</label>
                <select id="q-class" required>
                  <option value="">-- Select --</option>
                  <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                  <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                </select>
              </div>
              <div class="form-group">
                <label>Difficulty</label>
                <select id="q-difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium" selected>Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Question Type *</label>
                <select id="q-type" required>
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="theory">Theory / Structured</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
              <div class="form-group">
                <label>Marks *</label>
                <input type="number" id="q-marks" value="1" min="1" required />
              </div>
            </div>

            <div class="form-group">
              <label>Question Text *</label>
              <textarea id="q-text" rows="3" placeholder="Type the full question here..." required></textarea>
            </div>

            <!-- MCQ Options -->
            <div id="mcq-section">
              <label style="font-weight:700;color:var(--navy);margin-bottom:10px;display:block">
                Answer Options
              </label>
              ${['A','B','C','D'].map(l => `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                  <span style="font-weight:700;width:20px;color:var(--navy)">${l}</span>
                  <input type="text" id="opt-${l}" placeholder="Option ${l}" style="flex:1" />
                  <label style="display:flex;align-items:center;gap:6px;font-weight:400;width:80px">
                    <input type="radio" name="correct-answer" value="${l}" />
                    Correct
                  </label>
                </div>
              `).join('')}
            </div>

            <!-- True/False -->
            <div id="tf-section" style="display:none">
              <div class="form-group">
                <label>Correct Answer</label>
                <select id="q-tf-answer">
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              </div>
            </div>

            <!-- Fill/Short Answer -->
            <div id="fill-section" style="display:none">
              <div class="form-group">
                <label>Correct Answer</label>
                <input type="text" id="q-fill-answer" placeholder="The expected answer" />
              </div>
            </div>

            <!-- Theory/Essay Marking Guide -->
            <div id="theory-section" style="display:none">
              <div style="background:var(--light-blue);border-radius:8px;padding:18px;margin-top:10px">
                <h4 style="font-size:14px;font-weight:700;color:var(--navy);margin-bottom:14px">
                  Marking Guide (AI uses this to mark student answers)
                </h4>
                <div class="form-group">
                  <label>Model Answer</label>
                  <textarea id="q-model-answer" rows="3" placeholder="The ideal complete answer..."></textarea>
                </div>
                <div class="form-group">
                  <label>Key Points (one per line, format: point text | marks)</label>
                  <textarea id="q-key-points" rows="4"
                    placeholder="Mitochondria produces energy | 2&#10;Process is called cellular respiration | 2&#10;Also known as the powerhouse | 1"></textarea>
                  <span class="form-hint">Each line: Key point text | marks awarded for that point</span>
                </div>
                <div class="form-group">
                  <label>Keywords (comma separated)</label>
                  <input type="text" id="q-keywords" placeholder="mitochondria, ATP, energy, cellular respiration" />
                </div>
                <div class="form-group">
                  <label>Strictness Level</label>
                  <select id="q-strictness">
                    <option value="lenient">Lenient - Award marks if idea is correct</option>
                    <option value="moderate" selected>Moderate - Require reasonable accuracy</option>
                    <option value="strict">Strict - Require precise terminology</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="margin-top:24px;display:flex;gap:12px">
              <button type="submit" class="btn btn-primary btn-lg">
                ${this.questionId ? 'Update Question' : 'Save Question'}
              </button>
              <button type="button" class="btn btn-outline" onclick="App.navigate('questions')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async init(id = null) {
    Navbar.setActive('questions');
    this.questionId = id;

    const typeSelect = document.getElementById('q-type');
    typeSelect?.addEventListener('change', () => this.toggleSections(typeSelect.value));
    this.toggleSections(typeSelect?.value || 'multiple_choice');

    if (id) await this.loadQuestion(id);

    document.getElementById('question-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });
  },

  toggleSections(type) {
    Helpers.el('mcq-section').style.display     = type === 'multiple_choice' ? '' : 'none';
    Helpers.el('tf-section').style.display      = type === 'true_false'       ? '' : 'none';
    Helpers.el('fill-section').style.display    = ['fill_blank','short_answer'].includes(type) ? '' : 'none';
    Helpers.el('theory-section').style.display  = ['theory','essay'].includes(type) ? '' : 'none';
  },

  async loadQuestion(id) {
    try {
      const { question: q } = await Api.getQuestion(id);
      Helpers.el('q-subject').value    = q.subject    || '';
      Helpers.el('q-topic').value      = q.topic      || '';
      Helpers.el('q-class').value      = q.classLevel || '';
      Helpers.el('q-difficulty').value = q.difficulty || 'medium';
      Helpers.el('q-type').value       = q.type       || 'multiple_choice';
      Helpers.el('q-marks').value      = q.markingGuide?.maxMarks ?? q.marks ?? 1;
      Helpers.el('q-text').value       = q.questionText || '';

      this.toggleSections(q.type);

      if (q.type === 'multiple_choice' && q.options?.length) {
        q.options.forEach(opt => {
          const el = Helpers.el(`opt-${opt.label}`);
          if (el) el.value = opt.text;
        });
        if (q.correctAnswer) {
          const radio = document.querySelector(`input[name="correct-answer"][value="${q.correctAnswer}"]`);
          if (radio) radio.checked = true;
        }
      }

      if (q.type === 'true_false' && q.correctAnswer) {
        Helpers.el('q-tf-answer').value = q.correctAnswer;
      }

      if (['fill_blank','short_answer'].includes(q.type) && q.correctAnswer) {
        Helpers.el('q-fill-answer').value = q.correctAnswer;
      }

      if (['theory','essay'].includes(q.type) && q.markingGuide) {
        const mg = q.markingGuide;
        Helpers.el('q-model-answer').value = mg.modelAnswer || '';
        Helpers.el('q-keywords').value     = (mg.keywords || []).join(', ');
        Helpers.el('q-strictness').value   = mg.strictness || 'moderate';
        if (mg.keyPoints?.length) {
          Helpers.el('q-key-points').value = mg.keyPoints
            .map(kp => `${kp.point} | ${kp.marks}`).join('\n');
        }
      }
    } catch (err) {
      Toast.error('Failed to load question');
    }
  },

  buildPayload() {
    const type = Helpers.el('q-type').value;
    const body = {
      subject:     Helpers.el('q-subject').value,
      topic:       Helpers.el('q-topic').value,
      classLevel:  Helpers.el('q-class').value,
      difficulty:  Helpers.el('q-difficulty').value,
      type,
      marks:       parseInt(Helpers.el('q-marks').value),
      questionText:Helpers.el('q-text').value,
    };

    if (type === 'multiple_choice') {
      body.options = ['A','B','C','D'].map(l => ({
        label: l,
        text:  Helpers.el(`opt-${l}`).value
      })).filter(o => o.text);
      const checked = document.querySelector('input[name="correct-answer"]:checked');
      body.correctAnswer = checked?.value || '';
    } else if (type === 'true_false') {
      body.correctAnswer = Helpers.el('q-tf-answer').value;
    } else if (['fill_blank','short_answer'].includes(type)) {
      body.correctAnswer = Helpers.el('q-fill-answer').value;
    } else {
      // Theory / Essay
      const keyPointsRaw = Helpers.el('q-key-points').value.trim().split('\n').filter(Boolean);
      body.markingGuide = {
        modelAnswer: Helpers.el('q-model-answer').value,
        keyPoints:   keyPointsRaw.map(line => {
          const [point, marks] = line.split('|');
          return { point: point.trim(), marks: parseInt(marks?.trim()) || 1 };
        }),
        keywords:   Helpers.el('q-keywords').value.split(',').map(k => k.trim()).filter(Boolean),
        strictness: Helpers.el('q-strictness').value,
      };
    }

    return body;
  },

  async save() {
    const btn = document.querySelector('#question-form button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const body = this.buildPayload();
      if (this.questionId) {
        await Api.updateQuestion(this.questionId, body);
        Toast.success('Question updated');
      } else {
        await Api.createQuestion(body);
        Toast.success('Question saved to bank');
      }
      App.navigate('questions');
    } catch (err) {
      Toast.error(err.message);
      btn.disabled = false;
      btn.textContent = this.questionId ? 'Update Question' : 'Save Question';
    }
  }
};
