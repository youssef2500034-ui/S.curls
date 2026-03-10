const confirmBtn = document.querySelector("#booking-form .btn");

function setBookingButtonState() {
  if (!confirmBtn) return;
  const hasValidTime = timeSelect && timeSelect.value && timeSelect.selectedIndex > 0;
  confirmBtn.disabled = !hasValidTime;
}
const api = window.apiClient || null;
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
    if (!stylistsByBranch[branch]) stylistsByBranch[branch] = [];
    stylistsByBranch[branch].push(s.name || s.stylist || '');
    if (!availability[branch]) availability[branch] = {};
    availability[branch][(s.name || '').toLowerCase()] = s.times || [];
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
  syncServicePills(serviceSelect.value || 'cutting');
  updateTimes();
}

function getFreeSlots(date, branch, stylist, service) {
    const branchKey = (branch || "").toLowerCase();
    const stylistKey = (stylist || "").toLowerCase();
    return { branchKey, stylistKey };
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
const servicePills = document.querySelectorAll("[data-service-pill]");
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

function updateTimes() {
    setBookingButtonState();
  const selectedDate = dateInput.value;
  const selectedBranch = branchSelect.value;
  const selectedStylist = stylistSelect.value;
  const selectedService = serviceSelect.value;

  timeSelect.innerHTML = "";
  timeSelect.appendChild(new Option("Pick a time", "", true, true));

  if (!selectedDate || !selectedBranch || !selectedStylist || !selectedService) {
    noSlotsMsg.style.display = "none";
    if (timeWrap) timeWrap.hidden = false;
    if (timeCount) timeCount.textContent = "";
    return;
  }

  // Prefetch and cache available slots
  if (!window._bookingSlotCache) window._bookingSlotCache = {};
  const cacheKey = `${selectedDate}_${selectedBranch}_${selectedStylist}_${selectedService}`;
  function renderSlots(resp) {
    if (!resp?.slots) return;
    const { branchKey, stylistKey } = getFreeSlots(selectedDate, selectedBranch, selectedStylist, selectedService);
    let allSlots = resp.slots.filter(
      (s) => s.branch === branchKey && s.stylist === stylistKey
    ).map((s) => s.time);
    window._bookingSlotCache[cacheKey] = allSlots;
    let freeSlots = applySlotFilter(allSlots, activeSlotFilter);
    if (freeSlots.length === 0 && allSlots.length > 0 && activeSlotFilter !== "all") {
      showFormNotice("No slots in this time window—showing all.", "info");
      freeSlots = allSlots;
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
  // Use cache if available
  if (window._bookingSlotCache[cacheKey]) {
    renderSlots({ slots: window._bookingSlotCache[cacheKey].map(time => ({ branch: selectedBranch.toLowerCase(), stylist: selectedStylist.toLowerCase(), time })) });
  } else {
    api.apiFetch(`/api/availability?date=${selectedDate}`).then(renderSlots);
  }
}

function syncServicePills(active) {
  servicePills.forEach((pill) => {
    const isActive = pill.dataset.servicePill === active;
    pill.classList.toggle("is-active", isActive);
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

function validateForm({ branch, stylist, service, date, time, mobile }) {
  let ok = true;
  if (!branch) {
    showFieldError("branch", "Please select a branch");
    ok = false;
  }
  if (!service) {
    showFieldError("service", "Please select a service");
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
  const service = serviceSelect.value || localStorage.getItem("preferredService") || "";
  const stylist = stylistSelect.value || localStorage.getItem("preferredStylist") || "";

  setChip(chipBranch, branch, branch ? `Branch: ${branch}` : "");
  setChip(chipService, service, service ? `Service: ${service}` : "");
  setChip(chipStylist, stylist, stylist ? `Stylist: ${capitalize(stylist)}` : "");

  const any = branch || service || stylist;
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
      serviceSelect.value = "";
      syncServicePills("");
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

servicePills.forEach((pill) => {
  pill.addEventListener("click", () => {
    const val = pill.dataset.servicePill;
    serviceSelect.value = val;
    syncServicePills(val);
    clearFieldError("service");
    updateTimes(); // Always update times immediately
    updateChips();
    setBookingButtonState();
  });
});

if (serviceSelect) {
  serviceSelect.value = "cutting";
  syncServicePills("cutting");
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

document.getElementById("booking-form").addEventListener("submit", (e) => {
    setBookingButtonState();
    e.preventDefault();
    clearAllErrors();

    // Wait for available times to load
    const branch = branchSelect.value;
    const stylist = stylistSelect.value;
    const service = serviceSelect.value;
    const date = dateInput.value;
    let time = timeSelect.value;
    const mobile = mobileInput.value.trim();
    const duration = serviceDuration[service] || 60;

    // Fetch available slots from backend and ensure time is valid
    api.apiFetch(`/api/availability?date=${date}`).then((resp) => {
      if (!resp?.slots) {
        showFormNotice('No available times loaded. Please try again.', 'error');
        return;
      }
      const branchKey = (branch || '').toLowerCase();
      const stylistKey = (stylist || '').toLowerCase();
      const availableTimes = resp.slots.filter(
        (s) => s.branch === branchKey && s.stylist === stylistKey
      ).map((s) => s.time);
      if (!availableTimes.length) {
        showFormNotice('No available times for this stylist on this date.', 'error');
        return;
      }
      // Ensure a valid time is always selected
      if (!time || !availableTimes.includes(time)) {
        time = availableTimes[0];
        timeSelect.value = time;
      }
      if (!validateForm({ branch, stylist, service, date, time, mobile })) {
        return;
      }
      const newBooking = { branch, stylist, service, date, time, duration, mobile, status: "Pending" };
      syncBookingToApi(newBooking)
        .then(() => {
          try {
            localStorage.setItem("preferredBranch", branch);
            localStorage.setItem("preferredStylist", stylist);
            localStorage.setItem("preferredService", service);
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
          showFormNotice(err.message || 'Booking failed, please try again', 'error');
        });
    });
});

function hydratePreferredSelections() {
  const preferredBranch = localStorage.getItem("preferredBranch");
  const preferredStylist = localStorage.getItem("preferredStylist");
  const preferredService = localStorage.getItem("preferredService");
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

    if (preferredService && serviceSelect.querySelector(`option[value="${preferredService}"]`)) {
      serviceSelect.value = preferredService;
      syncServicePills(preferredService);
    }
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
