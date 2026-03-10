document.addEventListener('DOMContentLoaded', () => {
  const FILTER_STATE_KEY = 'staffFilters';
  const api = window.apiClient || null;

  const shared = window.bookingData || {};
  const availability = shared.availability || {};
  const getFreeSlots = shared.getFreeSlots || (() => []);
  const getTodayStr = shared.getTodayStr || (() => new Date().toISOString().split('T')[0]);
  const loadBookings = shared.loadBookings || (() => []);
  const findNextDateWithSlots = shared.findNextDateWithSlots || (() => null);
  const formatTime12h = shared.formatTime12h || ((timeString) => {
    const [h, m] = timeString.split(':').map(Number);
    const hh24 = h % 24;
    const ampm = hh24 >= 12 ? 'PM' : 'AM';
    const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
    const mm = String(m).padStart(2, '0');
    return `${hh12}:${mm} ${ampm}`;
  });

  const state = loadFilterState();
  const baseCards = [];
  let cards = [];
  const filterGroups = document.querySelectorAll('.filter-group');
  async function fetchStylists() {
    if (!api?.apiFetch) return [];
    try {
      return await api.apiFetch('/api/stylists');
    } catch (err) {
      showTinyToast('Failed to load stylists');
      return [];
    }
  }

  filterGroups.forEach(group => {
    const type = group.dataset.filterType;
    group.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.dataset.value === state[type]) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state[type] = btn.dataset.value;
        saveFilterState();
        applyFilters();
      });
    });
  });

  // No baked-in cards; all content comes from backend

  // Keep availability in sync when returning to tab or when other tabs update bookings
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshAvailabilityUI();
  });
  window.addEventListener('focus', refreshAvailabilityUI);
  window.addEventListener('storage', (event) => {
    if (event.key === 'bookings') refreshAvailabilityUI();
  });

  // Keep CMS-fed cards in sync with backend edits (delete/add/update)
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderCmsStylists();
  });
  window.addEventListener('focus', renderCmsStylists);

  // Copy branch buttons
  document.querySelectorAll('[data-copy-address]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const address = btn.dataset.address || '';
      if (!address) return;
      try {
        await navigator.clipboard.writeText(address);
        showTinyToast('Branch copied');
      } catch (err) {
        showTinyToast('Copy not available');
      }
    });
  });

  // Next-availability chips
  function renderNextTimes() {
    document.querySelectorAll('[data-next-for]').forEach(section => {
      const stylist = section.dataset.nextFor;
      const card = section.closest('.staff-card');
      const branchKey = normalizeBranch(card.dataset.branch);
      const manualTimes = (card.dataset.times || '').split(',').filter(Boolean);
      const bookings = loadBookings();
      let slots = getFreeSlots(getTodayStr(), branchKey, stylist, 'cutting', bookings);
      if (!slots.length) {
        slots = availability[branchKey]?.[stylist] || manualTimes;
      }
      const slotList = section.querySelector('.slot-list');
      slotList.innerHTML = '';

      if (!slots.length) {
        slotList.innerHTML = '<span class="slot-pill muted">No times</span>';
        return;
      }

      slots.slice(0, 3).forEach(time => {
        const pill = document.createElement('span');
        pill.className = 'slot-pill';
        pill.textContent = formatTime12h(time);
        slotList.appendChild(pill);
      });
    });
  }

  function renderAvailabilityBadges() {
    const today = getTodayStr();
    document.querySelectorAll('[data-availability]').forEach(badge => {
      const card = badge.closest('.staff-card');
      const stylist = (card?.id) || '';
      const branchKey = normalizeBranch(card?.dataset.branch || '');
      const manualTimes = (card?.dataset.times || '').split(',').filter(Boolean);
      const bookings = loadBookings();
      const freeToday = getFreeSlots(today, branchKey, stylist, 'cutting', bookings);
      const hasToday = freeToday.length > 0 || manualTimes.length > 0;
      const nextDate = hasToday
        ? null
        : findNextDateWithSlots(branchKey, stylist, 'cutting', today, bookings);
      const hasSlots = hasToday || Boolean(nextDate);

      if (freeToday.length) {
        badge.textContent = 'Available today';
      } else if (manualTimes.length) {
        badge.textContent = 'By request';
      } else if (nextDate) {
        badge.textContent = `Next on ${nextDate}`;
      } else {
        badge.textContent = 'Fully booked';
      }

      badge.classList.toggle('on', hasSlots);
      badge.classList.toggle('off', !hasSlots);
    });
  }

  function refreshAvailabilityUI() {
    renderNextTimes();
    renderAvailabilityBadges();
  }

  function applyFilters() {
    cards.forEach(card => {
      const cardBranch = card.dataset.branch || '';
      const cardSpecialties = (card.dataset.specialties || '').split(',');

      const branchMatch =
        state.branch === 'all' ||
        cardBranch === state.branch ||
        cardBranch === 'both' ||
        (state.branch === 'both' && cardBranch);

      const specialtyMatch =
        state.specialty === 'all' ||
        cardSpecialties.includes(state.specialty);

      const visible = branchMatch && specialtyMatch;
      card.style.display = visible ? 'block' : 'none';
    });
  }

  function toggleDetails(btn) {
    if (!btn) return;
    const details = btn.closest('.staff-card').querySelector('.staff-details');
    const isHidden = details.hasAttribute('hidden');
    if (isHidden) {
      details.removeAttribute('hidden');
      btn.textContent = 'Hide Details ▲';
      btn.setAttribute('aria-expanded', 'true');
    } else {
      details.setAttribute('hidden', '');
      btn.textContent = 'View Details ▼';
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  function normalizeBranch(branch) {
    if (!branch) return '';
    const lower = branch.toLowerCase();
    if (lower.includes('rehab')) return 'rehab';
    if (lower.includes('zayed')) return 'sheikh-zayed';
    return lower.replace(/\s+/g, '-');
  }

  function mapService(label) {
    const lower = (label || '').toLowerCase();
    if (lower.includes('treat')) return 'treatment';
    if (lower.includes('color') || lower.includes('style')) return 'styling';
    if (lower.includes('cut')) return 'cutting';
    return 'cutting';
  }

  function saveFilterState() {
    try {
      localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
    } catch (err) {
      // ignore storage errors
    }
  }

  function attachBookHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const branchKey = normalizeBranch(btn.dataset.branch || '');
      const stylistKey = (btn.dataset.stylist || '').toLowerCase();
      const serviceKey = mapService(btn.dataset.service || '');

      try {
        if (branchKey) localStorage.setItem('preferredBranch', branchKey);
        if (stylistKey) localStorage.setItem('preferredStylist', stylistKey);
        if (serviceKey) localStorage.setItem('preferredService', serviceKey);
      } catch (err) {
        // ignore storage errors (private mode etc.)
      }

      window.location.href = '/booking';
    });
  }

  function attachToggle(btn) {
    if (!btn) return;
    btn.addEventListener('click', () => toggleDetails(btn));
  }

  function attachCardClick(card) {
    if (!card) return;
    card.addEventListener('click', (e) => {
      const target = e.target;
      const isAction = target.closest('.staff-actions') || target.closest('.contact-row');
      if (isAction) return;
      const toggleBtn = card.querySelector('[data-toggle]');
      toggleDetails(toggleBtn);
    });
  }

  async function renderCmsStylists() {
    const list = await fetchStylists();
    const container = document.querySelector('.staff-container');
    if (!container) return;

    const visibleList = (list || []).filter((sty) => sty.visible !== false);

    // If we have live data, drop the baked-in static cards so only CMS/admin data shows
    if (visibleList.length) {
      container.querySelectorAll('.staff-card:not(.cms-card)').forEach((el) => el.remove());
    }

    container.querySelectorAll('.cms-card').forEach((el) => el.remove());
    cards = [];

    container.innerHTML = '';

    if (!visibleList.length) {
      container.innerHTML = '<div class="empty-state">No stylists yet. Please add stylists in the admin dashboard.</div>';
      cards = [];
      return;
    }

    visibleList.forEach((sty) => {
      const card = buildCardFromCms(sty);
      container.appendChild(card);
      cards.push(card);
      attachToggle(card.querySelector('[data-toggle]'));
      attachCardClick(card);
      card.querySelectorAll('.book-btn').forEach((btn) => attachBookHandler(btn));
      card.querySelectorAll('[data-copy-address]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const address = btn.dataset.address || '';
          if (!address) return;
          try {
            await navigator.clipboard.writeText(address);
            showTinyToast('Branch copied');
          } catch (err) {
            showTinyToast('Copy not available');
          }
        });
      });
    });

    applyFilters();
    refreshAvailabilityUI();
  }

  function buildCardFromCms(sty) {
    const card = document.createElement('div');
    const name = sty.name || 'New stylist';
    const slug = (sty.id || name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const branchValue = normalizeBranchValue(sty.branch);
    const branchDisplay = formatBranch(branchValue);
    const specialties = Array.isArray(sty.specialties) && sty.specialties.length ? sty.specialties : ['styling'];
    const times = Array.isArray(sty.times) ? sty.times : [];

    card.className = 'staff-card cms-card';
    card.id = slug;
    card.dataset.branch = branchValue;
    card.dataset.specialties = specialties.join(',');
    card.dataset.times = times.join(',');

    card.innerHTML = `
      <div class="staff-image">✨</div>
      <div class="staff-info">
        <div class="staff-meta">
          <span class="branch-badge">${branchDisplay}</span>
          <span class="highlight-badge subtle">New</span>
          <span class="availability-badge" data-availability></span>
        </div>
        <div class="staff-name">${name}</div>
        <div class="staff-title">${sty.title || 'Stylist'}</div>
        <p class="staff-bio">${sty.bio || 'Freshly added stylist ready to book.'}</p>
        <div class="staff-specialties">
          ${specialties.map((s) => `<span class="specialty-badge">${capitalize(s)}</span>`).join('')}
        </div>
        <div class="branch-links">
          <button class="branch-link ghost" data-copy-address data-address="${branchDisplay} Branch">Copy Branch</button>
          ${sty.phone ? `<a class="branch-link" href="tel:${sty.phone}">Call</a>` : ''}
        </div>
        <div class="next-availability" data-next-for="${slug}">
          <span class="next-label">Next times</span>
          <div class="slot-list"></div>
        </div>
        <div class="contact-row">
          ${sty.phone ? `<a class="contact-link call" href="tel:${sty.phone}">Call</a>` : ''}
          <a class="contact-link whatsapp" href="https://wa.me/${(sty.phone || '').replace(/[^0-9]/g, '')}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
        <div class="staff-actions">
          <button class="book-btn" data-stylist="${name}" data-branch="${branchDisplay} Branch" data-service="${specialties[0] || 'styling'}">Book with ${name}</button>
          <button class="expand-btn" data-toggle>View Details ▼</button>
        </div>
        <div class="staff-details" hidden>
          <div class="detail-section">
            <h4>About</h4>
            <p>${sty.bio || 'Book a slot to experience their work.'}</p>
          </div>
          <div class="detail-section">
            <h4>Specialties</h4>
            <ul class="specialties-list">
              ${specialties.map((s) => `<li>${capitalize(s)}</li>`).join('')}
            </ul>
          </div>
          ${times.length ? `<div class="detail-section"><h4>Custom times</h4><p>${times.join(', ')}</p></div>` : ''}
        </div>
      </div>
    `;

    return card;
  }

  function normalizeBranchValue(raw) {
    if (!raw) return 'rehab';
    const lower = raw.toLowerCase();
    if (lower.includes('zayed')) return 'sheikh zayed';
    if (lower.includes('both')) return 'both';
    return 'rehab';
  }

  function formatBranch(value) {
    if (value === 'sheikh zayed' || value === 'sheikh-zayed') return 'Sheikh Zayed';
    if (value === 'both') return 'Both branches';
    return 'Rehab';
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function showTinyToast(msg) {
    let el = document.querySelector('.tiny-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'tiny-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), 1400);
  }

  function loadFilterState() {
    try {
      const raw = localStorage.getItem(FILTER_STATE_KEY);
      if (raw) {
        return Object.assign({ specialty: 'all', branch: 'all' }, JSON.parse(raw));
      }
    } catch (err) {
      // ignore parse/storage errors
    }
    return { specialty: 'all', branch: 'all' };
  }

  renderCmsStylists();
  applyFilters();
  refreshAvailabilityUI();
});