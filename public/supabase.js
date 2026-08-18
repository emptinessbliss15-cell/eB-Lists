(() => {
  const url = 'https://zaabghrczrbqkxrhkinj.supabase.co';
  const key = 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';

  if (window.supabase?.createClient && !window.eB?.supabase) {
    window.eB = window.eB || {};
    window.eB.supabase = window.supabase.createClient(url, key);
  }
})();
