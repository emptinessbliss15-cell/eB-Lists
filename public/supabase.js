(() => {
  const url = 'https://zaabghrczrbqkxrhkinj.supabase.co';
  const key = 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';

  window.eB = window.eB || {};
  if (!window.eB.supabase) {
    window.eB.supabase = window.supabase.createClient(url, key);
  }
})();
