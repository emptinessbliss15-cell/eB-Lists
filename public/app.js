(() => {
  const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const status = document.getElementById('status'), app = document.getElementById('app'), auth = document.getElementById('auth');
  const email = document.getElementById('email'), password = document.getElementById('password'), tree = document.getElementById('tree'), items = document.getElementById('items');
  let user = null, activeList = null, activeApp = 'lists', listFilter = 'all';
  const setStatus = text => status.textContent = text || '';
  const apps = {
    lists: { name: 'Lists', nodes: [] },
    info: { name: 'Info', nodes: [{ id: 'about', name: 'About', url: 'https://ebliss-info.emptinessbliss15.workers.dev/' }] },
    support: { name: 'Supportable', nodes: [{ id: 'supportable', name: 'Supportable', url: 'https://supportable.emptinessbliss15.workers.dev/' }] }
  };

  function selectApp(name) {
    activeApp = name;
    document.getElementById('listsNav').setAttribute('aria-current', String(name === 'lists'));
    document.getElementById('infoNav').setAttribute('aria-current', String(name === 'info'));
    document.getElementById('supportableNav').setAttribute('aria-current', String(name === 'support'));
    if (name === 'lists') renderListTree(); else renderAppTree(name);
  }

  function renderAppTree(name) {
    tree.innerHTML = '';
    const root = document.createElement('div'); root.className = 'eb-tree-section'; root.textContent = apps[name].name; tree.append(root);
    apps[name].nodes.forEach(node => {
      const row = document.createElement('div'); row.className = 'eb-tree-row eb-tree-child';
      const button = document.createElement('button'); button.type='button'; button.className='eb-tree-node'; button.textContent='• ' + node.name;
      button.onclick=()=>openExternal(node.url,node.name); row.append(button); tree.append(row);
    });
  }

  function openExternal(url,title) {
    document.getElementById('listWorkspace').hidden=true;
    document.getElementById('appTitle').textContent=title;
    const frame=document.getElementById('contentFrame'); frame.src=url; frame.hidden=false;
  }

  function treeButton(label, onClick, active=false, child=false) {
    const row=document.createElement('div'); row.className='eb-tree-row' + (child?' eb-tree-child':'');
    const b=document.createElement('button'); b.type='button'; b.className='eb-tree-node'; b.textContent=(child?'• ':'')+label; b.setAttribute('aria-current',String(active)); b.onclick=onClick; row.append(b); return row;
  }

  async function renderListTree() {
    document.getElementById('contentFrame').hidden=true;
    document.getElementById('listWorkspace').hidden=false;
    document.getElementById('appTitle').textContent='Lists';
    const {data,error}=await supabase.from('lists').select('*').order('created_at'); if(error)return setStatus(error.message);
    tree.innerHTML='';
    tree.append(treeButton('Lists',()=>{listFilter='all';renderListTree();},listFilter==='all'));
    tree.append(treeButton('Ordered',()=>{listFilter='ordered';renderListTree();},listFilter==='ordered',true));
    tree.append(treeButton('Unordered',()=>{listFilter='unordered';renderListTree();},listFilter==='unordered',true));
    const filtered=data.filter(l=>listFilter==='all'||(listFilter==='ordered'?l.ordered:!l.ordered));
    filtered.forEach(list=>tree.append(treeButton(`${list.name} · ${list.ordered?'ordered':'unordered'}`,()=>openList(list),activeList?.id===list.id)));
  }

  function showActiveListName(){const title=document.getElementById('activeList');title.innerHTML='';const name=document.createElement('span');name.textContent=activeList.name;name.title='Click to rename';name.onclick=beginRename;title.appendChild(name);}
  function beginRename(){if(!activeList||document.getElementById('activeListEdit'))return;const title=document.getElementById('activeList');title.innerHTML='';const input=document.createElement('input');input.id='activeListEdit';input.value=activeList.name;title.appendChild(input);input.focus();input.select();input.addEventListener('keydown',e=>{if(e.key==='Enter')renameActiveList();if(e.key==='Escape')showActiveListName();});input.addEventListener('blur',renameActiveList);}
  async function renameActiveList(){if(!activeList)return;const input=document.getElementById('activeListEdit'),name=input.value.trim();if(!name)return;const r=await supabase.from('lists').update({name}).eq('id',activeList.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);activeList.name=name;showActiveListName();await renderListTree();}
  async function openList(list){activeApp='lists';activeList=list;document.getElementById('contentFrame').hidden=true;document.getElementById('listWorkspace').hidden=false;document.getElementById('appTitle').textContent='Lists';showActiveListName();document.getElementById('listMode').textContent=list.ordered?'Ordered':'Unordered';document.getElementById('listView').hidden=false;await renderListTree();await refreshItems();}

  async function refreshItems(){
    if(!activeList)return;const {data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at');if(error)return setStatus(error.message);items.innerHTML='';
    data.forEach(item=>{
      const li=document.createElement('li');li.className='eb-item-row';
      const main=document.createElement('div');main.className='eb-item-main';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='eb-item-icon secondary';toggle.title=item.completed?'Mark incomplete':'Mark complete';toggle.setAttribute('aria-label',toggle.title);toggle.textContent=item.completed?'✓':'○';
      const text=document.createElement('span');text.className=item.completed?'eb-item-text completed':'eb-item-text';text.textContent=item.text;
      toggle.onclick=async()=>{const r=await supabase.from('list_items').update({completed:!item.completed}).eq('id',item.id);if(r.error)setStatus(r.error.message);else refreshItems();};
      main.append(toggle,text);
      const actions=document.createElement('div');actions.className='eb-item-actions';
      const edit=document.createElement('button');edit.type='button';edit.className='eb-item-action secondary';edit.title='Edit item';edit.setAttribute('aria-label','Edit item');edit.textContent='✎';
      const del=document.createElement('button');del.type='button';del.className='eb-item-action secondary';del.title='Delete item';del.setAttribute('aria-label','Delete item');del.textContent='×';
      edit.onclick=()=>beginItemEdit(item,text);del.onclick=async()=>{if(!confirm('Delete this item?'))return;const r=await supabase.from('list_items').delete().eq('id',item.id);if(r.error)setStatus(r.error.message);else refreshItems();};
      actions.append(edit,del);li.append(main,actions);items.appendChild(li);
    });
  }
  function beginItemEdit(item,textEl){const input=document.createElement('input');input.value=item.text;input.className='eb-item-edit';textEl.replaceWith(input);input.focus();input.select();const save=async()=>{const text=input.value.trim();if(!text){refreshItems();return;}const r=await supabase.from('list_items').update({text}).eq('id',item.id);if(r.error)setStatus(r.error.message);await refreshItems();};input.addEventListener('keydown',e=>{if(e.key==='Enter')save();if(e.key==='Escape')refreshItems();});input.addEventListener('blur',save);}

  async function applySession(session){user=session?.user||null;auth.hidden=!!user;app.hidden=!user;document.getElementById('user').textContent=user?.email||'';if(user)await renderListTree();}
  document.getElementById('signIn').onclick=async()=>{const r=await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(r.error)return setStatus(r.error.message);await applySession(r.data.session);};
  document.getElementById('signUp').onclick=async()=>{const r=await supabase.auth.signUp({email:email.value.trim(),password:password.value});if(r.error)return setStatus(r.error.message);if(r.data.session)await applySession(r.data.session);else setStatus('Account created. Check your email if confirmation is required.');};
  document.getElementById('signOut').onclick=async()=>{await supabase.auth.signOut({scope:'local'});activeList=null;document.getElementById('listView').hidden=true;document.getElementById('contentFrame').hidden=true;await applySession(null);};
  document.getElementById('newList').onclick=async()=>{const input=document.getElementById('listName'),name=input.value.trim();if(!name)return;const ordered=document.getElementById('listOrdered').checked;const r=await supabase.from('lists').insert({name,owner_id:user.id,ordered});if(r.error)return setStatus(r.error.message);input.value='';document.getElementById('listOrdered').checked=false;await renderListTree();};
  document.getElementById('newItem').onclick=async()=>{const input=document.getElementById('item'),text=input.value.trim();if(!text||!activeList)return;const latest=await supabase.from('list_items').select('position').eq('list_id',activeList.id).order('position',{ascending:false}).limit(1);if(latest.error)return setStatus(latest.error.message);const position=(latest.data?.[0]?.position??-1)+1;const r=await supabase.from('list_items').insert({list_id:activeList.id,owner_id:user.id,text,position});if(r.error)return setStatus(r.error.message);input.value='';await refreshItems();};
  document.getElementById('infoNav').onclick=()=>selectApp('info');document.getElementById('listsNav').onclick=()=>selectApp('lists');document.getElementById('supportableNav').onclick=()=>selectApp('support');
  supabase.auth.onAuthStateChange((_e,s)=>applySession(s));supabase.auth.getSession().then(({data})=>applySession(data.session));
})();
