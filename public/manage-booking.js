(function() {
  const shared = window.bookingData || {};
  const api = window.apiClient || null;

  let cachedBookings = [];

  const serviceDuration = shared.serviceDuration || {
    treatment: 90,
    cutting: 60,
    styling: 45,
  };

  const formatTime12h = shared.formatTime12h || function formatTime12h(timeString) {
    const [h, m] = timeString.split(":").map(Number);
    const hh24 = h % 24;
    const ampm = hh24 >= 12 ? "PM" : "AM";
    const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
    const mm = String(m).padStart(2, "0");
    return `${hh12}:${mm} ${ampm}`;
  };

  const getTodayStr = shared.getTodayStr || (() => new Date().toISOString().split("T")[0]);
  const loadBookings = shared.loadBookings || function loadBookings() {
    if (cachedBookings.length) return cachedBookings;
    try {
      return JSON.parse(localStorage.getItem("bookings")) || [];
    } catch (err) {
      return [];
    }
  };
  const saveBookings = shared.saveBookings || function saveBookings(list) {
    cachedBookings = Array.isArray(list) ? list : [];
    localStorage.setItem("bookings", JSON.stringify(list));
  };
  const getFreeSlots = shared.getFreeSlots || ((date, branch, stylist, service) => []);
  const findNextDateWithSlots = shared.findNextDateWithSlots || (() => null);

  const statusClasses = {
    Pending: 'status-pending',
    Confirmed: 'status-confirmed',
    Cancelled: 'status-cancelled'
  };

  const resultCount = document.getElementById('result-count');
  const refreshBtn = document.getElementById('refresh-availability');
  const mobileField = document.getElementById('search-mobile');
  const dateFilterField = document.getElementById('filter-date');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const statusFilterField = document.getElementById('filter-status');

  let lastResults = [];
  let lastMobile = '';

  function isValidEgyptianMobile(number) {
    return /^(?:\+20|0)?(10|11|12|15)\d{8}$/.test(number);
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 60);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  function titleCase(str) {
    return (str || "").split(/[-\s]/).filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }

  function renderBookings(userBookings, mobile) {
    const container = document.getElementById('bookings-container');
    const noBookingsMsg = document.getElementById('no-bookings-msg');
    container.innerHTML = '';
    noBookingsMsg.style.display = 'none';

    lastResults = userBookings;
    lastMobile = mobile;

    if (resultCount) {
      resultCount.textContent = userBookings.length
        ? `${userBookings.length} booking${userBookings.length === 1 ? '' : 's'} found`
        : '';
    }

    if (!userBookings.length) {
      noBookingsMsg.style.display = 'block';
      showToast('No bookings found', 'info');
      return;
    }

    const today = getTodayStr();
    const bookings = loadBookings();

    userBookings.forEach((booking, index) => {
      const statusClass = statusClasses[booking.status] || 'status-pending';
      const availHint = availabilityHint(booking, today, bookings);

      const html = `
        <div class="booking-item">
          <div class="booking-header">
            <div class="booking-detail">
              <span class="booking-label">Branch</span>
              <span class="booking-value">${titleCase(booking.branch)}</span>
            </div>
            <div class="booking-detail">
              <span class="booking-label">Service</span>
              <span class="booking-value">${titleCase(booking.service)}</span>
            </div>
            <div class="booking-detail">
              <span class="booking-label">Stylist</span>
              <span class="booking-value">${titleCase(booking.stylist)}</span>
            </div>
          </div>

          <div class="booking-header">
            <div class="booking-detail">
              <span class="booking-label">Date</span>
              <span class="booking-value">${booking.date}</span>
            </div>
            <div class="booking-detail">
              <span class="booking-label">Time</span>
              <span class="booking-value">${formatTime12h(booking.time)}</span>
            </div>
            <div class="booking-detail">
              <span class="booking-label">Duration</span>
              <span class="booking-value">${booking.duration || serviceDuration[booking.service] || ''} mins</span>
            </div>
          </div>

          <div class="booking-footer">
            <div class="availability-hint">${availHint}</div>
            <span class="booking-status ${statusClass}">${booking.status}</span>
          </div>

          <div class="booking-actions">
            <button class="action-btn" onclick="duplicateBooking(${index}, '${mobile}')">Duplicate</button>
            <button class="action-btn reschedule-btn" onclick="rescheduleBooking(${index}, '${mobile}')">Reschedule</button>
            <button class="action-btn cancel-btn" onclick="cancelBooking(${index}, '${mobile}')">Cancel</button>
          </div>

          <div class="resched-panel" id="resched-panel-${index}" hidden>
            <div class="resched-row">
              <label for="resched-date-${index}">New date</label>
              <input type="date" id="resched-date-${index}" min="${today}">
            </div>
            <div class="resched-row">
              <label for="resched-time-${index}">New time</label>
              <select id="resched-time-${index}"></select>
              <span class="resched-hint" id="resched-hint-${index}"></span>
            </div>
            <div class="resched-actions">
              <button class="action-btn" onclick="applyReschedule(${index})">Save</button>
              <button class="action-btn ghost" onclick="closeReschedule(${index})">Close</button>
            </div>
          </div>
        </div>
      `;

      container.innerHTML += html;
    });

    showToast('Bookings loaded', 'success');
  }

  function availabilityHint(booking, fromDate, allBookings) {
    const freeToday = getFreeSlots(fromDate, booking.branch, booking.stylist, booking.service, allBookings);
    if (freeToday && freeToday.length) {
      return `Available today: ${formatTime12h(freeToday[0])} (${freeToday.length} slot${freeToday.length === 1 ? '' : 's'})`;
    }
    const next = findNextDateWithSlots(booking.branch, booking.stylist, booking.service, fromDate, allBookings);
    if (next) {
      const nextSlots = getFreeSlots(next, booking.branch, booking.stylist, booking.service, allBookings) || [];
      return `Next: ${next} (${nextSlots.length} slot${nextSlots.length === 1 ? '' : 's'})`;
    }
    return 'No free slots in the next 2 weeks';
  }

  function prefillFromBooking(index, mobile) {
    const bookings = loadBookings();
    const userBookings = bookings.filter(b => b.mobile === mobile);
    const match = userBookings[index];
    if (!match) return null;
    try {
      localStorage.setItem('preferredBranch', match.branch);
      localStorage.setItem('preferredStylist', match.stylist);
      localStorage.setItem('preferredService', match.service);
    } catch (err) {}
    return match;
  }

  async function searchBookings(mobileOverride='') {
    const mobileInputRaw = mobileOverride || (mobileField?.value.trim() || '');
    let mobileInput = mobileInputRaw;

    // Allow falling back to lastMobile so filter/refresh works after initial search
    if (!mobileInput && lastMobile) {
      mobileInput = lastMobile;
      if (mobileField) mobileField.value = lastMobile;
    }

    if (!mobileInput) {
      showToast('Please enter your mobile number', 'error');
      return;
    }

    if (!isValidEgyptianMobile(mobileInput)) {
      showToast('Invalid Egyptian mobile number format', 'error');
      return;
    }

    const statusFilter = statusFilterField?.value || 'all';
    const dateFilter = dateFilterField?.value || '';

    if (dateFilter && dateFilterField && dateFilter < (dateFilterField.min || getTodayStr())) {
      showToast('Date must be today or later', 'error');
      return;
    }

    let bookings = [];
    if (api?.apiFetch) {
      try {
        bookings = await api.apiFetch(`/api/bookings/search?mobile=${encodeURIComponent(mobileInput)}`);
      } catch (err) {
        showToast('Failed to load bookings', 'error');
        bookings = [];
      }
    } else {
      bookings = loadBookings();
    }

    if (bookings.length) saveBookings(bookings);

    let userBookings = bookings.filter(b => b.mobile === mobileInput && (statusFilter === 'all' || b.status === statusFilter));
    if (dateFilter) {
      userBookings = userBookings.filter(b => b.date === dateFilter);
    }

    // Sort: upcoming first, then past
    userBookings.sort((a, b) => {
      const aTime = Date.parse(`${a.date}T${a.time}`);
      const bTime = Date.parse(`${b.date}T${b.time}`);
      return (aTime || 0) - (bTime || 0);
    });

    renderBookings(userBookings, mobileInput);
  }

  async function handleFilterChange() {
    const mobileInput = mobileField?.value.trim() || lastMobile;
    if (!mobileInput) {
      showToast('Enter mobile first to filter', 'error');
      return;
    }
    await searchBookings(mobileInput);
  }

  function rescheduleBooking(index, mobile) {
    const match = prefillFromBooking(index, mobile);
    if (!match) return;
    const panel = document.getElementById(`resched-panel-${index}`);
    const dateInput = document.getElementById(`resched-date-${index}`);
    if (!panel || !dateInput) return;
    dateInput.min = getTodayStr();
    dateInput.value = match.date;
    panel.hidden = false;
    populateReschedTimes(index, match.date, match);
  }

  function duplicateBooking(index, mobile) {
    const match = prefillFromBooking(index, mobile);
    if (!match) return;
    showToast('Duplicated to booking', 'success');
    window.location.href = 'booking.html';
  }

  function closeReschedule(index) {
    const panel = document.getElementById(`resched-panel-${index}`);
    if (panel) panel.hidden = true;
  }

  function populateReschedTimes(index, dateValue, booking) {
    const timeSelect = document.getElementById(`resched-time-${index}`);
    const hint = document.getElementById(`resched-hint-${index}`);
    if (!timeSelect) return;
    timeSelect.innerHTML = '';
    const bookings = loadBookings();
    let free = getFreeSlots(dateValue, booking.branch, booking.stylist, booking.service, bookings) || [];

    if (!free.length) {
      const next = findNextDateWithSlots(booking.branch, booking.stylist, booking.service, dateValue, bookings);
      if (next) {
        dateValue = next;
        const dateInput = document.getElementById(`resched-date-${index}`);
        if (dateInput) dateInput.value = next;
        free = getFreeSlots(next, booking.branch, booking.stylist, booking.service, bookings) || [];
        if (hint) hint.textContent = `Moved to next available: ${next}`;
      } else if (hint) {
        hint.textContent = 'No slots in next 2 weeks';
      }
    } else if (hint) {
      hint.textContent = `${free.length} slot${free.length === 1 ? '' : 's'}`;
    }

    free.forEach(t => {
      const opt = new Option(formatTime12h(t), t);
      timeSelect.appendChild(opt);
    });
    if (free.length) {
      timeSelect.value = free[0];
    }
  }

  async function applyReschedule(index) {
    const booking = lastResults[index];
    if (!booking) return;
    const dateInput = document.getElementById(`resched-date-${index}`);
    const timeSelect = document.getElementById(`resched-time-${index}`);
    if (!dateInput || !timeSelect) return;
    const newDate = dateInput.value;
    const newTime = timeSelect.value;
    if (!newDate || !newTime) {
      showToast('Pick date and time', 'error');
      return;
    }

    const bookings = loadBookings();
    const fullIndex = bookings.findIndex(b => (b._id || b.id) === (booking._id || booking.id));
    if (fullIndex === -1) return;

    // Ensure the selected slot is still free
    const freeNow = getFreeSlots(newDate, booking.branch, booking.stylist, booking.service, bookings);
    if (!freeNow.includes(newTime)) {
      showToast('Time just got booked. Refresh and try another slot.', 'error');
      return;
    }

    const updated = {
      ...booking,
      date: newDate,
      time: newTime,
      status: 'Pending',
    };

    if (api?.apiFetch) {
      await api.apiFetch(`/api/bookings/${booking._id || booking.id}?mobile=${encodeURIComponent(booking.mobile)}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    } else {
      bookings[fullIndex] = updated;
      saveBookings(bookings);
    }

    closeReschedule(index);
    showToast('Rescheduled. Updated to pending.', 'success');
    await searchBookings();
  }

  async function cancelBooking(index, mobile) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    const bookings = loadBookings();
    const target = bookings.find(b => b.mobile === mobile && (b._id || b.id) === (lastResults[index]?._id || lastResults[index]?.id));
    if (!target) return;

    if (api?.apiFetch) {
      await api.apiFetch(`/api/bookings/${target._id || target.id}?mobile=${encodeURIComponent(target.mobile)}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Cancelled', mobile: target.mobile }),
      });
    } else {
      target.status = 'Cancelled';
      saveBookings(bookings);
    }

    showToast('Booking cancelled', 'success');
    await searchBookings();
  }

  // Expose globals for inline onclick handlers
  window.searchBookings = searchBookings;
  window.rescheduleBooking = rescheduleBooking;
  window.duplicateBooking = duplicateBooking;
  window.cancelBooking = cancelBooking;
  window.applyReschedule = applyReschedule;
  window.closeReschedule = closeReschedule;

  // UI wiring
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await searchBookings();
      showToast('Availability refreshed', 'success');
    });
  }

  if (statusFilterField) {
    statusFilterField.addEventListener('change', handleFilterChange);
  }

  if (dateFilterField) {
    try {
      dateFilterField.min = getTodayStr();
    } catch (err) {}
    dateFilterField.addEventListener('change', handleFilterChange);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (statusFilterField) statusFilterField.value = 'all';
      if (dateFilterField) dateFilterField.value = '';
      if (mobileField) mobileField.value = '';
      if (resultCount) resultCount.textContent = '';
      const container = document.getElementById('bookings-container');
      const noMsg = document.getElementById('no-bookings-msg');
      if (container) container.innerHTML = '';
      if (noMsg) noMsg.style.display = 'none';
      lastMobile = '';
      lastResults = [];
      showToast('Filters cleared', 'success');
    });
  }

  // Allow changing reschedule date to refresh times
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.id.startsWith('resched-date-')) return;
    const parts = target.id.split('resched-date-');
    const idx = Number(parts[1]);
    const booking = lastResults[idx];
    if (!booking) return;
    populateReschedTimes(idx, target.value, booking);
  });

  if (mobileField) {
    mobileField.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') searchBookings();
    });
  }
})();
