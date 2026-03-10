   const form = document.getElementById('contact-form');
   if (!form) return;

   // Quick copy buttons
   document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
         const val = btn.dataset.copy;
         if (!val) return;
         try {
            await navigator.clipboard.writeText(val);
            showNotice(`Copied ${val}`, 'success');
         } catch (err) {
            showNotice('Copy not available on this browser', 'error');
         }
      });
   });

   const notice = document.getElementById('contact-alert');
   const fields = {
      name: document.getElementById('contact-name'),
      email: document.getElementById('contact-email'),
      phone: document.getElementById('contact-phone'),
      message: document.getElementById('contact-message'),
   };

   function showError(id, msg) {
      const el = document.querySelector(`[data-error-for="${id}"]`);
      if (el) {
         el.textContent = msg;
         el.style.display = 'block';
      }
   }

   function clearErrors() {
      document.querySelectorAll('.field-error').forEach(el => {
         el.textContent = '';
         el.style.display = 'none';
      });
      if (notice) {
         notice.hidden = true;
         notice.textContent = '';
      }
   }

   function showNotice(msg, type = 'success') {
      if (!notice) return;
      notice.textContent = msg;
      notice.dataset.type = type;
      notice.hidden = false;
   }

   function isValidMobile(val) {
      return /^(?:\+20|0)?(10|11|12|15)\d{8}$/.test(val.trim());
   }

   form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const name = fields.name?.value.trim() || '';
      const email = fields.email?.value.trim() || '';
      const phone = fields.phone?.value.trim() || '';
      const message = fields.message?.value.trim() || '';

      let ok = true;
      if (!name) { showError('contact-name', 'Please enter your name'); ok = false; }
      if (!email) { showError('contact-email', 'Please enter a valid email'); ok = false; }
      if (!isValidMobile(phone)) { showError('contact-phone', 'Enter a valid 11-digit mobile'); ok = false; }
      if (!message) { showError('contact-message', 'Please add a message'); ok = false; }

      if (!ok) {
         showNotice('Please fix the highlighted fields', 'error');
         return;
      }

      try {
         const leads = JSON.parse(localStorage.getItem('contactLeads') || '[]');
         leads.push({ name, email, phone, message, createdAt: Date.now() });
         localStorage.setItem('contactLeads', JSON.stringify(leads));
      } catch (err) {}

      showNotice('Thank you! We will get back to you soon.', 'success');
      form.reset();
   });