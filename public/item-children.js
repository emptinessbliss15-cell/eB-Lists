const supabaseClient = window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
const itemsEl = document.getElementById('items');
const templatePicker = document.getElementById('itemTemplate');
const statusEl = document.getElementById('status');

const style = document.createElement('style');
style.textContent = `.eb-item-add-child{flex:0 0 auto!important;min-width:24px!important;padding:3px 6px!important;font-weight:700}.eb-item-row{margin-left:var(--eb-item-depth,0px)}.eb-item-row.eb-child-row{border-left:1px solid var(--eb-border,#ddd);padding-left:6px}`;
document.head.appendChild(style);

function status(text){ if(statusEl) statusEl.textContent=text||''; }
function currentListId(){
  const title=(document.getElementById('activeList')?.textContent||'').trim();
  const buttons=[...document.querySelectorAll('.eb-list-open')];
  const hit=buttons.find(b=>b.textContent.replace(/\s+·\s+(ordered|unordered)$/,'').trim()===title);
  return hit?.dataset.listId||null;
}
async function sessionUser(){const {data}=await supabaseClient.auth.getSession();return data.session?.user||null}
async function addChild(row,index){
  const listId=currentListId(); if(!listId)return status('Select a list first.');
  const user=await sessionUser(); if(!user)return status('Please sign in.');
  const {data: legacy}=await supabaseClient.from('list_items').select('id,text,position,created_at').eq('list_id',listId).order('position').order('created_at');
  const {data: holons,error}=await supabaseClient.from('list_holons').select('id,list_id,holon_id,position,parent_holon_id,created_at,holon:holons!list_holons_holon_id_fkey(id,type_name,holon_fields(id,name,field_type,value,position))').eq('list_id',listId).order('position').order('created_at');
  if(error)return status(error.message);
  const combined=[...(legacy||[]).map(data=>({kind:'legacy',data})),...(holons||[]).map(data=>({kind:'holon',data}))].sort((a,b)=>(a.data.position??0)-(b.data.position??0)||new Date(b.data.created_at)-new Date(a.data.created_at));
  const item=combined[index]; if(!item)return;
  if(item.kind!=='holon')return status('This legacy item needs conversion before it can have subitems.');
  const name=prompt(`New subitem under “${row.querySelector('.eb-item-text')?.textContent||'item'}”:`); if(!name?.trim())return;
  const templateId=templatePicker?.value; if(!templateId)return status('Choose an item type first.');
  const {data:template,error:templateError}=await supabaseClient.from('templates').select('*,template_fields(*)').eq('id',templateId).single(); if(templateError)return status(templateError.message);
  const {data:holon,error:holonError}=await supabaseClient.from('holons').insert({owner_id:user.id,template_id:template.id,type_name:template.name}).select().single(); if(holonError)return status(holonError.message);
  const fields=(template.template_fields||[]).map((field,position)=>({holon_id:holon.id,name:field.name,field_type:field.field_type,value:field.name==='text'?name.trim():field.default_value,position}));
  if(fields.length){const {error}=await supabaseClient.from('holon_fields').insert(fields);if(error)return status(error.message)}
  const siblings=(holons||[]).filter(x=>x.parent_holon_id===item.data.holon_id);
  const position=siblings.length?Math.max(...siblings.map(x=>x.position??0))+1:(item.data.position??0)+0.5;
  const {error}=await supabaseClient.from('list_holons').insert({list_id:listId,holon_id:holon.id,owner_id:user.id,position,parent_holon_id:item.data.holon_id,execution_mode:item.data.execution_mode||'parallel'}); if(error)return status(error.message);
  status('Subitem added.');
  document.dispatchEvent(new CustomEvent('eb:items-refresh-requested'));
}
function enhance(){
  if(!itemsEl)return;
  [...itemsEl.children].forEach((li,index)=>{
    const row=li.querySelector('.eb-item-row'); if(!row||row.querySelector('.eb-item-add-child'))return;
    const controls=row.querySelector('.eb-item-controls'); if(!controls)return;
    const add=document.createElement('button'); add.type='button';add.className='secondary eb-item-add-child';add.textContent='+';add.title='Add subitem';add.setAttribute('aria-label','Add subitem');
    add.onclick=e=>{e.stopPropagation();addChild(row,index)};
    controls.insertBefore(add,controls.firstChild);
  });
}
new MutationObserver(()=>enhance()).observe(itemsEl,{childList:true,subtree:true});
document.addEventListener('eb:items-refresh-requested',()=>document.querySelector('.eb-list-open')?.click());
setTimeout(enhance,500);
