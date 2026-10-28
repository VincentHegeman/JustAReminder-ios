/* JustAReminder - app-wrapper compatibiliteit voor TESTEN.
   Dit is een afzonderlijke kopie: de oorspronkelijke websitebestanden blijven ongemoeid. */
(function () {
  'use strict';
  window.JAR_MOBILE_TEST_BUILD = true;
  window.jarIsNativeWrapper = function () {
    return (location.hostname === 'localhost' || location.hostname === '127.0.0.1') || Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
  };
  window.jarBuildFamilyInviteUrl = function (token) {
    var path = 'family-dashboard.html?invite=' + encodeURIComponent(String(token));
    if (window.jarIsNativeWrapper()) {
      var base = String((window.JAR_MOBILE_CONFIG || {}).familyPublicBaseUrl || '').trim();
      if (!/^https:\/\/[^/]+/i.test(base)) return '';
      return base.replace(/\/+$/, '') + '/' + path;
    }
    return location.origin + location.pathname.replace(/[^/]+$/, '') + path;
  };
})();
