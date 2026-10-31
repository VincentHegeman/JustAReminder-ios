/* JustAReminder — iOS native wrapper fixes and UI polish.
 * Only active in the real Capacitor app. Leaves website/PWA alone.
 */
(function () {
  'use strict';
  function nativeApp() {
    var c = window.Capacitor;
    return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
  }
  window.jarIsNativeWrapper = nativeApp;
  if (!nativeApp()) return;

  var root = document.documentElement;
  root.classList.add('jar-ios-native');
  root.lang = root.lang || 'nl';

  function installedAppUI() {
    document.querySelectorAll('.jar-install-link, [onclick*="jarInstallOpen"], #jarInstallLayer').forEach(function (el) {
      if (!el.hidden) el.hidden = true;
      if (el.getAttribute('aria-hidden') !== 'true') el.setAttribute('aria-hidden', 'true');
    });
  }

  function nativeStatus() {
    ['jarHomePushState', 'jarPushStatusText', 'notificationState'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && (/Open als app|Webpush|browser/i.test(el.textContent || '') || !(el.textContent || '').trim())) {
        el.textContent = 'iPhone-meldingen nog niet beschikbaar in deze testversie';
      }
    });
    ['jarSubscriptionStatusText', 'jarSubscriptionModalStatus'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && /Supabase-pakket|Mollie LIVE|Geverifieerde betaalrechten|Opgehaald:/i.test(el.textContent || '')) {
        el.textContent = 'Apple-aankopen zijn nog niet beschikbaar. Je bestaande abonnementsrechten worden door je account bepaald.';
      }
    });
    ['jarProdPushStatus', 'jarPushStatusText', 'jarHomePushState'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && /webpush|browser|niet ondersteund|nog niet beschikbaar/i.test(el.textContent || '')) {
        el.textContent = 'iPhone-meldingen worden in een volgende testversie toegevoegd.';
      }
    });
  }

  // All fixed layout changes live in native-fixes.css, not inline styles.
  // This prevents a MutationObserver(style) feedback loop on iOS.
  function compactHeaderArea() { /* native CSS controls the header */ }
  function fixPersonalizationTabs() { /* native CSS handles tab wrapping */ }

  // Check readability of custom dark colour schemes without changing saved preferences.
  function colorToRgb(value) {
    if (!value) return null;
    var s = value.trim();
    if (/^#[a-f0-9]{6}$/i.test(s)) return [1, 3, 5].map(function(i){return parseInt(s.slice(i,i+2), 16);});
    var m = s.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/i);
    return m ? [Number(m[1]),Number(m[2]),Number(m[3])] : null;
  }
  function luminance(rgb) {
    var v = rgb.map(function(c){var x=c/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);});
    return .2126*v[0]+.7152*v[1]+.0722*v[2];
  }
  function updateContrast() {
    var st=getComputedStyle(root);
    var surface=colorToRgb(st.getPropertyValue('--prod-surface') || st.getPropertyValue('--jar-appearance-surface'));
    var ink=colorToRgb(st.getPropertyValue('--prod-text') || st.getPropertyValue('--jar-appearance-text'));
    if (!surface || !ink) return;
    var light=luminance(surface), text=luminance(ink);
    var ratio=(Math.max(light,text)+.05)/(Math.min(light,text)+.05);
    root.classList.toggle('jar-ios-dark-contrast',light<.20 && ratio<4.5);
  }

  function taskCopy() {
    var selector = document.getElementById('reminderType');
    var modal = document.getElementById('modalBackdrop');
    if (!selector || !modal) return;
    if (!modal.classList.contains('show')) { delete modal.dataset.jarTaskDefaultsApplied; return; }
    var task = selector.value === 'task';
    if (task && !modal.dataset.jarTaskDefaultsApplied && !/(bewerken|wijzigen)/i.test(document.getElementById('modalTitle')?.textContent || '')) {
      var notif = document.getElementById('notificationMinutes');
      if (notif) notif.value = '-1';
      modal.dataset.jarTaskDefaultsApplied = '1';
      if (typeof window.updateTaskFields === 'function') window.updateTaskFields();
    }
    var title = document.getElementById('modalTitle');
    if (title && !/bewerken|wijzigen/i.test(title.textContent)) {
      title.textContent = task ? 'Nieuwe taak' : 'Nieuwe herinnering';
    }
    var desc = modal.querySelector('[data-wizard-step="0"] .wizard-step-desc');
    var descText = task ? 'Geef je taak een duidelijke naam.' : 'Geef je herinnering een duidelijke naam.';
    if (desc && desc.textContent !== descText) desc.textContent = descText;
    var replacements = [
      ['label[for="title"]', task ? 'Naam van taak *' : 'Naam van herinnering *'],
      ['#wizardHeading0', task ? 'Welke taak wil je doen?' : 'Wat wil je onthouden?'],
      ['#wizardHeading3', task ? 'Welke instellingen heeft deze taak?' : 'Wat voor herinnering is het?'],
      ['#wizardSaveButton', task ? 'Taak opslaan ✓' : 'Herinnering opslaan ✓']
    ];
    replacements.forEach(function (pair) {
      var el = modal.querySelector(pair[0]);
      if (el && el.textContent !== pair[1]) el.textContent = pair[1];
    });
  }

  function keepFocusedInputVisible() {
    var node = document.activeElement;
    if (!node || !node.matches || !node.matches('input, textarea, select')) return;
    var viewport = window.visualViewport;
    if (!viewport) return;
    var rect = node.getBoundingClientRect();
    var usableBottom = viewport.offsetTop + viewport.height - 18;
    if (rect.bottom > usableBottom || rect.top < viewport.offsetTop + 12) {
      node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
  }

  function setup() {
    document.body.classList.toggle('jar-ios-dashboard-layout',!!document.querySelector('.mobile-header'));
    installedAppUI();
    nativeStatus();
    compactHeaderArea();
    fixPersonalizationTabs();
    taskCopy();
    updateContrast();

    function updateConnectionBanner() {
      var offline = navigator.onLine === false;
      var banner = document.getElementById('jar-ios-offline-banner');
      if (!banner && offline) {
        banner = document.createElement('div');
        banner.id = 'jar-ios-offline-banner';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.textContent = 'Geen internetverbinding. Wijzigingen kunnen mogelijk niet worden opgeslagen.';
        document.body.appendChild(banner);
      }
      if (banner) banner.hidden = !offline;
    }
    window.addEventListener('online', updateConnectionBanner);
    window.addEventListener('offline', updateConnectionBanner);
    updateConnectionBanner();

    function updateVisualHeight() {
      var v = window.visualViewport;
      var h = v ? v.height : window.innerHeight;
      if (h && h > 180) { var value=Math.round(h)+'px'; if (root.style.getPropertyValue('--jar-visible-height')!==value) root.style.setProperty('--jar-visible-height',value); }
    }
    updateVisualHeight();
    window.addEventListener('resize', function(){ updateVisualHeight(); updateContrast(); }, { passive: true });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', updateVisualHeight, { passive: true });

    document.querySelectorAll('[onclick*="requestNotificationPermission"]').forEach(function (button) {
      button.disabled = true;
      button.title = 'iPhone-meldingen worden pas ingeschakeld wanneer APNs en de server zijn gekoppeld';
      button.textContent = 'Nog niet beschikbaar';
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'reminderType') taskCopy();
      if (e.target && e.target.id === 'notificationMinutes' && typeof window.updateTaskFields === 'function') window.updateTaskFields();
    });
    document.addEventListener('click', function () { window.setTimeout(function(){ taskCopy(); compactHeaderArea(); fixPersonalizationTabs(); }, 0); }, true);

    var keyboard = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard;
    if (keyboard && typeof keyboard.setAccessoryBarVisible === 'function') {
      Promise.resolve(keyboard.setAccessoryBarVisible({ isVisible: false })).catch(function () {});
    }

    window.addEventListener('focusin', function (e) {
      if (e.target && e.target.matches && e.target.matches('input,textarea,select')) {
        window.setTimeout(keepFocusedInputVisible, 240);
      }
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () { window.setTimeout(keepFocusedInputVisible, 90); });
    }

    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        installedAppUI();
        nativeStatus();
        compactHeaderArea();
        fixPersonalizationTabs();
        taskCopy();
      });
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    // Theme changes update CSS vars on <html>; watch only this attribute.
    var lastTheme = '';
    new MutationObserver(function(){
      var now = root.getAttribute('style') || '';
      if (now === lastTheme) return;
      lastTheme = now;
      updateContrast();
    }).observe(root, {attributes:true,attributeFilter:['style']});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
