(function() {
  const api = window.apiClient || {};
  const loginForm = document.getElementById('stylist-login-form');
  const loginCard = document.getElementById('login-card');
  const attendanceCard = document.getElementById('attendance-card');
  const attForm = document.getElementById('sty-att-form');
  const attList = document.getElementById('sty-att-list');
  const showAttListBtn = document.getElementById('show-att-list-btn');
  const attListWrapper = document.getElementById('att-list-wrapper');
  const hideAttListBtn = document.getElementById('hide-att-list-btn');
  const statusLogin = document.getElementById('sty-login-status');
  const statusAtt = document.getElementById('sty-att-status');
  const phoneInput = document.getElementById('sty-login-phone');
  const pinInput = document.getElementById('sty-login-pin');
  const dateInput = document.getElementById('sty-att-date');
  const inInput = document.getElementById('sty-att-in');
  const outInput = document.getElementById('sty-att-out');
  const notesInput = document.getElementById('sty-att-notes');
  const btnNowIn = document.getElementById('btn-att-in-now');
  const btnNowOut = document.getElementById('btn-att-out-now');
  const btnNowAll = document.getElementById('btn-att-now-all');
  const btnStart = document.getElementById('btn-start-shift');
  const btnEnd = document.getElementById('btn-end-shift');
  const startTimeLabel = document.getElementById('start-time-label');
  const endTimeLabel = document.getElementById('end-time-label');
  const identityEl = document.getElementById('sty-identity');
  const logoutBtn = document.getElementById('sty-logout');

  const STORAGE_KEY = 'stylistPortal';

  function setStatus(el, msg) {
    if (el) el.textContent = msg || '';
    if (el) setTimeout(() => (el.textContent = ''), 2000);
  }

  function setError(el, msg) {
    if (el) {
      el.textContent = msg || '';
      el.classList.add('danger');
      setTimeout(() => {
        el.textContent = '';
        el.classList.remove('danger');
      }, 3000);
    }
  }

  function saveSession(session) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (_) {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function clearSession() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  function setAuth(token) {
    if (api.setToken) api.setToken(token);
    // also store for api-client fallback
    try { localStorage.setItem('stylistToken', token); } catch (_) {}
  }

  function showAttendance(session) {
    if (!session) return;
    loginCard.hidden = true;
    attendanceCard.hidden = false;
    if (showAttListBtn && attListWrapper && hideAttListBtn) {
      attListWrapper.hidden = true;
      showAttListBtn.hidden = false;
      showAttListBtn.onclick = function() {
        attListWrapper.hidden = false;
        showAttListBtn.hidden = true;
      };
      hideAttListBtn.onclick = function() {
        attListWrapper.hidden = true;
        showAttListBtn.hidden = false;
      };
    }
    if (identityEl) identityEl.textContent = `${session.employee?.name || 'Stylist'} · ${session.employee?._id || ''}`;
    setTodayAndNow();
    updateShiftControls(null);
    syncTodayState(session);
    loadAttendance(session.employee?._id);
  }

  function setTodayAndNow() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (dateInput) dateInput.value = today;
    if (inInput && !inInput.value) inInput.value = formatTime(now);
  }

  function formatTime(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function updateShiftControls(record) {
    const hasIn = !!record?.checkIn;
    const hasOut = !!record?.checkOut;
    if (btnEnd) btnEnd.hidden = !hasIn || hasOut;
    if (btnStart) btnStart.disabled = hasIn && !hasOut;
    if (startTimeLabel) {
      if (hasIn) {
        startTimeLabel.textContent = `Started: ${record.checkIn}`;
        startTimeLabel.hidden = false;
      } else {
        startTimeLabel.hidden = true;
      }
    }
    if (endTimeLabel) {
      if (hasOut) {
        endTimeLabel.textContent = `Ended: ${record.checkOut}`;
        endTimeLabel.hidden = false;
      } else {
        endTimeLabel.hidden = true;
      }
    }
  }

  async function loadAttendance(employeeId) {
    if (!attList) return;
    attList.innerHTML = '<p class="hint">Loading...</p>';
    try {
      const records = await api.apiFetch(`/api/attendance?employeeId=${encodeURIComponent(employeeId)}`, {}, { auth: true });
      if (!records.length) {
        attList.innerHTML = '<p class="hint">No attendance yet.</p>';
        return records;
      }
      attList.innerHTML = records
        .map((r) => `<div class="admin-row"><div><strong>${r.date || ''}</strong> · ${r.checkIn || '--'} → ${r.checkOut || '--'} · ${r.hours || 0} hrs<div class="tiny">${r.notes || ''}</div></div></div>`)
        .join('');
      return records;
    } catch (err) {
      attList.innerHTML = `<p class="hint danger">Failed to load: ${err.message || err}</p>`;
      return [];
    }
  }

  async function getTodayRecord(employeeId) {
    const records = await api.apiFetch(`/api/attendance?employeeId=${encodeURIComponent(employeeId)}`, {}, { auth: true });
    const today = new Date().toISOString().split('T')[0];
    return records.find((r) => r.date === today) || null;
  }

  async function syncTodayState(sessionOverride) {
    const session = sessionOverride || loadSession();
    if (!session?.token || !session?.employee?._id) return;
    setAuth(session.token);
    try {
      const rec = await getTodayRecord(session.employee._id);
      if (rec) {
        if (dateInput) dateInput.value = rec.date || '';
        if (rec.checkIn && inInput) inInput.value = rec.checkIn;
        if (rec.checkOut && outInput) outInput.value = rec.checkOut;
        if (rec.notes && notesInput) notesInput.value = rec.notes;
      }
      updateShiftControls(rec);
    } catch (_) {
      updateShiftControls(null);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setStatus(statusLogin, 'Logging in...');
    try {
      const phone = phoneInput?.value;
      const pin = pinInput?.value;
      const res = await api.apiFetch('/stylist-auth/login', { method: 'POST', body: JSON.stringify({ phone, pin }) });
      const session = { token: res.token, employee: res.employee };
      saveSession(session);
      setAuth(res.token);
      setStatus(statusLogin, 'Logged in');
      showAttendance(session);
    } catch (err) {
      setError(statusLogin, err.message || 'Login failed');
    }
  }

  async function handleAttendance(e) {
    e.preventDefault();
    const session = loadSession();
    if (!session?.token || !session?.employee?._id) {
      setStatus(statusAtt, 'Session expired, please login again');
      attendanceCard.hidden = true;
      loginCard.hidden = false;
      return;
    }
    setAuth(session.token);
    try {
      const payload = {
        employeeId: session.employee._id,
        date: dateInput?.value,
        checkIn: inInput?.value,
        checkOut: outInput?.value,
        notes: notesInput?.value,
      };
      await api.apiFetch('/api/attendance', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
      setStatus(statusAtt, 'Saved');
      updateShiftControls(payload);
      await loadAttendance(session.employee._id);
    } catch (err) {
      setError(statusAtt, err.message || 'Failed to save');
    }
  }

  async function startShift() {
    const session = loadSession();
    if (!session?.token || !session?.employee?._id) {
      setError(statusAtt, 'Session expired, please login again');
      attendanceCard.hidden = true;
      loginCard.hidden = false;
      return;
    }
    setAuth(session.token);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = formatTime(now);
    if (dateInput) dateInput.value = today;
    if (inInput) inInput.value = time;
    if (outInput) outInput.value = '';
    try {
      const existing = await getTodayRecord(session.employee._id);
      const payload = {
        employeeId: session.employee._id,
        date: today,
        checkIn: time,
        checkOut: '',
        notes: notesInput?.value,
      };
      if (existing?._id) {
        await api.apiFetch(`/api/attendance/${existing._id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
      } else {
        await api.apiFetch('/api/attendance', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
      }
      setStatus(statusAtt, 'Check-in saved');
      updateShiftControls(payload);
      await loadAttendance(session.employee._id);
    } catch (err) {
      setError(statusAtt, err.message || 'Failed to start');
    }
  }

  async function endShift() {
    const session = loadSession();
    if (!session?.token || !session?.employee?._id) {
      setError(statusAtt, 'Session expired, please login again');
      attendanceCard.hidden = true;
      loginCard.hidden = false;
      return;
    }
    setAuth(session.token);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = formatTime(now);
    if (dateInput) dateInput.value = today;
    if (outInput) outInput.value = time;
    try {
      const existing = await getTodayRecord(session.employee._id);
      const payload = {
        employeeId: session.employee._id,
        date: today,
        checkIn: existing?.checkIn || time,
        checkOut: time,
        notes: notesInput?.value,
      };
      if (existing?._id) {
        await api.apiFetch(`/api/attendance/${existing._id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
      } else {
        await api.apiFetch('/api/attendance', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
      }
      setStatus(statusAtt, 'Check-out saved');
      updateShiftControls(payload);
      await loadAttendance(session.employee._id);
      // Reset for new day after end shift
      if (dateInput) dateInput.value = '';
      if (inInput) inInput.value = '';
      if (outInput) outInput.value = '';
      if (notesInput) notesInput.value = '';
      updateShiftControls({});
    } catch (err) {
      setError(statusAtt, err.message || 'Failed to end');
    }
  }

  function restoreSession() {
    const session = loadSession();
    if (session?.token && session?.employee) {
      setAuth(session.token);
      showAttendance(session);
    }
  }

  loginForm?.addEventListener('submit', handleLogin);
  attForm?.addEventListener('submit', handleAttendance);
  logoutBtn?.addEventListener('click', () => {
    clearSession();
    attendanceCard.hidden = true;
    loginCard.hidden = false;
    setStatus(statusAtt, 'Logged out');
  });

  btnNowIn?.addEventListener('click', () => {
    const now = new Date();
    if (dateInput) dateInput.value = now.toISOString().split('T')[0];
    if (inInput) inInput.value = formatTime(now);
  });

  btnNowOut?.addEventListener('click', () => {
    const now = new Date();
    if (dateInput) dateInput.value = now.toISOString().split('T')[0];
    if (outInput) outInput.value = formatTime(now);
  });

  btnNowAll?.addEventListener('click', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = formatTime(now);
    if (dateInput) dateInput.value = today;
    if (inInput) inInput.value = time;
    if (outInput) outInput.value = time;
  });

  btnStart?.addEventListener('click', startShift);
  btnEnd?.addEventListener('click', endShift);

  restoreSession();
})();
