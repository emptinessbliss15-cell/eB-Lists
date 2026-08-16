(() => {
  const db=window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co','sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const style=document.createElement('style');
  style.textContent=`.eb-template-field{position:relative}.eb-field-handle{flex:0 0 22px;width:22px;height:24px;padding:0!important;border:0;background:transparent;color:inherit;cursor:grab;font-size:15px;opacity:.7}.eb-field-handle:active{cursor:grabbing}.eb-field-handle:hover{background:#8883;border-radius:3px;opacity:1}.eb-field-order{display:flex;gap:1px;flex:0 0 auto}.eb-field-order button{width:20px;height:24px;padding:0!important;border:0;background:transparent;color:inherit;opacity:.65}.eb-field-order button:hover{background:#8883;border-radius:3px;opacity:1}.eb-template-field.eb-dragging{opacity:.45}.eb-template-field.eb-drop-target{outline:1px dashed #888;outline-offset:2px}`;
  document.head.appendChild(style);
  let observerBusy=false;
  async function saveOrder(rows){
    const user=(await db.auth.getUser()).data?.user;if(!user)return;
    for(let i=0;i<rows.length;i++){const id=rows[i].dataset.fieldId;if(id)await db.from('template_fields').update({position:i}).eq('id',id);}
  }
  function enhance(){
    if(observerBusy)return;
    document.querySelectorAll('.eb-template-field').forEach(row=>{
      if(row.dataset.enhanced==='1')return;
      const input=row.querySelector('[data-field-name]');if(!input)return;
      const fieldId=input.closest('.eb-template-field').dataset.fieldId;
      if(!fieldId)return;
      row.dataset.enhanced='1';row.draggable=true;
      const handle=document.createElement('button');handle.type='button';handle.className='eb-field-handle';handle.textContent='⠿';handle.title='Drag to reorder';handle.setAttribute('aria-label','Drag to reorder field');
      row.insertBefore(handle,input);
      const order=document.createElement('span');order.className='eb-field-order';
      const up=document.createElement('button'),down=document.createElement('button');
      up.type=down.type='button';up.textContent='↑';down.textContent='↓';up.title='Move field up';down.title='Move field down';up.setAttribute('aria-label','Move field up');down.setAttribute('aria-label','Move field down');order.append(up,down);row.insertBefore(order,row.querySelector('.eb-x'));
      const container=row.parentElement;
      const rows=()=>Array.from(container.querySelectorAll(':scope > .eb-template-field'));
      const persist=async()=>{observerBusy=true;await saveOrder(rows());observerBusy=false;};
      const move=(delta)=>{const rs=rows(),i=rs.indexOf(row),j=i+delta;if(j<0||j>=rs.length)return;if(delta<0)container.insertBefore(row,rs[j]);else container.insertBefore(row,rs[j].nextSibling);persist();};
      up.onclick=()=>move(-1);down.onclick=()=>move(1);
      row.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',fieldId);row.classList.add('eb-dragging');});
      row.addEventListener('dragend',()=>{row.classList.remove('eb-dragging');container.querySelectorAll('.eb-drop-target').forEach(x=>x.classList.remove('eb-drop-target'));});
      row.addEventListener('dragover',e=>{e.preventDefault();if(row!==document.querySelector('.eb-dragging'))row.classList.add('eb-drop-target');});
      row.addEventListener('dragleave',()=>row.classList.remove('eb-drop-target'));
      row.addEventListener('drop',e=>{e.preventDefault();row.classList.remove('eb-drop-target');const dragging=container.querySelector('.eb-dragging');if(!dragging||dragging===row)return;const rs=rows(),a=rs.indexOf(dragging),b=rs.indexOf(row);if(a<b)container.insertBefore(dragging,row.nextSibling);else container.insertBefore(dragging,row);persist();});
    });
  }
  const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});setInterval(enhance,500);
})();
