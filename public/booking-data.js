(function() {
  const api = window.apiClient || null;

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  async function fetchAvailability({ date, branch, stylist, service }) {
    const params = new URLSearchParams();
    params.set('date', date || todayStr());
    if (branch) params.set('branch', branch);
    if (stylist) params.set('stylist', stylist);
    if (service) params.set('service', service);
    const url = `/api/availability?${params.toString()}`;

    if (api?.apiFetch) {
      return api.apiFetch(url);
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error('Availability failed');
    return res.json();
  }

  async function getFreeSlots(date, branch, stylist, service) {
    if (!date || !branch || !stylist) return [];
    try {
      const resp = await fetchAvailability({ date, branch, stylist, service });
      const slots = resp?.slots || [];
      return slots
        .filter((s) => s.branch === (branch || '').toLowerCase() && s.stylist === (stylist || '').toLowerCase())
        .map((s) => s.time)
        .sort();
    } catch (err) {
      return [];
    }
  }

  async function findNextDateWithSlots(branch, stylist, service, fromDate, bookings, maxDays = 14) {
    const start = fromDate ? new Date(fromDate) : new Date();
    for (let i = 0; i < maxDays; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const candidate = d.toISOString().split('T')[0];
      const free = await getFreeSlots(candidate, branch, stylist, service, bookings);
      if (free.length) return candidate;
    }
    return null;
  }

  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem('bookings')) || [];
    } catch (err) {
      return [];
    }
  }

  function saveBookings(list) {
    try {
      localStorage.setItem('bookings', JSON.stringify(list || []));
    } catch (err) {
      // ignore
    }
  }

  function formatTime12h(timeString) {
    const [h, m] = (timeString || '').split(':').map(Number);
    const hh24 = h % 24;
    const ampm = hh24 >= 12 ? 'PM' : 'AM';
    const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
    const mm = String(m || 0).padStart(2, '0');
    return `${hh12}:${mm} ${ampm}`;
  }

  window.bookingData = {
    getFreeSlots,
    fetchAvailability,
    findNextDateWithSlots,
    loadBookings,
    saveBookings,
    formatTime12h,
    getTodayStr: todayStr,
  };
})();
