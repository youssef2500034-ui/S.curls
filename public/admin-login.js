// Clear old session
try { localStorage.removeItem('adminToken'); } catch (_) {}

const form = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.apiClient) {
        errorMessage.textContent = 'Client not ready. Please refresh the page.';
        errorMessage.style.display = 'block';
        return;
    }

    errorMessage.style.display = 'none';
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const data = await window.apiClient.apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        window.apiClient.setToken(data.token);
        window.location.href = '/admin';
    } catch (err) {
        errorMessage.textContent = 'Invalid credentials';
        errorMessage.style.display = 'block';
    }
});