const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co','sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
const listsEl = document.getElementById('lists');
const style = document.createElement('style');
style.textContent = `
.eb-list-tree{list-style:none;padding:0;margin:0}.eb-list-tree ul{list-style:none;padding:0 0 0 14px;margin:1px 0}.eb-list-tree .eb-list-row{position:relative}.eb-tree-toggle{flex:0 0 20px!important;min-width:20px!important;padding:2px!important}.eb-tree-toggle.empty{visibility:hidden}.eb-list-nav li[data-dragging="true"]{opacity:.45}.eb-list-nav li[data-drop-target="true"]>.eb-list-row{outline:1px dashed currentColor;outline-offset:-1px}.eb-list-subtype{opacity:.6;font-size:10px;padding:2px 5px}.eb-child-add{flex:0 0 auto!important;padding:3px 5px!important}
`;
document.head.appendChild(style);

let currentLists = [];
let rebuilding = false;

function nameFromRow(li){return li.querySelector('.eb-list-open')?.textContent.replace(/\s+·\s+(ordered|unordered)$/,'').trim() || '';}

async function loadLists(){
  const {data,error}=await supabase.from('lists').select('id,name,parent_list_id,ordered,created_at').order('created_at');
  if(error) return;
  currentLists=data||[];
  renderHierarchy();
}

function renderHierarchy(){
  if(rebuilding) return;
  rebuilding=true;
  const existing=[...listsEl.children];
  const byName=new Map();
  existing.forEach(li=>{const name=nameFromRow(li);if(name) byName.set(name,li);});
  const nodeById=new Map();
  currentLists.forEach(list=>{
    const li=byName.get(list.name);
    if(li){li.dataset.listId=list.id;li.dataset.parentListId=list.parent_list_id||'';nodeById.set(list.id,li);}
  });
  const root=document.createElement('ul');root.className='eb-list-tree';
  const children=new Map();
  currentLists.forEach(list=>{const key=list.parent_list_id||'__root__';if(!children.has(key))children.set(key,[]);children.get(key).push(list);});
  function appendNode(list,parent){
    const li=nodeById.get(list.id);if(!li)return;
    const childLists=children.get(list.id)||[];
    const row=li.querySelector('.eb-list-row');
    let toggle=row?.querySelector('.eb-tree-toggle');
    if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='secondary eb-tree-toggle';row?.prepend(toggle);}
    toggle.classList.toggle('empty',childLists.length===0);toggle.textContent=childLists.length?'▾':'';toggle.title=childLists.length?'Collapse':'No sublists';
    const childWrap=li.querySelector(':scope > .eb-list-tree-children');
    let wrap=childWrap;
    if(!wrap){wrap=document.createElement('ul');wrap.className='eb-list-tree-children';li.appendChild(wrap);}
    wrap.innerHTML='';
    childLists.forEach(child=>appendNode(child,wrap));
    toggle.onclick=e=>{e.stopPropagation();const hidden=wrap.hidden;wrap.hidden=!hidden;toggle.textContent=hidden?'▾':'▸';localStorage.setItem('ebListTree:'+list.id,hidden?'1':'0');};
    wrap.hidden=localStorage.getItem('ebListTree:'+list.id)==='0';if(wrap.hidden)toggle.textContent='▸';
    li.draggable=true;
    li.ondragstart=e=>{e.stopPropagation();li.dataset.dragging='true';e.dataTransfer.setData('text/plain',list.id);};
    li.ondragend=()=>{delete li.dataset.dragging;document.querySelectorAll('[data-drop-target="true"]').forEach(n=>delete n.dataset.dropTarget);};
    li.ondragover=e=>{e.preventDefault();if(e.dataTransfer) e.dataTransfer.dropEffect='move';li.dataset.dropTarget='true';};
    li.ondragleave=()=>delete li.dataset.dropTarget;
    li.ondrop=async e=>{e.preventDefault();e.stopPropagation();delete li.dataset.dropTarget;const draggedId=e.dataTransfer.getData('text/plain');if(!draggedId||draggedId===list.id)return;if(await wouldCycle(draggedId,list.id))return alert('That would create a circular hierarchy.');const {error}=await supabase.from('lists').update({parent_list_id:list.id}).eq('id',draggedId);if(error)return alert(error.message);await loadLists();};
    const rowActions=row?.querySelectorAll('.eb-list-action');
    if(row && !row.querySelector('.eb-child-add')){const add=document.createElement('button');add.type='button';add.className='secondary eb-list-action eb-child-add';add.textContent='↳';add.title='Create sub-list';add.onclick=async e=>{e.stopPropagation();const name=prompt(`New sub-list under “${list.name}”:`);if(!name?.trim())return;const {error}=await supabase.from('lists').insert({owner_id:(await supabase.auth.getUser()).data.user.id,name:name.trim(),ordered:false,parent_list_id:list.id});if(error)return alert(error.message);await loadLists();};row?.insertBefore(add,rowActions?.[rowActions.length-1]||null);}
    parent.appendChild(li);
  }
  (children.get('__root__')||[]).forEach(list=>appendNode(list,root));
  listsEl.innerHTML='';listsEl.appendChild(root);rebuilding=false;
}

async function wouldCycle(dragged,target){
  let id=target;const seen=new Set();
  while(id){if(id===dragged)return true;if(seen.has(id))return true;seen.add(id);const found=currentLists.find(x=>x.id===id);id=found?.parent_list_id||null;}
  return false;
}

const observer=new MutationObserver(()=>{if(!rebuilding)loadLists();});
observer.observe(listsEl,{childList:true});
(async()=>{const {data:{session}}=await supabase.auth.getSession();if(session){await new Promise(r=>setTimeout(r,100));await loadLists();}})();
supabase.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(loadLists,100);});
