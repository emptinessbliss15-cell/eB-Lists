(() => {
  const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const status = document.getElementById('status'), app = document.getElementById('app'), auth = document.getElementById('auth');
  const email = document.getElementById('email'), password = document.getElementById('password'), tree = document.getElementById('tree'), items = document.getElementById('items');
  let user = null, activeList = null, activeApp = 'lists', listFilter = 'all', allLists = [];
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

  function actionButton(label, title, onClick) {
    const b=document.createElement('button'); b.type='button'; b.className='eb-tree-action'; b.textContent=label; b.title=title; b.setAttribute('aria-label',title);
    b.onclick=e=>{e.stopPropagation();onClick();}; return b;
  }

  function treeButton(list, depth) {
    const row=document.createElement('div'); row.className='eb-tree-row';
    const wrap=document.createElement('div'); wrap.className='eb-tree-entry'; wrap.style.paddingLeft=(depth*14)+'px';
    const b=document.createElement('button'); b.type='button'; b.className='eb-tree-node'; b.textContent=(depth?'• ':'')+`${list.name} · ${list.ordered?'ordered':'unordered'}`; b.setAttribute('aria-current',String(activeList?.id===list.id)); b.onclick=()=>openList(list);
    wrap.append(b);
    const actions=document.createElement('div'); actions.className='eb-tree-actions';
    actions.append(actionButton('+','Add sub-list',()=>addSubList(list)), actionButton('↑','Move up',()=>moveList(list,-1)), actionButton('↓','Move down',()=>moveList(list,1)), actionButton('×','Delete list',()=>deleteList(list)));
    wrap.append(actions); row.append(wrap); return row;
  }

  async function renderListTree() {
    document.getElementById('contentFrame').hidden=true;
    document.getElementById('listWorkspace').hidden=false;
    document.getElementById('appTitle').textContent='Lists';
    const {data,error}=await supabase.from('lists').select('*').order('position').order('created_at');
    if(error)return setStatus(error.message);
    allLists=data||[]; tree.innerHTML='';
    tree.append(treeButtonRoot('Lists',()=>{listFilter='all';renderListTree();},listFilter==='all'));
    tree.append(treeButtonRoot('Ordered',()=>{listFilter='ordered';renderListTree();},listFilter==='ordered',true));
    tree.append(treeButtonRoot('Unordered',()=>{listFilter='unordered';renderListTree();},listFilter==='unordered',true));
    const visible=allLists.filter(l=>listFilter==='all'||(listFilter==='ordered'?l.ordered:!l.ordered));
    const children=new Map(); visible.forEach(l=>{const key=l.parent_list_id||'root';if(!children.has(key))children.set(key,[]);children.get(key).push(l);});
    const walk=(parent,depth)=>{(children.get(parent)||[]).forEach(list=>{tree.append(treeButton(list,depth));walk(list.id,depth+1);});};
    walk('root',0);
  }

  function treeButtonRoot(label,onClick,active,child=false){
    const row=document.createElement('div'); row.className='eb-tree-row'+(child?' eb-tree-child':'');
    const b=document.createElement('button'); b.type='button'; b.className='eb-tree-node'; b.textContent=(child?'• ':'')+label; b.setAttribute('aria-current',String(active)); b.onclick=onClick; row.append(b); return row;
  }

  async function addSubList(parent){
    const name=prompt(`Name for a sub-list of “${parent.name}”:`); if(!name?.trim())return;
    const siblings=allLists.filter(l=>(l.parent_list_id||null)===(parent.id));
    const r=await supabase.from('lists').insert({name:name.trim(),owner_id:user.id,ordered:false,parent_list_id:parent.id,position:siblings.length});
    if(r.error)return setStatus(r.error.message); await renderListTree();
  }

  async function moveList(list,direction){
    const siblings=allLists.filter(l=>(l.parent_list_id||null)===(list.parent_list_id||null)).sort((a,b)=>a.position-b.position);
    const index=siblings.findIndex(l=>l.id===list.id), target=index+direction; if(index<0||target<0||target>=siblings.length)return;
    const other=siblings[target];
    let r=await supabase.from('lists').update({position:other.position}).eq('id',list.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message);
    r=await supabase.from('lists').update({position:list.position}).eq('id',other.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message);
    await renderListTree();
  }

  async function deleteList(list){
    const hasChildren=allLists.some(l=>l.parent_list_id===list.id);
    const message=hasChildren?`Delete “${list.name}” and all of its sub-lists?`:`Delete “${list.name}”?`;
    if(!confirm(message))return;
    const r=await supabase.from('lists').delete().eq('id',list.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message);
    if(activeList?.id===list.id){activeList=null;document.getElementById('listView').hidden=true;}
    await renderListTree();
  }

  function showActiveListName(){const title=document.getElementById('activeList');title.innerHTML='';const name=document.createElement('span');name.textContent=activeList.name;name.title='Click to rename';name.onclick=beginRename;title.appendChild(name);}
  function beginRename(){if(!activeList||document.getElementById('activeListEdit'))return;const title=document.getElementById('activeList');title.innerHTML='';const input=document.createElement('input');input.id='activeListEdit';input.value=activeList.name;title.appendChild(input);input.focus();input.select();input.addEventListener('keydown',e=>{if(e.key==='Enter')renameActiveList();if(e.key==='Escape')showActiveListName();});input.addEventListener('blur',renameActiveList);}
  async function renameActiveList(){if(!activeList)return;const input=document.getElementById('activeListEdit'),name=input.value.trim();if(!name)return;const r=await supabase.from('lists').update({name}).eq('id',activeList.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);activeList.name=name;showActiveListName();await renderListTree();}

  async function toggleListOrdered(){
    if(!activeList)return; const ordered=!activeList.ordered;
    const r=await supabase.from('lists').update({ordered}).eq('id',activeList.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message);
    activeList.ordered=ordered; document.getElementById('listMode').textContent=ordered?'Ordered':'Unordered'; document.getElementById('listOrderToggle').textContent=ordered?'Ordered':'Unordered';
    await renderListTree(); await refreshItems();
  }

  async function openList(list){activeApp='lists';activeList={...list};document.getElementById('contentFrame').hidden=true;document.getElementById('listWorkspace').hidden=false;document.getElementById('appTitle').textContent='Lists';showActiveListName();document.getElementById('listMode').textContent=list.ordered?'Ordered':'Unordered';document.getElementById('listOrderToggle').textContent=list.ordered?'Ordered':'Unordered';document.getElementById('listView').hidden=false;await renderListTree();await refreshItems();}

  async function moveItem(item,direction){
    const {data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at'); if(error)return setStatus(error.message);
    const index=data.findIndex(x=>x.id===item.id), target=index+direction; if(index<0||target<0||target>=data.length)return;
    const other=data[target]; let r=await supabase.from('list_items').update({position:other.position}).eq('id',item.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message);
    r=await supabase.from('list_items').update({position:item.position}).eq('id',other.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message);
    await refreshItems();
  }

  async function addChildItem(parent){
    const text=prompt(`Add child item to “${parent.text}”:`); if(!text?.trim())return;
    const siblings=await supabase.from('list_items').select('position').eq('list_id',activeList.id).eq('parent_id',parent.id).order('position',{ascending:false}).limit(1);
    if(siblings.error)return setStatus(siblings.error.message);
    const position=(siblings.data?.[0]?.position??-1)+1;
    const r=await supabase.from('list_items').insert({list_id:activeList.id,owner_id:user.id,text:text.trim(),position,parent_id:parent.id});
    if(r.error)return setStatus(r.error.message); await refreshItems();
  }

  async function refreshItems(){
    if(!activeList)return;const {data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at');if(error)return setStatus(error.message);items.innerHTML='';
    const roots=(data||[]).filter(item=>!item.parent_id);
    const children=new Map(); (data||[]).forEach(item=>{if(item.parent_id){if(!children.has(item.parent_id))children.set(item.parent_id,[]);children.get(item.parent_id).push(item);}});
    const renderItem=(item,depth=0)=>{
      const index=data.findIndex(x=>x.id===item.id);
      const li=document.createElement('li');li.className='eb-item-row';
      const main=document.createElement('div');main.className='eb-item-main';main.style.paddingLeft=(depth*20)+'px';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='eb-item-icon secondary';toggle.title=item.completed?'Mark incomplete':'Mark complete';toggle.setAttribute('aria-label',toggle.title);toggle.textContent=item.completed?'✓':'○';
      const text=document.createElement('span');text.className=item.completed?'eb-item-text completed':'eb-item-text';text.textContent=item.text;
      toggle.onclick=async()=>{const r=await supabase.from('list_items').update({completed:!item.completed}).eq('id',item.id);if(r.error)setStatus(r.error.message);else refreshItems();}; main.append(toggle,text);
      const actions=document.createElement('div');actions.className='eb-item-actions';
      const add=document.createElement('button');add.type='button';add.className='eb-item-action secondary';add.title='Add child item';add.setAttribute('aria-label','Add child item');add.textContent='+';add.onclick=()=>addChildItem(item);actions.append(add);
      if(activeList.ordered){
        const up=document.createElement('button');up.type='button';up.className='eb-item-action secondary';up.textContent='↑';up.title='Move up';up.disabled=index===0;up.onclick=()=>moveItem(item,-1);
        const down=document.createElement('button');down.type='button';down.className='eb-item-action secondary';down.textContent='↓';down.title='Move down';down.disabled=index===data.length-1;down.onclick=()=>moveItem(item,1); actions.append(up,down);
      }
      const edit=document.createElement('button');edit.type='button';edit.className='eb-item-action secondary';edit.title='Edit item';edit.setAttribute('aria-label','Edit item');edit.textContent='✎';
      const del=document.createElement('button');del.type='button';del.className='eb-item-action secondary';del.title='Delete item';del.setAttribute('aria-label','Delete item');del.textContent='×';
      edit.onclick=()=>beginItemEdit(item,text);del.onclick=async()=>{if(!confirm('Delete this item?'))return;const r=await supabase.from('list_items').delete().eq('id',item.id).eq('owner_id',user.id);if(r.error)setStatus(r.error.message);else refreshItems();};
      actions.append(edit,del);li.append(main,actions);items.appendChild(li);
      (children.get(item.id)||[]).sort((a,b)=>a.position-b.position).forEach(child=>renderItem(child,depth+1));
    };
    roots.sort((a,b)=>a.position-b.position).forEach(item=>renderItem(item));
  }

  function beginItemEdit(item,textEl){const input=document.createElement('input');input.value=item.text;input.className='eb-item-edit';textEl.replaceWith(input);input.focus();input.select();const save=async()=>{const text=input.value.trim();if(!text){refreshItems();return;}const r=await supabase.from('list_items').update({text}).eq('id',item.id).eq('owner_id',user.id);if(r.error)setStatus(r.error.message);await refreshItems();};input.addEventListener('keydown',e=>{if(e.key==='Enter')save();if(e.key==='Escape')refreshItems();});input.addEventListener('blur',save);}

  async function applySession(session){user=session?.user||null;auth.hidden=!!user;app.hidden=!user;document.getElementById('user').textContent=user?.email||'';if(user)await renderListTree();}
  document.getElementById('signIn').onclick=async()=>{const r=await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(r.error)return setStatus(r.error.message);await applySession(r.data.session);};
  document.getElementById('signUp').onclick=async()=>{const r=await supabase.auth.signUp({email:email.value.trim(),password:password.value});if(r.error)return setStatus(r.error.message);if(r.data.session)await applySession(r.data.session);else setStatus('Account created. Check your email if confirmation is required.');};
  document.getElementById('signOut').onclick=async()=>{await supabase.auth.signOut({scope:'local'});activeList=null;document.getElementById('listView').hidden=true;document.getElementById('contentFrame').hidden=true;await applySession(null);};
  document.getElementById('newList').onclick=async()=>{const input=document.getElementById('listName'),name=input.value.trim();if(!name)return;const ordered=document.getElementById('listOrdered').checked;const position=allLists.filter(l=>!l.parent_list_id).length;const r=await supabase.from('lists').insert({name,owner_id:user.id,ordered,parent_list_id:null,position});if(r.error)return setStatus(r.error.message);input.value='';document.getElementById('listOrdered').checked=false;await renderListTree();};
  document.getElementById('newItem').onclick=async()=>{const input=document.getElementById('item'),text=input.value.trim();if(!text||!activeList)return;const latest=await supabase.from('list_items').select('position').eq('list_id',activeList.id).is('parent_id',null).order('position',{ascending:false}).limit(1);if(latest.error)return setStatus(latest.error.message);const position=(latest.data?.[0]?.position??-1)+1;const r=await supabase.from('list_items').insert({list_id:activeList.id,owner_id:user.id,text,position,parent_id:null});if(r.error)return setStatus(r.error.message);input.value='';await refreshItems();};
  document.getElementById('listOrderToggle').onclick=toggleListOrdered;
  document.getElementById('infoNav').onclick=()=>selectApp('info');document.getElementById('listsNav').onclick=()=>selectApp('lists');document.getElementById('supportableNav').onclick=()=>selectApp('support');
  supabase.auth.onAuthStateChange((_e,s)=>applySession(s));supabase.auth.getSession().then(({data})=>applySession(data.session));
})();
