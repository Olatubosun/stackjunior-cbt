// js/pages/exams.js

const ExamsPage = {
  render() {
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">${Auth.isTeacher() ? 'Manage Exams' : 'My Exams'}</h1>
            <p class="page-subtitle">${Auth.isTeacher() ? 'Create and manage all exams' : 'Available exams for you'}</p>
          </div>
          ${Auth.isTeacher() ? `
            <button class="btn btn-primary" onclick="App.navigate('create-exam')">+ Create Exam</button>
          ` : ''}
        </div>

        <div class="card">
          <div id="exams-list">
            <div style="text-align:center;padding:40px">
              <div class="spinner" style="margin:auto"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    Navbar.setActive('exams');
    await this.load();
  },

  async load() {
    try {
      const data  = await Api.getExams();
      const exams = data.exams || [];
      this._exams = exams;

      if (!exams.length) {
        Helpers.setHTML('exams-list', `
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>${Auth.isTeacher() ? 'No exams yet' : 'No exams available'}</h3>
            <p>${Auth.isTeacher() ? 'Create your first exam to get started' : 'Check back soon for new exams'}</p>
            ${Auth.isTeacher() ? `<button class="btn btn-primary" onclick="App.navigate('create-exam')">Create Exam</button>` : ''}
          </div>
        `);
        return;
      }

      Helpers.setHTML('exams-list', `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Duration</th>
                <th>Questions</th>
                ${Auth.isTeacher() ? '<th>Attempts</th>' : ''}
                <th>Status</th>
                ${Auth.isTeacher() ? '<th>Created</th><th>Actions</th>' : '<th>Action</th>'}
              </tr>
            </thead>
            <tbody>
              ${exams.map(ex => `
                <tr>
                  <td><strong>${ex.title}</strong></td>
                  <td>${ex.subject}</td>
                  <td>${ex.classLevel}</td>
                  <td>${ex.duration} min</td>
                  <td>${ex.questions?.length || 0}</td>
                  ${Auth.isTeacher() ? `<td>${ex.attemptsAllowed || 1}</td>` : ''}
                  <td>
                    <span class="badge ${Helpers.badgeForStatus(ex.status)}">
                      ${ex.status}
                    </span>
                  </td>
                  ${Auth.isTeacher() ? `
                    <td>${Helpers.formatDate(ex.createdAt)}</td>
                    <td>
                      <button class="btn btn-outline btn-sm"
                              onclick="App.navigate('create-exam','${ex.id}')">Edit</button>
                      ${ex.status === 'draft' && Auth.canPublish() ? `
                        <button class="btn btn-green btn-sm"
                                onclick="ExamsPage.publish('${ex.id}')">Publish</button>
                      ` : ''}
                      <button class="btn btn-danger btn-sm"
                              onclick="ExamsPage.delete('${ex.id}')">Delete</button>
                    </td>
                  ` : `
                    <td>
                      ${ex.status === 'active' ? `
                        <button class="btn btn-primary btn-sm"
                                onclick="App.navigate('take-exam','${ex.id}')">Start Exam</button>
                      ` : `
                        <span style="color:var(--muted);font-size:13px">Not available</span>
                      `}
                    </td>
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="font-size:13px;color:var(--muted);margin-top:12px">${exams.length} exam(s)</p>
      `);
    } catch (err) {
      Toast.error('Failed to load exams');
    }
  },

  publish(id) {
    const ex = (this._exams || []).find(e => e.id === id);
    Modal.show({
      title: 'Publish Exam',
      body: `
        <p style="font-size:14px;color:var(--muted);margin-bottom:14px">
          Publishing makes this exam available to the class. Set how many times each
          student may take it.
        </p>
        <div class="form-group">
          <label>Attempts allowed per student</label>
          <input type="number" id="publish-attempts" min="1" value="${ex?.attemptsAllowed || 1}" style="width:130px" />
        </div>
      `,
      footer: `
        <button class="btn btn-outline" id="pub-cancel">Cancel</button>
        <button class="btn btn-green" id="pub-confirm">Publish</button>
      `
    });
    document.getElementById('pub-cancel')?.addEventListener('click', () => Modal.close());
    document.getElementById('pub-confirm')?.addEventListener('click', async () => {
      const n = Math.max(1, parseInt(document.getElementById('publish-attempts').value, 10) || 1);
      Modal.close();
      try {
        await Api.publishExam(id, { attemptsAllowed: n });
        Toast.success('Exam published and now available to students');
        this.load();
      } catch (err) {
        Toast.error(err.message);
      }
    });
  },

  delete(id) {
    Modal.confirm({
      title: 'Delete Exam',
      message: 'Are you sure you want to delete this exam? This cannot be undone.',
      onConfirm: async () => {
        try {
          await Api.deleteExam(id);
          Toast.success('Exam deleted');
          this.load();
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });
  }
};
