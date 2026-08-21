/**
 * Reusable, data-source-agnostic tree model/view helper.
 */
export class Tree {
  constructor({ container, getId = node => node.id, getParentId = node => node.parentId ?? null, renderNode }) {
    if (!container) throw new Error('Tree requires a container');
    this.container=container; this.getId=getId; this.getParentId=getParentId; this.renderNode=renderNode;
    this.nodes=[]; this.selectedId=null; this.expandedIds=new Set(); this.listeners=new Map();
    this.draggedId=null; this.dropTargetId=null; this.dropBefore=true; this.dragArmed=false;
    if(!document.getElementById('eb-tree-dnd-style')){const s=document.createElement('style');s.id='eb-tree-dnd-style';s.textContent='.eb-tree-row{position:relative}.eb-tree-row.dragging{opacity:.45}.eb-tree-row.drop-before::before,.eb-tree-row.drop-after::after{content:"";position:absolute;left:4px;right:4px;height:3px;border-radius:2px;background:currentColor;z-index:10;pointer-events:none}.eb-tree-row.drop-before::before{top:-2px}.eb-tree-row.drop-after::after{bottom:-2px}';document.head.append(s);}
    this.container.addEventListener('pointerdown',e=>{const h=e.target.closest?.('.eb-tree-drag-handle');if(!h)return;const r=h.closest?.('.eb-tree-row[data-tree-node-id]');if(!r)return;this.dragArmed=true;r.draggable=true;});
    this.container.addEventListener('dragstart',e=>{const r=e.target.closest?.('.eb-tree-row[data-tree-node-id]');if(!r||!this.dragArmed)return;const id=r.dataset.treeNodeId;if(!id)return;this.dragArmed=false;this.draggedId=id;r.classList.add('dragging');e.dataTransfer?.setData('text/plain',id);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';this.emit('dragstart',{node:this.getNode(id),id});});
    this.container.addEventListener('dragover',e=>{const r=e.target.closest?.('.eb-tree-row[data-tree-node-id]');if(!r||this.draggedId===null)return;const targetId=r.dataset.treeNodeId;if(targetId===this.draggedId)return;const target=this.getNode(targetId),dragged=this.getNode(this.draggedId);if(!target||!dragged||this.isDescendant(targetId,this.draggedId))return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';this.container.querySelectorAll('.drag-over,.drop-before,.drop-after').forEach(x=>x.classList.remove('drag-over','drop-before','drop-after'));const rect=r.getBoundingClientRect();this.dropBefore=e.clientY<rect.top+rect.height/2;this.dropTargetId=targetId;r.classList.add(this.dropBefore?'drop-before':'drop-after');});
    this.container.addEventListener('dragleave',e=>{const r=e.target.closest?.('.eb-tree-row[data-tree-node-id]');if(r&&!r.contains(e.relatedTarget))r.classList.remove('drag-over','drop-before','drop-after');});
    this.container.addEventListener('drop',e=>{const r=e.target.closest?.('.eb-tree-row[data-tree-node-id]');if(!r||this.draggedId===null)return;const targetId=r.dataset.treeNodeId;if(targetId===this.draggedId)return;const dragged=this.getNode(this.draggedId),target=this.getNode(targetId);if(!dragged||!target||this.isDescendant(targetId,this.draggedId))return;e.preventDefault();this.emit('move',{node:dragged,id:this.draggedId,target,targetId,before:this.dropBefore});this.clearDragState();});
    this.container.addEventListener('dragend',()=>this.clearDragState());
  }
  setData(nodes){this.nodes=Array.isArray(nodes)?[...nodes]:[];this.render();}
  getNode(id){return this.nodes.find(n=>String(this.getId(n))===String(id))??null;}
  getChildren(parentId=null){return this.nodes.filter(n=>(this.getParentId(n)??null)===parentId);}
  hasChildren(id){return this.getChildren(id).length>0;}
  isExpanded(id){return this.expandedIds.has(id);}
  setExpanded(id,expanded){if(expanded)this.expandedIds.add(id);else this.expandedIds.delete(id);this.emit('expand',{id,expanded});this.render();}
  toggleExpanded(id){this.setExpanded(id,!this.isExpanded(id));}
  select(id){this.selectedId=id;this.emit('select',{node:this.getNode(id),id});this.render();}
  isDescendant(candidateId,ancestorId){let c=this.getNode(candidateId);while(c){const p=this.getParentId(c);if(p==null)return false;if(String(p)===String(ancestorId))return true;c=this.getNode(p);}return false;}
  clearDragState(){const draggedId=this.draggedId,dropTargetId=this.dropTargetId;this.container.querySelectorAll('.dragging,.drag-over,.drop-before,.drop-after').forEach(x=>x.classList.remove('dragging','drag-over','drop-before','drop-after'));this.container.querySelectorAll('.eb-tree-row[draggable="true"]').forEach(x=>x.draggable=false);this.draggedId=null;this.dropTargetId=null;this.dropBefore=true;this.dragArmed=false;this.emit('dragend',{draggedId,dropTargetId});}
  on(event,handler){if(!this.listeners.has(event))this.listeners.set(event,new Set());this.listeners.get(event).add(handler);return()=>this.listeners.get(event)?.delete(handler);}
  emit(event,detail){for(const h of this.listeners.get(event)??[])h(detail);}
  render(){this.container.replaceChildren();const walk=(parentId,depth)=>{for(const node of this.getChildren(parentId)){const id=this.getId(node);const el=this.renderNode(node,{depth,selected:this.selectedId===id,expanded:this.isExpanded(id),hasChildren:this.hasChildren(id),toggle:()=>this.toggleExpanded(id),select:()=>this.select(id),emit:(event,detail)=>this.emit(event,{node,id,...detail})});if(el){const row=el.classList.contains('eb-tree-row')?el:el.querySelector?.('.eb-tree-row');if(row){row.dataset.treeNodeId=String(id);row.draggable=false;const h=row.querySelector('.eb-tree-drag-handle');if(h){h.dataset.treeNodeId=String(id);h.draggable=false;}}this.container.append(el);}if(this.hasChildren(id)&&this.isExpanded(id))walk(id,depth+1);}};walk(null,0);this.emit('render',{tree:this});}
}
window.eB=window.eB||{};window.eB.Tree=Tree;
