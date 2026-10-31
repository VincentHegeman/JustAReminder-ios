/* JustAReminder iOS v1.4 — session preference, last workspace and route recovery.
 * No passwords are saved. Only Supabase's session is stored via its supported
 * storage adapter. This file has no effect on the public web/PWA builds.
 */
(function (w) {
  'use strict';
  const native = !!(w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function' && w.Capacitor.isNativePlatform());
  const PREF = 'jar_ios_remember_login_v2';
  const LAST = 'jar_ios_last_workspace_v2';
  const LAST_ROUTE = 'jar_ios_last_route_v1';
  const LAST_USER = 'jar_ios_last_user_v1';
  const AUTH_PREFIX = 'sb-';
  const storage = (area) => { try { return w[area]; } catch (_) { return null; } };
  const get = (area, key) => { try { return storage(area)?.getItem(key) ?? null; } catch (_) { return null; } };
  const set = (area, key, value) => { try { storage(area)?.setItem(key, value); } catch (_) {} };
  const remove = (area, key) => { try { storage(area)?.removeItem(key); } catch (_) {} };
  const remember = () => get('localStorage', PREF) !== 'false'; // Existing logins remain remembered.
  const adapter = {
    getItem(key) {
      return remember() ? (get('localStorage', key) ?? get('sessionStorage', key)) : get('sessionStorage', key);
    },
    setItem(key, value) {
      const target = remember() ? 'localStorage' : 'sessionStorage';
      set(target, key, value);
      remove(target === 'localStorage' ? 'sessionStorage' : 'localStorage', key);
    },
    removeItem(key) { remove('localStorage', key); remove('sessionStorage', key); }
  };
  function setRemember(value) {
    if (!native) return;
    const was = remember();
    set('localStorage', PREF, value ? 'true' : 'false');
    if (was !== !!value) {
      const from = storage(was ? 'localStorage' : 'sessionStorage');
      const to = storage(value ? 'localStorage' : 'sessionStorage');
      if (from && to) {
        try {
          const keys = [];
          for (let i = 0; i < from.length; i++) {
            const key = from.key(i);
            if (key && key.startsWith(AUTH_PREFIX) && key.endsWith('-auth-token')) keys.push(key);
          }
          keys.forEach(key => {
            const token = from.getItem(key);
            if (token != null) to.setItem(key, token);
            from.removeItem(key);
          });
        } catch (_) {}
      }
    }
  }
  function isAuthPath(pathname) {
    return /\/(inloggen|account)\.html$/i.test(pathname || w.location.pathname);
  }
  function isMenuPath(pathname) {
    const path = pathname || w.location.pathname;
    return /\/index\.html$/i.test(path) || /\/$/.test(path);
  }
  function routeValue(urlLike) {
    try {
      const u = new URL(urlLike || w.location.href, w.location.href);
      if (u.protocol !== w.location.protocol || u.host !== w.location.host) return null;
      if (!/\/(prive\/dashboard|family\/family-dashboard)\.html$/i.test(u.pathname)) return null;
      return u.pathname.replace(/^\//, '') + (u.search || '') + (u.hash || '');
    } catch (_) { return null; }
  }
  function lastRoute() { return get('localStorage', LAST_ROUTE); }
  function bindUser(id) {
    if (!native || !id) return;
    const previous = get('localStorage', LAST_USER);
    if (previous && previous !== id) {
      remove('localStorage', LAST_ROUTE);
      set('localStorage', LAST, 'prive');
      remove('localStorage', 'jar_ios_private_tab_v1');
    }
    set('localStorage', LAST_USER, id);
  }
  function markRoute(urlLike) {
    if (!native) return;
    const value = routeValue(urlLike);
    if (value) set('localStorage', LAST_ROUTE, value);
  }
  function dashboardFor(space) {
    return (space === 'family') ? 'family/family-dashboard.html' : 'prive/dashboard.html';
  }
  function resumeUrl() {
    const space = get('localStorage', LAST) === 'family' ? 'family' : 'prive';
    const route = lastRoute();
    if (route && ((space === 'family' && route.startsWith('family/')) || (space === 'prive' && route.startsWith('prive/')))) return route;
    return dashboardFor(space);
  }
  function goMenu() { w.location.assign('../index.html?menu=1'); }
  function goBack(fallback) {
    const ref = document.referrer || '';
    let sameOrigin = false;
    try { const u = new URL(ref); sameOrigin = u.protocol === w.location.protocol && u.host === w.location.host; } catch (_) {}
    const previousUsable = sameOrigin && !/\/index\.html(\?|$)/i.test(ref) && !/\/(inloggen|account)\.html(\?|$)/i.test(ref);
    if (previousUsable && w.history.length > 1) { w.history.back(); return; }
    const destination = fallback || resumeUrl();
    if (destination && !w.location.pathname.endsWith(destination.split('?')[0])) { w.location.assign('/' + destination.replace(/^\//,'')); return; }
    w.location.assign('/' + dashboardFor(get('localStorage', LAST) === 'family' ? 'family' : 'prive'));
  }
  const api = {
    native, remember, setRemember, bindUser,
    authOptions() { return native ? {auth: {persistSession: true, autoRefreshToken: true, storage: adapter}} : {}; },
    last() { return get('localStorage', LAST) === 'family' ? 'family' : 'prive'; },
    mark(space) { if (native && (space === 'prive' || space === 'family')) set('localStorage', LAST, space); },
    route: lastRoute,
    markRoute,
    resumeUrl,
    goMenu,
    back: goBack,
    setStatus(text) {
      const el = document.getElementById('jarResumeStatus');
      if (el) el.textContent = text;
    }
  };
  w.JAR_iOS_session = api;

  if (!native) return;

  // Persist the last useful screen, so app restarts and menu hops return users to where they were.
  if (!isAuthPath() && !isMenuPath()) {
    markRoute();
    const markCurrent = () => markRoute();
    w.addEventListener('hashchange', markCurrent, {passive:true});
    w.addEventListener('pagehide', markCurrent, {passive:true});
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') markCurrent(); });
  }

  // Menu access never signs the user out. It is a workspace switch, not logout.
  function injectSwitch() {
    if (!/\/(prive|family)\/family-dashboard\.html|\/prive\/dashboard\.html/.test(w.location.pathname)) return;
    const targets = [document.querySelector('#mobileMenu nav'), document.querySelector('.sidebar-bottom')].filter(Boolean);
    const more = document.querySelector('.jar-prod-more-grid');
    if (more) targets.push(more);
    targets.forEach((parent) => {
      if (parent.querySelector('[data-jar-return-menu]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-jar-return-menu', '');
      button.className = 'jar-return-menu';
      button.textContent = '← Terug naar menu';
      button.addEventListener('click', () => api.goMenu());
      parent.appendChild(button);
    });
    if (more && !more.querySelector('[data-jar-remember-setting]')) {
      const wrap = document.createElement('div');
      wrap.className = 'jar-remember-setting';
      wrap.setAttribute('data-jar-remember-setting','');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox'; input.checked = remember();
      input.addEventListener('change', () => setRemember(input.checked));
      label.append(input, document.createTextNode(' Ingelogd blijven op dit toestel'));
      wrap.appendChild(label);
      const note = document.createElement('small');
      note.textContent = 'Uitloggen blijft altijd mogelijk. Je wachtwoord wordt niet in de app opgeslagen.';
      wrap.appendChild(note);
      more.appendChild(wrap);
    }
  }

  // Secondary pages get an explicit iOS-friendly previous button.
  function injectBackButton() {
    if (/\/prive\/dashboard\.html$/i.test(w.location.pathname) || /\/family\/family-dashboard\.html$/i.test(w.location.pathname) || isMenuPath()) return;
    const host = document.querySelector('.auth-nav, .mobile-header, .topbar, .page-header, header');
    if (!host || host.querySelector('[data-jar-ios-back]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'jar-ios-back-button';
    button.setAttribute('data-jar-ios-back','');
    button.textContent = '← Vorige';
    button.addEventListener('click', function(){ api.back(api.resumeUrl()); });
    host.insertBefore(button, host.firstChild);
  }

  function setup() { injectSwitch(); injectBackButton(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once:true}); else setup();
})(window);
