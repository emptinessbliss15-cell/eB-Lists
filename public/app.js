(() => {
  const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const status = document.getElementById('status'), app = document.getElementById('app'), auth = document.getElementById('auth');
  const email = document.getElementById('email'), password = document.getElementById('password'), tree = document.getElementById('tree'), items = document.getElementById('items');
  let user = null, activeList = null;
  const setStatus = text => status.textContent = text || '';

  async function refreshLists() {
    const { data, error } = await supabase.from('lists').select('*').order('created_at');
    if (error) return setStatus(error.message);
    tree.innerHTML = '';
    data.forEach(list => {
      const node = document.createElement('button'); node.type='button'; node.className='eb-tree-node';
      node.textContent = `${list.name} ${list.ordered ? '· ordered' : '· unordered'}`;
      node.setAttribute('aria-current', activeList?.id === list.id ? 'true' : 'false'); node.onclick=()=>openList(list); tree.appendChild(node);
    });
  }
  async function renameActiveList() {
    if (!activeList) return;
    const input=document.getElementById('activeListEdit'), name=input.value.trim(); if(!name)return;
    const result=await supabase.from('lists').update({name}).eq('id',activeList.id).eq('owner_id',user.id); if(result.error)return setStatus(result.error.message);
    activeList.name=name; showActiveListName(); await refreshLists();
  }
  function showActiveListName(){ const title=document.getElementById('activeList'); title.innerHTML=''; const name=document.createElement('span'); name.textContent=activeList.name; name.title='Click to rename'; name.onclick=beginRename; title.appendChild(name); }
  function beginRename(){
    if(!activeList||document.getElementById('activeListEdit'))return; const title=document.getElementById('activeList'); title.innerHTML=''; const input=document.createElement('input'); input.id='activeListEdit'; input.value=activeList.name; title.appendChild(input); input.focus(); input.select();
    input.addEventListener('keydown',e=>{if(e.key==='Enter')renameActiveList();if(e.key==='Escape')showActiveListName();}); input.addEventListener('blur',renameActiveList);
  }
  async function openList(list){ activeList=list; showActiveListName(); document.getElementById('listMode').textContent=list.ordered?'Ordered':'Unordered'; document.getElementById('listView').hidden=false; await refreshLists(); await refreshItems(); }
  async function refreshItems(){
    if(!activeList)return; const {data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at'); if(error)return setStatus(error.message); items.innerHTML='';
    data.forEach(item=>{
      const li=document.createElement('li'); li.className='eb-item-row';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='eb-item-toggle'; toggle.title=item.completed?'Mark incomplete':'Mark complete'; toggle.setAttribute('aria-label',toggle.title); toggle.textContent=item.completed?'✓':'○';
      const text=document.createElement('span'); text.className=item.completed?'eb-item-text completed':'eb-item-text'; text.textContent=item.text;
      toggle.onclick=async()=>{const r=await supabase.from('list_items').update({completed:!item.completed}).eq('id',item.id);if(r.error)setStatus(r.error.message);else refreshItems();};
      li.append(toggle,text); items.appendChild(li);
    });
  }
  function showSurface(name){
    document.getElementById('auth').hidden=true; app.hidden=false; document.getElementById('listView').hidden=name!=='lists';
    if(name==='info'){document.getElementById('activeList').textContent='Info';document.getElementById('listMode').textContent='eB Lists';items.innerHTML='<li class="eb-info">Shared ordered and unordered lists.</li>';}
    if(name==='support'){document.getElementById('activeList').textContent='Supportable';document.getElementById('listMode').textContent='Support';items.innerHTML='<li class="eb-info">Remote assistance and support interface.</li>';}
  }
  async function applySession(session){ user=session?.user||null; auth.hidden=!!user; app.hidden=!user; document.getElementById('user').textContent=user?.email||''; if(user)await refreshLists(); }
  document.getElementById('signIn').onclick=async()=>{const r=await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(r.error)return setStatus(r.error.message);await applySession(r.data.session);};
  document.getElementById('signUp').onclick=async()=>{const r=await supabase.auth.signUp({email:email.value.trim(),password:password.value});if(r.error)return setStatus(r.error.message);if(r.data.session)await applySession(r.data.session);else setStatus('Account created. Check your email if confirmation is required.');};
  document.getElementById('signOut').onclick=async()=>{await supabase.auth.signOut({scope:'local'});activeList=null;document.getElementById('listView').hidden=true;await applySession(null);};
  document.getElementById('newList').onclick=async()=>{const input=document.getElementById('listName'),name=input.value.trim();if(!name)return;const ordered=document.getElementById('listOrdered').checked;const r=await supabase.from('lists').insert({name,owner_id:user.id,ordered});if(r.error)return setStatus(r.error.message);input.value='';document.getElementById('listOrdered').checked=false;await refreshLists();};
  document.getElementById('newItem').onclick=async()=>{const input=document.getElementById('item'),text=input.value.trim();if(!text||!activeList)return;const latest=await supabase.from('list_items').select('position').eq('list_id',activeList.id).order('position',{ascending:false}).limit(1);if(latest.error)return setStatus(latest.error.message);const position=(latest.data?.[0]?.position??-1)+1;const r=await supabase.from('list_items').insert({list_id:activeList.id,owner_id:user.id,text,position});if(r.error)return setStatus(r.error.message);input.value='';await refreshItems();};
  document.getElementById('infoNav').onclick=()=>showSurface('info'); document.getElementById('listsNav').onclick=()=>{if(activeList)openList(activeList);else showSurface('lists');}; document.getElementById('supportableNav').onclick=()=>showSurface('support');
  supabase.auth.onAuthStateChange((_e,s)=>applySession(s)); supabase.auth.getSession().then(({data})=>applySession(data.session));
})();
