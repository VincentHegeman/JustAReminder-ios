/* JustAReminder: StoreKit 2, fail-closed payment flow.
 * The server alone grants entitlements. Sandbox and production are disabled
 * in www/app-config.js until verified end-to-end.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const translate = text => window.JAR_WORLD_LOCALE?.paywallText(String(text)) || String(text);
  const catalogue = window.JAR_APPLE_PRODUCTS;
  const native = !!window.Capacitor?.isNativePlatform?.();
  const plugin = native && (window.Capacitor.Plugins?.JARStoreKit || window.Capacitor.registerPlugin?.('JARStoreKit'));
  const environment = window.JAR_MOBILE_CONFIG?.iosPurchaseEnvironment === 'Sandbox' ? 'Sandbox' : 'Production';
  // Sandbox testing is explicitly isolated from the production-purchase release gate.
  const purchasesEnabled = !!native && (
    (environment === 'Sandbox' && window.JAR_MOBILE_CONFIG?.iosSandboxPurchasesReady === true) ||
    (environment === 'Production' && window.JAR_MOBILE_CONFIG?.iosPurchasesReady === true)
  );
  const prices = new Map();
  const ids = Object.values(catalogue || {}).flatMap(group => typeof group === 'object' && group ? Object.values(group) : []).filter(id => typeof id === 'string');
  let period = 'monthly';
  let busy = false;
  let client;
  const choiceButtons = [...document.querySelectorAll('[data-plan]')];
  function message(text) {
    const el = $('status');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function setBusy(value) {
    busy = value;
    render();
    if ($('restorePurchases')) $('restorePurchases').disabled = value;
  }
  function render() {
    $('monthly')?.setAttribute('aria-pressed', String(period === 'monthly'));
    $('yearly')?.setAttribute('aria-pressed', String(period === 'yearly'));
    for (const [element, tier, fallback] of [
      ['plus-price', 'private', period === 'monthly' ? '€ 4,99' : '€ 49,99'],
      ['premium-price', 'premium', period === 'monthly' ? '€ 9,99' : '€ 99,99'],
    ]) {
      const host = $(element);
      if (host) host.textContent = (prices.get(catalogue?.[tier]?.[period]) || fallback) + translate(period === 'monthly' ? ' / maand' : ' / jaar');
    }
    const bundle = $('bundle');
    if (bundle) for (const option of bundle.options) {
      const match = /^extra(50|100|150|200)\.monthly$/.exec(option.value);
      if (!match) continue;
      const price = prices.get('eu.justareminder.' + option.value);
      if (price) option.textContent = '+' + match[1] + ' herinneringen · ' + price + ' / maand';
    }
    for (const btn of choiceButtons) {
      btn.disabled = busy || !purchasesEnabled;
      btn.textContent = translate(purchasesEnabled ? 'Kies abonnement' : 'Nog niet beschikbaar');
    }
    const extra = $('bundleInfo');
    if (extra) {
      extra.disabled = busy || !purchasesEnabled;
      extra.textContent = translate(purchasesEnabled ? 'Kies uitbreiding' : 'Nog niet beschikbaar');
    }
  }
  function supabaseClient() {
    if (!window.supabase?.createClient) throw new Error('Loginbibliotheek niet beschikbaar');
    if (!client) client = window.supabase.createClient(
      'https://fqupzovqwzaqkatcfbka.supabase.co',
      'sb_publishable_ahp4b1jbybZmcQDDkkdNrg_IvbVXZsY',
      window.JAR_iOS_session?.authOptions() || {}
    );
    return client;
  }
  async function userAccount() {
    const { data, error } = await supabaseClient().auth.getUser();
    if (error || !data?.user?.id) throw new Error('Log eerst in met je JustAReminder-account');
    return data.user;
  }
  async function server(action, other = {}) {
    const {data, error} = await supabaseClient().functions.invoke('jar-apple-verify', {body:{action, ...other}});
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Server niet bereikbaar');
    return data;
  }
  async function showProducts() {
    if (!plugin) {
      message('StoreKit werkt alleen in de geïnstalleerde iPhone-app.');
      return;
    }
    try {
      const result = await plugin.getProducts({productIds: ids});
      for (const p of result?.products || []) if (p.id && p.displayPrice) prices.set(p.id, p.displayPrice);
      render();
      if (!prices.size) message('Apple heeft nog geen abonnementen teruggegeven. Controleer de App Store Connect-producten.');
    } catch (error) {
      message('Apple-producten konden niet worden geladen: ' + (error?.message || 'Onbekende fout'));
    }
  }
  async function verifyOnServer(transaction) {
    if (!transaction?.signedTransaction || !transaction?.transactionId) throw new Error('Apple-transactiegegevens ontbreken');
    const env = transaction.environment === 'Sandbox' ? 'Sandbox' : 'Production';
    const result = await server('verify', {environment:env,signedTransaction:transaction.signedTransaction});
    if (!result?.verified || !result?.recorded ||
      (env === 'Production' && result?.rightsReady !== true) ||
      (env === 'Sandbox' && result?.sandboxRecorded !== true)) {
      throw new Error('De aankoop is nog niet volledig bevestigd. De server heeft geen betaalde rechten vrijgegeven.');
    }
    // Only after confirmed server delivery. Swift itself never grants client-side rights.
    const finished = await plugin.finishAfterServerVerification({transactionId:String(transaction.transactionId)});
    if (finished?.finished === false) console.info('StoreKit transaction no longer unfinished');
    return result;
  }
  async function buy(productId) {
    if (busy || !purchasesEnabled || !plugin) {
      message('Apple-aankopen staan in deze versie nog uit.');
      return;
    }
    setBusy(true);
    try {
      const user = await userAccount();
      const preflight = await server('preflight',{environment,productId});
      if (!preflight?.ready || preflight?.accountId !== user.id || preflight?.environment !== environment) throw new Error('De betaalserver heeft deze aankoop niet vrijgegeven');
      const result = await plugin.purchase({productId,accountId:user.id});
      if (result?.status === 'pending') message('Apple verwerkt deze aankoop nog.');
      else if (result?.status === 'cancelled') message('De aankoop is geannuleerd.');
      else if (result?.status === 'verify_on_server') {
        await verifyOnServer(result);
        message(result.environment === 'Sandbox'
          ? 'Apple Sandbox-aankoop geverifieerd en geregistreerd. Er zijn geen echte betaalrechten aangepast.'
          : 'Je Apple-abonnement is geverifieerd. De server heeft je rechten bijgewerkt.');
      } else throw new Error('Onbekend antwoord van Apple');
    } catch (error) {
      message('Aankoop niet afgerond: ' + (error?.message || 'Onbekende fout'));
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (busy || !plugin) return;
    setBusy(true);
    try {
      await userAccount();
      const {transactions = []} = await plugin.restorePurchases();
      if (!transactions.length) return message('Apple heeft geen actieve abonnementen gevonden.');
      let succeeded = 0, rejected = 0;
      for (const tx of transactions) {
        try {await verifyOnServer(tx); succeeded++;}
        catch (err) {rejected++; console.warn('Apple restore:',err?.message || 'verification rejected');}
      }
      message(rejected
        ? succeeded + ' abonnement(en) hersteld, ' + rejected + ' niet bevestigd. Gebruik het oorspronkelijke JustAReminder-account of neem contact op met support.'
        : succeeded + ' abonnement(en) hersteld en door de server gecontroleerd.');
    } catch (error) {
      message('Aankopen herstellen mislukt: ' + (error?.message || 'Onbekende fout'));
    } finally {setBusy(false);}
  }
  $('monthly')?.addEventListener('click', () => {period='monthly';render();});
  $('yearly')?.addEventListener('click', () => {period='yearly';render();});
  $('free')?.addEventListener('click', () => location.assign('../prive/index.html'));
  for (const b of choiceButtons) b.addEventListener('click', () => {
    const tier = b.dataset.plan === 'plus' ? 'private' : 'premium';
    return buy(catalogue?.[tier]?.[period]);
  });
  $('bundleInfo')?.addEventListener('click', () => buy('eu.justareminder.' + $('bundle').value));
  $('restorePurchases')?.addEventListener('click', () => restore());
  render();
  if (plugin) void showProducts();
})();
