/* JustAReminder - APNs for the native Capacitor iOS app.
 * No effect on browser, PWA, Android, customers, or billing.
 * Requires @capacitor/push-notifications and the Supabase jar-apns-* functions.
 */
(function (w) {
  'use strict';
  const cap = w.Capacitor;
  if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== 'ios') return;

  const supabaseURL = 'https://fqupzovqwzaqkatcfbka.supabase.co';
  const publishableKey = 'sb_publishable_ahp4b1jbybZmcQDDkkdNrg_IvbVXZsY';
  const tokenKey = 'jar_native_apns_token_v2';
  const enabledKey = 'jar_native_apns_optin_v2';
  const push = cap.Plugins?.PushNotifications ||
    (cap.isPluginAvailable?.('PushNotifications') && cap.registerPlugin?.('PushNotifications'));
  let client;
  let currentToken = null;
  let listenerSetup = false;
  let activating = false;
  try { currentToken = w.localStorage.getItem(tokenKey); } catch (_) {}

  function notice(message) {
    const p = document.getElementById('jar-apns-status');
    if (p) p.textContent = message;
  }
  function sb() {
    if (!client) {
      if (!w.supabase?.createClient) throw Error('Supabase is nog niet beschikbaar.');
      client = w.supabase.createClient(supabaseURL, publishableKey, w.JAR_iOS_session?.authOptions?.() || {});
    }
    return client;
  }
  async function getAuthenticatedSession() {
    const supabase = sb();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) throw Error('Log eerst in bij JustAReminder.');
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.id !== session.user?.id) throw Error('Je sessie is verlopen. Log opnieuw in.');
    return session;
  }
  async function invoke(name, body) {
    const session = await getAuthenticatedSession();
    const response = await fetch(supabaseURL + '/functions/v1/' + name, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': publishableKey
      },
      body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(result.error || 'Serverfout (' + response.status + ').');
    return result;
  }
  async function registerOnServer(token) {
    // Distribution and TestFlight builds use Apple's production APNs environment.
    // A development/simulator build must explicitly override this when testing sandbox.
    const environment = w.JAR_APNS_ENV === 'sandbox' ? 'sandbox' : 'production';
    await invoke('jar-apns-register', { action: 'register', token, environment });
    currentToken = token;
    try {
      w.localStorage.setItem(tokenKey, token);
      w.localStorage.setItem(enabledKey, 'yes');
    } catch (_) {}
    notice('iPhone-meldingen zijn ingeschakeld. Je kunt nu een testmelding versturen.');
  }
  async function installListeners() {
    if (listenerSetup) return;
    if (!push) throw Error('Deze TestFlight-versie bevat de native pushplugin nog niet. Installeer de nieuwe build.');
    await push.addListener('registration', async (token) => {
      try {
        if (!/^[0-9a-f]{32,256}$/i.test(token?.value || '')) throw Error('Apple gaf geen geldig apparaat-token terug.');
        await registerOnServer(token.value.toLowerCase());
      } catch (error) {
        notice('iPhone registreren mislukt: ' + (error.message || 'onbekend'));
      }
    });
    await push.addListener('registrationError', (error) => {
      notice('Apple-pushregistratie mislukt: ' + (error?.error || 'Controleer de Push Notifications-capability en provisioning.'));
    });
    await push.addListener('pushNotificationActionPerformed', () => {
      const destination = w.JAR_iOS_session?.resumeUrl?.() || 'prive/dashboard.html';
      w.location.assign('/' + destination.replace(/^\//, ''));
    });
    listenerSetup = true;
  }
  async function enable(options = {}) {
    if (activating) return;
    activating = true;
    try {
      await getAuthenticatedSession();
      await installListeners();
      const permissions = options.silent ? await push.checkPermissions() : await push.requestPermissions();
      if (permissions.receive !== 'granted') {
        notice(permissions.receive === 'denied'
          ? 'Meldingen zijn geblokkeerd. Sta ze toe bij iPhone Instellingen > Meldingen > JustAReminder.'
          : 'Geef toestemming om iPhone-meldingen te ontvangen.');
        return;
      }
      notice('Je iPhone wordt bij Apple geregistreerd…');
      await push.register();
    } catch (error) {
      notice(error.message || 'Kon iPhone-meldingen niet activeren.');
    } finally {
      activating = false;
    }
  }
  async function disable() {
    if (!currentToken) {
      try { w.localStorage.removeItem(enabledKey); } catch (_) {}
      notice('Er is geen geregistreerde iPhone op dit apparaat.');
      return;
    }
    await invoke('jar-apns-register', {action: 'remove', token: currentToken});
    currentToken = null;
    try {
      w.localStorage.removeItem(tokenKey);
      w.localStorage.removeItem(enabledKey);
    } catch (_) {}
    notice('iPhone-meldingen uitgeschakeld voor dit account.');
  }
  async function test() {
    try {
      notice('Testmelding verzenden…');
      if (!currentToken) throw Error('Schakel eerst iPhone-meldingen in.');
      const reply = await invoke('jar-apns-test', {token: currentToken});
      notice(reply.sent ? 'Testmelding naar Apple verzonden. Controleer je iPhone.' : (reply.message || 'Testmelding niet afgeleverd.'));
    } catch (error) {
      notice('Testmelding mislukt: ' + (error.message || 'onbekend'));
    }
  }
  function control(text, action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await action(); } catch (e) { notice(e.message || 'Actie mislukt.'); }
      finally { b.disabled = false; }
    });
    b.style.cssText = 'min-height:44px;border:1px solid #b6d1c4;border-radius:12px;background:#e9f4ed;color:#265448;font:700 13px system-ui;padding:10px 12px;cursor:pointer;';
    return b;
  }
  function setup() {
    // Use a permanently visible position on the dashboard; don't place controls
    // inside a hidden route, menu or a modal that users cannot reach.
    // Native APNs belongs under 'Meer > Instellingen', not above the dashboard.
    // Both Privé and Family expose a dedicated More grid. Keep a safe fallback.
    const more = document.querySelector('#jarProdMorePage .jar-prod-more-grid, #jarFamilyMorePage .jar-prod-more-grid');
    const area = more || document.querySelector('.content') || document.querySelector('.main');
    if (!area || document.getElementById('jar-native-push-controls')) return;
    const section = document.createElement('section');
    section.id = 'jar-native-push-controls';
    section.setAttribute('aria-label', 'iPhone-meldingen');
    section.style.cssText = 'box-sizing:border-box;width:100%;margin:0 0 14px;padding:13px;border:1px solid #dbe9df;border-radius:16px;background:#f4faf6;color:#31574f;';
    const heading = document.createElement('strong');
    heading.textContent = 'iPhone-meldingen';
    heading.style.cssText = 'display:block;margin-bottom:8px;font:750 15px system-ui;';
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    if (push) {
      buttons.append(
        control('Meldingen inschakelen', () => enable()),
        control('Testmelding sturen', test),
        control('Meldingen uitzetten', disable)
      );
    }
    const state = document.createElement('p');
    state.id = 'jar-apns-status';
    state.setAttribute('role', 'status');
    state.style.cssText = 'font:13px/1.45 system-ui;color:#4d6c63;margin:8px 0 0;';
    state.textContent = push ? 'Schakel meldingen in om herinneringen op je iPhone te ontvangen.' :
      'Native pushplugin ontbreekt. Deze app moet opnieuw via TestFlight worden geïnstalleerd.';
    section.append(heading, buttons, state);
    if (more) more.appendChild(section);
    else area.insertBefore(section, area.firstChild);
    let optedIn = false;
    try { optedIn = w.localStorage.getItem(enabledKey) === 'yes'; } catch (_) {}
    if (optedIn && push) setTimeout(() => enable({silent: true}), 800);
  }
  // On explicit logout, remove the token from the old account BEFORE its session
  // is invalidated so the previous account won't receive reminders on this device.
  function prepareLogout() {
    document.addEventListener('click', async function (event) {
      const button = event.target?.closest?.('[onclick*="logout()"]');
      if (!button || !currentToken || typeof w.logout !== 'function') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try { await disable(); } catch (_) { /* still log out */ }
      w.logout();
    }, true);
  }
  w.JARNativePush = { enable, disable, test };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setup(); prepareLogout(); }, {once:true});
  else { setup(); prepareLogout(); }
})(window);
