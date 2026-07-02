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
          <button class="btn btn-outline" id="tab-external" onclick="AiGeneratePage.switchTab('external')"
                  style="background:transparent;border:none;color:var(--muted)">
            From External Examinations
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
              <label>Upload a file (auto-fills the text below)</label>
              <div style="border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer"
                   onclick="document.getElementById('text-file').click()">
                <div style="font-size:32px;margin-bottom:8px">&#128196;</div>
                <p style="color:var(--muted);font-size:14px">Click to upload or drag a file</p>
                <p style="color:var(--light);font-size:12px">.txt, .md, .csv, .pdf</p>
              </div>
              <input type="file" id="text-file"
                     accept=".txt,.md,.csv,.pdf,text/plain,text/markdown,text/csv,application/pdf"
                     style="display:none" onchange="AiGeneratePage.loadTextFile(this)" />
              <div id="text-file-name" style="font-size:13px;color:var(--green);margin-top:6px"></div>
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
              <label>Choose how to capture</label>
              <div style="display:flex;flex-wrap:wrap;gap:12px">
                <div style="flex:1;min-width:200px;border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer;transition:border-color .15s"
                     onmouseover="this.style.borderColor='var(--navy)'" onmouseout="this.style.borderColor='var(--border)'"
                     onclick="AiGeneratePage.openCamera()">
                  <div style="font-size:36px;margin-bottom:8px">&#128247;</div>
                  <p style="font-weight:600;color:var(--navy);font-size:14px;margin:0">Use Camera</p>
                  <p style="color:var(--muted);font-size:12px;margin:4px 0 0">Take a photo right now</p>
                </div>
                <div style="flex:1;min-width:200px;border:2px dashed var(--border);border-radius:8px;padding:24px;text-align:center;cursor:pointer;transition:border-color .15s"
                     onmouseover="this.style.borderColor='var(--navy)'" onmouseout="this.style.borderColor='var(--border)'"
                     onclick="document.getElementById('scan-file').click()">
                  <div style="font-size:36px;margin-bottom:8px">&#128194;</div>
                  <p style="font-weight:600;color:var(--navy);font-size:14px;margin:0">Upload Image</p>
                  <p style="color:var(--muted);font-size:12px;margin:4px 0 0">JPG / PNG from device</p>
                </div>
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

        <!-- Tab: External Examinations -->
        <div id="tab-content-external" style="display:none">
          <div class="card" style="margin-bottom:16px">
            <h3 class="card-title" style="margin-bottom:6px">Generate from External Examinations</h3>
            <p style="color:var(--muted);font-size:13px;margin:0 0 16px">
              Practice questions modeled on the style, format and syllabus of major external
              examinations. Pick an exam body, subject and year, preview the generated
              questions, and select which to add to your bank.
            </p>
            <div class="form-row">
              <div class="form-group">
                <label>Education Level *</label>
                <select id="ext-level" onchange="AiGeneratePage.refreshExternalExamBodies()">
                  <option value="senior">Senior (SS 1 - SS 3)</option>
                  <option value="junior">Junior (JSS 1 - JSS 3 / Primary leaving)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Examination Body *</label>
                <select id="ext-body"></select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Subject *</label>
                <input type="text" id="ext-subject" placeholder="e.g. Mathematics, Biology, English Language" />
              </div>
              <div class="form-group">
                <label>Year *</label>
                <select id="ext-year"></select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Class Level</label>
                <select id="ext-class">
                  <option value="">-- Select --</option>
                  <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                  <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                </select>
              </div>
              <div class="form-group">
                <label>Number of Questions</label>
                <input type="number" id="ext-quantity" value="10" min="1" max="30" />
              </div>
            </div>

            <div class="form-group">
              <label>Question Types</label>
              <div style="display:flex;flex-wrap:wrap;gap:10px;padding:6px 0">
                ${[['multiple_choice','Multiple Choice'],['theory','Theory'],
                   ['essay','Essay'],['fill_blank','Fill in Blank'],['true_false','True/False']
                  ].map(([val, lbl]) => `
                  <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:14px">
                    <input type="checkbox" class="ext-type" value="${val}"
                           ${val === 'multiple_choice' ? 'checked' : ''} />
                    ${lbl}
                  </label>
                `).join('')}
              </div>
            </div>

            <button class="btn btn-gold btn-lg" onclick="AiGeneratePage.generateFromExternalExam()">
              Preview Questions
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

        <p style="text-align:center;color:var(--muted);font-size:10px;margin:32px 0 8px;opacity:.7">
          AI-generated practice questions are in the style of the selected exam &amp; year &mdash;
          not verbatim copies of past papers, which are copyrighted by the exam bodies.
        </p>
      </div>
    `;
  },

  init() {
    Navbar.setActive('ai-generate');
    this.generatedQuestions = [];
    this._selectedQuestions = new Set();
    this._editing = new Set();
    this._externalMode = false;
    // Defer until after innerHTML mounts
    setTimeout(() => {
      this.refreshExternalExamBodies();
      this.populateYearDropdown();
    }, 0);
  },

  EXTERNAL_EXAMS: {
    senior: [
      { value: 'WAEC SSCE',  label: 'WAEC SSCE (May/June)' },
      { value: 'WAEC GCE',   label: 'WAEC GCE (Nov/Dec)' },
      { value: 'NECO SSCE',  label: 'NECO SSCE (June/July)' },
      { value: 'NECO GCE',   label: 'NECO GCE (Nov/Dec)' },
      { value: 'NABTEB SSCE',label: 'NABTEB SSCE' },
      { value: 'NABTEB NBC', label: 'NABTEB NBC (Nat. Business Cert.)' },
      { value: 'NABTEB NTC', label: 'NABTEB NTC (Nat. Technical Cert.)' },
      { value: 'JAMB UTME',  label: 'JAMB UTME' },
      { value: 'IGCSE',      label: 'Cambridge IGCSE' },
    ],
    junior: [
      { value: 'BECE',           label: 'BECE (Basic Education Cert. Exam)' },
      { value: 'JSCE',           label: 'JSCE (Junior School Cert. Exam)' },
      { value: 'NCEE',           label: 'NCEE (National Common Entrance)' },
      { value: 'Common Entrance',label: 'Common Entrance Exam' },
    ],
  },

  refreshExternalExamBodies() {
    const level = document.getElementById('ext-level')?.value || 'senior';
    const sel   = document.getElementById('ext-body');
    if (!sel) return;
    sel.innerHTML = this.EXTERNAL_EXAMS[level]
      .map(e => `<option value="${e.value}">${e.label}</option>`).join('');
  },

  populateYearDropdown() {
    const sel = document.getElementById('ext-year');
    if (!sel) return;
    const now = new Date().getFullYear();
    const years = [];
    for (let y = now; y >= now - 20; y--) years.push(y);
    sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  },

  async generateFromExternalExam() {
    const examBody   = document.getElementById('ext-body').value;
    const subject    = document.getElementById('ext-subject').value.trim();
    const year       = document.getElementById('ext-year').value;
    const classLevel = document.getElementById('ext-class').value;
    const quantity   = parseInt(document.getElementById('ext-quantity').value) || 10;
    const types      = [...document.querySelectorAll('.ext-type:checked')].map(c => c.value);

    if (!examBody) { Toast.warning('Pick an examination body'); return; }
    if (!subject)  { Toast.warning('Enter a subject'); return; }
    if (!year)     { Toast.warning('Pick a year'); return; }
    if (!types.length) { Toast.warning('Pick at least one question type'); return; }

    this._externalMode    = true;
    this._externalContext = { examBody, year, subject, classLevel };

    await this._generate(() => Api.aiGenerateExternalExam({
      examBody, year, subject, classLevel, quantity, types
    }));
  },

  switchTab(tab) {
    ['prompt', 'text', 'scan', 'external'].forEach(t => {
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
      const [header, b64] = e.target.result.split(',');
      this._scanBase64 = b64;
      this._scanMime = (header.match(/data:(.*?);base64/) || [])[1] || 'image/jpeg';
    };
    reader.readAsDataURL(file);
  },

  loadTextFile(input) {
    const file = input.files[0];
    if (!file) return;
    document.getElementById('text-file-name').textContent = `Loaded: ${file.name}`;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf' || file.type === 'application/pdf') {
      this._readPdf(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('text-content').value = e.target.result || '';
      Toast.success(`Loaded ${file.name} into the editor`);
    };
    reader.onerror = () => Toast.error('Could not read file');
    reader.readAsText(file);
  },

  async _readPdf(file) {
    Helpers.showSpinner();
    try {
      if (!window.pdfjsLib) await this._loadPdfJs();
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n\n';
      }
      document.getElementById('text-content').value = text.trim();
      Toast.success(`Extracted text from ${pdf.numPages} page(s)`);
    } catch (err) {
      Toast.error('PDF read failed: ' + err.message);
    } finally {
      Helpers.hideSpinner();
    }
  },

  _loadPdfJs() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      s.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(s);
    });
  },

  async openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      Toast.error('Camera not supported on this browser');
      return;
    }
    Modal.show({
      title: 'Take a photo',
      body: `
        <video id="cam-video" autoplay playsinline
               style="width:100%;border-radius:8px;background:#000;max-height:60vh"></video>
        <canvas id="cam-canvas" style="display:none"></canvas>
      `,
      footer: `
        <button class="btn btn-outline" id="cam-cancel">Cancel</button>
        <button class="btn btn-primary" id="cam-capture">Capture</button>
      `
    });

    try {
      this._camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      document.getElementById('cam-video').srcObject = this._camStream;
    } catch (err) {
      Toast.error('Could not access camera: ' + err.message);
      Modal.close();
      return;
    }

    const obs = new MutationObserver(() => {
      if (!document.getElementById('active-modal')) {
        this._stopCameraStream();
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });

    document.getElementById('cam-cancel')?.addEventListener('click', () => Modal.close());
    document.getElementById('cam-capture')?.addEventListener('click', () => this._captureCamera());
  },

  _captureCamera() {
    const video = document.getElementById('cam-video');
    const canvas = document.getElementById('cam-canvas');
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    Modal.close();

    document.getElementById('scan-preview').style.display = '';
    document.getElementById('scan-preview-img').src = dataUrl;
    document.getElementById('btn-scan').disabled = false;
    this._scanBase64 = dataUrl.split(',')[1];
    this._scanMime = 'image/jpeg';
    Toast.success('Photo captured');
  },

  _stopCameraStream() {
    if (this._camStream) {
      this._camStream.getTracks().forEach(t => t.stop());
      this._camStream = null;
    }
  },

  async scanPaper() {
    if (!this._scanBase64) { Toast.warning('Please upload an image first'); return; }
    await this._generate(() => Api.aiScanPaper({
      imageBase64: this._scanBase64,
      mimeType:    this._scanMime || 'image/jpeg',
      subject:     document.getElementById('scan-subject').value,
      classLevel:  document.getElementById('scan-class').value,
    }));
  },

  async _generate(apiFn) {
    Helpers.showSpinner();
    try {
      const data = await apiFn();
      this.generatedQuestions = data.questions || [];
      // Default: all questions selected
      this._selectedQuestions = new Set(this.generatedQuestions.map((_, i) => i));
      this._editing = new Set();
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

  toggleSelected(index, checked) {
    if (checked) this._selectedQuestions.add(index);
    else         this._selectedQuestions.delete(index);
    this._updateSelectionCount();
  },

  selectAllGenerated(select) {
    this._selectedQuestions = new Set(
      select ? this.generatedQuestions.map((_, i) => i) : []
    );
    this.renderGenerated();
  },

  _updateSelectionCount() {
    const el = document.getElementById('selection-count');
    if (el) el.textContent =
      `${this._selectedQuestions.size} of ${this.generatedQuestions.length} selected`;
  },

  renderGenerated() {
    document.getElementById('generated-section').style.display = '';
    const typeLabel = {
      multiple_choice: 'MCQ', true_false: 'T/F', fill_blank: 'Fill',
      short_answer: 'Short', theory: 'Theory', essay: 'Essay'
    };
    const toolbar = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 14px;border-bottom:1px solid var(--border);margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:12px;font-size:13px">
          <span id="selection-count" style="color:var(--muted)">
            ${this._selectedQuestions.size} of ${this.generatedQuestions.length} selected
          </span>
          <button class="btn btn-outline btn-sm" onclick="AiGeneratePage.selectAllGenerated(true)">Select all</button>
          <button class="btn btn-outline btn-sm" onclick="AiGeneratePage.selectAllGenerated(false)">Select none</button>
        </div>
        ${this._externalMode && this._externalContext ? `
          <span class="badge badge-blue" style="font-size:12px">
            ${this._externalContext.examBody} ${this._externalContext.year || ''} - ${this._externalContext.subject}
          </span>
        ` : ''}
      </div>`;

    Helpers.setHTML('generated-list', toolbar + this.generatedQuestions.map((q, i) =>
      this._editing.has(i) ? this._editCard(q, i, typeLabel) : this._viewCard(q, i, typeLabel)
    ).join(''));
  },

  // Escape a value for safe use in HTML attributes / textareas.
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  _viewCard(q, i, typeLabel) {
    return `
      <div style="border:1.5px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px;${this._selectedQuestions.has(i) ? '' : 'opacity:0.55'}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" ${this._selectedQuestions.has(i) ? 'checked' : ''}
                   onchange="AiGeneratePage.toggleSelected(${i}, this.checked)"
                   style="width:18px;height:18px;cursor:pointer" />
            <span style="font-weight:700;color:var(--navy)">${i + 1}.</span>
            <span class="badge badge-blue">${typeLabel[q.type] || q.type}</span>
            <span class="badge badge-grey">${q.marks || 1} mark${q.marks > 1 ? 's' : ''}</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="AiGeneratePage.editQuestion(${i})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="AiGeneratePage.removeQuestion(${i})">Remove</button>
          </div>
        </div>
        <p style="font-size:15px;font-weight:600;color:var(--navy);margin-bottom:10px">
          ${this.esc(q.questionText)}
        </p>
        ${q.options?.length ? `
          <ul style="list-style:none;padding:0;margin:0 0 10px">
            ${q.options.map(o => `
              <li style="padding:4px 0;font-size:14px;color:${o.label === q.correctAnswer ? 'var(--green)' : 'var(--text)'}">
                <strong>${o.label}.</strong> ${this.esc(o.text)}
                ${o.label === q.correctAnswer ? ' <strong>(Correct)</strong>' : ''}
              </li>
            `).join('')}
          </ul>
        ` : ''}
        ${q.correctAnswer && q.type !== 'multiple_choice' ? `
          <p style="font-size:13px;color:var(--green);margin-bottom:6px">
            <strong>Answer:</strong> ${this.esc(q.correctAnswer)}
          </p>
        ` : ''}
        ${q.explanation ? `
          <p style="font-size:13px;color:var(--muted);background:var(--light-bg);padding:8px;border-radius:6px">
            <strong>Explanation:</strong> ${this.esc(q.explanation)}
          </p>
        ` : ''}
        ${q.markingGuide?.modelAnswer ? `
          <div style="font-size:13px;color:var(--muted);margin-top:8px">
            <strong>Model Answer:</strong> ${this.esc(Helpers.truncate(q.markingGuide.modelAnswer, 120))}
          </div>
        ` : ''}
      </div>`;
  },

  _editCard(q, i, typeLabel) {
    const optionTypes = ['multiple_choice', 'true_false'];
    return `
      <div style="border:1.5px solid var(--blue);border-radius:8px;padding:18px;margin-bottom:12px;background:var(--light-blue)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:700;color:var(--navy)">Editing Question ${i + 1}</span>
          <button class="btn btn-green btn-sm" onclick="AiGeneratePage.doneEditing(${i})">Done</button>
        </div>

        <div class="form-group">
          <label>Question</label>
          <textarea rows="3" style="width:100%"
            oninput="AiGeneratePage.updateField(${i},'questionText',this.value)">${this.esc(q.questionText)}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Type</label>
            <select onchange="AiGeneratePage.changeType(${i}, this.value)">
              ${['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'theory', 'essay']
                .map(t => `<option value="${t}" ${q.type === t ? 'selected' : ''}>${typeLabel[t] || t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Marks</label>
            <input type="number" min="1" value="${q.marks || 1}"
              onchange="AiGeneratePage.updateField(${i},'marks',parseInt(this.value)||1)" />
          </div>
        </div>

        ${optionTypes.includes(q.type) ? `
          <div class="form-group">
            <label>Options — pick the correct answer</label>
            ${(q.options || []).map((o, oi) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <input type="radio" name="correct-${i}" ${o.label === q.correctAnswer ? 'checked' : ''}
                       onchange="AiGeneratePage.setCorrect(${i},'${o.label}')" style="cursor:pointer" title="Mark correct" />
                <span style="font-weight:700;width:20px">${o.label}.</span>
                <input type="text" value="${this.esc(o.text)}" style="flex:1"
                       oninput="AiGeneratePage.updateOption(${i},${oi},'text',this.value)" />
                <button class="btn btn-danger btn-sm" onclick="AiGeneratePage.removeOption(${i},${oi})"
                        style="padding:4px 8px">&times;</button>
              </div>
            `).join('')}
            <button class="btn btn-outline btn-sm" onclick="AiGeneratePage.addOption(${i})"
                    style="margin-top:4px">+ Add option</button>
          </div>
        ` : `
          <div class="form-group">
            <label>Correct Answer</label>
            <input type="text" value="${this.esc(q.correctAnswer)}"
                   oninput="AiGeneratePage.updateField(${i},'correctAnswer',this.value)" />
          </div>
        `}

        <div class="form-group">
          <label>Explanation</label>
          <textarea rows="2" style="width:100%"
            oninput="AiGeneratePage.updateField(${i},'explanation',this.value)">${this.esc(q.explanation)}</textarea>
        </div>

        ${['theory', 'essay', 'short_answer'].includes(q.type) ? `
          <div class="form-group">
            <label>Model Answer (for marking)</label>
            <textarea rows="3" style="width:100%"
              oninput="AiGeneratePage.updateMarkingGuide(${i},'modelAnswer',this.value)">${this.esc(q.markingGuide?.modelAnswer)}</textarea>
          </div>
        ` : ''}
      </div>`;
  },

  editQuestion(i) { this._editing.add(i); this.renderGenerated(); },
  doneEditing(i) { this._editing.delete(i); this.renderGenerated(); },

  updateField(i, field, value) { if (this.generatedQuestions[i]) this.generatedQuestions[i][field] = value; },

  updateMarkingGuide(i, field, value) {
    const q = this.generatedQuestions[i];
    if (!q) return;
    q.markingGuide = q.markingGuide || {};
    q.markingGuide[field] = value;
  },

  updateOption(i, oi, field, value) {
    const opt = this.generatedQuestions[i]?.options?.[oi];
    if (opt) opt[field] = value;
  },

  setCorrect(i, label) {
    const q = this.generatedQuestions[i];
    if (!q) return;
    q.correctAnswer = label;
    (q.options || []).forEach(o => { o.isCorrect = (o.label === label); });
  },

  changeType(i, type) {
    const q = this.generatedQuestions[i];
    if (!q) return;
    q.type = type;
    if (type === 'true_false') {
      q.options = [
        { label: 'A', text: 'True',  isCorrect: q.correctAnswer === 'A' },
        { label: 'B', text: 'False', isCorrect: q.correctAnswer === 'B' },
      ];
    } else if (type === 'multiple_choice' && !(q.options && q.options.length)) {
      q.options = ['A', 'B', 'C', 'D'].map(l => ({ label: l, text: '', isCorrect: false }));
    }
    this.renderGenerated();
  },

  addOption(i) {
    const q = this.generatedQuestions[i];
    if (!q) return;
    q.options = q.options || [];
    q.options.push({ label: String.fromCharCode(65 + q.options.length), text: '', isCorrect: false });
    this.renderGenerated();
  },

  removeOption(i, oi) {
    const q = this.generatedQuestions[i];
    if (!q?.options) return;
    q.options.splice(oi, 1);
    q.options.forEach((o, idx) => { o.label = String.fromCharCode(65 + idx); });
    const correct = q.options.find(o => o.isCorrect);
    q.correctAnswer = correct ? correct.label : '';
    this.renderGenerated();
  },

  removeQuestion(index) {
    this.generatedQuestions.splice(index, 1);
    // Re-index the selection + editing sets around the removed item
    const reindex = (set) => {
      const out = new Set();
      for (const i of set) {
        if (i < index) out.add(i);
        else if (i > index) out.add(i - 1);
      }
      return out;
    };
    this._selectedQuestions = reindex(this._selectedQuestions);
    this._editing = reindex(this._editing);
    if (this.generatedQuestions.length === 0) {
      document.getElementById('generated-section').style.display = 'none';
    } else {
      this.renderGenerated();
    }
  },

  clearGenerated() {
    this.generatedQuestions = [];
    this._selectedQuestions = new Set();
    this._editing = new Set();
    this._externalMode = false;
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

    const picked = this.generatedQuestions
      .map((q, i) => ({ q, i }))
      .filter(({ i }) => this._selectedQuestions.has(i));

    if (!picked.length) {
      Toast.warning('Select at least one question to save');
      return;
    }

    const ext = this._externalMode ? this._externalContext : null;

    const subject    = ext?.subject
                    || document.getElementById('gen-subject')?.value
                    || document.getElementById('text-subject')?.value
                    || document.getElementById('scan-subject')?.value
                    || 'General';
    const classLevel = ext?.classLevel
                    || document.getElementById('gen-class')?.value
                    || document.getElementById('text-class')?.value
                    || document.getElementById('scan-class')?.value
                    || 'SS 1';

    Helpers.showSpinner();
    try {
      const questions = picked.map(({ q }) => ({
        ...q,
        subject,
        classLevel,
        topic:        q.topic || document.getElementById('gen-topic')?.value
                              || (ext ? `${ext.examBody} ${ext.year || ''}`.trim() : 'General'),
        source:       ext ? 'external_exam' : (q.source || 'ai_generated'),
        externalExam: ext ? `${ext.examBody}${ext.year ? ' ' + ext.year : ''}` : (q.externalExam || null),
      }));
      const data = await Api.bulkImport({ questions });
      Toast.success(`${data.count} question${data.count === 1 ? '' : 's'} saved to question bank!`);
      this.clearGenerated();
      App.navigate('questions');
    } catch (err) {
      Toast.error('Failed to save: ' + err.message);
    } finally {
      Helpers.hideSpinner();
    }
  }
};
