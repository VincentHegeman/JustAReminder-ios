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
    // The legacy web-push label is not the status of native APNs. Never overwrite
    // a real registration/error message from the native push integration.
    ['jarHomePushState', 'jarPushStatusText', 'notificationState', 'jarProdPushStatus'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var value = (el.textContent || '').trim();
      if (!value || /iPhone-meldingen nog niet beschikbaar|iPhone-meldingen worden in een volgende testversie|Open als app|Webpush|browsermeldingen|niet ondersteund/i.test(value)) {
        el.textContent = 'iPhone-push: beheer meldingen via het groene vak op je dashboard.';
      }
    });
    ['jarSubscriptionStatusText', 'jarSubscriptionModalStatus'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && /Supabase-pakket|Mollie LIVE|Geverifieerde betaalrechten|Opgehaald:/i.test(el.textContent || '')) {
        el.textContent = 'Apple-aankopen zijn nog niet beschikbaar. Je bestaande abonnementsrechten worden door je account bepaald.';
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
    var wizardBody = node.closest('#wizardTouchArea');
    if (wizardBody) {
      var bodyRect = wizardBody.getBoundingClientRect();
      var top = Math.max(bodyRect.top + 12, viewport.offsetTop + 12);
      var bottom = Math.min(bodyRect.bottom - 12, usableBottom);
      if (rect.bottom > bottom) wizardBody.scrollTop += rect.bottom - bottom + 12;
      else if (rect.top < top) wizardBody.scrollTop -= top - rect.top + 12;
      return;
    }
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

    // VisualViewport is not reliable by itself in every iOS WKWebView keyboard
    // mode. Combine it with Capacitor Keyboard events and account for native
    // resizing, so keyboard height is never subtracted twice.
    var nativeKeyboardHeight = 0;
    var unoccludedWindowHeight = window.innerHeight;
    var keyboardFocusInWizard = false;
    function isKeyboardField(node) {
      return !!(node && node.matches && node.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=time]):not([type=hidden])'));
    }
    function updateVisualHeight() {
      var v = window.visualViewport;
      var frame = window.innerHeight;
      var visualCovered = v ? Math.max(0, frame - v.height - v.offsetTop) : 0;
      var nativeShrink = Math.max(0, unoccludedWindowHeight - frame);
      var nativeCovered = nativeKeyboardHeight > 0 ? Math.max(0, nativeKeyboardHeight - nativeShrink) : 0;
      var covered = Math.max(visualCovered, nativeCovered);
      if (covered < 24) covered = 0;
      var visible = Math.max(140, frame - covered);
      if (v && v.height > 0) visible = Math.min(visible, Math.max(140, v.height));
      var sizes = {
        '--jar-visible-height': Math.round(visible) + 'px',
        '--jar-ios-keyboard-bottom': Math.round(covered) + 'px'
      };
      Object.keys(sizes).forEach(function (name) {
        if (root.style.getPropertyValue(name) !== sizes[name]) root.style.setProperty(name, sizes[name]);
      });
      root.classList.toggle('jar-ios-keyboard-open', nativeKeyboardHeight > 0 || covered > 0);
      if (!nativeKeyboardHeight && !keyboardFocusInWizard && !covered) unoccludedWindowHeight = frame;
    }
    updateVisualHeight();
    window.addEventListener('resize', function(){ updateVisualHeight(); updateContrast(); }, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateVisualHeight, { passive: true });
      window.visualViewport.addEventListener('scroll', updateVisualHeight, { passive: true });
    }

    // The old web permission button must not claim that native APNs is missing.
    // Reuse the native opt-in, without requesting permission on page load.
    document.querySelectorAll('[onclick*="requestNotificationPermission"]').forEach(function (button) {
      if (button.dataset.jarIosPushWired === '1') return;
      button.dataset.jarIosPushWired = '1';
      button.removeAttribute('onclick');
      button.disabled = false;
      button.title = 'Schakel native iPhone-meldingen in';
      button.textContent = 'iPhone-meldingen inschakelen';
      button.addEventListener('click', function () {
        var nativePush = window.JARNativePush;
        if (nativePush && typeof nativePush.enable === 'function') {
          void nativePush.enable();
        } else {
          var status = document.getElementById('jarPushStatusText') || document.getElementById('jarHomePushState');
          if (status) status.textContent = 'Open het groene vak iPhone-meldingen op het dashboard.';
        }
      });
    });

    document.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'reminderType') taskCopy();
      if (e.target && e.target.id === 'notificationMinutes' && typeof window.updateTaskFields === 'function') window.updateTaskFields();
    });
    document.addEventListener('click', function () { window.setTimeout(function(){ taskCopy(); compactHeaderArea(); fixPersonalizationTabs(); }, 0); }, true);

    var keyboard = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard;
    function keyboardShow(event) {
      var value = Number(event && event.keyboardHeight);
      nativeKeyboardHeight = Number.isFinite(value) && value > 0 ? value : 0;
      updateVisualHeight();
      window.setTimeout(keepFocusedInputVisible, 80);
    }
    function keyboardHide() {
      nativeKeyboardHeight = 0;
      updateVisualHeight();
      window.setTimeout(function () {
        unoccludedWindowHeight = window.innerHeight;
        updateVisualHeight();
      }, 110);
    }
    function listenKeyboard(name, handler) {
      if (!keyboard || typeof keyboard.addListener !== 'function') return;
      try { Promise.resolve(keyboard.addListener(name, handler)).catch(function () {}); }
      catch (_) { /* VisualViewport remains a fallback. */ }
    }
    listenKeyboard('keyboardWillShow', keyboardShow);
    listenKeyboard('keyboardDidShow', keyboardShow);
    listenKeyboard('keyboardWillHide', keyboardHide);
    listenKeyboard('keyboardDidHide', keyboardHide);

    // A visible, accessible escape hatch is necessary even when iOS does not
    // emit a viewport resize event: the user can always dismiss the keyboard.
    var reminderModal = document.getElementById('modalBackdrop');
    var reminderHeader = reminderModal && reminderModal.querySelector('.wizard-modal .modal-header');
    if (reminderHeader && !document.getElementById('jar-ios-keyboard-done')) {
      var done = document.createElement('button');
      done.id = 'jar-ios-keyboard-done';
      done.type = 'button';
      done.textContent = 'Gereed';
      done.setAttribute('aria-label', 'Toetsenbord sluiten');
      done.addEventListener('click', function () {
        var active = document.activeElement;
        if (isKeyboardField(active)) active.blur();
        if (keyboard && typeof keyboard.hide === 'function') {
          Promise.resolve(keyboard.hide()).catch(function () {});
        }
        keyboardFocusInWizard = false;
        root.classList.remove('jar-ios-wizard-field-focus');
      });
      reminderHeader.insertBefore(done, reminderHeader.querySelector('.close-button'));
    }

    document.addEventListener('focusin', function (e) {
      if (isKeyboardField(e.target) && reminderModal && reminderModal.contains(e.target)) {
        keyboardFocusInWizard = true;
        root.classList.add('jar-ios-wizard-field-focus');
        window.setTimeout(keepFocusedInputVisible, 240);
      }
    });
    document.addEventListener('focusout', function () {
      window.setTimeout(function () {
        keyboardFocusInWizard = isKeyboardField(document.activeElement) &&
          !!(reminderModal && reminderModal.contains(document.activeElement));
        root.classList.toggle('jar-ios-wizard-field-focus', keyboardFocusInWizard);
        updateVisualHeight();
      }, 50);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        window.setTimeout(keepFocusedInputVisible, 90);
      });
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
