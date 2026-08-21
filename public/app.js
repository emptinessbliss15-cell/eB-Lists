import { Tree } from './lib/Tree.js';
import { Grid } from './lib/Grid.js';

(() => {
  const supabase = window.eB.supabase;
  const status = document.getElementById('status'), tree = document.getElementById('tree');
  let user = null, activeList = null, allLists = [];
  let treeInitialized = false;
  let realtimeChannel = null;
  let tabulatorGrid = null;
  let tabulatorLoading = null;
  const setStatus = text => status.textContent = text || '';

  const treeView = new Tree({ container: tree, getId: node => node.id, getParentId: node => node.parent_list_id ?? null, renderNode: (node, context) => treeButton(node, context.depth, context) });
  window.eBListsTree = treeView;

  const gridContainer = document.createElement('div');
  gridContainer.id = 'listGrid';
  gridContainer.className = 'eb-grid-container';
  document.getElementById('items').replaceWith(gridContainer);

  const itemType = {
    name: 'Item',
    fields: [
      { key: 'text', label: 'Item', render: (value, row) => {
        const input = document.createElement('input'); input.className = 'eb-grid-edit'; input.value = value || ''; input.setAttribute('aria-label', 'Item text'); input.addEventListener('click', e => e.stopPropagation()); input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); }); input.addEventListener('blur', () => { const next = input.value.trim(); if (next && next !== (row.text || '')) updateItemField(row, 'text', next); else input.value = row.text || ''; }); return input;
      }},
      { key: 'completed', label: 'Done', render: (value, row) => { const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!value; input.setAttribute('aria-label', 'Completed'); input.addEventListener('click', e => e.stopPropagation()); input.addEventListener('change', () => updateItemField(row, 'completed', input.checked)); return input; }},
      { key: 'actions', label: 'Actions', render: value => value }
    ]
  };

  const grid = new Grid({ container: gridContainer, type: itemType });
  window.eBListsGrid = grid;

  function actionButton(label,title,onClick){const b=document.createElement('button');b.type='button';b.className='eb-tree-action';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=e=>{e.stopPropagation();onClick();};return b;}
  function treeButton(list,depth,context={}){const row=document.createElement('div');row.className='eb-tree-row';const wrap=document.createElement('div');wrap.className='eb-tree-entry';wrap.style.paddingLeft=(depth*14)+'px';const handle=document.createElement('span');handle.className='eb-tree-drag-handle';handle.textContent='⠿';handle.title='Drag to move';handle.setAttribute('aria-label','Drag to move');handle.dataset.listId=list.id;wrap.append(handle);if(context.hasChildren){const toggle=document.createElement('button');toggle.type='button';toggle.className='eb-tree-action';toggle.textContent=context.expanded?'▾':'▸';toggle.title=context.expanded?'Collapse':'Expand';toggle.setAttribute('aria-label',toggle.title);toggle.onclick=e=>{e.stopPropagation();context.toggle();};wrap.append(toggle);}else{const spacer=document.createElement('span');spacer.className='eb-tree-action';spacer.textContent=' ';spacer.setAttribute('aria-hidden','true');wrap.append(spacer);}const b=document.createElement('button');b.type='button';b.className='eb-tree-node';b.textContent=(depth?'• ':'')+`${list.name} ${list.ordered?'☷':'☰'}`;b.setAttribute('aria-current',String(activeList?.id===list.id));b.onclick=()=>openList(list);wrap.append(b);const actions=document.createElement('div');actions.className='eb-tree-actions';actions.append(actionButton('+','Add sub-list',()=>addSubList(list)),actionButton('↑','Move up',()=>moveList(list,-1)),actionButton('↓','Move down',()=>moveList(list,1)),actionButton('×','Delete list',()=>deleteList(list)));wrap.append(actions);row.append(wrap);return row;}

  async function renderListTree(){document.getElementById('contentFrame').hidden=true;document.getElementById('listWorkspace').hidden=false;if(!user){setStatus('Sign in to load lists.');return;}setStatus('Refreshing lists…');const{data,error}=await supabase.from('lists').select('*').order('position').order('created_at');if(error){setStatus(error.message);return;}allLists=data||[];if(!treeInitialized){allLists.forEach(list=>{if(allLists.some(child=>child.parent_list_id===list.id))treeView.expandedIds.add(list.id);});treeInitialized=true;}treeView.setData(allLists);setStatus('');window.dispatchEvent(new Event('eb:lists-rendered'));}
  async function addSubList(parent){const name=prompt(`Name for a sub-list of “${parent.name}”: `);if(!name?.trim())return;const siblings=allLists.filter(l=>(l.parent_list_id||null)===parent.id);const r=await supabase.from('lists').insert({name:name.trim(),owner_id:user.id,ordered:false,parent_list_id:parent.id,position:siblings.length});if(r.error)return setStatus(r.error.message);await renderListTree();}
  async function persistListOrder(orderedLists){for(let index=0;index<orderedLists.length;index++){const r=await supabase.from('lists').update({position:index}).eq('id',orderedLists[index].id).eq('owner_id',user.id);if(r.error){setStatus(r.error.message);return false;}}return true;}
  async function moveList(list,direction){const siblings=allLists.filter(l=>(l.parent_list_id||null)===(list.parent_list_id||null)).sort((a,b)=>a.position-b.position||String(a.id).localeCompare(String(b.id)));const index=siblings.findIndex(l=>l.id===list.id),target=index+direction;if(index<0||target<0||target>=siblings.length)return;const reordered=[...siblings];const[moved]=reordered.splice(index,1);reordered.splice(target,0,moved);if(!await persistListOrder(reordered))return;await renderListTree();}
  async function moveListToTarget(list,target){if(!list||!target||list.id===target.id)return;const sameParent=(list.parent_list_id||null)===(target.parent_list_id||null);if(!sameParent)return setStatus('Drag/drop currently moves within the same tree level.');const siblings=allLists.filter(l=>(l.parent_list_id||null)===(list.parent_list_id||null)).sort((a,b)=>a.position-b.position||String(a.id).localeCompare(String(b.id)));const from=siblings.findIndex(l=>l.id===list.id),to=siblings.findIndex(l=>l.id===target.id);if(from<0||to<0)return;const reordered=[...siblings];const[moved]=reordered.splice(from,1);reordered.splice(to,0,moved);if(!await persistListOrder(reordered))return;await renderListTree();}
  treeView.on('move',({node,target})=>moveListToTarget(node,target));
  async function deleteList(list){const hasChildren=allLists.some(l=>l.parent_list_id===list.id);if(!confirm(hasChildren?`Delete “${list.name}” and all of its sub-lists?`:`Delete “${list.name}”?`))return;const r=await supabase.from('lists').delete().eq('id',list.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);if(activeList?.id===list.id){activeList=null;document.getElementById('listView').hidden=true;}await renderListTree();}
  function showActiveListName(){const title=document.getElementById('activeList');title.innerHTML='';const name=document.createElement('span');name.textContent=activeList.name;name.title='Click to rename';name.onclick=beginRename;title.appendChild(name);}
  function beginRename(){if(!activeList||document.getElementById('activeListEdit'))return;const title=document.getElementById('activeList');title.innerHTML='';const input=document.createElement('input');input.id='activeListEdit';input.value=activeList.name;title.appendChild(input);input.focus();input.select();input.addEventListener('keydown',e=>{if(e.key==='Enter')renameActiveList();if(e.key==='Escape')showActiveListName();});input.addEventListener('blur',renameActiveList);}
  async function renameActiveList(){if(!activeList)return;const input=document.getElementById('activeListEdit'),name=input.value.trim();if(!name)return;const r=await supabase.from('lists').update({name}).eq('id',activeList.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);activeList.name=name;showActiveListName();await renderListTree();}
  async function toggleListOrdered(){if(!activeList)return;const ordered=!activeList.ordered;const r=await supabase.from('lists').update({ordered}).eq('id',activeList.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);activeList.ordered=ordered;document.getElementById('listMode').textContent=ordered?'Ordered':'Unordered';document.getElementById('listOrderToggle').textContent=ordered?'Ordered':'Unordered';await renderListTree();await refreshItems();}
  async function openList(list){activeList={...list};document.getElementById('contentFrame').hidden=true;document.getElementById('listWorkspace').hidden=false;document.getElementById('appTitle').textContent='Lists';document.getElementById('listView').hidden=false;showActiveListName();document.getElementById('listMode').textContent=list.ordered?'Ordered':'Unordered';document.getElementById('listOrderToggle').textContent=list.ordered?'Ordered':'Unordered';treeView.selectedId=list.id;await renderListTree();await refreshItems();await subscribeToActiveList();}
  async function moveItem(item,direction){const{data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at');if(error)return setStatus(error.message);const index=data.findIndex(x=>x.id===item.id),target=index+direction;if(index<0||target<0||target>=data.length)return;const other=data[target];let r=await supabase.from('list_items').update({position:other.position}).eq('id',item.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);r=await supabase.from('list_items').update({position:item.position}).eq('id',other.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);await refreshItems();}
  async function addChildItem(parent){const text=prompt(`Add child item to “${parent.text}”: `);if(!text?.trim())return;const siblings=await supabase.from('list_items').select('position').eq('list_id',activeList.id).eq('parent_id',parent.id).order('position',{ascending:false}).limit(1);if(siblings.error)return setStatus(siblings.error.message);const position=(siblings.data?.[0]?.position??-1)+1;const r=await supabase.from('list_items').insert({list_id:activeList.id,owner_id:user.id,text:text.trim(),position,parent_id:parent.id});if(r.error)return setStatus(r.error.message);await refreshItems();}
  async function toggleItem(item){await updateItemField(item,'completed',!item.completed);}
  async function updateItemField(item,field,value){const r=await supabase.from('list_items').update({[field]:value}).eq('id',item.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);}
  async function deleteItem(item){if(!confirm(`Delete “${item.text}”?`))return;const r=await supabase.from('list_items').delete().eq('id',item.id).eq('owner_id',user.id);if(r.error)return setStatus(r.error.message);await refreshItems();}
  async function renameItem(item){const text=prompt('Edit item text:',item.text);if(text===null||!text.trim())return;await updateItemField(item,'text',text.trim());}
  function itemActions(item){const wrap=document.createElement('div');wrap.className='eb-grid-actions';wrap.append(actionButton('+','Add child item',()=>addChildItem(item)),actionButton('↑','Move up',()=>moveItem(item,-1)),actionButton('↓','Move down',()=>moveItem(item,1)),actionButton('×','Delete item',()=>deleteItem(item)));return wrap;}

  function ensureTabulator(){
    if(window.Tabulator)return Promise.resolve(window.Tabulator);
    if(tabulatorLoading)return tabulatorLoading;
    tabulatorLoading=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-eb-tabulator]');
      if(existing){existing.addEventListener('load',()=>resolve(window.Tabulator));existing.addEventListener('error',reject);return;}
      const script=document.createElement('script');script.src='https://unpkg.com/tabulator-tables@6.3.1/dist/js/tabulator.min.js';script.async=true;script.dataset.ebTabulator='true';script.onload=()=>window.Tabulator?resolve(window.Tabulator):reject(new Error('Tabulator loaded without global'));script.onerror=()=>reject(new Error('Unable to load Tabulator from CDN'));document.head.appendChild(script);
    });
    return tabulatorLoading;
  }

  async function renderTabulator(rows){
    const host=document.getElementById('tabulatorGrid'),experiment=document.getElementById('tabulatorExperiment');
    if(!host||!experiment)return;
    experiment.hidden=false;
    host.innerHTML='';
    host.style.minHeight='180px';
    try{
      const Tabulator=await ensureTabulator();
      if(!tabulatorGrid){
        tabulatorGrid=new Tabulator(host,{layout:'fitColumns',height:'220px',resizableColumnFit:true,resizableColumnGuide:true,movableColumns:true,columnDefaults:{resizable:true},columns:[{title:'Item',field:'text',width:300,minWidth:140},{title:'Done',field:'completed',width:80,minWidth:70,hozAlign:'center',formatter:'tickCross'},{title:'Actions',field:'actionsText',width:120,minWidth:100}],data:rows.map(row=>({...row,actionsText:'+  ↑  ↓  ×'}))});
      }else{
        tabulatorGrid.setData(rows.map(row=>({...row,actionsText:'+  ↑  ↓  ×'})));
      }
    }catch(error){
      host.textContent=`Tabulator experiment unavailable: ${error.message}`;
      host.title='The experimental grid is optional; the production grid above is unaffected.';
    }
  }

  async function refreshItems(){if(!activeList){setStatus('Select a list to refresh its grid.');return;}const{data,error}=await supabase.from('list_items').select('*').eq('list_id',activeList.id).order('position').order('created_at');if(error){setStatus(error.message);return;}const rows=data||[];grid.setRows(rows.map(item=>({...item,completed:!!item.completed,actions:itemActions(item)})));renderTabulator(rows);setStatus('');}

  async function subscribeToActiveList(){
    if (realtimeChannel) { await supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
    if (!activeList) return;
    realtimeChannel = supabase.channel(`eb-lists-items-${activeList.id}`).on('postgres_changes',{event:'*',schema:'public',table:'list_items',filter:`list_id=eq.${activeList.id}`},payload=>{if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') refreshItems();}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'lists',filter:`id=eq.${activeList.id}`},payload=>{if (payload.new) { activeList = {...activeList,...payload.new}; showActiveListName(); document.getElementById('listMode').textContent=activeList.ordered?'Ordered':'Unordered'; document.getElementById('listOrderToggle').textContent=activeList.ordered?'Ordered':'Unordered'; renderListTree(); }}).subscribe((state, error) => {if (state === 'SUBSCRIBED') setStatus(''); else if (state === 'CHANNEL_ERROR' || error) setStatus('Realtime unavailable; refresh to see remote changes.');});
  }

  window.eBLists={refreshTree:renderListTree,refreshList:refreshItems};
  document.getElementById('treeRefresh')?.addEventListener('click',e=>{e.preventDefault();renderListTree();});
  document.getElementById('listRefresh')?.addEventListener('click',e=>{e.preventDefault();refreshItems();});
  window.addEventListener('eb:refresh-tree',()=>renderListTree());
  window.addEventListener('eb:refresh-list',()=>refreshItems());
  function setAuthenticatedUser(nextUser){user=nextUser||null;treeInitialized=false;if(realtimeChannel){supabase.removeChannel(realtimeChannel);realtimeChannel=null;}if(user){renderListTree();}else{allLists=[];activeList=null;treeInitialized=false;treeView.setData([]);}}
  window.addEventListener('eb-auth-session',e=>setAuthenticatedUser(e.detail?.user||null));
  supabase.auth.getSession().then(({data,error})=>{if(error)return setStatus(error.message);setAuthenticatedUser(data?.session?.user||null);});
})();
