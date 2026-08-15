const supabase = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
const listsEl = document.getElementById('lists');
const style = document.createElement('style');
style.textContent = `.eb-list-nav li.eb-nested-list{margin:1px 0}.eb-list-nav li.eb-nested-list .eb-list-row{padding-left:calc(var(--eb-depth,0) * 16px)}.eb-list-child-toggle{flex:0 0 20px!important;min-width:20px;padding:2px!important}.eb-list-child-toggle.empty{visibility:hidden}.eb-list-add-child{flex:0 0 auto;padding:3px 5px!important}.eb-list-nav li.eb-dragging{opacity:.45}.eb-list-nav li.eb-drop-target{outline:1px dashed currentColor;outline-offset:-1px}`;
document.head.appendChild(style);

let collapsed = new Set(JSON.parse(localStorage.getItem('ebListsCollapsed') || '[]'));
let observerLock = false;

async function currentLists(){
  const {data,error}=await supabase.from('lists').select('id,name,parent_list_id,ordered,created_at').order('created_at');
  if(error) return [];
  return data||[];
}

function saveCollapsed(){localStorage.setItem('ebListsCollapsed',JSON.stringify([...collapsed]));}

async function enhance(){
  if(observerLock || !listsEl.children.length) return;
  const data=await currentLists();
  const byName=new Map(data.map(x=>[x.name,x]));
  const rows=[...listsEl.querySelectorAll(':scope > li')];
  rows.forEach(li=>{
    const open=li.querySelector('.eb-list-open');
    const list=open && byName.get(open.textContent.replace(/\s+·\s+(ordered|unordered)$/,''));
    if(!list) return;
    li.dataset.listId=list.id; li.dataset.parentId=list.parent_list_id||''; li.classList.add('eb-nested-list'); li.draggable=true;
    const row=li.querySelector('.eb-list-row');
    let toggle=row.querySelector('.eb-list-child-toggle');
    if(!toggle){toggle=document.createElement('button');toggle.className='secondary eb-list-child-toggle';toggle.type='button';toggle.title='Expand/collapse children';row.insertBefore(toggle,row.firstChild)}
    let add=row.querySelector('.eb-list-add-child');
    if(!add){add=document.createElement('button');add.className='secondary eb-list-add-child';add.type='button';add.textContent='+';add.title='Add sub-list';row.appendChild(add);add.onclick=async e=>{e.stopPropagation();const name=prompt(`New sub-list under “${list.name}”:`);if(!name?.trim())return;const r=await supabase.from('lists').insert({name:name.trim(),owner_id:(await supabase.auth.getUser()).data.user.id,parent_list_id:list.id,ordered:false});if(r.error)alert(`Could not create sub-list: ${r.error.message}`);else location.reload()}}
    toggle.onclick=e=>{e.stopPropagation();if(collapsed.has(list.id))collapsed.delete(list.id);else collapsed.add(list.id);saveCollapsed();applyTree(data)};
    li.ondragstart=e=>{e.dataTransfer.setData('text/plain',list.id);li.classList.add('eb-dragging')};
    li.ondragend=()=>li.classList.remove('eb-dragging');
    li.ondragover=e=>{e.preventDefault();li.classList.add('eb-drop-target')};
    li.ondragleave=()=>li.classList.remove('eb-drop-target');
    li.ondrop=async e=>{e.preventDefault();li.classList.remove('eb-drop-target');const child=e.dataTransfer.getData('text/plain');if(!child||child===list.id)return;const source=data.find(x=>x.id===child);if(!source)return;if(await createsCycle(child,list.id,data))return alert('Cannot move a list inside one of its own descendants.');const r=await supabase.from('lists').update({parent_list_id:list.id}).eq('id',child);if(r.error)alert(`Could not move list: ${r.error.message}`);else applyTree(await currentLists())};
  });
  applyTree(data);
}

async function createsCycle(child,parent,data){let id=parent;while(id){if(id===child)return true;id=data.find(x=>x.id===id)?.parent_list_id||null}return false}

function applyTree(data){
  const map=new Map(data.map(x=>[x.id,x]));
  const nodes=[...listsEl.querySelectorAll(':scope > li.eb-nested-list')];
  const nodeMap=new Map(nodes.map(li=>[li.dataset.listId,li]));
  nodes.forEach(li=>{li.style.display='';li.style.setProperty('--eb-depth','0');listsEl.appendChild(li)});
  const children=new Map();data.forEach(x=>{if(x.parent_list_id){if(!children.has(x.parent_list_id))children.set(x.parent_list_id,[]);children.get(x.parent_list_id).push(x)}});
  const append=(id,depth)=>{const li=nodeMap.get(id);if(!li)return;li.style.setProperty('--eb-depth',depth);const toggle=li.querySelector('.eb-list-child-toggle');const kids=children.get(id)||[];if(toggle){toggle.textContent=kids.length?(collapsed.has(id)?'›':'⌄'):'';toggle.classList.toggle('empty',!kids.length)};kids.forEach(k=>{const child=nodeMap.get(k.id);if(child){li.after(child);append(k.id,depth+1)}});if(collapsed.has(id))kids.forEach(k=>{const child=nodeMap.get(k.id);if(child)child.style.display='none';hideDescendants(k.id)});};
  const hideDescendants=id=>(children.get(id)||[]).forEach(k=>{const n=nodeMap.get(k.id);if(n){n.style.display='none';hideDescendants(k.id)}});
  data.filter(x=>!x.parent_list_id).forEach(x=>append(x.id,0));
}

new MutationObserver(()=>setTimeout(enhance,0)).observe(listsEl,{childList:true});
setTimeout(enhance,500);
