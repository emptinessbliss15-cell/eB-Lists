(() => {
  const db=window.supabase.createClient('https://zaabghrczrbqkxrhkinj.supabase.co','sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF');
  const style=document.createElement('style');
  style.textContent='.eb-tree-drag-handle{flex:0 0 20px;width:20px;padding:2px!important;border:0;background:transparent;color:inherit;cursor:grab;opacity:.65}.eb-tree-drag-handle:active{cursor:grabbing}.eb-tree-entry.eb-tree-dragging{opacity:.45}.eb-tree-entry.eb-tree-drop-before{border-top:2px solid currentColor}.eb-tree-entry.eb-tree-drop-after{border-bottom:2px solid currentColor}.eb-tree-entry.eb-tree-drop-child{outline:1px dashed currentColor;outline-offset:1px}';
  document.head.appendChild(style);
  let busy=false;
  async function persistGroup(rows,parentId){
    for(let i=0;i<rows.length;i++) await db.from('lists').update({parent_list_id:parentId||null,position:i}).eq('id',rows[i].dataset.listId);
  }
  function clearTargets(){document.querySelectorAll('.eb-tree-drop-before,.eb-tree-drop-after,.eb-tree-drop-child').forEach(x=>x.classList.remove('eb-tree-drop-before','eb-tree-drop-after','eb-tree-drop-child'));}
  function enhance(){
    const tree=document.getElementById('tree'); if(!tree||busy)return;
    tree.querySelectorAll('.eb-tree-row').forEach(row=>{
      const entry=row.querySelector('.eb-tree-entry'); const node=row.querySelector('.eb-tree-node');
      if(!entry||!node||entry.dataset.listId||!node.getAttribute('aria-current')&&!node.textContent.includes(' · '))return;
      const text=node.textContent.replace(/^•\s*/,'');
      const source=[...tree.querySelectorAll('.eb-tree-entry')].find(e=>e.querySelector('.eb-tree-node')?.textContent.replace(/^•\s*/,'')===text);
      if(!source)return;
      // The row is enhanced only when app.js supplies the list id as a data attribute.
      const id=entry.dataset.listId; if(!id||entry.dataset.dragEnhanced==='1')return;
      entry.dataset.dragEnhanced='1'; entry.draggable=true;
      const handle=document.createElement('button'); handle.type='button'; handle.className='eb-tree-drag-handle'; handle.textContent='⠿'; handle.title='Drag to reorder or reparent'; handle.setAttribute('aria-label',handle.title);
      entry.insertBefore(handle,node);
      entry.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);entry.classList.add('eb-tree-dragging');});
      entry.addEventListener('dragend',()=>{entry.classList.remove('eb-tree-dragging');clearTargets();});
      entry.addEventListener('dragover',e=>{
        const dragging=tree.querySelector('.eb-tree-dragging'); if(!dragging||dragging===entry)return;
        e.preventDefault(); clearTargets();
        const r=entry.getBoundingClientRect(); const y=e.clientY-r.top;
        if(y<r.height*.25)entry.classList.add('eb-tree-drop-before');
        else if(y>r.height*.75)entry.classList.add('eb-tree-drop-after');
        else entry.classList.add('eb-tree-drop-child');
      });
      entry.addEventListener('drop',async e=>{
        e.preventDefault();
        const dragging=tree.querySelector('.eb-tree-dragging'); if(!dragging||dragging===entry)return;
        const dragId=dragging.dataset.listId,targetId=entry.dataset.listId;
        const r=entry.getBoundingClientRect(), y=e.clientY-r.top;
        clearTargets(); busy=true;
        const {data,error}=await db.from('lists').select('id,parent_list_id,position').order('position').order('created_at');
        if(error){busy=false;return;}
        const all=data||[]; const target=all.find(x=>x.id===targetId), dragged=all.find(x=>x.id===dragId); if(!target||!dragged){busy=false;return;}
        // Prevent cycles: a node cannot become its own descendant.
        let p=target.parent_list_id, cycle=targetId===dragId;
        while(p&&!cycle){if(p===dragId)cycle=true;p=all.find(x=>x.id===p)?.parent_list_id||null;}
        if(cycle){busy=false;return;}
        let newParent;
        if(y>=r.height*.25&&y<=r.height*.75) newParent=targetId; else newParent=target.parent_list_id||null;
        const siblings=all.filter(x=>(x.parent_list_id||null)===(newParent||null)&&x.id!==dragId).sort((a,b)=>a.position-b.position);
        let insert=siblings.length;
        if(newParent===target.parent_list_id){const ti=siblings.findIndex(x=>x.id===targetId);insert=y<r.height*.5?Math.max(0,ti):ti+1;}
        siblings.splice(insert,0,{...dragged,parent_list_id:newParent});
        await persistGroup(siblings,newParent);
        busy=false;
        if(window.renderListTree)window.renderListTree();
      });
    });
  }
  new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true}); setInterval(enhance,500);
})();
