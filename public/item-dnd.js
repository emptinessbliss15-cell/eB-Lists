(() => {
  const db=window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co','sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const style=document.createElement('style');
  style.textContent=`.eb-item-row{position:relative}.eb-item-drag-handle{flex:0 0 22px;width:22px;height:24px;padding:0!important;border:0;background:transparent;color:inherit;cursor:grab;font-size:15px;opacity:.7}.eb-item-drag-handle:active{cursor:grabbing}.eb-item-drag-handle:hover{background:#8883;border-radius:3px;opacity:1}.eb-item-row.eb-item-dragging{opacity:.45}.eb-item-row.eb-item-drop-target{outline:1px dashed #888;outline-offset:2px}`;
  document.head.appendChild(style);
  let busy=false;
  function isOrdered(){return document.getElementById('listOrderToggle')?.textContent==='Ordered'}
  async function saveDomOrder(){
    const list=document.getElementById('items');if(!list)return;
    const active=document.getElementById('activeList')?.textContent?.trim();
    if(!active)return;
    const {data:lists}=await db.from('lists').select('id').eq('name',active).limit(1);const listId=lists?.[0]?.id;if(!listId)return;
    const {data:items}=await db.from('list_items').select('id,text').eq('list_id',listId).is('parent_id',null);
    if(!items)return;
    const rows=Array.from(list.querySelectorAll(':scope > .eb-item-row'));
    const used=new Set();
    for(let i=0;i<rows.length;i++){
      const text=rows[i].querySelector('.eb-item-text')?.textContent?.trim();if(!text)continue;
      const match=items.find(x=>x.text===text&&!used.has(x.id));if(!match)continue;used.add(match.id);
      await db.from('list_items').update({position:i}).eq('id',match.id);
    }
  }
  function enhance(){
    if(busy||!isOrdered())return;
    const list=document.getElementById('items');if(!list)return;
    list.querySelectorAll(':scope > .eb-item-row').forEach(row=>{
      if(row.dataset.dragEnhanced==='1')return;
      const main=row.querySelector('.eb-item-main');if(!main)return;
      row.dataset.dragEnhanced='1';row.draggable=true;
      const handle=document.createElement('button');handle.type='button';handle.className='eb-item-drag-handle';handle.textContent='⠿';handle.title='Drag to reorder';handle.setAttribute('aria-label','Drag to reorder item');main.insertBefore(handle,main.firstChild);
      row.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';row.classList.add('eb-item-dragging')});
      row.addEventListener('dragend',()=>{row.classList.remove('eb-item-dragging');list.querySelectorAll('.eb-item-drop-target').forEach(x=>x.classList.remove('eb-item-drop-target'))});
      row.addEventListener('dragover',e=>{e.preventDefault();const d=list.querySelector('.eb-item-dragging');if(d&&d!==row)row.classList.add('eb-item-drop-target')});
      row.addEventListener('dragleave',()=>row.classList.remove('eb-item-drop-target'));
      row.addEventListener('drop',async e=>{e.preventDefault();row.classList.remove('eb-item-drop-target');const d=list.querySelector('.eb-item-dragging');if(!d||d===row)return;const rows=Array.from(list.querySelectorAll(':scope > .eb-item-row'));const a=rows.indexOf(d),b=rows.indexOf(row);if(a<b)list.insertBefore(d,row.nextSibling);else list.insertBefore(d,row);busy=true;await saveDomOrder();busy=false;window.dispatchEvent(new CustomEvent('eb:item-reordered'))});
    });
  }
  const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});setInterval(enhance,500);
})();
