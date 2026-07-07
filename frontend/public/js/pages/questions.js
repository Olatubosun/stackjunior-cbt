// js/pages/questions.js

const QuestionsPage = {
  render() {
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">Question Bank</h1>
            <p class="page-subtitle">Manage all your exam questions</p>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-gold"    onclick="App.navigate('ai-generate')">AI Generate</button>
            <button class="btn btn-primary" onclick="App.navigate('create-question')">+ Add Question</button>
          </div>
        </div>

        <!-- Filters -->
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
            <div class="form-group" style="margin:0;flex:1;min-width:140px">
              <label>Subject</label>
              <input type="text" id="filter-subject" placeholder="e.g. Mathematics" />
            </div>
            <div class="form-group" style="margin:0;flex:1;min-width:120px">
              <label>Topic</label>
              <input type="text" id="filter-topic" placeholder="Any topic" />
            </div>
            <div class="form-group" style="margin:0;min-width:120px">
              <label>Type</label>
              <select id="filter-type">
                <option value="">All Types</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="theory">Theory</option>
                <option value="essay">Essay</option>
                <option value="true_false">True/False</option>
                <option value="fill_blank">Fill in Blank</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;min-width:120px">
              <label>Source</label>
              <select id="filter-source">
                <option value="">All Sources</option>
                <option value="manual">Manual</option>
                <option value="ai_generated">AI Generated</option>
                <option value="scanned">Scanned</option>
                <option value="external_exam">External Exam</option>
              </select>
            </div>
            <button class="btn btn-primary" onclick="QuestionsPage.load()">Search</button>
          </div>
        </div>

        <div class="card">
          <div id="questions-list">
            <div style="text-align:center;padding:40px"><div class="spinner" style="margin:auto"></div></div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    Navbar.setActive('questions');
    await this.load();
  },

  async load() {
    try {
      const subject = document.getElementById('filter-subject')?.value || '';
      const topic   = document.getElementById('filter-topic')?.value   || '';
      const type    = document.getElementById('filter-type')?.value    || '';
      const source  = document.getElementById('filter-source')?.value  || '';

      let params = '?';
      if (subject) params += `subject=${encodeURIComponent(subject)}&`;
      if (topic)   params += `topic=${encodeURIComponent(topic)}&`;
      if (type)    params += `type=${type}&`;
      if (source)  params += `source=${source}&`;

      const data = await Api.getQuestions(params);
      const questions = data.questions || [];

      const typeLabel = {
        multiple_choice: 'MCQ', true_false: 'T/F', fill_blank: 'Fill',
        short_answer: 'Short', theory: 'Theory', essay: 'Essay'
      };

      Helpers.setHTML('questions-list', questions.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Question</th><th>Subject</th><th>Topic</th>
              <th>Type</th><th>Marks</th><th>Source</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${questions.map(q => `
                <tr>
                  <td style="max-width:260px">${Helpers.truncate(q.questionText, 70)}</td>
                  <td>${q.subject}</td>
                  <td>${q.topic}</td>
                  <td><span class="badge badge-blue">${typeLabel[q.type] || q.type}</span></td>
                  <td>${q.markingGuide?.maxMarks ?? q.marks ?? 1}</td>
                  <td><span class="badge badge-grey">${q.source}</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm"
                            onclick="QuestionsPage.edit('${q.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm"
                            onclick="QuestionsPage.delete('${q.id}')">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="font-size:13px;color:#6B7280;margin-top:12px">${questions.length} question(s) found</p>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No questions found</h3>
          <p>Add questions manually, generate with AI, or scan a paper</p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-primary" onclick="App.navigate('create-question')">Add Manually</button>
            <button class="btn btn-gold"    onclick="App.navigate('ai-generate')">AI Generate</button>
          </div>
        </div>
      `);
    } catch (err) {
      Toast.error('Failed to load questions');
    }
  },

  edit(id) {
    App.navigate('create-question', id);
  },

  delete(id) {
    Modal.confirm({
      title: 'Delete Question',
      message: 'Are you sure you want to remove this question from the bank?',
      onConfirm: async () => {
        try {
          await Api.deleteQuestion(id);
          Toast.success('Question deleted');
          this.load();
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });
  }
};
