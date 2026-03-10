// Restore archived attendance for a month
const restoreAttendanceForm = document.getElementById('restore-attendance-form');
const restoreMonthSelect = document.getElementById('restore-month');
const restoreYearInput = document.getElementById('restore-year');
const restoreAttendanceStatus = document.getElementById('restore-attendance-status');

if (restoreAttendanceForm) {
  restoreAttendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const month = restoreMonthSelect.value;
    const year = restoreYearInput.value;
    restoreAttendanceStatus.textContent = 'Restoring...';
    try {
      const res = await api.apiFetch('/api/attendance/restore-month', {
        method: 'POST',
        body: JSON.stringify({ month, year })
      }, { auth: true });
      restoreAttendanceStatus.textContent = `Restored ${res.restored || 0} records for ${year}-${month}`;
      await fetchAttendance();
    } catch (err) {
      restoreAttendanceStatus.textContent = err.message || 'Failed to restore';
    }
  });
}
const api = window.apiClient || {};
const token = api.getToken?.();
if (!token) {
  window.location.href = "/admin-login";
}

const table = document.getElementById("bookings-table");
const branchFilter = document.getElementById("branch-filter");
const stylistFilter = document.getElementById("stylist-filter");
const statusFilter = document.getElementById("status-filter");
const noBookingsMsg = document.getElementById("no-bookings");
const clockDiv = document.getElementById("clock");
const statTotal = document.getElementById("stat-total");
const statPending = document.getElementById("stat-pending");
const statConfirmed = document.getElementById("stat-confirmed");
const statCancelled = document.getElementById("stat-cancelled");
const statPaid = document.getElementById("stat-paid");
const statUnpaid = document.getElementById("stat-unpaid");
const statUpcoming = document.getElementById("stat-upcoming");
const statDuration = document.getElementById("stat-duration");
const statBookingsPanel = document.getElementById("stat-bookings");
const statsBranchTableBody = document.querySelector("#stats-branch-table tbody");
const logoutBtn = document.getElementById("logout-btn");
const seedBtn = document.getElementById("seed-demo");
const addStylistBtn = document.getElementById("add-stylist");
const addPricingBtn = document.getElementById("add-pricing");
const addGalleryBtn = document.getElementById("add-gallery");
const addEmployeeBtn = document.getElementById("add-employee");
const addAttendanceBtn = document.getElementById("add-attendance");
const panelStylist = document.getElementById("panel-stylist");
const panelPricing = document.getElementById("panel-pricing");
const panelGallery = document.getElementById("panel-gallery");
const panelEmployee = document.getElementById("panel-employee");
const panelAttendance = document.getElementById("panel-attendance");
const panelCloseBtns = document.querySelectorAll("[data-panel-close]");
const formStylist = document.getElementById("form-stylist");
const formPricing = document.getElementById("form-pricing");
const formGallery = document.getElementById("form-gallery");
const formEmployee = document.getElementById("form-employee");
const formAttendance = document.getElementById("form-attendance");
const statusStylist = document.getElementById("stylist-status");
const statusPricing = document.getElementById("pricing-status");
const statusGallery = document.getElementById("gallery-status");
const statusEmployee = document.getElementById("emp-status-note");
const statusAttendance = document.getElementById("att-status-note");
const listStylists = document.getElementById("list-stylists");
const listPricing = document.getElementById("list-pricing");
const listGallery = document.getElementById("list-gallery");
const listEmployees = document.getElementById("list-employees");
const listAttendance = document.getElementById("list-attendance");
const selectAttendanceEmployee = document.getElementById("att-employee");
const attCheckInInput = document.getElementById("att-in");
const attCheckOutInput = document.getElementById("att-out");
const attHoursInput = document.getElementById("att-hours");
const attDateInput = document.getElementById("att-date");
const empBaseInput = document.getElementById("emp-base");
const empHourlyInput = document.getElementById("emp-hourly");
const empLoginPhoneInput = document.getElementById("emp-login-phone");
const empLoginPinInput = document.getElementById("emp-login-pin");
const storageMode = 'api';
const storageOk = true;
const storagePill = document.getElementById("storage-pill");
const persistNote = ' (synced)';
let editingStylistId = null;
let editingPricingId = null;
let editingGalleryId = null;
let editingEmployeeId = null;
let editingAttendanceId = null;
let cachedStylists = [];
let cachedPricing = [];
let cachedGallery = [];
let cachedBookings = [];
let cachedEmployees = [];
let cachedAttendance = [];

async function fetchStylists() {
  cachedStylists = await api.apiFetch('/api/stylists');
  return cachedStylists;
}

async function fetchPricing() {
  cachedPricing = await api.apiFetch('/api/pricing');
  return cachedPricing;
}

async function fetchGallery() {
  cachedGallery = await api.apiFetch('/api/gallery');
  return cachedGallery;
}

async function fetchEmployees() {
  cachedEmployees = await api.apiFetch('/api/employees', {}, { auth: true });
  return cachedEmployees;
}

async function fetchAttendance() {
  cachedAttendance = await api.apiFetch('/api/attendance', {}, { auth: true });
  return cachedAttendance;
}

async function fetchBookings(filters = {}) {
  const params = new URLSearchParams();
  if (filters.branch && filters.branch !== 'all') params.set('branch', filters.branch);
  if (filters.stylist && filters.stylist !== 'all') params.set('stylist', filters.stylist);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString() ? `?${params.toString()}` : '';
  cachedBookings = await api.apiFetch(`/api/bookings${qs}`, {}, { auth: true });
  return cachedBookings;
}

async function saveStylist(payload) {
  return api.apiFetch('/api/stylists', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
}

async function updateStylist(id, payload) {
  return api.apiFetch(`/api/stylists/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
}

async function deleteStylist(id) {
  return api.apiFetch(`/api/stylists/${id}`, { method: 'DELETE' }, { auth: true });
}

async function upsertStylistFromEmployee(emp) {
  if (!emp || !emp._id) return;
  const payload = {
    _id: emp._id,
    name: emp.name || 'Stylist',
    branch: emp.branch || 'rehab',
    title: emp.role || 'Stylist',
    specialties: [],
    times: [],
    bio: emp.notes || '',
    phone: emp.phone || '',
    visible: false,
  };
  try {
    await updateStylist(emp._id, payload);
  } catch (err) {
    if (err?.status === 404 || /not found/i.test(err?.message || '')) {
      await saveStylist(payload);
    } else {
      throw err;
    }
  }
}

async function upsertEmployeeFromStylist(sty) {
  if (!sty || !sty._id) return null;
  const id = sty._id || sty.id;
  const existing = cachedEmployees.find((e) => (e._id || e.id) === id);
  if (existing) return existing;
  const payload = {
    _id: id,
    name: sty.name || 'Worker',
    role: sty.title || 'Stylist',
    branch: sty.branch || 'rehab',
    status: 'active',
    baseSalary: 0,
    hourlyRate: 0,
    startDate: '',
    notes: sty.bio || '',
    phone: sty.phone || '',
  };
  const created = await saveEmployee(payload);
  cachedEmployees.push(created);
  return created;
}

async function ensureEmployeesForStylists() {
  const stylists = cachedStylists.length ? cachedStylists : await fetchStylists();
  if (!stylists.length) return stylists;
  if (!cachedEmployees.length) await fetchEmployees();
  const existingIds = new Set(cachedEmployees.map((e) => e._id || e.id));
  const missing = stylists.filter((s) => !existingIds.has(s._id || s.id));
  for (const sty of missing) {
    try {
      await upsertEmployeeFromStylist(sty);
    } catch (_) {
      // ignore individual sync failures
    }
  }
  if (missing.length) {
    await fetchEmployees();
  }
  return stylists;
}

async function savePricing(payload) {
  return api.apiFetch('/api/pricing', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
}

async function updatePricing(id, payload) {
  return api.apiFetch(`/api/pricing/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
}

async function deletePricing(id) {
  return api.apiFetch(`/api/pricing/${id}`, { method: 'DELETE' }, { auth: true });
}

async function saveGallery(payload) {
  return api.apiFetch('/api/gallery', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
}

async function updateGallery(id, payload) {
  return api.apiFetch(`/api/gallery/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
}

async function deleteGallery(id) {
  return api.apiFetch(`/api/gallery/${id}`, { method: 'DELETE' }, { auth: true });
}

async function saveEmployee(payload) {
  return api.apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
}

async function updateEmployee(id, payload) {
  return api.apiFetch(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
}

async function deleteEmployee(id) {
  return api.apiFetch(`/api/employees/${id}`, { method: 'DELETE' }, { auth: true });
}

async function saveAttendance(payload) {
  return api.apiFetch('/api/attendance', { method: 'POST', body: JSON.stringify(payload) }, { auth: true });
}

async function updateAttendance(id, payload) {
  return api.apiFetch(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, { auth: true });
}

async function deleteAttendance(id) {
  return api.apiFetch(`/api/attendance/${id}`, { method: 'DELETE' }, { auth: true });
}

    function formatTime12h(timeString) {
      if (!timeString) return '';
      let [h, m] = timeString.split(":");
      h = Number(h);
      m = m !== undefined ? Number(m) : 0;
      const hh24 = h % 24;
      const ampm = hh24 >= 12 ? "PM" : "AM";
      const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
      const mm = m !== undefined ? String(m).padStart(2, "0") : "00";
      // If minutes are 0, show as '1 PM', else '1:30 PM'
      return mm === "00" ? `${hh12} ${ampm}` : `${hh12}:${mm} ${ampm}`;
    }

// Digital Clock
function updateClock() {
  let now = new Date();
  let timeString = now.toLocaleTimeString();
  let dateString = now.toLocaleDateString();
  clockDiv.textContent = `Current Time: ${dateString} ${timeString}`;
}
setInterval(updateClock, 1000);
updateClock();

// Clean old bookings
function cleanOldBookings() {
  const today = new Date().toISOString().split("T")[0];
  return (cachedBookings || []).filter(b => b.date >= today);
}

// Helper to safely update duplicated stat IDs across header + panel
function setStatText(id, value) {
  document.querySelectorAll(`#${id}`).forEach((el) => {
    el.textContent = value;
  });
}

// Update stat tiles with counts
function updateStats(bookings) {
  const total = bookings.length;
  const pending = bookings.filter((b) => (b.status || "Pending") === "Pending").length;
  const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "Cancelled").length;
  const paid = bookings.filter((b) => b.paymentStatus === 'Paid').length;
  const unpaid = total - paid;

  const today = new Date();
  const in7Days = new Date();
  in7Days.setDate(today.getDate() + 7);

  const upcoming = bookings.filter((b) => {
    if (!b.date) return false;
    const d = new Date(b.date);
    return d >= today && d <= in7Days;
  }).length;

  const durations = bookings.map((b) => Number(b.duration) || 0).filter((n) => n > 0);
  const avgDuration = durations.length ? Math.round((durations.reduce((a, n) => a + n, 0) / durations.length) * 10) / 10 : 0;

  setStatText('stat-total', total);
  setStatText('stat-pending', pending);
  setStatText('stat-confirmed', confirmed);
  setStatText('stat-cancelled', cancelled);
  setStatText('stat-paid', paid);
  setStatText('stat-unpaid', unpaid);
  setStatText('stat-bookings', total);
  setStatText('stat-upcoming', upcoming);
  setStatText('stat-duration', avgDuration || '--');

  updateBranchTable(bookings);
}

function updateBranchTable(bookings) {
  if (!statsBranchTableBody) return;
  const branches = {};
  bookings.forEach((b) => {
    const key = (b.branch || 'unknown').toLowerCase();
    if (!branches[key]) {
      branches[key] = { total: 0, confirmed: 0, pending: 0, cancelled: 0 };
    }
    branches[key].total += 1;
    const status = b.status || 'Pending';
    if (status === 'Confirmed') branches[key].confirmed += 1;
    else if (status === 'Cancelled') branches[key].cancelled += 1;
    else branches[key].pending += 1;
  });

  const rows = Object.entries(branches).map(([branch, data]) => {
    const label = branch === 'rehab' ? 'Rehab' : branch.includes('zayed') ? 'Sheikh Zayed' : branch.charAt(0).toUpperCase() + branch.slice(1);
    return `<tr><td>${label}</td><td>${data.total}</td><td>${data.confirmed}</td><td>${data.pending}</td><td>${data.cancelled}</td></tr>`;
  });

  statsBranchTableBody.innerHTML = rows.join('') || '<tr><td colspan="5">No data yet</td></tr>';
}

async function renderBookings() {
  try {
    await fetchBookings({
      branch: branchFilter.value,
      stylist: stylistFilter.value,
      status: statusFilter.value,
    });
  } catch (err) {
    table.innerHTML = '<tr><td colspan="9">Failed to load bookings</td></tr>';
    noBookingsMsg.style.display = "block";
    return;
  }

  table.innerHTML = `
    <tr>
      <th>Branch</th>
      <th>Stylist</th>
      <th>Service</th>
      <th>Date</th>
      <th>Time</th>
      <th>Duration</th>
      <th>Mobile</th>
      <th>Status</th>
      <th>Payment</th>
      <th>Actions</th>
    </tr>
  `;

  let bookings = cleanOldBookings();
  updateStats(bookings);

  let filtered = bookings; // server already filtered

  if (filtered.length === 0) {
    noBookingsMsg.style.display = "block";
  } else {
    noBookingsMsg.style.display = "none";
    filtered.forEach((b) => {
      let statusClass = "status-pending";
      if (b.status === "Confirmed") statusClass = "status-confirmed";
      if (b.status === "Cancelled") statusClass = "status-cancelled";

      table.innerHTML += `
        <tr>
          <td>${b.branch}</td>
          <td>${b.stylist}</td>
          <td>${b.service}</td>
          <td>${b.date}</td>
          <td>${formatTime12h(b.time)}</td>
          <td>${b.duration} mins</td>
          <td>${b.mobile}</td>
          <td class="${statusClass}">${b.status || "Pending"}</td>
          <td>${(b.paymentStatus || 'Unpaid')}${b.paymentMethod && b.paymentMethod !== 'none' ? ` (${b.paymentMethod})` : ''}</td>
          <td>
            <button class="action-btn confirm-btn" onclick="confirmBooking('${b._id || b.id}')">Confirm</button>
            <button class="action-btn cancel-btn" onclick="cancelBooking('${b._id || b.id}')">Cancel</button>
            <button class="action-btn delete-btn" onclick="deleteBooking('${b._id || b.id}')">Delete Permanently</button>
            ${b.paymentStatus === 'Paid' ? '' : `<button class="action-btn confirm-btn" onclick="markPaid('${b._id || b.id}','cash')">Paid (Cash)</button>`}
            ${b.paymentStatus === 'Paid' ? '' : `<button class="action-btn confirm-btn" onclick="markPaid('${b._id || b.id}','visa')">Paid (Visa)</button>`}
          </td>
        </tr>
      `;
    });
  }
}

async function updateBookingStatus(id, status) {
  await api.apiFetch(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }, { auth: true });
  await renderBookings();
}

async function confirmBooking(id) {
  await updateBookingStatus(id, "Confirmed");
}

async function cancelBooking(id) {
  await updateBookingStatus(id, "Cancelled");
}

async function deleteBooking(id) {
  const ok = confirm("Are you sure you want to delete this booking permanently?");
  if (!ok) return;
  try {
    await api.apiFetch(`/api/bookings/${id}`, { method: 'DELETE' }, { auth: true });
    await renderBookings();
  } catch (err) {
    alert(`Delete failed: ${err.message || err}`);
  }
}

async function markPaid(id, method) {
  await api.apiFetch(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ paymentStatus: 'Paid', paymentMethod: method }) }, { auth: true });
  await renderBookings();
}

branchFilter.addEventListener("change", renderBookings);
stylistFilter.addEventListener("change", renderBookings);
statusFilter.addEventListener("change", renderBookings);

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    api.setToken?.('');
    localStorage.removeItem("isAdmin");
    window.location.href = "/admin-login";
  });
}

if (seedBtn) {
  seedBtn.addEventListener("click", async () => {
    const confirmed = confirm("Load sample bookings into the database? This will create new records.");
    if (!confirmed) return;

    const today = new Date();
    const fmt = (d) => d.toISOString().split("T")[0];
    const plusDays = (n) => {
      const clone = new Date(today);
      clone.setDate(today.getDate() + n);
      return fmt(clone);
    };

    const sample = [
      { branch: "rehab", stylist: "sara", service: "cutting", date: plusDays(0), time: "11:00", duration: 45, mobile: "+201111111111", status: "Pending" },
      { branch: "sheikh-zayed", stylist: "mona", service: "styling", date: plusDays(1), time: "14:30", duration: 90, mobile: "+201222222222", status: "Confirmed" },
      { branch: "rehab", stylist: "ahmed", service: "treatment", date: plusDays(2), time: "10:15", duration: 40, mobile: "+201333333333", status: "Cancelled" },
      { branch: "sheikh-zayed", stylist: "sara", service: "cutting", date: plusDays(3), time: "16:00", duration: 60, mobile: "+201444444444", status: "Pending" }
    ];

    await Promise.all(sample.map((s) => api.apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(s) })));
    await renderBookings();
  });
}

// تحديث الجدول كل دقيقة
setInterval(renderBookings, 60000);

renderBookings();

// Simple panel toggling
function openPanel(panel) {
  [panelStylist, panelPricing, panelGallery, panelEmployee, panelAttendance].forEach((p) => {
    if (!p) return;
    if (p === panel) {
      p.hidden = false;
      p.style.display = "block";
      p.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      p.hidden = true;
      p.style.display = "none";
    }
  });
}

function closePanels() {
  [panelStylist, panelPricing, panelGallery, panelEmployee, panelAttendance].forEach((p) => {
    if (!p) return;
    p.hidden = true;
    p.style.display = "none";
  });
}

addStylistBtn?.addEventListener("click", () => openPanel(panelStylist));
addPricingBtn?.addEventListener("click", () => openPanel(panelPricing));
addGalleryBtn?.addEventListener("click", () => openPanel(panelGallery));
addEmployeeBtn?.addEventListener("click", () => openPanel(panelEmployee));
addAttendanceBtn?.addEventListener("click", () => openPanel(panelAttendance));
panelCloseBtns.forEach((btn) => btn.addEventListener("click", closePanels));

attCheckInInput?.addEventListener('change', syncAttendanceHours);
attCheckOutInput?.addEventListener('change', syncAttendanceHours);
attHoursInput?.setAttribute('readonly', 'readonly');

empBaseInput?.addEventListener('blur', () => {
  const base = empBaseInput.value;
  if (!base) return;
  const hourly = promptHourlyFromBase(base);
  if (hourly === null) return;
  empHourlyInput.value = hourly || '';
});

function splitList(raw) {
  if (!raw) return [];
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clearStatusLater(el) {
  if (!el) return;
  setTimeout(() => (el.textContent = ""), 1800);
}

function calcHourlyFromBase(base, workDays = 26, hoursPerDay = 8) {
  const b = Number(base) || 0;
  const days = Number(workDays) || 0;
  const hrs = Number(hoursPerDay) || 0;
  if (!b || !days || !hrs) return 0;
  return Math.round((b / (days * hrs)) * 100) / 100;
}

function promptHourlyFromBase(base) {
  const baseVal = Number(base) || 0;
  if (!baseVal) return null;
  const daysInput = prompt('Work days per month?', '26');
  if (daysInput === null) return null;
  const hoursInput = prompt('Hours per day?', '8');
  if (hoursInput === null) return null;
  const days = Number(daysInput) || 26;
  const hours = Number(hoursInput) || 8;
  const hourly = calcHourlyFromBase(baseVal, days, hours);
  return hourly || null;
}

function calcAttendanceHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  if (Number.isNaN(inH) || Number.isNaN(outH)) return 0;
  const diffMinutes = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
  if (diffMinutes <= 0) return 0;
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function calcAttendancePay(att, employee, baseAwardedSet) {
  if (!employee) return { total: 0, basePart: 0, hourlyPart: 0, hours: att.hours || 0 };
  const hours = att.hours || calcAttendanceHours(att.checkIn, att.checkOut);
  const hourlyPart = (employee.hourlyRate || 0) * (hours || 0);
  let basePart = 0;
  const key = `${employee._id || employee.id}-${att.date || ''}`;
  if (employee.baseSalary && att.date && baseAwardedSet) {
    if (!baseAwardedSet.has(key)) {
      basePart = (employee.baseSalary || 0) / 30;
      baseAwardedSet.add(key);
    }
  }
  const total = Math.max(0, Math.round((basePart + hourlyPart) * 100) / 100);
  return { total, basePart, hourlyPart, hours: hours || 0 };
}

function syncAttendanceHours() {
  if (!attHoursInput) return;
  const hours = calcAttendanceHours(attCheckInInput?.value, attCheckOutInput?.value);
  attHoursInput.value = hours ? hours.toString() : "";
}

function renderLists() {
  renderStylistsList();
  renderPricingList();
  renderGalleryList();
  renderEmployeesList();
  renderAttendanceList();
  renderStoragePill();
}

function renderStoragePill() {
  if (!storagePill) return;
  storagePill.textContent = 'Storage: synced via backend';
  storagePill.hidden = false;
  storagePill.className = 'pill confirmed';
}

async function renderStylistsList() {
  if (!listStylists || !api?.apiFetch) return;
  listStylists.innerHTML = '<p class="hint">Loading stylists...</p>';
  try {
    const data = await fetchStylists();
    if (!data.length) {
      listStylists.innerHTML = '<p class="hint">No stylists added yet.</p>';
      return;
    }

    // Filter out duplicate stylists by unique _id or id
      const uniqueStylists = [];
      const seenIds = new Set();
      for (const s of data) {
        const id = s._id || s.id;
        if (!seenIds.has(id)) {
          uniqueStylists.push(s);
          seenIds.add(id);
        }
      }
    listStylists.innerHTML = uniqueStylists
      .map(
        (s) => `
        <div class="admin-row">
          <div>
            <strong>${s.name || 'Stylist'}</strong> · ${s.branch || 'rehab'}
            <div class="tiny">${(s.specialties || []).join(', ')}</div>
          </div>
          <div class="admin-row-actions">
            <button class="ghost-btn xsmall" data-edit-stylist="${s._id || s.id}">Edit</button>
            <button class="ghost-btn xsmall danger" data-delete-stylist="${s._id || s.id}">Delete</button>
          </div>
        </div>`
      )
      .join("");

    listStylists.querySelectorAll("[data-edit-stylist]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editStylist;
        const record = data.find((r) => (r._id || r.id) === id);
        if (!record) return;
        editingStylistId = id;
        document.getElementById("stylist-name").value = record.name || "";
        document.getElementById("stylist-branch").value = record.branch || "rehab";
        document.getElementById("stylist-title").value = record.title || "";
        document.getElementById("stylist-specialties").value = (record.specialties || []).join(", ");
        document.getElementById("stylist-times").value = (record.times || []).join(", ");
        document.getElementById("stylist-bio").value = record.bio || "";
        document.getElementById("stylist-phone").value = record.phone || "";
        statusStylist.textContent = "Editing stylist...";
      });
    });

    listStylists.querySelectorAll("[data-delete-stylist]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.deleteStylist;
        await deleteStylist(id);
        if (editingStylistId === id) editingStylistId = null;
        statusStylist.textContent = "Stylist removed.";
        await renderStylistsList();
        clearStatusLater(statusStylist);
      });
    });
  } catch (err) {
    listStylists.innerHTML = `<p class="hint danger">Failed to load stylists: ${err.message}</p>`;
  }
}

async function renderPricingList() {
  if (!listPricing || !api?.apiFetch) return;
  listPricing.innerHTML = '<p class="hint">Loading pricing...</p>';
  try {
    const data = await fetchPricing();
    if (!data.length) {
      listPricing.innerHTML = '<p class="hint">No pricing cards added yet.</p>';
      return;
    }

    listPricing.innerHTML = data
      .map(
        (p) => `
        <div class="admin-row">
          <div>
            <strong>${p.title || 'Service'}</strong> · ${p.category || ''} · EGP ${p.amount || 0}
            <div class="tiny">${(p.features || []).join(' · ')}</div>
          </div>
          <div class="admin-row-actions">
            <button class="ghost-btn xsmall" data-edit-pricing="${p._id || p.id}">Edit</button>
            <button class="ghost-btn xsmall danger" data-delete-pricing="${p._id || p.id}">Delete</button>
          </div>
        </div>`
      )
      .join("");

    listPricing.querySelectorAll("[data-edit-pricing]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editPricing;
        const record = data.find((r) => (r._id || r.id) === id);
        if (!record) return;
        editingPricingId = id;
        document.getElementById("price-title").value = record.title || "";
        document.getElementById("price-category").value = record.category || "cutting";
        document.getElementById("price-amount").value = record.amount || "";
        document.getElementById("price-duration").value = record.duration || "";
        document.getElementById("price-features").value = (record.features || []).join("\n");
        statusPricing.textContent = "Editing pricing...";
      });
    });

    listPricing.querySelectorAll("[data-delete-pricing]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.deletePricing;
        await deletePricing(id);
        if (editingPricingId === id) editingPricingId = null;
        statusPricing.textContent = "Pricing removed.";
        await renderPricingList();
        clearStatusLater(statusPricing);
      });
    });
  } catch (err) {
    listPricing.innerHTML = `<p class="hint danger">Failed to load pricing: ${err.message}</p>`;
  }
}

async function renderGalleryList() {
  if (!listGallery || !api?.apiFetch) return;
  listGallery.innerHTML = '<p class="hint">Loading gallery...</p>';
  try {
    const data = await fetchGallery();
    if (!data.length) {
      listGallery.innerHTML = '<p class="hint">No gallery photos added yet.</p>';
      return;
    }

    listGallery.innerHTML = data
      .map(
        (g) => `
        <div class="admin-row">
          <div>
            <strong>${g.title || 'Photo'}</strong> · ${g.branch || ''}
            <div class="tiny">${(g.tags || []).join(', ')}</div>
          </div>
          <div class="admin-row-actions">
            <button class="ghost-btn xsmall" data-edit-gallery="${g._id || g.id}">Edit</button>
            <button class="ghost-btn xsmall danger" data-delete-gallery="${g._id || g.id}">Delete</button>
          </div>
        </div>`
      )
      .join("");

    listGallery.querySelectorAll("[data-edit-gallery]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editGallery;
        const record = data.find((r) => (r._id || r.id) === id);
        if (!record) return;
        editingGalleryId = id;
        document.getElementById("gallery-url").value = record.url || "";
        document.getElementById("gallery-title").value = record.title || "";
        document.getElementById("gallery-tags").value = (record.tags || []).join(" ");
        document.getElementById("gallery-branch").value = record.branch || "rehab";
        document.getElementById("gallery-stylist").value = record.stylist || "";
        statusGallery.textContent = "Editing photo...";
      });
    });

    listGallery.querySelectorAll("[data-delete-gallery]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.deleteGallery;
        await deleteGallery(id);
        if (editingGalleryId === id) editingGalleryId = null;
        statusGallery.textContent = "Photo removed.";
        await renderGalleryList();
        clearStatusLater(statusGallery);
      });
    });
  } catch (err) {
    listGallery.innerHTML = `<p class="hint danger">Failed to load gallery: ${err.message}</p>`;
  }
}

function populateAttendanceSelect(employees) {
  if (!selectAttendanceEmployee) return;
  const opts = ['<option value="">Select employee</option>'].concat(
    (employees || []).map((e) => `<option value="${e._id || e.id}">${e.name || 'Worker'} · ${e.branch || ''}</option>`)
  );
  selectAttendanceEmployee.innerHTML = opts.join('');
}

async function renderEmployeesList() {
  if (!listEmployees || !api?.apiFetch) return;
  listEmployees.innerHTML = '<p class="hint">Loading staff...</p>';
  try {
    const data = await fetchEmployees();
    console.log('Fetched employees:', data); // Debug log
    populateAttendanceSelect(data);
    if (!data.length) {
      listEmployees.innerHTML = '<p class="hint">No staff yet.</p>';
      return;
    }

    listEmployees.innerHTML = data
      .map((emp) => `
        <div class="admin-row">
          <div>
            <strong>${emp.name || 'Worker'}</strong> · ${emp.role || 'Staff'} · ${emp.branch || ''}
            <div class="tiny">Base: EGP ${emp.baseSalary || 0} · Hourly: EGP ${emp.hourlyRate || 0} · ${emp.startDate || ''}</div>
            <div class="tiny">Status: ${emp.status || 'active'}${emp.notes ? ' · ' + emp.notes : ''}</div>
            <div class="tiny">Login: ${emp.loginPhone || 'n/a'}${emp.loginPin ? ' · PIN set' : ' · no PIN'}</div>
          </div>
          <div class="admin-row-actions">
            <button class="ghost-btn xsmall" data-edit-employee="${emp._id || emp.id}">Edit</button>
            <button class="ghost-btn xsmall danger" data-delete-employee="${emp._id || emp.id}">Delete</button>
          </div>
        </div>`)
      .join('');

    listEmployees.querySelectorAll('[data-edit-employee]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editEmployee;
        const record = cachedEmployees.find((r) => (r._id || r.id) === id);
        if (!record) return;
        editingEmployeeId = id;
        document.getElementById('emp-name').value = record.name || '';
        document.getElementById('emp-role').value = record.role || '';
        document.getElementById('emp-branch').value = record.branch || 'rehab';
        document.getElementById('emp-status').value = record.status || 'active';
        document.getElementById('emp-base').value = record.baseSalary || '';
        document.getElementById('emp-hourly').value = record.hourlyRate || '';
        document.getElementById('emp-start').value = record.startDate || '';
        document.getElementById('emp-notes').value = record.notes || '';
        document.getElementById('emp-login-phone').value = record.loginPhone || record.phone || '';
        document.getElementById('emp-login-pin').value = record.loginPin || '';
        statusEmployee.textContent = 'Editing worker...';
      });
    });

    listEmployees.querySelectorAll('[data-delete-employee]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.deleteEmployee;
        const ok = confirm('Delete this worker?');
        if (!ok) return;
        await deleteEmployee(id);
        try { await deleteStylist(id); } catch (_) { /* stylist may not exist */ }
        if (editingEmployeeId === id) editingEmployeeId = null;
        statusEmployee.textContent = 'Worker removed.';
        await renderEmployeesList();
        await renderAttendanceList();
        clearStatusLater(statusEmployee);
      });
    });
  } catch (err) {
    listEmployees.innerHTML = `<p class="hint danger">Failed to load staff: ${err.message}</p>`;
  }
}

async function renderAttendanceList() {
  if (!listAttendance || !api?.apiFetch) return;
  listAttendance.innerHTML = '<p class="hint">Loading attendance...</p>';
  try {
    await ensureEmployeesForStylists();
    const employees = cachedEmployees.length ? cachedEmployees : await fetchEmployees();
    const data = await fetchAttendance();
    populateAttendanceSelect(employees);
    if (!data.length) {
      listAttendance.innerHTML = '<p class="hint">No attendance records yet.</p>';
      return;
    }

    const names = new Map(employees.map((e) => [e._id || e.id, e.name || 'Worker']));
    const empById = new Map(employees.map((e) => [e._id || e.id, e]));
    const baseAwarded = new Set();
    const totals = new Map(); // employeeId -> total across all records
    const totalsByDay = new Map(); // date -> Map<employeeId,total>

    const rows = data
      .map((att) => {
        const emp = empById.get(att.employeeId);
        const pay = calcAttendancePay(att, emp, baseAwarded);
        const currentTotal = totals.get(att.employeeId) || 0;
        const newTotal = Math.round((currentTotal + pay.total) * 100) / 100;
        totals.set(att.employeeId, newTotal);

        if (att.date) {
          if (!totalsByDay.has(att.date)) totalsByDay.set(att.date, new Map());
          const byDay = totalsByDay.get(att.date);
          const dayTotal = byDay.get(att.employeeId) || 0;
          byDay.set(att.employeeId, Math.round((dayTotal + pay.total) * 100) / 100);
        }
        return `
        <div class="admin-row">
          <div>
            <strong>${names.get(att.employeeId) || 'Employee'}</strong> · ${att.date || ''} · EGP ${pay.total}
            <div class="tiny">${att.checkIn || '--'} → ${att.checkOut || '--'} · ${pay.hours || 0} hrs · Hourly: EGP ${pay.hourlyPart.toFixed(2)}${pay.basePart ? ` · Base: EGP ${pay.basePart.toFixed(2)}` : ''}</div>
            <div class="tiny">${att.notes || ''}</div>
          </div>
          <div class="admin-row-actions">
            <button class="ghost-btn xsmall" data-edit-attendance="${att._id || att.id}">Edit</button>
            <button class="ghost-btn xsmall danger" data-delete-attendance="${att._id || att.id}">Delete</button>
          </div>
        </div>`;
      })
      .join('');

    const totalsSummary = Array.from(totalsByDay.entries())
      .map(([date, map]) => {
        const lines = Array.from(map.entries())
          .map(([empId, total]) => `<div class="tiny">${names.get(empId) || 'Employee'}: EGP ${total.toFixed(2)}</div>`)
          .join('');
        return `<div class="tiny"><strong>${date}</strong></div>${lines}`;
      })
      .join('') || Array.from(totals.entries())
      .map(([empId, total]) => `<div class="tiny">${names.get(empId) || 'Employee'}: EGP ${total.toFixed(2)}</div>`)
      .join('');

    listAttendance.innerHTML = `
      <div class="admin-row">
        <div>
          <strong>Daily totals</strong>
          <div class="tiny">Base counted once per worker per day.</div>
          ${totalsSummary}
        </div>
      </div>
      ${rows}
    `;

    listAttendance.querySelectorAll('[data-edit-attendance]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editAttendance;
        const record = cachedAttendance.find((r) => (r._id || r.id) === id);
        if (!record) return;
        editingAttendanceId = id;
        document.getElementById('att-employee').value = record.employeeId || '';
        document.getElementById('att-date').value = record.date || '';
        document.getElementById('att-in').value = record.checkIn || '';
        document.getElementById('att-out').value = record.checkOut || '';
        document.getElementById('att-hours').value = record.hours || calcAttendanceHours(record.checkIn, record.checkOut) || '';
        document.getElementById('att-notes').value = record.notes || '';
        syncAttendanceHours();
        statusAttendance.textContent = 'Editing attendance...';
      });
    });

    listAttendance.querySelectorAll('[data-delete-attendance]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.deleteAttendance;
        const ok = confirm('Delete this attendance entry?');
        if (!ok) return;
        await deleteAttendance(id);
        if (editingAttendanceId === id) editingAttendanceId = null;
        statusAttendance.textContent = 'Attendance removed.';
        await renderAttendanceList();
        clearStatusLater(statusAttendance);
      });
    });
  } catch (err) {
    listAttendance.innerHTML = `<p class="hint danger">Failed to load attendance: ${err.message}</p>`;
  }
}

formStylist?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!api?.apiFetch) {
    statusStylist.textContent = "Storage unavailable";
    return;
  }

  const payload = {
    name: document.getElementById("stylist-name")?.value,
    branch: document.getElementById("stylist-branch")?.value,
    title: document.getElementById("stylist-title")?.value,
    specialties: splitList(document.getElementById("stylist-specialties")?.value?.replace(/\s*,\s*/g, ",")),
    times: splitList(document.getElementById("stylist-times")?.value),
    bio: document.getElementById("stylist-bio")?.value,
    phone: document.getElementById("stylist-phone")?.value,
  };

  try {
    if (editingStylistId) {
      await updateStylist(editingStylistId, payload);
      statusStylist.textContent = "Stylist updated" + persistNote + ".";
    } else {
      await saveStylist(payload);
      statusStylist.textContent = "Stylist added to site" + persistNote + ".";
    }
    editingStylistId = null;
    formStylist.reset();
    await renderStylistsList();
  } catch (err) {
    statusStylist.textContent = `Failed: ${err.message}`;
  }
  clearStatusLater(statusStylist);
});

formPricing?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!api?.apiFetch) {
    statusPricing.textContent = "Storage unavailable";
    return;
  }

  const featuresRaw = document.getElementById("price-features")?.value || "";
  const payload = {
    title: document.getElementById("price-title")?.value,
    category: document.getElementById("price-category")?.value,
    amount: document.getElementById("price-amount")?.value,
    duration: document.getElementById("price-duration")?.value,
    features: splitList(featuresRaw)
  };

  try {
    if (editingPricingId) {
      await updatePricing(editingPricingId, payload);
      statusPricing.textContent = "Pricing updated" + persistNote + ".";
    } else {
      await savePricing(payload);
      statusPricing.textContent = "Pricing card added to site" + persistNote + ".";
    }
    editingPricingId = null;
    formPricing.reset();
    await renderPricingList();
  } catch (err) {
    statusPricing.textContent = `Failed: ${err.message}`;
  }
  clearStatusLater(statusPricing);
});

formGallery?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!api?.apiFetch) {
    statusGallery.textContent = "Storage unavailable";
    return;
  }

  const tagsField = document.getElementById("gallery-tags")?.value || "";
  const normalizedTags = tagsField
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const fileInput = document.getElementById("gallery-file");
  const file = fileInput?.files?.[0];
  const url = document.getElementById("gallery-url")?.value;
  const formData = new FormData();
  if (file) formData.append("image", file);
  if (url) formData.append("url", url);
  formData.append("title", document.getElementById("gallery-title")?.value || "");
  formData.append("tags", normalizedTags.join(" "));
  formData.append("branch", document.getElementById("gallery-branch")?.value || "");
  formData.append("stylist", document.getElementById("gallery-stylist")?.value || "");

  try {
    let result;
    if (editingGalleryId) {
      result = await fetch(`/api/gallery/${editingGalleryId}`, {
        method: "PUT",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      result = await fetch(`/api/gallery`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    if (!result.ok) throw new Error((await result.json()).error || "Upload failed");
    statusGallery.textContent = "Photo added to gallery" + persistNote + ".";
    editingGalleryId = null;
    formGallery.reset();
    await renderGalleryList();
  } catch (err) {
    statusGallery.textContent = `Failed: ${err.message}`;
  }
  clearStatusLater(statusGallery);
});

formEmployee?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!api?.apiFetch) {
    statusEmployee.textContent = 'Storage unavailable';
    return;
  }

  let baseSalaryVal = empBaseInput?.value;
  let hourlyRateVal = empHourlyInput?.value;
  if (baseSalaryVal && (!hourlyRateVal || Number(hourlyRateVal) === 0)) {
    const calc = promptHourlyFromBase(baseSalaryVal);
    if (calc !== null) {
      empHourlyInput.value = calc || '';
      hourlyRateVal = empHourlyInput.value;
    }
  }

  const payload = {
    name: document.getElementById('emp-name')?.value,
    role: document.getElementById('emp-role')?.value,
    branch: document.getElementById('emp-branch')?.value,
    status: document.getElementById('emp-status')?.value,
    baseSalary: baseSalaryVal,
    hourlyRate: hourlyRateVal,
    startDate: document.getElementById('emp-start')?.value,
    notes: document.getElementById('emp-notes')?.value,
    loginPhone: empLoginPhoneInput?.value,
    loginPin: empLoginPinInput?.value,
  };

  try {
    if (editingEmployeeId) {
      const updated = await updateEmployee(editingEmployeeId, payload);
      await upsertStylistFromEmployee(updated);
      statusEmployee.textContent = 'Worker updated' + persistNote + '.';
    } else {
      const saved = await saveEmployee(payload);
      await upsertStylistFromEmployee(saved);
      statusEmployee.textContent = 'Worker added' + persistNote + '.';
    }
    editingEmployeeId = null;
    formEmployee.reset();
    await renderEmployeesList();
    await renderAttendanceList();
  } catch (err) {
    statusEmployee.textContent = `Failed: ${err.message}`;
  }
  clearStatusLater(statusEmployee);
});

formAttendance?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!api?.apiFetch) {
    statusAttendance.textContent = 'Storage unavailable';
    return;
  }

  const checkIn = document.getElementById('att-in')?.value;
  const checkOut = document.getElementById('att-out')?.value;
  const hours = calcAttendanceHours(checkIn, checkOut);
  if (attHoursInput) attHoursInput.value = hours ? hours.toString() : '';

  const payload = {
    employeeId: document.getElementById('att-employee')?.value,
    date: document.getElementById('att-date')?.value,
    checkIn,
    checkOut,
    hours,
    notes: document.getElementById('att-notes')?.value,
  };

  try {
    if (editingAttendanceId) {
      await updateAttendance(editingAttendanceId, payload);
      statusAttendance.textContent = 'Attendance updated' + persistNote + '.';
    } else {
      await saveAttendance(payload);
      statusAttendance.textContent = 'Attendance added' + persistNote + '.';
    }
    editingAttendanceId = null;
    formAttendance.reset();
    await renderAttendanceList();
  } catch (err) {
    statusAttendance.textContent = `Failed: ${err.message}`;
  }
  clearStatusLater(statusAttendance);
});

// --- Automatic stylist-to-employee sync on admin load ---
(async function syncStylistsToEmployeesOnLoad() {
  await fetchStylists();
  await ensureEmployeesForStylists(); // Sync stylists to employees for payroll
  await fetchEmployees();
})();

renderLists();
