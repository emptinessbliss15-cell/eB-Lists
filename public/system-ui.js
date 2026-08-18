(() => {
  const db=window.eB?.supabase;if(!db)throw new Error('Shared Supabase client is not available');
  const tree=document.getElementById('tree');if(!tree)return;
  const style=document.createElement('style');style.textContent=`...`;document.head.appendChild(style);
  // existing system UI behavior continues here
})();
