(function () {
  'use strict';
  let duration = 'monthly';
  const status = document.getElementById('status');
  const catalogue = window.JAR_APPLE_PRODUCTS;
  const show = message => { status.textContent = message; status.classList.add('show'); status.scrollIntoView({behavior:'smooth',block:'nearest'}); };
  function render() {
    document.getElementById('monthly').setAttribute('aria-pressed',String(duration==='monthly'));
    document.getElementById('yearly').setAttribute('aria-pressed',String(duration==='yearly'));
    document.getElementById('plus-price').innerHTML = duration==='monthly'?'€ 4,99 <span>/ maand</span>':'€ 49,99 <span>/ jaar</span>';
    document.getElementById('premium-price').innerHTML = duration==='monthly'?'€ 9,99 <span>/ maand</span>':'€ 99,99 <span>/ jaar</span>';
  }
  document.getElementById('monthly').addEventListener('click', () => {duration='monthly';render();});
  document.getElementById('yearly').addEventListener('click', () => {duration='yearly';render();});
  document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => {
    const plan=button.getAttribute('data-plan'); const section=plan==='plus'?'private':'premium';
    show('Apple-product: '+catalogue[section][duration]+' — Nog geen aankoop mogelijk. Hiervoor moeten StoreKit 2 en de beveiligde Supabase-verificatie werken. Er is niets afgeschreven.');
  }));
  document.getElementById('bundleInfo').addEventListener('click', () => {
    show('Apple-product: eu.justareminder.'+document.getElementById('bundle').value+' — Testversie. Geen aankoop gestart en geen rechten gewijzigd.');
  });
  document.getElementById('free').addEventListener('click', () => {window.location.href='../prive/index.html';});
  render();
})();
