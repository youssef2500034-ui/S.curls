document.addEventListener('DOMContentLoaded', () => {
	const pills = document.querySelectorAll('.pricing-pill');
	const baseCards = Array.from(document.querySelectorAll('.pricing-card:not(.cms-card)'));
	let cards = [...baseCards];
	const bookButtons = document.querySelectorAll('[data-pricing-book]');
	const api = window.apiClient || null;
	let currentCategory = 'all';

	async function fetchPricing() {
		if (!api?.apiFetch) return [];
		try {
			return await api.apiFetch('/api/pricing');
		} catch (err) {
			console.error('pricing load failed', err);
			return [];
		}
	}

	pills.forEach((pill) => {
		pill.addEventListener('click', () => {
			pills.forEach((p) => p.classList.remove('active'));
			pill.classList.add('active');
			currentCategory = pill.dataset.category || 'all';
			applyFilter(currentCategory);
		});
	});

	bookButtons.forEach((btn) => attachBookHandler(btn));

	function applyFilter(category) {
		cards.forEach((card) => {
			const cat = card.dataset.category || '';
			const matches = category === 'all' || cat === category;
			card.style.display = matches ? 'flex' : 'none';
		});
	}

	function attachBookHandler(btn) {
		if (!btn) return;
		btn.addEventListener('click', () => {
			const service = btn.dataset.service || 'cutting';
			try {
				localStorage.setItem('preferredService', service);
			} catch (err) {
				// ignore storage errors
			}
			window.location.href = '/booking';
		});
	}

	function buildPricingCard(record) {
		const card = document.createElement('div');
		card.className = 'pricing-card cms-card';
		card.dataset.category = record.category || 'cutting';
		const amount = Number(record.amount) || 0;
		const features = Array.isArray(record.features) ? record.features : [];
		const durationText = record.duration ? `${record.duration} minutes` : '';

		card.innerHTML = `
			<div class="pricing-header">
				<div class="pricing-title">${record.title || 'New service'}</div>
				<div class="pricing-subtitle">Custom</div>
				<div class="pricing-amount">EGP ${amount}</div>
				<div class="pricing-duration">${durationText}</div>
			</div>
			<div class="pricing-body">
				<ul class="pricing-features">
					${features.map((f) => `<li>${f}</li>`).join('')}
				</ul>
				<button class="pricing-button" data-pricing-book data-service="${record.category || 'cutting'}">Book ${record.title || 'service'}</button>
			</div>
		`;

		return card;
	}

	async function renderCmsPricing() {
		const list = await fetchPricing();
		const container = document.querySelector('.pricing-container');
		if (!container) return;

		// If live data exists, remove baked-in static cards so admin data fully controls the view
		if (list.length) {
			container.querySelectorAll('.pricing-card:not(.cms-card)').forEach((el) => el.remove());
		}
		const bundle = container.querySelector('.bundle-section');

		container.querySelectorAll('.cms-card').forEach((el) => el.remove());
		cards = [...baseCards];

		list.forEach((record) => {
			const card = buildPricingCard(record);
			if (bundle) {
				container.insertBefore(card, bundle);
			} else {
				container.appendChild(card);
			}
			cards.push(card);
			const btn = card.querySelector('[data-pricing-book]');
			attachBookHandler(btn);
		});

		applyFilter(currentCategory);
	}

	// Refresh CMS-driven pricing when coming back to the tab (reflect admin deletes)
	window.addEventListener('visibilitychange', () => {
		if (!document.hidden) renderCmsPricing();
	});
	window.addEventListener('focus', renderCmsPricing);

	renderCmsPricing();
	// initial render
	applyFilter('all');
});
