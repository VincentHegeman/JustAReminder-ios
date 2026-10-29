/* JustAReminder — iOS TestFlight verbeteringen v1.1.
 * Alleen actief in de echte Capacitor-app. Laat website/PWA ongemoeid.
 * Biedt NOOIT betalings- of pushrechten zonder servervalidatie.
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
    // Alleen een EERLIJKE status tonen: browserpush ondersteunt deze wrapper niet.
    ['jarHomePushState', 'jarPushStatusText', 'notificationState'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && (/Open als app|Webpush|browser/i.test(el.textContent || '') || !(el.textContent || '').trim())) {
        el.textContent = 'iPhone-meldingen nog niet beschikbaar in deze testversie';
      }
    });
  }
  function taskCopy() {
    var selector = document.getElementById('reminderType');
    var modal = document.getElementById('modalBackdrop');
    if (!selector || !modal || !modal.classList.contains('show')) return;
    var task = selector.value === 'task';
    var title = document.getElementById('modalTitle');
    if (title && !/bewerken|wijzigen/i.test(title.textContent)) {
      title.textContent = task ? 'Nieuwe taak' : 'Nieuwe herinnering';
    }
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
      node.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
    }
  }
  function setup() {
    installedAppUI(); nativeStatus(); taskCopy();
    document.querySelectorAll('[onclick*="requestNotificationPermission"]').forEach(function(button){
      button.disabled = true; button.title = 'iPhone-meldingen worden pas ingeschakeld wanneer APNs en de server zijn gekoppeld';
      button.textContent = 'Nog niet beschikbaar';
    });
    document.addEventListener('change', function(e) { if (e.target && e.target.id === 'reminderType') taskCopy(); });
    document.addEventListener('click', function() { window.setTimeout(taskCopy, 0); }, true);
    // Keyboard plugin is optional in older builds; no hard failure.
    var keyboard = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Keyboard;
    if (keyboard && typeof keyboard.setAccessoryBarVisible === 'function') {
      Promise.resolve(keyboard.setAccessoryBarVisible({isVisible:false})).catch(function(){});
    }
    window.addEventListener('focusin', function(e) {
      if (e.target && e.target.matches && e.target.matches('input,textarea,select')) {
        window.setTimeout(keepFocusedInputVisible, 240);
      }
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function() {window.setTimeout(keepFocusedInputVisible, 90);});
    }
    // MutationObserver for async-rendered task panels and status.
    var pending=false;
    new MutationObserver(function() {
      if (pending) return;
      pending=true;
      requestAnimationFrame(function(){pending=false;installedAppUI(); taskCopy();});
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
