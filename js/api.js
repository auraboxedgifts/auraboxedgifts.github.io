(function () {
  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';
  const API_BASE = window.AURA_API_BASE || (isLocalHost ? 'http://localhost:5013' : 'https://aura.devshubh.me');

  function resolveAssetPath(assetPath) {
    if (!assetPath) return '';
    if (/^https?:\/\//i.test(assetPath)) return assetPath;
    if (assetPath.startsWith('//')) return `${window.location.protocol}${assetPath}`;
    if (protocol === 'file:') return assetPath.replace(/^\/+/, '');
    return assetPath;
  }

  async function apiFetch(path, options) {
    const overrideToken = options && Object.prototype.hasOwnProperty.call(options, 'authToken')
      ? options.authToken
      : undefined;
    const token = overrideToken !== undefined ? overrideToken : localStorage.getItem('auraAuthToken');
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options && options.headers ? options.headers : {});
    if (token) headers.Authorization = `Bearer ${token}`;
    const requestOptions = Object.assign({}, options || {}, { headers });
    if (requestOptions && Object.prototype.hasOwnProperty.call(requestOptions, 'authToken')) {
      delete requestOptions.authToken;
    }
    const response = await fetch(`${API_BASE}${path}`, requestOptions);
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : { success: false, error: await response.text() };
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  window.AuraApi = { API_BASE, apiFetch, resolveAssetPath };
})();
