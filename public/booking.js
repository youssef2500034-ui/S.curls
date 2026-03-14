const confirmBtn = document.querySelector("#booking-form .btn");
const bookingShared = window.bookingData || {};
const api = window.apiClient || null;

function setBookingButtonState() {
  if (!confirmBtn) return;
  const hasValidTime = timeSelect && timeSelect.value && timeSelect.selectedIndex > 0;
  confirmBtn.disabled = !hasValidTime;
}
let stylists = [];
let pricing = [];
let stylistsByBranch = {};
let availability = {};
let serviceDuration = {
  treatment: 90,
  cutting: 60,
  styling: 45,
};

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const formatTime12h = (timeString) => {
  const [h, m] = timeString.split(":").map(Number);
  const hh24 = h % 24;
  const ampm = hh24 >= 12 ? "PM" : "AM";
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  const mm = String(m).padStart(2, "0");
  return `${hh12}:${mm} ${ampm}`;
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => toDateInputValue(new Date());

function buildMaps() {
  stylistsByBranch = {};
  availability = {};
  (stylists || []).forEach((s) => {
    const branch = (s.branch || '').toLowerCase();
    const styName = (s.name || s.stylist || '').toLowerCase();
    if (!stylistsByBranch[branch]) stylistsByBranch[branch] = [];
    stylistsByBranch[branch].push(styName);
    if (!availability[branch]) availability[branch] = {};
    availability[branch][styName] = s.times || [];
  });

  serviceDuration = {};
  (pricing || []).forEach((p) => {
    const key = (p.category || 'cutting').toLowerCase();
    serviceDuration[key] = p.duration || 60;
  });
  // fallbacks
  serviceDuration.treatment = serviceDuration.treatment || 90;
  serviceDuration.cutting = serviceDuration.cutting || 60;
  serviceDuration.styling = serviceDuration.styling || 45;
}

async function loadData() {
  if (!api?.apiFetch) {
    showFormNotice('Live data unavailable right now. Please try again soon.', 'error');
    return;
  }

  try {
    stylists = await api.apiFetch('/api/stylists');
    pricing = await api.apiFetch('/api/pricing');
  } catch (err) {
    console.error('Failed to load booking data', err);
    showFormNotice('Could not load live data. Please refresh or try again.', 'error');
    stylists = [];
    pricing = [];
  }

  buildMaps();
  repopulateStylists();
  try {
    localStorage.removeItem('preferredService');
  } catch (err) {}
  setSelectedServices([]);
  updateTimes();
}

function getFreeSlots(date, branch, stylist, service) {
  if (!bookingShared.getFreeSlots) return [];
  return bookingShared.getFreeSlots(date, branch, stylist, service);
}

async function syncBookingToApi(record) {
  if (!api?.apiFetch) return;
  return api.apiFetch('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

function setTodayAsMinimum() {
  const today = getTodayStr();
  dateInput.min = today;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast success";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 60);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

const branchSelect = document.getElementById("branch");
const stylistSelect = document.getElementById("stylist");
const serviceSelect = document.getElementById("service");
const dateInput = document.getElementById("date");
const timeSelect = document.getElementById("time");
const noSlotsMsg = document.getElementById("no-slots");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const paymentMethodSelect = document.getElementById("payment-method");
const servicePills = document.querySelectorAll("[data-service-pill]");
const servicePillInputs = document.querySelectorAll("[data-service-pill] input[type='checkbox']");
const slotFilterButtons = document.querySelectorAll("[data-slot-filter]");
const chipBranch = document.querySelector('[data-chip="branch"]');
const chipService = document.querySelector('[data-chip="service"]');
const chipStylist = document.querySelector('[data-chip="stylist"]');
const clearPrefBtn = document.getElementById("clear-pref");
const formNotice = document.getElementById("form-notice");
const fieldErrors = document.querySelectorAll(".field-error");
const timeCount = document.getElementById("time-count");
const timeWrap = document.querySelector(".time-select-wrap");
const mobileInput = document.getElementById("mobile");
let activeSlotFilter = "all";

function getSelectedServices() {
  const pills = Array.from(servicePillInputs)
    .filter((el) => el.checked)
    .map((el) => el.value);
  if (pills.length) return pills;
  // Fallback to select multiple
  const selectedFromSelect = Array.from(serviceSelect?.selectedOptions || []).map((opt) => opt.value);
  return selectedFromSelect;
}

function setSelectedServices(values = []) {
  const set = new Set(values);
  servicePillInputs.forEach((el) => {
    el.checked = set.has(el.value);
  });
  if (serviceSelect) {
    Array.from(serviceSelect.options).forEach((opt) => {
      opt.selected = set.has(opt.value);
    });
  }
  syncServicePills(values);
}

setTodayAsMinimum();
dateInput.value = dateInput.value || getTodayStr();

function repopulateStylists() {
  const branch = (branchSelect.value || "").toLowerCase();
  stylistSelect.innerHTML = "";
  stylistSelect.appendChild(new Option("-- Select Stylist --", "", true, true));
  if (!branch || !stylistsByBranch[branch]) return;

  let firstStylist = "";
  stylistsByBranch[branch].forEach((stylist, idx) => {
    const opt = new Option(stylist, stylist);
    opt.textContent = capitalize(stylist);
    stylistSelect.appendChild(opt);
    if (idx === 0) firstStylist = stylist;
  });

  // Auto-pick the only stylist available for that branch to make time selection faster
  if (stylistsByBranch[branch].length === 1) {
    stylistSelect.value = firstStylist;
    clearFieldError("stylist");
  }
}

function applySlotFilter(slots, filter) {
  if (filter === "morning") return slots.filter((t) => toMinutes(t) >= 8 * 60 && toMinutes(t) < 12 * 60);
  if (filter === "afternoon") return slots.filter((t) => toMinutes(t) >= 12 * 60 && toMinutes(t) < 16 * 60);
  if (filter === "evening") return slots.filter((t) => toMinutes(t) >= 16 * 60 && toMinutes(t) <= 21 * 60);
  return slots;
}

async function updateTimes() {
  setBookingButtonState();
  const selectedDate = dateInput.value;
  const selectedBranch = branchSelect.value;
  const selectedStylist = stylistSelect.value;
  const selectedServices = getSelectedServices();
  const primaryService = selectedServices[0] || "";

  timeSelect.innerHTML = "";
  timeSelect.appendChild(new Option("Pick a time", "", true, true));

  if (!selectedDate || !selectedBranch || !selectedStylist || !primaryService) {
    noSlotsMsg.style.display = "none";
    if (timeWrap) timeWrap.hidden = false;
    if (timeCount) timeCount.textContent = "";
    return;
  }

  if (!window._bookingSlotCache) window._bookingSlotCache = {};
  const cacheKey = `${selectedDate}_${selectedBranch}_${selectedStylist}_${primaryService}`;

  async function renderSlots() {
    const slots = window._bookingSlotCache[cacheKey]
      ? window._bookingSlotCache[cacheKey]
      : await getFreeSlots(selectedDate, selectedBranch, selectedStylist, primaryService);
    window._bookingSlotCache[cacheKey] = Array.isArray(slots) ? slots : [];
    let freeSlots = applySlotFilter(window._bookingSlotCache[cacheKey], activeSlotFilter);
    if (freeSlots.length === 0 && window._bookingSlotCache[cacheKey].length > 0 && activeSlotFilter !== "all") {
      showFormNotice("No slots in this time window—showing all.", "info");
      freeSlots = window._bookingSlotCache[cacheKey];
    }
    hideFormNotice();
    timeSelect.innerHTML = "";
    timeSelect.appendChild(new Option("Pick a time", "", true, true));
    freeSlots.forEach((t) => {
      const opt = new Option(formatTime12h(t), t);
      timeSelect.appendChild(opt);
    });
    const hasSlots = freeSlots.length > 0;
    if (hasSlots) {
      timeSelect.selectedIndex = 1;
      timeSelect.value = freeSlots[0];
    }
    if (timeWrap) timeWrap.hidden = !hasSlots;
    if (noSlotsMsg) noSlotsMsg.style.display = hasSlots ? "none" : "block";
    if (timeCount) {
      timeCount.textContent = `${freeSlots.length} slot${freeSlots.length === 1 ? "" : "s"} available`;
      timeCount.hidden = false;
    }
    setBookingButtonState();
  }

  await renderSlots();
}

function syncServicePills(activeList = []) {
  const set = new Set(Array.isArray(activeList) ? activeList : [activeList]);
  servicePills.forEach((pill) => {
    const val = pill.dataset.servicePill;
    const isActive = set.has(val);
    pill.classList.toggle("is-active", isActive);
    const input = pill.querySelector("input[type='checkbox']");
    if (input) input.checked = isActive;
  });
}

function setChip(el, val, label) {
  if (!el) return;
  if (!val) {
    el.hidden = true;
    return;
  }
  el.textContent = label;
  el.hidden = false;
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showFieldError(key, msg) {
  const el = document.querySelector(`[data-error-for="${key}"]`);
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function clearFieldError(key) {
  const el = document.querySelector(`[data-error-for="${key}"]`);
  if (!el) return;
  el.textContent = "";
  el.style.display = "none";
}

function clearAllErrors() {
  fieldErrors.forEach((el) => {
    el.textContent = "";
    el.style.display = "none";
  });
  hideFormNotice();
}

function showFormNotice(msg, type = "info") {
  if (!formNotice) return;
  formNotice.textContent = msg;
  formNotice.dataset.type = type;
  formNotice.hidden = false;
}

function hideFormNotice() {
  if (!formNotice) return;
  formNotice.hidden = true;
  formNotice.textContent = "";
  delete formNotice.dataset.type;
}

function validateForm({ branch, stylist, services, date, time, mobile, paymentMethod }) {
  let ok = true;
  if (!branch) {
    showFieldError("branch", "Please select a branch");
    ok = false;
  }
  if (!services || services.length === 0) {
    showFieldError("service", "Please select at least one service");
    ok = false;
  }
  if (!stylist) {
    showFieldError("stylist", "Please choose a stylist");
    ok = false;
  }
  if (!date) {
    showFieldError("date", "Please pick a date");
    ok = false;
  }
  if (!time) {
    showFieldError("time", "Please select a time");
    ok = false;
  }
  if (!isValidEgyptMobile(mobile)) {
    showFieldError("mobile", "Enter a valid 11-digit mobile");
    ok = false;
  }
  if (paymentMethodSelect && !paymentMethod) {
    showFieldError("payment-method", "Select payment method");
    ok = false;
  }
  if (!ok) {
    showFormNotice("Please fix the highlighted fields", "error");
  } else {
    hideFormNotice();
  }
  return ok;
}

function isValidEgyptMobile(num) {
  return /^(?:\+20|0)?(10|11|12|15)\d{8}$/.test(num);
}

function updateChips() {
  const branch = branchSelect.value || localStorage.getItem("preferredBranch") || "";
  const services = getSelectedServices();
  const stylist = stylistSelect.value || localStorage.getItem("preferredStylist") || "";
  const serviceLabel = services.length ? services.join(", ") : "";

  setChip(chipBranch, branch, branch ? `Branch: ${branch}` : "");
  setChip(chipService, serviceLabel, serviceLabel ? `Service: ${serviceLabel}` : "");
  setChip(chipStylist, stylist, stylist ? `Stylist: ${capitalize(stylist)}` : "");

  const any = branch || services.length || stylist;
  if (clearPrefBtn) clearPrefBtn.hidden = !any;

  if (clearPrefBtn) {
    clearPrefBtn.onclick = () => {
      try {
        localStorage.removeItem("preferredBranch");
        localStorage.removeItem("preferredService");
        localStorage.removeItem("preferredStylist");
        localStorage.removeItem("preferredDate");
        localStorage.removeItem("preferredTime");
      } catch (err) {}
      branchSelect.value = "";
      stylistSelect.value = "";
      setSelectedServices([]);
      dateInput.value = dateInput.min || "";
      timeSelect.innerHTML = "";
      if (timeCount) timeCount.textContent = "";
      if (noSlotsMsg) noSlotsMsg.style.display = "none";
      if (timeWrap) timeWrap.hidden = false;
      updateTimes();
      updateChips();
      clearAllErrors();
      hideFormNotice();
    };
  }
}

servicePillInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const selected = getSelectedServices();
    setSelectedServices(selected);
    clearFieldError("service");
    updateTimes();
    updateChips();
    setBookingButtonState();
  });
});

if (serviceSelect) {
  setSelectedServices([]);
}

branchSelect.addEventListener("change", () => {
  repopulateStylists();
  updateTimes();
  updateChips();
  clearFieldError("branch");
  setBookingButtonState();
});

stylistSelect.addEventListener("change", () => {
  updateTimes();
  updateChips();
  clearFieldError("stylist");
  setBookingButtonState();
});

serviceSelect.addEventListener("change", () => {
  const selectedFromSelect = Array.from(serviceSelect.selectedOptions || []).map((opt) => opt.value);
  setSelectedServices(selectedFromSelect);
  updateTimes();
  updateChips();
  clearFieldError("service");
  setBookingButtonState();
});

dateInput.addEventListener("change", () => {
  updateTimes();
  clearFieldError("date");
  setBookingButtonState();
});

timeSelect.addEventListener("change", () => clearFieldError("time"));
timeSelect.addEventListener("change", setBookingButtonState);

mobileInput.addEventListener("input", () => clearFieldError("mobile"));

slotFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeSlotFilter = btn.dataset.slotFilter || "all";
    slotFilterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    updateTimes(false);
  });
});

document.getElementById("booking-form").addEventListener("submit", async (e) => {
  setBookingButtonState();
  e.preventDefault();
  clearAllErrors();

  const branch = branchSelect.value;
  const stylist = stylistSelect.value;
  const services = getSelectedServices();
  const primaryService = services[0] || "";
  const date = dateInput.value;
  let time = timeSelect.value;
  const mobile = mobileInput.value.trim();
  const fullName = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : '';
  const duration = services.reduce((acc, key) => acc + (serviceDuration[key] || 60), 0) || 60;

  const availableTimes = await getFreeSlots(date, branch, stylist, primaryService);
  if (!availableTimes.length) {
    showFormNotice('No available times for this stylist on this date.', 'error');
    return;
  }
  if (!time || !availableTimes.includes(time)) {
    time = availableTimes[0];
    timeSelect.value = time;
  }

  if (!validateForm({ branch, stylist, services, date, time, mobile, paymentMethod })) {
    return;
  }

  const serviceLabel = services.join(', ');
  const newBooking = { branch, stylist, service: serviceLabel, services, date, time, duration, mobile, status: "Pending", name: fullName, email, paymentMethod };
  syncBookingToApi(newBooking)
    .then(() => {
      try {
        localStorage.setItem("preferredBranch", branch);
        localStorage.setItem("preferredStylist", stylist);
        localStorage.setItem("preferredMobile", mobile);
        localStorage.setItem("preferredDate", date);
        localStorage.setItem("preferredTime", time);
      } catch (err) {}
      showToast(`Booking confirmed with ${capitalize(stylist)} at ${formatTime12h(time)} on ${date}.`);
      hideFormNotice();
      e.target.reset();
      setTodayAsMinimum();
      dateInput.value = getTodayStr();
      updateTimes();
      updateChips();
    })
    .catch((err) => {
      console.error('Booking failed', err);
      const msg = err?.message || 'Booking failed, please try again';
      const needsRating = err?.bookingId && err?.activeDate === undefined;
      const hasActive = err?.activeDate;
      if (hasActive) {
        const detail = err.activeTime ? ` at ${formatTime12h(err.activeTime)}` : '';
        showFormNotice(`${msg} Active booking on ${err.activeDate}${detail}.`, 'error');
        return;
      }
      const extra = needsRating ? ' Redirecting you to rate your last visit.' : '';
      showFormNotice(`${msg}${extra}`, needsRating ? 'info' : 'error');
      if (needsRating) {
        const returnTo = window.location.pathname || '/booking';
        const params = new URLSearchParams({ mobile, returnTo });
        setTimeout(() => {
          window.location.href = `/testimonials?${params.toString()}`;
        }, 300);
      }
    });
});

function hydratePreferredSelections() {
  const preferredBranch = localStorage.getItem("preferredBranch");
  const preferredStylist = localStorage.getItem("preferredStylist");
  const preferredMobile = localStorage.getItem("preferredMobile");
  const preferredDate = localStorage.getItem("preferredDate");
  const preferredTime = localStorage.getItem("preferredTime");

  if (preferredBranch && branchSelect.querySelector(`option[value="${preferredBranch}"]`)) {
    const today = getTodayStr();
    if (preferredDate && preferredDate >= today) {
      dateInput.value = preferredDate;
    } else {
      dateInput.value = dateInput.value || today;
    }
    branchSelect.value = preferredBranch;
    repopulateStylists();

    if (preferredStylist && stylistSelect.querySelector(`option[value="${preferredStylist}"]`)) {
      stylistSelect.value = preferredStylist;
    }

    setSelectedServices([]);
  }

  if (preferredMobile && mobileInput) {
    mobileInput.value = preferredMobile;
  }

  updateTimes();

  if (preferredTime) {
    const hasPreferred = Array.from(timeSelect.options).some((opt) => opt.value === preferredTime);
    if (hasPreferred) {
      timeSelect.value = preferredTime;
    }
  }

  updateChips();
}

document.addEventListener("DOMContentLoaded", () => {
  loadData().then(() => {
    hydratePreferredSelections();
  });
});
