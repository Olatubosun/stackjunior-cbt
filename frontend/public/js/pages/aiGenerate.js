// js/pages/aiGenerate.js

const AiGeneratePage = {
  generatedQuestions: [],

  render() {
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">AI Question Generator</h1>
            <p class="page-subtitle">Generate questions using AI - from a prompt, your notes, or a scanned paper</p>
          </div>
          <button class="btn btn-outline" onclick="AiGeneratePage.tryBack()">Back to Bank</button>
        </div>

        <!-- Method Tabs -->
        <div style="display:flex;gap:4px;margin-bottom:20px;background:#E5E7EB;padding:4px;border-radius:10px;width:fit-content">
          <button class="btn btn-primary" id="tab-prompt" onclick="AiGeneratePage.switchTab('prompt')">
            Prompt AI
          </button>
          <button class="btn btn-outline" id="tab-text" onclick="AiGeneratePage.switchTab('text')"
                  style="background:transparent;border:none;color:var(--muted)">
            Upload Notes / Text
          </button>
          <button class="btn btn-outline" id="tab-scan" onclick="AiGeneratePage.switchTab('scan')"
                  style="background:transparent;border:none;color:var(--muted)">
            Scan a Paper
          </button>
        </div>

        <!-- Tab: Prompt -->
        <div id="tab-content-prompt">
          <div class="card" style="margin-bottom:16px">
            <h3 class="card-title" style="margin-bottom:16px">Generate from Topic Prompt</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Subject *</label>
                <input type="text" id="gen-subject" placeholder="e.g. Biology" />
              </div>
              <div class="form-group">
                <label>Topic *</label>
                <input type="text" id="gen-topic" placeholder="e.g. Photosynthesis" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Class Level *</label>
                <select id="gen-class">
                  <option value="">-- Select --</option>
                  <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                  <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                </select>
              </div>
              <div class="form-group">
                <label>Difficulty</label>
                <select id="gen-difficulty">
                  <option value="easy">Easy</option>
                  <option value="medium" selected>Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Question Types</label>
                <div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px 0">
                  ${[['multiple_choice','Multiple Choice'],['theory','Theory'],
                     ['essay','Essay'],['fill_blank','Fill in Blank'],['true_false','True/False']
                    ].map(([val, lbl]) => `
                    <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:14px">
                      <input type="checkbox" class="gen-type" value="${val}"
                             ${val === 'multiple_choice' ? 'checked' : ''} />
                      ${lbl}
                    </label>
                  `).join('')}
                </div>
              </div>
              <div class="form-group">
                <label>Number of Questions</label>
                <input type="number" id="gen-quantity" value="5" min="1" max="20" />
              </div>
            </div>
            <button class="btn btn-gold btn-lg" id="btn-generate-prompt" onclick="AiGeneratePage.generateFromPrompt()">
              Generate Questions
            </button>
          </div>
        </div>

        <!-- Tab: Text/Notes -->
        <div id="tab-content-text" style="display:none">
          <div class="card" style="margin-bottom:16px">
            <h3 class="card-title" style="margin-bottom:16px">Generate from Your Notes or Textbook</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Subject</label>
                <input type="text" id="text-subject" placeholder="e.g. Chemistry" />
              </div>
              <div class="form-group">
                <label>Class Level</label>
                <select id="text-class">
                  <option value="">-- Select --</option>
                  <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                  <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Number of Questions</label>
                <input type="number" id="text-quantity" value="5" min="1" max="20" />
              </div>
              <div class="form-group">
                <label>Question Types (comma separated)</label>
                <input type="text" id="text-types" value="multiple_choice" placeholder="multiple_choice, theory" />
              </div>
            </div>
            <div class="form-group">
              <label>Paste your notes or textbook content *</label>
              <textarea id="text-content" rows="8"
                placeholder="Paste any educational content here - notes, textbook excerpts, lesson summaries. AI will generate questions based on this content..."></textarea>
            </div>
            <button class="btn btn-gold btn-lg" onclick="AiGeneratePage.generateFromText()">
              Generate from Content
            </button>
          </div>
        </div>

        <!-- Tab: Scan -->
        <div id="tab-content-scan" style="display:none">
          <div class="card" style="margin-bottom:16px">
            <h3 class="card-title" style="margin-bottom:16px">Scan a Printed Question Paper</h3>
            <p style="color:var(--muted);font-size:14px;margin-bottom:16px">
              Take a clear photo of any printed question paper or upload a scanned image.
              AI will extract all questions automatically.
            </p>
            <div class="form-row">
              <div class="form-group">
                <label>Subject (optional)</label>
                <input type="text" id="scan-subject" placeholder="e.g. English Language" />
              </div>
              <div class="form-group">
                <label>Class Level (optional)</label>
                <select id="scan-class">
                  <option value="">-- Select --</option>
                  <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                  <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Upload Image (JPG, PNG, PDF)</label>
              <div style="border:2px dashed var(--border);border-radius:8px;padding:32px;text-align:center;cursor:pointer"
                   onclick="document.getElementById('scan-file').click()">
                <div style="font-size:36px;margin-bottom:8px">📷</div>
                <p style="color:var(--muted);font-size:14px">Click to upload or drag and drop</p>
                <p style="color:var(--light);font-size:12px">JPG, PNG supported</p>
              </div>
              <input type="file" id="scan-file" accept="image/*" style="display:none"
                     onchange="AiGeneratePage.previewScan(this)" />
            </div>
            <div id="scan-preview" style="display:none;margin-bottom:16px">
              <img id="scan-preview-img" style="max-width:100%;border-radius:8px;border:1px solid var(--border)" />
            </div>
            <button class="btn btn-gold btn-lg" id="btn-scan" onclick="AiGeneratePage.scanPaper()" disabled>
              Extract Questions from Image
            </button>
          </div>
        </div>

        <!-- Generated Questions Preview -->
        <div id="generated-section" style="display:none">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Generated Questions Preview</h3>
              <div style="display:flex;gap:8px">
                <button class="btn btn-outline btn-sm" onclick="AiGeneratePage.clearGenerated()">Clear</button>
                <button class="btn btn-green" onclick="AiGeneratePage.saveAll()">
                  Save All to Question Bank
                </button>
              </div>
            </div>
            <div id="generated-list"></div>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    Navbar.setActive('ai-generate');
    this.generatedQuestions = [];
  },

  switchTab(tab) {
    ['prompt', 'text', 'scan'].forEach(t => {
      const content = document.getElementById(`tab-content-${t}`);
      const btn     = document.getElementById(`tab-${t}`);
      if (content) content.style.display = t === tab ? '' : 'none';
      if (btn) {
        if (t === tab) {
          btn.className = 'btn btn-primary';
          btn.style.cssText = '';
        } else {
          btn.className = 'btn btn-outline';
          btn.style.cssText = 'background:transparent;border:none;color:var(--muted)';
        }
      }
    });
  },

  async generateFromPrompt() {
    const subject  = document.getElementById('gen-subject').value;
    const topic    = document.getElementById('gen-topic').value;
    const classLevel = document.getElementById('gen-class').value;
    if (!subject || !topic || !classLevel) {
      Toast.warning('Please fill in subject, topic, and class level');
      return;
    }
    const types    = [...document.querySelectorAll('.gen-type:checked')].map(c => c.value);
    const quantity = parseInt(document.getElementById('gen-quantity').value) || 5;

    await this._generate(() => Api.aiGenerateQuestions({
      subject, topic, classLevel,
      difficulty: document.getElementById('gen-difficulty').value,
      types, quantity
    }));
  },

  async generateFromText() {
    const content  = document.getElementById('text-content').value.trim();
    const subject  = document.getElementById('text-subject').value;
    const classLevel = document.getElementById('text-class').value;
    if (!content)  { Toast.warning('Please paste some content first'); return; }

    const types = document.getElementById('text-types').value.split(',').map(t => t.trim()).filter(Boolean);
    const quantity = parseInt(document.getElementById('text-quantity').value) || 5;

    await this._generate(() => Api.aiGenerateFromText({ text: content, subject, classLevel, types, quantity }));
  },

  previewScan(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('scan-preview').style.display = '';
      document.getElementById('scan-preview-img').src = e.target.result;
      document.getElementById('btn-scan').disabled = false;
      this._scanBase64 = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
  },

  async scanPaper() {
    if (!this._scanBase64) { Toast.warning('Please upload an image first'); return; }
    await this._generate(() => Api.aiScanPaper({
      imageBase64: this._scanBase64,
      subject:     document.getElementById('scan-subject').value,
      classLevel:  document.getElementById('scan-class').value,
    }));
  },

  async _generate(apiFn) {
    Helpers.showSpinner();
    try {
      const data = await apiFn();
      this.generatedQuestions = data.questions || [];
      if (!this.generatedQuestions.length) {
        Toast.warning('No questions were generated. Try a different prompt.');
        return;
      }
      this.renderGenerated();
      Toast.success(`${this.generatedQuestions.length} questions generated!`);
    } catch (err) {
      Toast.error('AI generation failed: ' + err.message);
    } finally {
      Helpers.hideSpinner();
    }
  },

  renderGenerated() {
    document.getElementById('generated-section').style.display = '';
    const typeLabel = {
      multiple_choice: 'MCQ', true_false: 'T/F', fill_blank: 'Fill',
      short_answer: 'Short', theory: 'Theory', essay: 'Essay'
    };
    Helpers.setHTML('generated-list', this.generatedQuestions.map((q, i) => `
      <div style="border:1.5px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--navy)">${i + 1}.</span>
            <span class="badge badge-blue">${typeLabel[q.type] || q.type}</span>
            <span class="badge badge-grey">${q.marks || 1} mark${q.marks > 1 ? 's' : ''}</span>
          </div>
          <button class="btn btn-danger btn-sm" onclick="AiGeneratePage.removeQuestion(${i})">Remove</button>
        </div>
        <p style="font-size:15px;font-weight:600;color:var(--navy);margin-bottom:10px">
          ${q.questionText}
        </p>
        ${q.options?.length ? `
          <ul style="list-style:none;padding:0;margin:0 0 10px">
            ${q.options.map(o => `
              <li style="padding:4px 0;font-size:14px;color:${o.label === q.correctAnswer ? 'var(--green)' : 'var(--text)'}">
                <strong>${o.label}.</strong> ${o.text}
                ${o.label === q.correctAnswer ? ' <strong>(Correct)</strong>' : ''}
              </li>
            `).join('')}
          </ul>
        ` : ''}
        ${q.correctAnswer && q.type !== 'multiple_choice' ? `
          <p style="font-size:13px;color:var(--green);margin-bottom:6px">
            <strong>Answer:</strong> ${q.correctAnswer}
          </p>
        ` : ''}
        ${q.explanation ? `
          <p style="font-size:13px;color:var(--muted);background:var(--light-bg);padding:8px;border-radius:6px">
            <strong>Explanation:</strong> ${q.explanation}
          </p>
        ` : ''}
        ${q.markingGuide?.modelAnswer ? `
          <div style="font-size:13px;color:var(--muted);margin-top:8px">
            <strong>Model Answer:</strong> ${Helpers.truncate(q.markingGuide.modelAnswer, 120)}
          </div>
        ` : ''}
      </div>
    `).join(''));
  },

  removeQuestion(index) {
    this.generatedQuestions.splice(index, 1);
    if (this.generatedQuestions.length === 0) {
      document.getElementById('generated-section').style.display = 'none';
    } else {
      this.renderGenerated();
    }
  },

  clearGenerated() {
    this.generatedQuestions = [];
    document.getElementById('generated-section').style.display = 'none';
  },

  tryBack() {
    if (!this.generatedQuestions.length) {
      App.navigate('questions');
      return;
    }
    Modal.show({
      title: 'Unsaved Questions',
      body:  `<p>You have <strong>${this.generatedQuestions.length}</strong> generated question(s) that haven't been saved to the question bank. What do you want to do?</p>`,
      footer: `
        <button class="btn btn-outline" id="leave-cancel">Cancel</button>
        <button class="btn btn-danger"  id="leave-discard">Don't Save</button>
        <button class="btn btn-green"   id="leave-save">Save</button>
      `
    });
    document.getElementById('leave-cancel')?.addEventListener('click',  () => Modal.close());
    document.getElementById('leave-discard')?.addEventListener('click', () => {
      Modal.close();
      this.generatedQuestions = [];
      App.navigate('questions');
    });
    document.getElementById('leave-save')?.addEventListener('click', async () => {
      Modal.close();
      await this.saveAll(); // saveAll() navigates to 'questions' on success
    });
  },

  async saveAll() {
    if (!this.generatedQuestions.length) return;

    const subject    = document.getElementById('gen-subject')?.value
                    || document.getElementById('text-subject')?.value
                    || document.getElementById('scan-subject')?.value
                    || 'General';
    const classLevel = document.getElementById('gen-class')?.value
                    || document.getElementById('text-class')?.value
                    || document.getElementById('scan-class')?.value
                    || 'SS 1';

    Helpers.showSpinner();
    try {
      const questions = this.generatedQuestions.map(q => ({
        ...q,
        subject,
        classLevel,
        topic:    q.topic || document.getElementById('gen-topic')?.value || 'General',
        source:   'ai_generated',
      }));
      const data = await Api.bulkImport({ questions });
      Toast.success(`${data.count} questions saved to question bank!`);
      this.clearGenerated();
      App.navigate('questions');
    } catch (err) {
      Toast.error('Failed to save: ' + err.message);
    } finally {
      Helpers.hideSpinner();
    }
  }
};
