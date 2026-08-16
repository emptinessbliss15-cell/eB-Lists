(() => {
  const db=window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co','sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const style=document.createElement('style');style.textContent=`.eb-template-field{position:relative}.eb-field-handle{flex:0 0 22px;width:22px;height:24px;padding:0!important;border:0;background:transparent;color:inherit;cursor:grab;font-size:15px;opacity:.7}.eb-field-handle:active{cursor:grabbing}.eb-field-handle:hover{background:#8883;border-radius:3px;opacity:1}.eb-field-order{display:flex;gap:1px;flex:0 0 auto}.eb-field-order button{width:20px;height:24px;padding:0!important;border:0;background:transparent;color:inherit;opacity:.65}.eb-field-order button:hover{background:#8883;border-radius:3px;opacity:1}.eb-template-field.eb-dragging{opacity:.45}.eb-template-field.eb-drop-target{outline:1px dashed #888;outline-offset:2px}`;document.head.appendChild(style);
  let busy=false;
  async function saveOrder(card,rows){
    const user=(await db.auth.getUser()).data?.user;if(!user)return;
    const templateName=card.querySelector('h4')?.textContent?.trim();if(!templateName)return;
    const t=await db.from('templates').select('id').eq('owner_id',user.id).eq('name',templateName).limit(1).maybeSingle();if(t.error||!t.data)return;
    const fields=await db.from('template_fields').select('id,name').eq('template_id',t.data.id);if(fields.error)return;
    const byName=new Map((fields.data||[]).map(f=>[f.name,f.id]));busy=true;
    for(let i=0;i<rows.length;i++){const name=rows[i].querySelector('[data-field-name]')?.value?.trim();const id=byName.get(name);if(id)await db.from('template_fields').update({position:i}).eq('id',id);}busy=false;
  }
  function enhance(){
    if(busy)return;
    document.querySelectorAll('.eb-template-field').forEach(row=>{
      if(row.dataset.enhanced==='1')return;
      const input=row.querySelector('[data-field-name]'),card=row.closest('.eb-system-card');if(!input||!card)return;
      row.dataset.enhanced='1';row.draggable=true;
      const handle=document.createElement('button');handle.type='button';handle.className='eb-field-handle';handle.textContent='⠿';handle.title='Drag to reorder';handle.setAttribute('aria-label','Drag to reorder field');row.insertBefore(handle,input);
      const order=document.createElement('span');order.className='eb-field-order';const up=document.createElement('button'),down=document.createElement('button');up.type=down.type='button';up.textContent='↑';down.textContent='↓';up.title='Move field up';down.title='Move field down';up.setAttribute('aria-label','Move field up');down.setAttribute('aria-label','Move field down');order.append(up,down);row.insertBefore(order,row.querySelector('.eb-x'));
      const container=row.parentElement,rows=()=>Array.from(container.querySelectorAll(':scope > .eb-template-field'));
      const persist=()=>saveOrder(card,rows());
      const move=(delta)=>{const rs=rows(),i=rs.indexOf(row),j=i+delta;if(j<0||j>=rs.length)return;if(delta<0)container.insertBefore(row,rs[j]);else container.insertBefore(row,rs[j].nextSibling);persist();};
      up.onclick=()=>move(-1);down.onclick=()=>move(1);
      row.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';row.classList.add('eb-dragging');});
      row.addEventListener('dragend',()=>{row.classList.remove('eb-dragging');container.querySelectorAll('.eb-drop-target').forEach(x=>x.classList.remove('eb-drop-target'));});
      row.addEventListener('dragover',e=>{e.preventDefault();const d=container.querySelector('.eb-dragging');if(d&&d!==row)row.classList.add('eb-drop-target');});
      row.addEventListener('dragleave',()=>row.classList.remove('eb-drop-target'));
      row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('eb-drop-target');const d=container.querySelector('.eb-dragging');if(!d||d===row)return;const rs=rows(),a=rs.indexOf(d),b=rs.indexOf(row);if(a<b)container.insertBefore(d,row.nextSibling);else container.insertBefore(d,row);persist();});
    });
  }
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});setInterval(enhance,500);
})();
