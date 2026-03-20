function updateGA4Links(measurementId) {
  if (typeof gtag !== 'function') {
    console.warn('[GA4] gtag is not available globally. Only FB params will be used.');
  }

  var gtagAvailable = typeof gtag === 'function';
  var LINK_SELECTOR = 'a[href*="go.guiademoteis.com.br"]';
  var RETRY_INTERVAL_MS = 2000;
  var MAX_RETRIES = 5;
  var GTAG_TIMEOUT_MS = 5000;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function saveToStorage(key, value) {
    if (value) {
      localStorage.setItem(key, value);
      console.log('[GA4] ' + key + ' saved in localStorage:', value);
    }
  }

  function getGtagParameter(parameter) {
    return new Promise(function (resolve) {
      var timeout = setTimeout(function () {
        console.warn('[GA4] Timeout getting ' + parameter);
        resolve(null);
      }, GTAG_TIMEOUT_MS);
      gtag('get', measurementId, parameter, function (value) {
        clearTimeout(timeout);
        console.log('[GA4] ' + parameter + ':', value);
        resolve(value);
      });
    });
  }

  function collectParams() {
    return {
      client_id: localStorage.getItem('client_id'),
      session_id: localStorage.getItem('session_id'),
      fbp: getCookie('_fbp') || localStorage.getItem('fbp'),
      fbc: getCookie('_fbc') || localStorage.getItem('fbc')
    };
  }

  function hasAllParams(params) {
    var hasFb = !!(params.fbp && params.fbc);
    var hasGa4 = !!(params.client_id && params.session_id);
    return gtagAvailable ? (hasFb && hasGa4) : hasFb;
  }

  function persistParams(params) {
    saveToStorage('client_id', params.client_id);
    saveToStorage('session_id', params.session_id);
    saveToStorage('fbp', params.fbp);
    saveToStorage('fbc', params.fbc);
  }

  function updateLinks(params) {
    document
      .querySelectorAll(LINK_SELECTOR)
      .forEach(function (link) {
        var href = link.getAttribute('href');
        if (!href) return;
        try {
          var url = new URL(href, window.location.origin);
          if (params.client_id) url.searchParams.set('client_id', params.client_id);
          if (params.session_id) url.searchParams.set('session_id', params.session_id);
          if (params.fbp) url.searchParams.set('fbp', params.fbp);
          if (params.fbc) url.searchParams.set('fbc', params.fbc);
          if (href !== url.toString()) {
            link.setAttribute('href', url.toString());
            console.log(
              '[GA4] Link updated:\n- From: ' + href + '\n- To: ' + url.toString()
            );
          }
        } catch (e) {
          console.warn('[GA4] Invalid URL ignored: ' + href);
        }
      });
  }

  window.addEventListener('DOMContentLoaded', function () {
    // Phase 1: apply whatever is already available (localStorage, cookies)
    var initialParams = collectParams();
    updateLinks(initialParams);

    // Phase 2: fetch GA4 params, persist everything, update links
    if (gtagAvailable) {
      Promise.all([getGtagParameter('client_id'), getGtagParameter('session_id')])
        .then(function (results) {
          var clientId = results[0];
          var sessionId = results[1];
          saveToStorage('client_id', clientId);
          saveToStorage('session_id', sessionId);
          var params = collectParams();
          persistParams(params);
          updateLinks(params);
        })
        .catch(function (error) {
          console.error('[GA4] Error retrieving parameters:', error);
        });
    }

    // Phase 3: retry for late FB cookies, only update if something changed
    var retries = 0;
    var retryInterval = setInterval(function () {
      retries++;
      var params = collectParams();
      var changed =
        params.fbp !== localStorage.getItem('fbp') ||
        params.fbc !== localStorage.getItem('fbc');
      if (changed) {
        persistParams(params);
        updateLinks(params);
      }
      if (hasAllParams(params) || retries >= MAX_RETRIES) {
        clearInterval(retryInterval);
      }
    }, RETRY_INTERVAL_MS);
  });
}
