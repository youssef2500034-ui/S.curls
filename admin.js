const api = window.apiClient || {};
const token = api.getToken?.();
if (!token) {
  window.location.href = "admin-login.html";
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
const statBookings = document.getElementById("stat-bookings");
const statUpcoming = document.getElementById("stat-upcoming");
const statDuration = document.getElementById("stat-duration");
const statsBranchTable = document.getElementById("stats-branch-table")?.querySelector("tbody");
const logoutBtn = document.getElementById("logout-btn");
const seedBtn = document.getElementById("seed-demo");
const addStylistBtn = document.getElementById("add-stylist");
const addPricingBtn = document.getElementById("add-pricing");
const addGalleryBtn = document.getElementById("add-gallery");
const addStatsBtn = document.getElementById("add-stats");
const quickBar = document.querySelector('.admin-quick');
const panelStylist = document.getElementById("panel-stylist");
const panelPricing = document.getElementById("panel-pricing");
const panelGallery = document.getElementById("panel-gallery");
const panelStats = document.getElementById("panel-stats");
const panelCloseBtns = document.querySelectorAll("[data-panel-close]");
const formStylist = document.getElementById("form-stylist");
const formPricing = document.getElementById("form-pricing");
const formGallery = document.getElementById("form-gallery");
const statusStylist = document.getElementById("stylist-status");
const statusPricing = document.getElementById("pricing-status");
const statusGallery = document.getElementById("gallery-status");
const listStylists = document.getElementById("list-stylists");
const listPricing = document.getElementById("list-pricing");
const listGallery = document.getElementById("list-gallery");
const galleryFileInput = document.getElementById("gallery-file");
const galleryUrlInput = document.getElementById("gallery-url");
const storageMode = 'api';
const storageOk = true;
const storagePill = document.getElementById("storage-pill");
const persistNote = ' (synced)';
let editingStylistId = null;
let editingPricingId = null;
let editingGalleryId = null;
let cachedStylists = [];
let cachedPricing = [];
let cachedGallery = [];
let cachedBookings = [];

// Delegate clicks so buttons stay responsive after re-render
listStylists?.addEventListener('click', async (e) => {
  const delBtn = e.target.closest('[data-delete-stylist]');
  if (delBtn) {
    const id = delBtn.dataset.deleteStylist;
    try {
      await deleteStylist(id);
      if (editingStylistId === id) editingStylistId = null;
      statusStylist.textContent = 'Stylist removed.';
      await renderStylistsList();
    } catch (err) {
      if (isUnauthorized(err)) return forceLogin();
      statusStylist.textContent = `Failed: ${err.message}`;
    }
    clearStatusLater(statusStylist);
    return;
  }
});

listPricing?.addEventListener('click', async (e) => {
  const delBtn = e.target.closest('[data-delete-pricing]');
  if (delBtn) {
    const id = delBtn.dataset.deletePricing;
    try {
      await deletePricing(id);
      if (editingPricingId === id) editingPricingId = null;
      statusPricing.textContent = 'Pricing removed.';
      await renderPricingList();
    } catch (err) {
      if (isUnauthorized(err)) return forceLogin();
      statusPricing.textContent = `Failed: ${err.message}`;
    }
    clearStatusLater(statusPricing);
    return;
  }
});

listGallery?.addEventListener('click', async (e) => {
  const delBtn = e.target.closest('[data-delete-gallery]');
  if (delBtn) {
    const id = delBtn.dataset.deleteGallery;
    try {
      await deleteGallery(id);
      if (editingGalleryId === id) editingGalleryId = null;
      statusGallery.textContent = 'Photo removed.';
      await renderGalleryList();
    } catch (err) {
      if (isUnauthorized(err)) return forceLogin();
      statusGallery.textContent = `Failed: ${err.message}`;
    }
    clearStatusLater(statusGallery);
    return;
  }
});

function forceLogin(message = "Session expired. Please sign in again.") {
  api.clearToken?.();
  alert(message);
  window.location.href = "/admin-login";
}

function isUnauthorized(err) {
  return err?.status === 401 || String(err?.message || '').toLowerCase().includes('unauthorized');
}

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

async function fetchBookings() {
  cachedBookings = await api.apiFetch('/api/bookings', {}, { auth: true });
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
  return api.apiFetch('/api/gallery', { method: 'POST', body: payload }, { auth: true });
}

async function updateGallery(id, payload) {
  return api.apiFetch(`/api/gallery/${id}`, { method: 'PUT', body: payload }, { auth: true });
}

async function deleteGallery(id) {
  return api.apiFetch(`/api/gallery/${id}`, { method: 'DELETE' }, { auth: true });
}

    function formatTime12h(timeString) {
      const [h, m] = timeString.split(":").map(Number);
      const hh24 = h % 24;
      const ampm = hh24 >= 12 ? "PM" : "AM";
      const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
      const mm = String(m).padStart(2, "0");
      return `${hh12}:${mm} ${ampm}`;
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

// Update stat tiles with counts
function updateStats(bookings) {
  const total = bookings.length;
  const pending = bookings.filter(b => (b.status || "Pending") === "Pending").length;
  const confirmed = bookings.filter(b => b.status === "Confirmed").length;
  const cancelled = bookings.filter(b => b.status === "Cancelled").length;

  const paid = bookings.filter((b) => b.paymentStatus === 'Paid').length;
  const unpaid = total - paid;

  statTotal.textContent = total;
  statPending.textContent = pending;
  statConfirmed.textContent = confirmed;
  statCancelled.textContent = cancelled;

  if (statBookings) statBookings.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statConfirmed) statConfirmed.textContent = confirmed;
  if (statCancelled) statCancelled.textContent = cancelled;
  const statPaid = document.getElementById('stat-paid');
  const statUnpaid = document.getElementById('stat-unpaid');
  if (statPaid) statPaid.textContent = paid;
  if (statUnpaid) statUnpaid.textContent = unpaid;

  if (statUpcoming) {
    const today = new Date();
    const seven = new Date();
    seven.setDate(today.getDate() + 7);
    const upcoming = bookings.filter((b) => {
      const d = new Date(b.date);
      return d >= today && d <= seven;
    }).length;
    statUpcoming.textContent = upcoming;
  }

  if (statDuration) {
    const durations = bookings.map((b) => Number(b.duration) || 0).filter(Boolean);
    const avg = durations.length ? Math.round(durations.reduce((a, c) => a + c, 0) / durations.length) : 0;
    statDuration.textContent = avg;
  }

  renderBranchStats(bookings);
}

function renderBranchStats(bookings) {
  if (!statsBranchTable) return;
  const groups = bookings.reduce((acc, b) => {
    const branch = b.branch || 'unknown';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(b);
    return acc;
  }, {});

  statsBranchTable.innerHTML = '';
  Object.entries(groups).forEach(([branch, list]) => {
    const total = list.length;
    const confirmed = list.filter((b) => b.status === 'Confirmed').length;
    const pending = list.filter((b) => (b.status || 'Pending') === 'Pending').length;
    const cancelled = list.filter((b) => b.status === 'Cancelled').length;
    const row = document.createElement('tr');
    row.innerHTML = `<td>${branch}</td><td>${total}</td><td>${confirmed}</td><td>${pending}</td><td>${cancelled}</td>`;
    statsBranchTable.appendChild(row);
  });
}

async function renderBookings() {
  try {
    await fetchBookings();
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

  let filtered = bookings.filter(b =>
    (branchFilter.value === "all" || b.branch === branchFilter.value) &&
    (stylistFilter.value === "all" || b.stylist === stylistFilter.value) &&
    (statusFilter.value === "all" || (b.status || "Pending") === statusFilter.value)
  );

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
          <td>${(b.paymentStatus || 'Unpaid')}${b.paymentMethod && b.paymentMethod !== 'none' ? ' (' + b.paymentMethod + ')' : ''}</td>
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
  await api.apiFetch(`/api/bookings/${id}`, { method: 'DELETE' }, { auth: true });
  await renderBookings();
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
    window.location.href = "admin-login.html";
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
  [panelStylist, panelPricing, panelGallery, panelStats].forEach((p) => {
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
  [panelStylist, panelPricing, panelGallery, panelStats].forEach((p) => {
    if (!p) return;
    p.hidden = true;
    p.style.display = "none";
  });
}

addStylistBtn?.addEventListener("click", () => openPanel(panelStylist));
addPricingBtn?.addEventListener("click", () => openPanel(panelPricing));
addGalleryBtn?.addEventListener("click", () => openPanel(panelGallery));
addStatsBtn?.addEventListener("click", () => openPanel(panelStats));
panelCloseBtns.forEach((btn) => btn.addEventListener("click", closePanels));

// Delegate clicks for quick buttons to avoid missing bindings
const handlePanelOpen = (e) => {
  const btn = e.target.closest('[data-panel-id]');
  if (!btn) return;
  e.preventDefault();
  const panelId = btn.dataset.panelId;
  if (!panelId) return;
  const panel = document.getElementById(panelId);
  if (panel) openPanel(panel);
};

quickBar?.addEventListener('click', handlePanelOpen);
document.addEventListener('click', handlePanelOpen);

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

function renderLists() {
  renderStylistsList();
  renderPricingList();
  renderGalleryList();
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

    listStylists.innerHTML = data
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
        try {
          await deleteStylist(id);
          if (editingStylistId === id) editingStylistId = null;
          statusStylist.textContent = "Stylist removed.";
          await renderStylistsList();
        } catch (err) {
          if (isUnauthorized(err)) return forceLogin();
          statusStylist.textContent = `Failed: ${err.message}`;
        }
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
        try {
          await deletePricing(id);
          if (editingPricingId === id) editingPricingId = null;
          statusPricing.textContent = "Pricing removed.";
          await renderPricingList();
        } catch (err) {
          if (isUnauthorized(err)) return forceLogin();
          statusPricing.textContent = `Failed: ${err.message}`;
        }
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
        try {
          await deleteGallery(id);
          if (editingGalleryId === id) editingGalleryId = null;
          statusGallery.textContent = "Photo removed.";
          await renderGalleryList();
        } catch (err) {
          if (isUnauthorized(err)) return forceLogin();
          statusGallery.textContent = `Failed: ${err.message}`;
        }
        clearStatusLater(statusGallery);
      });
    });
  } catch (err) {
    listGallery.innerHTML = `<p class="hint danger">Failed to load gallery: ${err.message}</p>`;
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
    if (isUnauthorized(err)) return forceLogin();
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
    if (isUnauthorized(err)) return forceLogin();
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

  const formData = new FormData(formGallery);
  const file = galleryFileInput?.files?.[0] || null;
  const urlValue = (galleryUrlInput?.value || "").trim();

  if (!file && !urlValue) {
    statusGallery.textContent = "Please upload an image or enter an image URL.";
    clearStatusLater(statusGallery);
    return;
  }

  // Normalize tags and overwrite any existing tags field for consistency
  formData.delete('tags');
  normalizedTags.forEach((tag) => formData.append('tags', tag));

  try {
    if (editingGalleryId) {
      await updateGallery(editingGalleryId, formData);
      statusGallery.textContent = "Photo updated" + persistNote + ".";
    } else {
      await saveGallery(formData);
      statusGallery.textContent = "Photo added to gallery" + persistNote + ".";
    }
    editingGalleryId = null;
    formGallery.reset();
    if (galleryUrlInput) galleryUrlInput.value = "";
    if (galleryFileInput) galleryFileInput.value = "";
    await renderGalleryList();
  } catch (err) {
    if (isUnauthorized(err)) return forceLogin();
    statusGallery.textContent = `Failed: ${err.message}`;
  }
  clearStatusLater(statusGallery);
});

renderLists();
