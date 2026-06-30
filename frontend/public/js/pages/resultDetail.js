// js/pages/resultDetail.js

const ResultDetailPage = {
  result: null,

  render(id) {
    this._resultId = id;
    return `
      ${Navbar.render()}
      <div class="main-content">
        <div class="page-header">
          <div>
            <h1 class="page-title">Result Detail</h1>
            <p class="page-subtitle">
              ${Auth.isTeacher() ? 'Review answers, adjust AI marks, and release result' : 'Your exam result'}
            </p>
          </div>
          <button class="btn btn-outline" onclick="App.navigate('results')">Back</button>
        </div>
        <div id="result-detail-content">
          <div style="text-align:center;padding:60px">
            <div class="spinner" style="margin:auto"></div>
          </div>
        </div>
      </div>
    `;
  },

  async init(id) {
    Navbar.setActive('results');
    this._resultId = id;
    try {
      const data  = await Api.getResult(id);
      this.result = data.result;
      this.renderDetail();
    } catch (err) {
      Toast.error(err.message);
      App.navigate('results');
    }
  },

  renderDetail() {
    const r    = this.result;
    const pct  = r.percentage || 0;
    const grade= Helpers.gradeFromPercent(pct);

    Helpers.setHTML('result-detail-content', `
      <!-- Summary card -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
          <div class="result-score-circle ${r.passed ? 'pass' : 'fail'}" style="width:100px;height:100px;flex-shrink:0">
            <div class="result-score-pct" style="font-size:24px">${pct}%</div>
            <div class="result-score-label">Grade ${grade}</div>
          </div>
          <div style="flex:1">
            <h3 style="font-size:18px;font-weight:700;color:var(--navy);margin-bottom:6px">
              ${r.exam?.title || 'Exam'}
            </h3>
            <p style="color:var(--muted);font-size:14px;margin-bottom:10px">
              ${r.exam?.subject || ''} |
              ${Auth.isTeacher() ? `Student: <strong>${r.student?.name}</strong>` : ''}
            </p>
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <div>
                <span style="font-size:22px;font-weight:700;color:var(--navy)">${r.totalScore}</span>
                <span style="color:var(--muted);font-size:14px"> / ${r.totalMarks}</span>
              </div>
              <span class="badge ${r.passed ? 'badge-green' : 'badge-red'}" style="font-size:13px;padding:6px 14px">
                ${r.passed ? 'PASSED' : 'FAILED'}
              </span>
              <span class="badge ${Helpers.badgeForStatus(r.status)}" style="padding:6px 14px">
                ${r.status?.replace('_',' ')}
              </span>
            </div>
          </div>
          ${Auth.isTeacher() && r.status !== 'released' ? `
            <div>
              <div class="form-group" style="margin-bottom:10px">
                <label>General Comment (optional)</label>
                <textarea id="teacher-general-comment" rows="2"
                  placeholder="Add a comment for this student..."
                  style="width:220px">${r.teacherComment || ''}</textarea>
              </div>
              <button class="btn btn-green btn-block"
                      onclick="ResultDetailPage.release()">
                Release to Student
              </button>
            </div>
          ` : ''}
        </div>

        ${r.teacherComment ? `
          <div style="margin-top:14px;padding:12px;background:var(--light-blue);border-radius:6px;font-size:14px">
            <strong>Teacher Comment:</strong> ${r.teacherComment}
          </div>
        ` : ''}
      </div>

      <!-- AI Feedback -->
      ${r.aiFeedback?.strengths?.length || r.aiFeedback?.weakAreas?.length ? `
        <div class="ai-feedback-box" style="margin-bottom:16px">
          <h4>AI Performance Feedback</h4>
          ${r.aiFeedback.strengths?.length ? `
            <div class="feedback-section">
              <h5>Strengths</h5>
              <ul>${r.aiFeedback.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
          ` : ''}
          ${r.aiFeedback.weakAreas?.length ? `
            <div class="feedback-section">
              <h5>Areas to Improve</h5>
              <ul>${r.aiFeedback.weakAreas.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
          ` : ''}
          ${r.aiFeedback.recommendations?.length ? `
            <div class="feedback-section">
              <h5>Recommendations</h5>
              <ul>${r.aiFeedback.recommendations.map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Answers -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:16px">
          ${Auth.isTeacher() ? 'Answer Review' : 'Your Answers'}
        </h3>
        ${(r.answers || []).map((ans, i) => this.renderAnswer(ans, i)).join('')}
      </div>
    `);
  },

  renderAnswer(ans, index) {
    const q        = ans.question;
    const isTheory = q && ['theory', 'essay', 'short_answer'].includes(q.type);

    return `
      <div style="border:1.5px solid ${ans.isCorrect ? 'var(--green)' : ans.flagged ? 'var(--gold)' : 'var(--border)'};
                  border-radius:8px;padding:18px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--navy)">Q${index + 1}.</span>
            ${ans.flagged ? `<span class="badge badge-gold">Needs Review</span>` : ''}
            ${ans.isCorrect === true  ? `<span class="badge badge-green">Correct</span>` : ''}
            ${ans.isCorrect === false && !isTheory ? `<span class="badge badge-red">Incorrect</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            ${ans.aiMark !== undefined ? `
              <span style="font-size:13px;color:var(--muted)">AI: ${ans.aiMark}/${ans.maxMarks}</span>
            ` : ''}
            <span style="font-weight:700;color:var(--navy);font-size:15px">
              ${ans.marksAwarded !== undefined ? `${ans.marksAwarded} / ${ans.maxMarks}` : ''}
            </span>
          </div>
        </div>

        <p style="font-size:15px;font-weight:600;color:var(--navy);margin-bottom:12px">
          ${q?.questionText || ''}
        </p>

        <!-- Student answer -->
        <div style="background:var(--light-bg);border-radius:6px;padding:12px;margin-bottom:10px">
          <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase">
            Student Answer
          </span>
          <p style="font-size:14px;margin-top:4px;color:var(--text)">${ans.studentAnswer || '<em style="color:var(--muted)">No answer provided</em>'}</p>
        </div>

        <!-- Correct answer (teacher view or released results) -->
        ${(Auth.isTeacher() || q?.type === 'multiple_choice') && q?.correctAnswer ? `
          <div style="background:#D1FAE5;border-radius:6px;padding:10px;margin-bottom:10px">
            <span style="font-size:12px;font-weight:700;color:var(--green);text-transform:uppercase">Correct Answer</span>
            <p style="font-size:14px;margin-top:4px;color:var(--green)">${q.correctAnswer}</p>
          </div>
        ` : ''}

        <!-- AI comment -->
        ${ans.aiComment ? `
          <div style="background:var(--light-blue);border-radius:6px;padding:10px;margin-bottom:10px;font-size:13px">
            <strong>AI Comment:</strong> ${ans.aiComment}
          </div>
        ` : ''}

        <!-- Teacher marking for theory -->
        ${Auth.isTeacher() && isTheory ? `
          <div style="border-top:1px dashed var(--border);padding-top:12px;margin-top:8px">
            <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
              <div>
                <label style="font-size:12px">Marks Awarded</label>
                <input type="number" id="mark-${ans.id}" value="${ans.teacherMark ?? ans.aiMark ?? ''}"
                       min="0" max="${ans.maxMarks}"
                       style="width:80px;padding:6px;border:1.5px solid var(--border);border-radius:6px" />
                <span style="font-size:12px;color:var(--muted)"> / ${ans.maxMarks}</span>
              </div>
              <div style="flex:1;min-width:200px">
                <label style="font-size:12px">Comment</label>
                <input type="text" id="comment-${ans.id}" value="${ans.teacherComment || ''}"
                       placeholder="Add marking comment..."
                       style="width:100%;padding:6px;border:1.5px solid var(--border);border-radius:6px" />
              </div>
              <button class="btn btn-green btn-sm" style="margin-top:18px"
                      onclick="ResultDetailPage.saveAnswerMark('${this.result.id}','${ans.id}')">
                Save Mark
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Teacher comment (student view) -->
        ${ans.teacherComment && !Auth.isTeacher() ? `
          <div style="font-size:13px;color:var(--muted);margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
            <strong>Teacher:</strong> ${ans.teacherComment}
          </div>
        ` : ''}
      </div>
    `;
  },

  async saveAnswerMark(resultId, answerId) {
    const markEl    = document.getElementById(`mark-${answerId}`);
    const commentEl = document.getElementById(`comment-${answerId}`);
    if (!markEl) return;

    try {
      await Api.markAnswer(resultId, answerId, {
        teacherMark:    parseFloat(markEl.value),
        teacherComment: commentEl?.value || ''
      });
      Toast.success('Mark saved');
      const data  = await Api.getResult(resultId);
      this.result = data.result;
      this.renderDetail();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async release() {
    const comment = document.getElementById('teacher-general-comment')?.value || '';
    try {
      await Api.releaseResult(this._resultId, { teacherComment: comment });
      Toast.success('Result released to student');
      const data  = await Api.getResult(this._resultId);
      this.result = data.result;
      this.renderDetail();
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
