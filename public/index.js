document.addEventListener('DOMContentLoaded', () => {
  const api = window.apiClient || null;
  let stylists = [];
  let gallery = [];
  let availability = { date: '', slots: [] };
  let lastRenderAt = Date.now();
  let activeSlotFilter = 'all';

  const slotFilterButtons = document.querySelectorAll('[data-slot-filter-home]');
  slotFilterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSlotFilter = btn.dataset.slotFilterHome || 'all';
      slotFilterButtons.forEach((b) => b.classList.toggle('active', b === btn));
      renderAvailability();
    });
  });

  window.addEventListener('focus', refreshData);
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshData();
  });

  refreshData();

  async function refreshData() {
    const { stylists: sty, gallery: gal, availability: avail } = await loadData();
    stylists = sty;
    gallery = gal;
    availability = avail;
    renderAvailability();
    renderFeatured();
    renderBranchStatus();
  }

  async function loadData() {
    if (!api?.apiFetch) {
      console.warn('API client missing, cannot load live data');
      return { stylists: [], gallery: [], availability: { date: '', slots: [] } };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const [stylistsRes, galleryRes, availabilityRes] = await Promise.all([
        api.apiFetch('/api/stylists'),
        api.apiFetch('/api/gallery'),
        api.apiFetch(`/api/availability?date=${today}`),
      ]);
      return {
        stylists: stylistsRes || [],
        gallery: galleryRes || [],
        availability: availabilityRes || { date: today, slots: [] },
      };
    } catch (err) {
      console.error('Failed to load home data', err);
      return { stylists: [], gallery: [], availability: { date: '', slots: [] } };
    }
  }

  function normalizeBranch(value) {
    if (!value) return '';
    const lower = value.toLowerCase();
    if (lower.includes('zayed')) return 'sheikh-zayed';
    if (lower.includes('rehab')) return 'rehab';
    return lower.replace(/\s+/g, '-');
  }

  function formatTime12h(timeString) {
    if (!timeString) return '--';
    const [h, m] = timeString.split(':').map(Number);
    const hh24 = h % 24;
    const ampm = hh24 >= 12 ? 'PM' : 'AM';
    const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
    const mm = String(m || 0).padStart(2, '0');
    return `${hh12}:${mm} ${ampm}`;
  }

  function applySlotFilter(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(({ time }) => {
      const [h, m] = (time || '00:00').split(':').map(Number);
      const mins = h * 60 + m;
      if (activeSlotFilter === 'morning') return mins >= 8 * 60 && mins < 12 * 60;
      if (activeSlotFilter === 'afternoon') return mins >= 12 * 60 && mins < 16 * 60;
      if (activeSlotFilter === 'evening') return mins >= 16 * 60 && mins <= 21 * 60;
      return true;
    });
  }

  function renderAvailability() {
    const slotsByBranch = availability.slots.reduce((acc, slot) => {
      const branchKey = slot.branch || '';
      if (!acc[branchKey]) acc[branchKey] = [];
      acc[branchKey].push(slot);
      return acc;
    }, {});
    document.querySelectorAll('.avail-card').forEach((card) => {
      const branchKey = card.dataset.branch || '';
      const slotList = card.querySelector('.slot-list');
      const nextStylist = card.querySelector('.next-stylist .value');
      const nextSlot = card.querySelector('.next-slot');
      const liveStamp = card.querySelector('.live-stamp');

      if (!slotList) return;
      slotList.innerHTML = '';

      const filtered = applySlotFilter(slotsByBranch[branchKey] || []);
      if (!filtered.length) {
        slotList.innerHTML = '<div class="empty-state">No live times yet. Add stylists and times in the admin dashboard.</div>';
        if (nextStylist) nextStylist.textContent = '--';
        if (nextSlot) nextSlot.textContent = '--';
        if (liveStamp) liveStamp.textContent = 'Awaiting update';
        return;
      }

      filtered
        .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
        .slice(0, 6)
        .forEach(({ displayName, stylist, time }) => {
        const pill = document.createElement('span');
        pill.className = 'slot-pill';
        pill.textContent = `${formatTime12h(time)} · ${displayName || stylist}`;
        slotList.appendChild(pill);
      });

      const first = filtered.sort((a, b) => toMinutes(a.time) - toMinutes(b.time))[0];
      if (nextStylist) nextStylist.textContent = first.displayName || first.stylist || '--';
      if (nextSlot) nextSlot.textContent = formatTime12h(first.time);
      if (liveStamp) updateLiveStamp(liveStamp);
    });
  }

  function renderBranchStatus() {
    const slotsByBranch = availability.slots.reduce((acc, slot) => {
      const key = normalizeBranch(slot.branch || '');
      if (!acc[key]) acc[key] = [];
      acc[key].push(slot);
      return acc;
    }, {});

    const rehabStatus = document.getElementById('status-rehab');
    const sheikhStatus = document.getElementById('status-sheikh');

    if (rehabStatus) rehabStatus.textContent = formatBranchStatus(slotsByBranch['rehab']);
    if (sheikhStatus) sheikhStatus.textContent = formatBranchStatus(slotsByBranch['sheikh-zayed']);
  }

  function formatBranchStatus(list = []) {
    if (!list.length) return 'No live slots yet';
    const times = list.map((s) => s.time).filter(Boolean).sort();
    return `Open · ${times.length} slot${times.length === 1 ? '' : 's'} today`;
  }

  function toMinutes(t) {
    const [h, m] = (t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function renderFeatured() {
    const track = document.getElementById('featured-track');
    if (!track) return;
    track.innerHTML = '';

    if (!gallery.length) {
      track.innerHTML = '<div class="empty-state">No featured looks yet. Upload gallery items in admin.</div>';
      return;
    }

    gallery.slice(0, 8).forEach((item, idx) => {
      const branchKey = normalizeBranch(item.branch || '');
      const stylist = item.stylist || 'Stylist';
      const title = item.title || item.caption || 'New look';
      const desc = item.description || item.subtitle || 'Fresh from the floor.';
      const img = item.imageUrl || item.url || '';
      const card = document.createElement('article');
      card.className = 'look-card';
      card.dataset.branch = branchKey;
      card.dataset.stylist = stylist.toLowerCase();
      card.innerHTML = `
        <div class="look-img" ${img ? `style="background-image:url('${img}')"` : ''} aria-hidden="true"></div>
        <div class="look-meta">
          <p class="eyebrow">${branchKey ? formatBranch(branchKey) : 'Branch' } · ${stylist}</p>
          <h3>${title}</h3>
          <p class="small">${desc}</p>
          <button class="btn small book-look" data-branch="${branchKey}" data-stylist="${stylist}">Book this look</button>
        </div>
      `;
      track.appendChild(card);
    });

    track.querySelectorAll('.book-look').forEach((btn) => {
      btn.addEventListener('click', () => {
        const branchKey = btn.dataset.branch || '';
        const stylistName = btn.dataset.stylist || '';
        try {
          if (branchKey) localStorage.setItem('preferredBranch', branchKey);
          if (stylistName) localStorage.setItem('preferredStylist', stylistName.toLowerCase());
        } catch (err) {}
        window.location.href = '/booking';
      });
    });
  }

  function formatBranch(value) {
    if (value === 'sheikh-zayed') return 'Sheikh Zayed';
    if (value === 'rehab') return 'Rehab';
    return value.replace(/-/g, ' ');
  }

  function formatUpdatedLabel(diffMs) {
    const seconds = Math.floor(Math.max(0, diffMs) / 1000);
    if (seconds < 5) return 'Updated just now';
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Updated ${minutes}m ago`;
  }

  function updateLiveStamp(el) {
    lastRenderAt = Date.now();
    if (!el) return;
    el.textContent = formatUpdatedLabel(0);
    el.classList.remove('live-flash');
    void el.offsetWidth;
    el.classList.add('live-flash');
    setTimeout(() => {
      el.textContent = formatUpdatedLabel(Date.now() - lastRenderAt);
    }, 1000);
  }
});
