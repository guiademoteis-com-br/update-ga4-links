function updateGA4Links(measurementId) {
  if (typeof gtag !== 'function') {
    console.warn('[GA4] gtag is not available globally.');
    return;
  }

  function getGtagParameter(parameter) {
    return new Promise((resolve) => {
      if (typeof gtag !== 'function') {
        console.warn(`[GA4] gtag is not available for ${parameter}`);
        resolve(null);
        return;
      }
      gtag('get', measurementId, parameter, (value) => {
        console.log(`[GA4] ${parameter}:`, value);
        resolve(value);
      });
    });
  }

  function storeInLocalStorage(key, value) {
    if (value) {
      localStorage.setItem(key, value);
      console.log(`[GA4] ${key} saved in localStorage:`, value);
    }
  }

  function updateLinksWithParameters(clientId, sessionId) {
    if (!clientId || !sessionId) return;

    document
      .querySelectorAll('a[href*="go.guiademoteis.com.br"]')
      .forEach((link) => {
        const href = link.getAttribute('href');
        if (!href) return;
        try {
          const url = new URL(href, window.location.origin);
          url.searchParams.set('client_id', clientId);
          url.searchParams.set('session_id', sessionId);
          if (href !== url.toString()) {
            link.setAttribute('href', url.toString());
            console.log(
              `[GA4] Link updated:\n- From: ${href}\n- To: ${url.toString()}`
            );
          }
        } catch {
          console.warn(`[GA4] Invalid URL ignored: ${href}`);
        }
      });
  }

  window.addEventListener('DOMContentLoaded', () => {
    updateLinksWithParameters(
      localStorage.getItem('client_id'),
      localStorage.getItem('session_id')
    );

    Promise.all([getGtagParameter('client_id'), getGtagParameter('session_id')])
      .then(([clientId, sessionId]) => {
        storeInLocalStorage('client_id', clientId);
        storeInLocalStorage('session_id', sessionId);
        updateLinksWithParameters(clientId, sessionId);
      })
      .catch((error) => {
        console.error('[GA4] Error retrieving parameters:', error);
      });
  });
}
