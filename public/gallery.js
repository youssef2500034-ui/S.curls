document.addEventListener('DOMContentLoaded', () => {
	const filterPills = document.querySelectorAll('.filter-pill');
	const baseShots = Array.from(document.querySelectorAll('.gallery-grid .shot:not(.cms-shot)'));
	let shots = [...baseShots];
	const countLabel = document.getElementById('filter-count');
	const toast = createToast();
	let favorites = loadFavs();
	let currentFilter = 'all';
	const api = window.apiClient || null;

	async function fetchGallery() {
		if (!api?.apiFetch) return [];
		try {
			return await api.apiFetch('/api/gallery');
		} catch (err) {
			toast.show('Failed to load looks');
			return [];
		}
	}

	function applyFilter(tag) {
		currentFilter = tag;
		let visible = 0;

		shots.forEach((shot) => {
			const tags = (shot.dataset.tags || '').toLowerCase();
			const id = shot.dataset.id;
			const match =
				tag === 'all' ||
				(tag === 'favs' ? (id && favorites.has(id)) : tags.split(' ').includes(tag));
			shot.style.display = match ? 'block' : 'none';
			if (match) visible += 1;
		});

		if (countLabel) {
			countLabel.textContent = `${visible} look${visible === 1 ? '' : 's'}`;
		}
	}

	filterPills.forEach((pill) => {
		pill.addEventListener('click', () => {
			filterPills.forEach((p) => p.classList.remove('is-active'));
			pill.classList.add('is-active');
			applyFilter(pill.dataset.filter || 'all');
		});
	});

	function goToBookingFromLook(shotEl) {
		if (!shotEl) return;
		const branch = shotEl.dataset.branch || '';
		const stylistRaw = shotEl.dataset.stylist || '';
		const stylist = stylistRaw === 'team' ? '' : stylistRaw; // avoid invalid option
		const service = shotEl.dataset.service || 'cutting';

		try {
			if (branch) localStorage.setItem('preferredBranch', branch);
			if (stylist) localStorage.setItem('preferredStylist', stylist);
			if (service) localStorage.setItem('preferredService', service);
		} catch (err) {
			// ignore storage errors (private mode etc.)
		}

		toast.show('Saved this look to booking');
		window.location.href = '/booking';
	}

	function wireShot(shot) {
		const bookBtn = shot.querySelector('[data-book-look]');
		if (bookBtn) {
			bookBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const shotEl = bookBtn.closest('.shot');
				goToBookingFromLook(shotEl);
			});
		}

		const favBtn = shot.querySelector('[data-fav]');
		if (favBtn) {
			const shotId = shot.dataset.id;
			if (shotId && favorites.has(shotId)) {
				favBtn.classList.add('on');
				favBtn.textContent = '♥ Saved';
			}
			favBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const shotEl = favBtn.closest('.shot');
				const id = shotEl?.dataset.id;
				if (!id) return;
				const isFav = favorites.has(id);
				if (isFav) {
					favorites.delete(id);
					favBtn.classList.remove('on');
					favBtn.textContent = '♡ Save';
					toast.show('Removed from saved');
				} else {
					favorites.add(id);
					favBtn.classList.add('on');
					favBtn.textContent = '♥ Saved';
					toast.show('Saved this look');
				}
				persistFavs();
				if (currentFilter === 'favs') {
					applyFilter('favs');
				}
			});
		}

		shot.addEventListener('dblclick', () => goToBookingFromLook(shot));
	}

	function buildShotFromCms(record) {
		const art = document.createElement('article');
		const id = record.id || `shot-${Date.now()}`;
		const tags = Array.isArray(record.tags) ? record.tags : [];
		const tagLabels = tags.map(capitalizeTag);
		const title = record.title || 'New look';
		const branchLabel = formatBranch(record.branch);
		const stylistLabel = record.stylist ? capitalizeTag(record.stylist) : 'Team';

		art.className = 'shot cms-shot';
		art.dataset.id = id;
		art.dataset.tags = tags.join(' ');
		art.dataset.branch = record.branch || 'rehab';
		art.dataset.stylist = record.stylist || 'team';
		art.dataset.service = record.service || 'styling';

		art.innerHTML = `
			<img src="${record.url || ''}" alt="${title}">
			<div class="shot-overlay">
				<div class="shot-top">
					<span class="shot-badge">${branchLabel}</span>
					<span class="shot-badge ghost">${stylistLabel}</span>
				</div>
				<h3>${title}</h3>
				<div class="shot-tags">${tagLabels.map((t) => `<span>${t}</span>`).join('')}</div>
				<div class="shot-actions">
					<button class="shot-fav" data-fav>♡ Save</button>
					<button class="shot-cta" data-book-look>Book with ${stylistLabel}</button>
				</div>
			</div>
		`;

		return art;
	}

	async function renderCmsShots() {
		const list = await fetchGallery();
		const grid = document.querySelector('.gallery-grid');
		if (!grid) return;

		grid.querySelectorAll('.cms-shot').forEach((el) => el.remove());
		shots = [...baseShots];

		list.forEach((record) => {
			const shot = buildShotFromCms(record);
			grid.appendChild(shot);
			shots.push(shot);
			wireShot(shot);
		});

		applyFilter(currentFilter);
	}

	function formatBranch(raw) {
		if (!raw) return 'Rehab';
		const lower = raw.toLowerCase();
		if (lower.includes('zayed')) return 'Sheikh Zayed';
		return 'Rehab';
	}

	function capitalizeTag(t) {
		if (!t) return '';
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	shots.forEach((shot) => wireShot(shot));
	renderCmsShots();

	// Initial render
	applyFilter('all');

	// Refresh gallery when tab refocuses so deletes/updates propagate site-wide
	window.addEventListener('visibilitychange', () => {
		if (!document.hidden) renderCmsShots();
	});
	window.addEventListener('focus', renderCmsShots);

	function loadFavs() {
		try {
			const raw = localStorage.getItem('favShots');
			if (raw) return new Set(JSON.parse(raw));
		} catch (err) {}
		return new Set();
	}

	function persistFavs() {
		try {
			localStorage.setItem('favShots', JSON.stringify(Array.from(favorites)));
		} catch (err) {}
	}

	function createToast() {
		const el = document.createElement('div');
		el.className = 'toast';
		el.setAttribute('role', 'status');
		el.setAttribute('aria-live', 'polite');
		document.body.appendChild(el);

		let timer;

		return {
			show(msg) {
				el.textContent = msg;
				el.classList.add('visible');
				clearTimeout(timer);
				timer = setTimeout(() => el.classList.remove('visible'), 1600);
			}
		};
	}
});
