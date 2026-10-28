/* JustAReminder iOS native build: blokkeer oude Mollie-betaalacties. */
(function () {
  'use strict';
  const NATIVE = Boolean(window.JAR_MOBILE_TEST_BUILD || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()));
  if (!NATIVE) return;
  window.JAR_IOS_NATIVE_BUILD = true;
  const go = () => { window.location.href = '../ios/abonnementen.html'; };
  const interceptTerms = /startMollieCheckout|jarPrivateSubscriptionAction|jarDirectBundleStart|jarPrivateCancelLiveSubscription|openPlansModal|jarSub.*(Buy|Checkout|Purchase|Pay)/i;
  document.addEventListener('click', function (event) {
    const node = event.target && event.target.closest && event.target.closest('button,a,[onclick]');
    if (!node) return;
    const onclick = String(node.getAttribute('onclick') || '');
    const id = String(node.id || '');
    const button = String(node.getAttribute('data-plan-button') || '');
    const href = String(node.getAttribute('href') || '');
    const isPayment = Boolean((button && button!=='free') || /addonButton|jarPriveRemoveBundle|jarUndoPendingBundle|jarLivePrivateCancelButton|jarSubButtons/i.test(id) || interceptTerms.test(onclick) || /(?:checkout|mollie\.com)/i.test(href));
    if (!isPayment) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go();
  }, true);
  const guard = () => {
    ["startMollieCheckout", "jarDirectBundleStart", "jarPrivateSubscriptionAction", "jarPrivateCancelLiveSubscription", "openPlansModal"].forEach(name => {
      if (typeof window[name] === 'function') {
        try { window[name] = go; } catch (_) { /* capture listener remains active */ }
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard);
  else guard();
  // Let op: de oude serverstatus mag nog gelezen worden, maar de native app
  // moet nooit rechtstreeks een Mollie-betaalverzoek uit het webdashboard starten.
})();
