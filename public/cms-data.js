(function () {
  const KEY_STYLISTS = 'cmsStylists';
  const KEY_PRICING = 'cmsPricing';
  const KEY_GALLERY = 'cmsGallery';

  const memoryStore = {
    [KEY_STYLISTS]: [],
    [KEY_PRICING]: [],
    [KEY_GALLERY]: [],
  };

  function storageAvailable() {
    try {
      document.cookie = "__cms_test=1; max-age=5; path=/";
      const ok = document.cookie.includes("__cms_test=");
      document.cookie = "__cms_test=; max-age=0; path=/";
      return ok;
    } catch (err) {
      return false;
    }
  }

  function sessionAvailable() {
    try {
      const probe = '__cms_probe__';
      sessionStorage.setItem(probe, '1');
      sessionStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  function readCookie(key) {
    try {
      const name = `${key}=`;
      const parts = document.cookie.split(';').map((c) => c.trim());
      const hit = parts.find((c) => c.startsWith(name));
      if (!hit) return [];
      const raw = decodeURIComponent(hit.slice(name.length));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeCookie(key, value) {
    try {
      const json = encodeURIComponent(JSON.stringify(value || []));
      document.cookie = `${key}=${json}; max-age=${60 * 60 * 24 * 30}; path=/`;
    } catch (err) {
      // ignore cookie write errors
    }
  }

  function storageAvailable() {
    try {
      const probe = '__cms_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  const hasStorage = storageAvailable();
  const hasSession = !hasStorage && sessionAvailable();
  const hasCookie = !hasStorage && !hasSession && cookieAvailable();
  const storageMode = hasStorage ? 'local' : hasSession ? 'session' : hasCookie ? 'cookie' : 'memory';

  function getFromDriver(key) {
    if (hasStorage) return localStorage.getItem(key);
    if (hasSession) return sessionStorage.getItem(key);
    if (hasCookie) {
      const name = `${key}=`;
      const parts = document.cookie.split(';').map((c) => c.trim());
      const hit = parts.find((c) => c.startsWith(name));
      return hit ? decodeURIComponent(hit.slice(name.length)) : null;
    }
    return null;
  }

  function setToDriver(key, value) {
    if (hasStorage) {
      localStorage.setItem(key, value);
      return;
    }
    if (hasSession) {
      sessionStorage.setItem(key, value);
      return;
    }
    if (hasCookie) {
      document.cookie = `${key}=${value}; max-age=${60 * 60 * 24 * 30}; path=/`;
    }
  }

  function safeLoad(key) {
    try {
      const raw = getFromDriver(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      memoryStore[key] = list; // keep memory mirror
      return list;
    } catch (err) {
      return memoryStore[key] || [];
    }
  }

  function safeSave(key, value) {
    const list = Array.isArray(value) ? value : [];
    try {
      setToDriver(key, JSON.stringify(list));
      memoryStore[key] = list; // mirror in memory for resiliency
    } catch (err) {
      memoryStore[key] = list;
      if (hasCookie) writeCookie(key, list);
    }
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function loadStylists() {
    return safeLoad(KEY_STYLISTS);
  }

  function loadPricing() {
    return safeLoad(KEY_PRICING);
  }

  function loadGallery() {
    return safeLoad(KEY_GALLERY);
  }

  function addStylist(entry) {
    const list = loadStylists();
    const record = {
      id: entry.id || makeId('sty'),
      name: entry.name?.trim() || 'New stylist',
      branch: (entry.branch || 'rehab').toLowerCase(),
      title: entry.title?.trim() || '',
      specialties: Array.isArray(entry.specialties)
        ? entry.specialties.filter(Boolean).map((s) => s.trim().toLowerCase())
        : [],
      times: Array.isArray(entry.times)
        ? entry.times.filter(Boolean).map((t) => t.trim())
        : [],
      bio: entry.bio?.trim() || '',
      phone: entry.phone?.trim() || '',
    };
    list.push(record);
    safeSave(KEY_STYLISTS, list);
    return record;
  }

  function updateStylist(id, patch) {
    const list = loadStylists();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, id };
    safeSave(KEY_STYLISTS, list);
    return list[idx];
  }

  function removeStylist(id) {
    const list = loadStylists().filter((i) => i.id !== id);
    safeSave(KEY_STYLISTS, list);
    return list;
  }

  function addPricing(entry) {
    const list = loadPricing();
    const record = {
      id: entry.id || makeId('price'),
      title: entry.title?.trim() || 'Service',
      category: (entry.category || 'cutting').toLowerCase(),
      amount: Number(entry.amount) || 0,
      duration: Number(entry.duration) || 0,
      features: Array.isArray(entry.features)
        ? entry.features.filter(Boolean).map((f) => f.trim())
        : [],
    };
    list.push(record);
    safeSave(KEY_PRICING, list);
    return record;
  }

  function updatePricing(id, patch) {
    const list = loadPricing();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, id };
    safeSave(KEY_PRICING, list);
    return list[idx];
  }

  function removePricing(id) {
    const list = loadPricing().filter((i) => i.id !== id);
    safeSave(KEY_PRICING, list);
    return list;
  }

  function addGallery(entry) {
    const list = loadGallery();
    const record = {
      id: entry.id || makeId('shot'),
      url: entry.url?.trim() || '',
      title: entry.title?.trim() || 'New look',
      tags: Array.isArray(entry.tags)
        ? entry.tags.filter(Boolean).map((t) => t.trim().toLowerCase())
        : [],
      branch: (entry.branch || 'rehab').toLowerCase(),
      stylist: entry.stylist?.trim().toLowerCase() || 'team',
      service: entry.service?.trim().toLowerCase() || 'styling',
    };
    list.push(record);
    safeSave(KEY_GALLERY, list);
    return record;
  }

  function updateGallery(id, patch) {
    const list = loadGallery();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch, id };
    safeSave(KEY_GALLERY, list);
    return list[idx];
  }

  function removeGallery(id) {
    const list = loadGallery().filter((i) => i.id !== id);
    safeSave(KEY_GALLERY, list);
    return list;
  }

  window.cmsData = {
    storageAvailable: hasStorage,
    storageMode,
    loadStylists,
    loadPricing,
    loadGallery,
    addStylist,
    addPricing,
    addGallery,
    updateStylist,
    updatePricing,
    updateGallery,
    removeStylist,
    removePricing,
    removeGallery,
  };
})();
