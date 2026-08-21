import { Tree } from './lib/Tree.js';
import { Grid } from './lib/Grid.js';

(() => {
  const supabase = window.eB.supabase;
  const status = document.getElementById('status'), app = document.getElementById('app'), auth = document.getElementById('auth');
  const email = document.getElementById('email'), password = document.getElementById('password'), tree = document.getElementById('tree'), items = document.getElementById('items');
  let user = null, activeList = null, activeApp = 'lists', listFilter = 'all', allLists = [];
  let treeInitialized = false;
  const setStatus = text => status.textContent = text || '';

  const apps = {
    lists: { name: 'Lists', nodes: [] },
    info: { name: 'Info', nodes: [{ id: 'about', name: 'About', url: 'https://ebliss-info.emptinessbliss15.workers.dev/' }] },
    support: { name: 'Supportable', nodes: [{ id: 'supportable', name: 'Supportable', url: 'https://supportable.emptinessbliss15.workers.dev/' }] }
  };

  const treeView = new Tree({
    container: tree,
    getId: node => node.id,
    getParentId: node => node.parent_list_id ?? null,
    renderNode: (node, context) => treeButton(node, context.depth, context)
  });
  window.eBListsTree = treeView;

  const gridContainer = document.createElement('div');
  gridContainer.id = 'listGrid';
  gridContainer.className = 'eb-grid-container';
  items.replaceWith(gridContainer);
  const grid = new Grid({
    container: gridContainer,
    columns: [
      { key: 'text', label: 'Item' },
      { key: 'completed', label: 'Done' }
    ],
    renderCell: (value, row, column) => {
      if (column.key === 'text') {
        const span = document.createElement('span');
        span.textContent = value || '';
        span.className = row.completed ? 'eb-item-text completed' : 'eb-item-text';
        return span;
      }
      return value ? '✓' : '';
    }
  });
  window.eBListsGrid = grid;

  function syncHeaderSession(session) {
    const current = session?.user || null;
    const headerUser = document.getElementById('user');
    const signInHeader = document.getElementById('signInHeader');
    const signOut = document.getElementById('signOut');
    const themeSelect = document.getElementById('themeSelect');
    if (headerUser) { headerUser.textContent = current?.email || ''; headerUser.hidden = !current; }
    if (signInHeader) signInHeader.hidden = !!current;
    if (signOut) signOut.hidden = !current;
    if (themeSelect) themeSelect.hidden = !current;
  }

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

  function treeButton(list, depth, context = {}) {
    const row=document.createElement('div'); row.className='eb-tree-row';
    const wrap=document.createElement('div'); wrap.className='eb-tree-entry'; wrap.style.paddingLeft=(depth*14)+'px';
    const handle=document.createElement('span'); handle.className='eb-tree-drag-handle'; handle.textContent='⠿'; handle.title='Drag to move'; handle.setAttribute('aria-label','Drag to move'); handle.dataset.listId=list.id; wrap.append(handle);
    if (context.hasChildren) {
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='eb-tree-action'; toggle.textContent=context.expanded?'▾':'▸'; toggle.title=context.expanded?'Collapse':'Expand'; toggle.setAttribute('aria-label',toggle.title); toggle.onclick=e=>{e.stopPropagation();context.toggle();}; wrap.append(toggle);
    } else {
      const spacer=document.createElement('span'); spacer.className='eb-tree-action'; spacer.textContent=' '; spacer.setAttribute('aria-hidden','true'); wrap.append(spacer);
    }
    const b=document.createElement('button'); b.type='button'; b.className='eb-tree-node'; b.textContent=(depth?'• ':'')+`${list.name} ${list.ordered?'☷':'☰'}`; b.title=list.ordered?'Ordered list — click to open':'Unordered list — click to open'; b.setAttribute('aria-current',String(activeList?.id===list.id)); b.onclick=()=>openList(list);
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
    allLists=data||[];
    if (!treeInitialized) {
      allLists.forEach(list => { if (allLists.some(child => child.parent_list_id === list.id)) treeView.expandedIds.add(list.id); });
      treeInitialized = true;
    }
    treeView.setData(allLists);
    window.dispatchEvent(new Event('eb:lists-rendered'));
  }

  function treeButtonRoot(label,onClick,active,child=false){const row=document.createElement('div'); row.className='eb-tree-row'+(child?' eb-tree-child':''); if(!onClick){const header=document.createElement('div'); header.className='eb-tree-section'; header.textContent=label; row.append(header); return row;} const b=document.createElement('button'); b.type='button'; b.className='eb-tree-node'; b.textContent=(child?'• ':'')+label; b.setAttribute('aria-current',String(active)); b.onclick=onClick; row.append(b); return row;}

  async function addSubList(parent){const name=prompt(`Name for a sub-list of “${parent.name}”:`); if(!name?.trim())return; const siblings=allLists.filter(l=>(l.parent_list_id||null)===(parent.id)); const r=await supabase.from('lists').insert({name:name.trim(),owner_id:user.id,ordered:false,parent_list_id:parent.id,position:siblings.length}); if(r.error)return setStatus(r.error.message); await renderListTree();}

  async function persistListOrder(orderedLists) {
    for (let index = 0; index < orderedLists.length; index++) {
      const list = orderedLists[index];
      const r = await supabase.from('lists').update({ position: index }).eq('id', list.id).eq('owner_id', user.id);
      if (r.error) { setStatus(r.error.message); return false; }
    }
    return true;
  }

  async function moveList(list,direction){const siblings=allLists.filter(l=>(l.parent_list_id||null)===(list.parent_list_id||null)).sort((a,b)=>a.position-b.position || String(a.id).localeCompare(String(b.id))); const index=siblings.findIndex(l=>l.id===list.id), target=index+direction; if(index<0||target<0||target>=siblings.length)return; const reordered=[...siblings]; const [moved]=reordered.splice(index,1); reordered.splice(target,0,moved); if(!await persistListOrder(reordered))return; await renderListTree();}

  async function moveListToTarget(list,target){if(!list||!target||list.id===target.id)return; const sameParent=(list.parent_list_id||null)===(target.parent_list_id||null); if(!sameParent){setStatus('Drag/drop currently moves within the same tree level.');return;} const siblings=allLists.filter(l=>(l.parent_list_id||null)===(list.parent_list_id||null)).sort((a,b)=>a.position-b.position || String(a.id).localeCompare(String(b.id))); const from=siblings.findIndex(l=>l.id===list.id), to=siblings.findIndex(l=>l.id===target.id); if(from<0||to<0)return; const reordered=[...siblings]; const [moved]=reordered.splice(from,1); reordered.splice(to,0,moved); if(!await persistListOrder(reordered))return; await renderListTree();}

  treeView.on('move', ({ node, target }) => moveListToTarget(node, target));

  async function deleteList(list){const hasChildren=allLists.some(l=>l.parent_list_id===list.id); const message=hasChildren?`Delete “${list.name}” and all of its sub-lists?`:`Delete “${list.name}”?`; if(!confirm(message))return; const r=await supabase.from('lists').delete().eq('id',list.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message); if(activeList?.id===list.id){activeList=null;document.getElementById('listView').hidden=true;document.getElementById('contentFrame').hidden=true;} await renderListTree();}
  function showActiveListName(){const title=document.getElementById('activeList');title.innerHTML='';const name=document.createElement('span');name.textContent=activeList.name;name.title='Click to rename';name.onclick=beginRename;title.appendChild(name);}
  function beginRename(){if(!activeList||document.getElementById('activeListEdit'))return;const title=document.getElementById('activeList');title.innerHTML='';const input=document.createElement('input');input.id='activeListEdit';input.value=activeList.name;title.appendChild(input);input.focus();input.select();input.addEventListener('keydown',e=>{if(e.key==='Enter')renameActiveList();if(e.key==='Escape')showActiveListName();});input.addEventListener('blur',renameActiveList);}
  async function renameActiveList(){if(!activeList)return;const input=document.getElementById('activeListEdit'),name=input.value.trim();if(!name)return;const r=await supabase.from('lists').update({name}).eq('id',activeList.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);activeList.name=name;showActiveListName();await renderListTree();}
  async function toggleListOrdered(){if(!activeList)return; const ordered=!activeList.ordered; const r=await supabase.from('lists').update({ordered}).eq('id',activeList.id).eq('owner_id',user.id); if(r.error)return setStatus(r.error.message); activeList.ordered=ordered; document.getElementById('listMode').textContent=ordered?'Ordered':'Unordered'; document.getElementById('listOrderToggle').textContent=ordered?'Ordered':'Unordered'; await renderListTree(); await refreshItems();}
  async function openList(list){activeApp='lists'; activeList={...list}; document.getElementById('contentFrame').hidden=true; document.getElementById('listWorkspace').hidden=false; document.getElementById('appTitle').textContent='Lists'; document.getElementById('listView').hidden=false; showActiveListName(); document.getElementById('listMode').textContent=list.ordered?'Ordered':'Unordered'; document.getElementById('listOrderToggle').textContent=list.ordered?'Ordered':'Unordered'; treeView.selectedId=list.id; await renderListTree(); await refreshItems();}

  async function moveItem(item,direction){const {data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at');if(error)return setStatus(error.message);const index=data.findIndex(x=>x.id===item.id),target=index+direction;if(index<0||target<0||target>=data.length)return;const other=data[target];let r=await supabase.from('list_items').update({position:other.position}).eq('id',item.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);r=await supabase.from('list_items').update({position:item.position}).eq('id',other.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);await refreshItems();}
  async function addChildItem(parent){const text=prompt(`Add child item to “${parent.text}”:`);if(!text?.trim())return;const siblings=await supabase.from('list_items').select('position').eq('list_id',activeList.id).eq('parent_id',parent.id).order('position',{ascending:false}).limit(1);if(siblings.error)return setStatus(siblings.error.message);const position=(siblings.data?.[0]?.position??-1)+1;const r=await supabase.from('list_items').insert({list_id:activeList.id,owner_id:user.id,text:text.trim(),position,parent_id:parent.id});if(r.error)return setStatus(r.error.message);await refreshItems();}
  async function refreshItems(){if(!activeList)return;const {data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at');if(error)return setStatus(error.message);const listData=data||[];grid.setRows(listData.map(item=>({...item,completed:!!item.completed})));}

  window.eBLists={refreshTree:renderListTree,refreshList:refreshItems};
  window.addEventListener('eb:refresh-tree',()=>renderListTree());
  window.addEventListener('eb:refresh-list',()=>refreshItems());
  window.addEventListener('eb:auth-user',e=>{user=e.detail?.user||null;if(user)renderListTree();});

  document.getElementById('listsNav').onclick=()=>selectApp('lists');
  document.getElementById('infoNav').onclick=()=>selectApp('info');
  document.getElementById('supportableNav').onclick=()=>selectApp('support');
  document.getElementById('listOrderToggle').onclick=toggleListOrdered;

  window.eBListsSyncHeaderSession=syncHeaderSession;
})();
