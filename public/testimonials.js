document.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById('testimonials-container');
	const form = document.getElementById('rating-form');
	const mobileInput = document.getElementById('rating-mobile');
	const stylistInput = document.getElementById('rating-stylist');
	const scoreSelect = document.getElementById('rating-score');
	const commentInput = document.getElementById('rating-comment');
	const statusNote = document.getElementById('rating-status');
	const submitBtn = document.getElementById('rating-submit');
	const api = window.apiClient || null;
	const isAdmin = !!api?.getToken?.();

	function renderCard(entry) {
		const card = document.createElement('div');
		card.className = 'testimonial-card';
		card.dataset.id = entry._id;
		card.dataset.comment = entry.comment || '';
		card.dataset.rating = entry.rating || 5;
		card.innerHTML = `
			<div class="card-top">
				<div class="stars">${'★'.repeat(Math.round(entry.rating || 5))}</div>
				${isAdmin ? `<div class="testimonial-actions">
					<button class="pill-btn ghost" data-action="edit" aria-label="Edit testimonial">Edit</button>
					<button class="pill-btn danger" data-action="delete" aria-label="Delete testimonial">Delete</button>
				</div>` : ''}
			</div>
			<p class="testimonial-text">"${entry.comment || 'Great visit!'}"</p>
			<div class="customer-info">
				<div class="customer-avatar">${(entry.name || 'G').charAt(0).toUpperCase()}</div>
				<div class="customer-details">
					<span class="customer-name">${entry.name || 'Guest'}</span>
					<span class="customer-service">${entry.service || 'Salon Service'}</span>
					${entry.verified ? '<span class="verified-badge">Verified visit</span>' : ''}
				</div>
			</div>
		`;
		return card;
	}

	async function loadTestimonials() {
		try {
			const res = await fetch('/api/reviews/testimonials');
			const list = await res.json();
			container.innerHTML = '';
			if (!Array.isArray(list) || !list.length) {
				container.innerHTML = '<p class="empty-state">No testimonials yet. Be the first to leave a review after your booking!</p>';
				return;
			}
			list.forEach((t) => container.appendChild(renderCard(t)));
		} catch (err) {
			container.innerHTML = '<p class="empty-state">Unable to load testimonials right now.</p>';
		}
	}

	async function submitRating(e) {
		e.preventDefault();
		if (!form) return;
		statusNote.textContent = '';
		const payload = {
			mobile: mobileInput?.value.trim(),
			stylist: stylistInput?.value.trim(),
			score: scoreSelect?.value,
			comment: commentInput?.value.trim(),
		};
		if (!payload.mobile || !payload.score) {
			statusNote.textContent = 'Mobile and rating are required.';
			statusNote.dataset.state = 'error';
			return;
		}
		submitBtn.disabled = true;
		submitBtn.textContent = 'Submitting...';
		try {
			const res = await fetch('/api/reviews/ratings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Rating failed');
			statusNote.textContent = 'Thanks! Your rating was received.';
			statusNote.dataset.state = 'success';
			localStorage.setItem('preferredMobile', payload.mobile);
			form.reset();
			loadTestimonials();
			// Send user back to booking (or provided return path) after rating
			const params = new URLSearchParams(window.location.search);
			const returnTo = params.get('returnTo') || '/booking';
			if (params.get('mobile')) {
				setTimeout(() => {
					window.location.href = returnTo;
				}, 500);
			}
		} catch (err) {
			statusNote.textContent = err.message || 'Rating failed';
			statusNote.dataset.state = 'error';
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = 'Submit rating';
		}
	}

	async function handleCardAction(e) {
		const btn = e.target.closest('[data-action]');
		if (!btn || !isAdmin) return;
		const card = btn.closest('.testimonial-card');
		if (!card) return;
		const id = card.dataset.id;
		const action = btn.dataset.action;
		if (!id) return;
		if (!api?.apiFetch) {
			alert('Admin API not available.');
			return;
		}
		if (action === 'delete') {
			const ok = confirm('Delete this testimonial?');
			if (!ok) return;
			try {
				await api.apiFetch(`/api/reviews/testimonials/${id}`, { method: 'DELETE' }, { auth: true });
				loadTestimonials();
			} catch (err) {
				alert(err?.message || 'Delete failed');
			}
		} else if (action === 'edit') {
			const currentComment = card.dataset.comment || '';
			const currentRating = Number(card.dataset.rating) || 5;
			const newComment = prompt('Edit comment', currentComment);
			if (newComment === null) return;
			const newRating = Number(prompt('Edit rating (1-5)', currentRating)) || currentRating;
			try {
				await api.apiFetch(`/api/reviews/testimonials/${id}`, {
					method: 'PUT',
					body: { comment: newComment, rating: newRating },
				}, { auth: true });
				loadTestimonials();
			} catch (err) {
				alert(err?.message || 'Update failed');
			}
		}
	}


	function hydrateMobileFromQuery() {
		const params = new URLSearchParams(window.location.search);
		const mobile = params.get('mobile');
		if (mobile && mobileInput) {
			mobileInput.value = mobile;
			localStorage.setItem('preferredMobile', mobile);
		}
	}

	if (form) {
		const savedMobile = localStorage.getItem('preferredMobile');
		if (savedMobile && mobileInput) mobileInput.value = savedMobile;
		hydrateMobileFromQuery();
		form.addEventListener('submit', submitRating);
	}

	container?.addEventListener('click', handleCardAction);

	loadTestimonials();
});
