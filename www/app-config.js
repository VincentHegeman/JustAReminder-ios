/* JustAReminder testconfig. Geen geheimen in de app opnemen. */
window.JAR_MOBILE_CONFIG = Object.freeze({
  canonicalSiteUrl: 'https://www.justareminder.eu/',
  // De exacte openbare Family-invitelink is nog niet geverifieerd.
  // Gebruik geen localhost-links in uitnodigingen.
  familyPublicBaseUrl: '',
  iosPurchasesReady: false, // Productieaankopen blijven uit tot expliciete release.
  iosSandboxPurchasesReady: true, // Uitsluitend Sandbox binnen native TestFlight.
  iosPurchaseEnvironment: 'Sandbox',
});
