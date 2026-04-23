// js/components/modal.js

const Modal = {
  show({ title, body, footer = '', size = '' }) {
    this.close();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    overlay.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" id="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">${body}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close());
  },

  close() {
    const m = document.getElementById('active-modal');
    if (m) m.remove();
  },

  confirm({ title, message, onConfirm }) {
    this.show({
      title,
      body: `<p>${message}</p>`,
      footer: `
        <button class="btn btn-outline" id="modal-cancel">Cancel</button>
        <button class="btn btn-danger" id="modal-confirm">Confirm</button>
      `
    });
    document.getElementById('modal-cancel')?.addEventListener('click',  () => this.close());
    document.getElementById('modal-confirm')?.addEventListener('click', () => {
      this.close();
      onConfirm();
    });
  }
};
