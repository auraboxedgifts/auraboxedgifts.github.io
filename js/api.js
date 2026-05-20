(function () {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const API_BASE = window.AURA_API_BASE || (isLocalHost ? 'http://localhost:5013' : 'https://aura.devshubh.me');

  async function apiFetch(path, options) {
    const token = localStorage.getItem('auraAuthToken');
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options && options.headers ? options.headers : {});
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}${path}`, Object.assign({}, options || {}, { headers }));
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : { success: false, error: await response.text() };
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  window.AuraApi = { API_BASE, apiFetch };
})();
