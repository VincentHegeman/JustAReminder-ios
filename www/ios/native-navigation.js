/* JustAReminder iOS — safe back navigation, local sections, and modal priority.
   This script is native-only: it leaves website and PWA routing unchanged. */
(function (w) {
  'use strict';
  const native = !!(w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function' && w.Capacitor.isNativePlatform());
  if (!native) return;
  let current = 'overview';
  let history = ['overview'];
  let navigatingBack = false;
  const privateDashboard = /\/prive\/dashboard\.html$/i.test(w.location.pathname);
  const familyDashboard = /\/family\/family-dashboard\.html$/i.test(w.location.pathname);
  const dashboard = privateDashboard || familyDashboard;

  function closeOpenLayer() {
    const chooser = document.getElementById('jar26Choose');
    if (chooser && !chooser.hidden) {
      if (typeof w.jar26CloseChoose === 'function') w.jar26CloseChoose();
      else chooser.hidden = true;
      return true;
    }
    const menu = document.getElementById('mobileMenu');
    if (menu?.classList.contains('show')) {
      if (typeof w.closeMobileMenu === 'function') w.closeMobileMenu();
      else menu.classList.remove('show');
      return true;
    }
    const modals = [
      ['jarPersonalBackdrop', 'jarClosePersonalization'],
      ['modalBackdrop', 'closeModal'],
      ['plansBackdrop', 'closePlansModal'],
      ['categoryBackdrop', 'closeCategoryModal'],
    ];
    for (const [id, handler] of modals) {
      const el = document.getElementById(id);
      if (el?.classList.contains('show')) {
        if (typeof w[handler] === 'function') w[handler]();
        else el.classList.remove('show');
        return true;
      }
    }
    return false;
  }

  function updateButton() {
    const back = document.getElementById('jar-ios-dashboard-back');
    if (!back) return;
    back.hidden = !(history.length > 1);
  }

  function navigate(which) {
    if (typeof w.jarProdNavigate !== 'function') return;
    w.jarProdNavigate(which);
  }

  function back() {
    if (closeOpenLayer()) return;
    if (privateDashboard && history.length > 1) {
      history.pop();
      current = history[history.length - 1];
      navigatingBack = true;
      try { navigate(current); } finally { navigatingBack = false; }
      updateButton();
      return;
    }
    if (dashboard) {
      // On root dashboard, back never signs out or jumps to the welcome/login screen.
      if (privateDashboard && current !== 'overview') {
        history = ['overview'];
        current = 'overview';
        navigate('overview');
        updateButton();
      } else if (familyDashboard && typeof w.closeMobileMenu === 'function') {
        w.closeMobileMenu();
      }
      return;
    }
    if (w.JAR_iOS_session?.back) w.JAR_iOS_session.back();
    else w.location.assign('../index.html?menu=1');
  }

  w.JAR_iOS_back = back;

  function setup() {
    if (privateDashboard && typeof w.jarProdNavigate === 'function') {
      const original = w.jarProdNavigate;
      w.jarProdNavigate = function(which) {
        const next = typeof which === 'string' ? which : 'overview';
        if (!navigatingBack && next !== current) {
          history.push(next);
          if (history.length > 20) history = history.slice(-20);
        }
        current = next;
        const result = original.apply(this, arguments);
        try { localStorage.setItem('jar_ios_private_tab_v1', current); } catch (_) {}
        updateButton();
        return result;
      };
    }
    if (dashboard) {
      const header = document.querySelector('.mobile-header');
      if (header && !document.getElementById('jar-ios-dashboard-back')) {
        const button = document.createElement('button');
        button.id = 'jar-ios-dashboard-back';
        button.type = 'button';
        button.className = 'jar-ios-back-button';
        button.textContent = '← Vorige';
        button.hidden = true;
        button.addEventListener('click', back);
        header.insertBefore(button, header.querySelector('.mobile-brand') || header.firstChild);
      }
      if (privateDashboard) {
        let last = null;
        try { last = localStorage.getItem('jar_ios_private_tab_v1'); } catch (_) {}
        if (['todo','calendar','tasks','more','today','upcoming','completed'].includes(last)) {
          setTimeout(function() { navigate(last); }, 0);
        }
      }
    }
    document.addEventListener('keydown', function(event){
      if (event.key === 'Escape') {
        if (closeOpenLayer()) event.preventDefault();
      }
    });
    updateButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once:true });
  else setup();
})(window);
