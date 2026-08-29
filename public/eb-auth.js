(() => {
  if (window.eBAuth?.supabase) return;
  const supabase = window.supabase.createClient(
    'https://zaabghrczrbqkxrhkinj.supabase.co',
    'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF'
  );
  window.eBAuth = {
    supabase,
    getUser: async () => (await supabase.auth.getUser()).data?.user || null
  };
})();
