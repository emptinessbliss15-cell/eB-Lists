/**
 * Reusable, data-source-agnostic tree model/view helper.
 * The Tree knows about nodes, hierarchy, selection, expansion, and drag/drop,
 * but nothing about a persistence layer.
 */
export class Tree {
  constructor({ container, getId = node => node.id, getParentId = node => node.parentId ?? null, renderNode }) {
    if (!container) throw new Error('Tree requires a container');
    this.container = container;
    this.getId = getId;
    this.getParentId = getParentId;
    this.renderNode = renderNode;
    this.nodes = [];
    this.selectedId = null;
    this.expandedIds = new Set();
    this.listeners = new Map();
    this.draggedId = null;
    this.dropTargetId = null;
    this.dragArmed = false;

    this.container.addEventListener('pointerdown', event => {
      const handle = event.target.closest?.('.eb-tree-drag-handle');
      if (!handle) return;
      const row = handle.closest?.('.eb-tree-row[data-tree-node-id]');
      if (!row) return;
      this.dragArmed = true;
      row.draggable = true;
    });

    this.container.addEventListener('dragstart', event => {
      const row = event.target.closest?.('.eb-tree-row[data-tree-node-id]');
      if (!row || !this.dragArmed) return;
      const id = row.dataset.treeNodeId;
      if (!id) return;
      this.dragArmed = false;
      this.draggedId = id;
      row.classList.add('dragging');
      event.dataTransfer?.setData('text/plain', id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      this.emit('dragstart', { node: this.getNode(id), id });
    });

    this.container.addEventListener('dragover', event => {
      const row = event.target.closest?.('.eb-tree-row[data-tree-node-id]');
      if (!row || this.draggedId === null) return;
      const targetId = row.dataset.treeNodeId;
      if (targetId === this.draggedId) return;
      const target = this.getNode(targetId);
      const dragged = this.getNode(this.draggedId);
      if (!target || !dragged || this.isDescendant(targetId, this.draggedId)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this.dropTargetId = targetId;
      row.classList.add('drag-over');
    });

    this.container.addEventListener('dragleave', event => {
      const row = event.target.closest?.('.eb-tree-row[data-tree-node-id]');
      if (row && !row.contains(event.relatedTarget)) row.classList.remove('drag-over');
    });

    this.container.addEventListener('drop', event => {
      const row = event.target.closest?.('.eb-tree-row[data-tree-node-id]');
      if (!row || this.draggedId === null) return;
      const targetId = row.dataset.treeNodeId;
      if (targetId === this.draggedId) return;
      const dragged = this.getNode(this.draggedId);
      const target = this.getNode(targetId);
      if (!dragged || !target || this.isDescendant(targetId, this.draggedId)) return;
      event.preventDefault();
      this.emit('move', { node: dragged, id: this.draggedId, target, targetId });
      this.clearDragState();
    });

    this.container.addEventListener('dragend', () => this.clearDragState());
  }

  setData(nodes) { this.nodes = Array.isArray(nodes) ? [...nodes] : []; this.render(); }
  getNode(id) { return this.nodes.find(node => String(this.getId(node)) === String(id)) ?? null; }
  getChildren(parentId = null) { return this.nodes.filter(node => (this.getParentId(node) ?? null) === parentId); }
  hasChildren(id) { return this.getChildren(id).length > 0; }
  isExpanded(id) { return this.expandedIds.has(id); }
  setExpanded(id, expanded) { if (expanded) this.expandedIds.add(id); else this.expandedIds.delete(id); this.emit('expand', { id, expanded }); this.render(); }
  toggleExpanded(id) { this.setExpanded(id, !this.isExpanded(id)); }
  select(id) { this.selectedId = id; this.emit('select', { node: this.getNode(id), id }); this.render(); }
  isDescendant(candidateId, ancestorId) { let current = this.getNode(candidateId); while (current) { const parentId = this.getParentId(current); if (parentId == null) return false; if (String(parentId) === String(ancestorId)) return true; current = this.getNode(parentId); } return false; }
  clearDragState() { const draggedId=this.draggedId, dropTargetId=this.dropTargetId; this.container.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over')); this.draggedId=null; this.dropTargetId=null; this.dragArmed=false; this.emit('dragend',{draggedId,dropTargetId}); }
  on(event, handler) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event).add(handler); return () => this.listeners.get(event)?.delete(handler); }
  emit(event, detail) { for (const handler of this.listeners.get(event) ?? []) handler(detail); }
  render() {
    this.container.replaceChildren();
    const walk=(parentId,depth)=>{ for(const node of this.getChildren(parentId)){ const id=this.getId(node); const element=this.renderNode(node,{depth,selected:this.selectedId===id,expanded:this.isExpanded(id),hasChildren:this.hasChildren(id),toggle:()=>this.toggleExpanded(id),select:()=>this.select(id),emit:(event,detail)=>this.emit(event,{node,id,...detail})}); if(element){ const row=element.classList.contains('eb-tree-row')?element:element.querySelector?.('.eb-tree-row'); if(row){row.dataset.treeNodeId=String(id);row.draggable=false;const handle=row.querySelector('.eb-tree-drag-handle');if(handle){handle.dataset.treeNodeId=String(id);handle.draggable=false;}} this.container.append(element);} if(this.hasChildren(id)&&this.isExpanded(id))walk(id,depth+1); } }; walk(null,0); this.emit('render',{tree:this});
  }
}
window.eB=window.eB||{};window.eB.Tree=Tree;
