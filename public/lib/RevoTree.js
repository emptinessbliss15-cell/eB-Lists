/** RevoGrid-backed tree adapter for eB-Lists. */
export class RevoTree {
  constructor({ container, getId = n => n.id, getParentId = n => n.parentId ?? null } = {}) {
    if (!container) throw new Error('RevoTree requires a container');
    this.container = container;
    this.getId = getId;
    this.getParentId = getParentId;
    this.nodes = [];
    this.selectedId = null;
    this.expandedIds = new Set();
    this.listeners = new Map();
    this.grid = null;
    this.ready = this.load();
  }

  async load() {
    try {
      const { defineCustomElement } = await import(
        'https://cdn.jsdelivr.net/npm/@revolist/revogrid@4.25.1/standalone/revo-grid.js/+esm'
      );
      defineCustomElement();
      this.grid = document.createElement('revo-grid');
      this.grid.className = 'eb-revo-tree-grid';
      this.grid.theme = 'compact';
      this.grid.readonly = true;
      this.grid.range = false;
      this.grid.rowSize = 30;
      this.grid.stretch = true;
      this.grid.columns = [{
        prop: 'name', name: '', size: 360, readonly: true,
        cellTemplate: (h, { model }) => this.cellTemplate(h, model),
      }];
      this.container.replaceChildren(this.grid);
      this.render();
    } catch (error) {
      this.container.textContent = `Tree grid unavailable: ${error.message}`;
      this.emit('error', { error });
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }
  emit(event, detail) { for (const handler of this.listeners.get(event) ?? []) handler(detail); }
  setData(nodes) { this.nodes = Array.isArray(nodes) ? [...nodes] : []; this.render(); }
  getNode(id) { return this.nodes.find(n => String(this.getId(n)) === String(id)) ?? null; }
  getChildren(parentId = null) { return this.nodes.filter(n => (this.getParentId(n) ?? null) === parentId); }
  hasChildren(id) { return this.getChildren(id).length > 0; }
  isExpanded(id) { return this.expandedIds.has(id); }
  setExpanded(id, expanded) { expanded ? this.expandedIds.add(id) : this.expandedIds.delete(id); this.render(); }
  toggleExpanded(id) { this.setExpanded(id, !this.isExpanded(id)); }
  select(id) { this.selectedId = id; this.emit('select', { node: this.getNode(id), id }); this.render(); }

  visibleNodes() {
    const result = [];
    const walk = (parentId, depth) => {
      for (const node of this.getChildren(parentId)) {
        const id = this.getId(node);
        result.push({ ...node, __treeDepth: depth, __treeHasChildren: this.hasChildren(id), __treeExpanded: this.isExpanded(id) });
        if (this.hasChildren(id) && this.isExpanded(id)) walk(id, depth + 1);
      }
    };
    walk(null, 0);
    return result;
  }

  cellTemplate(h, model) {
    const id = this.getId(model);
    const depth = model.__treeDepth ?? 0;
    const disclosure = model.__treeHasChildren
      ? h('button', { type: 'button', title: model.__treeExpanded ? 'Collapse' : 'Expand', style: { border: 0, background: 'transparent', padding: '0 4px', cursor: 'pointer', color: 'inherit' }, onclick: e => { e.stopPropagation(); this.toggleExpanded(id); } }, model.__treeExpanded ? '▾' : '▸')
      : h('span', { style: { display: 'inline-block', width: '20px' } }, '');
    const label = h('button', {
      type: 'button', title: model.name ?? '',
      style: { border: 0, background: String(this.selectedId) === String(id) ? 'var(--eb-tree-selected,#8882)' : 'transparent', color: 'inherit', padding: '4px 6px', margin: 0, borderRadius: '3px', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: String(this.selectedId) === String(id) ? 600 : 400, cursor: 'pointer' },
      onclick: e => { e.stopPropagation(); this.select(id); },
    }, `${model.name ?? ''}${model.ordered ? ' ☷' : ' ☰'}`);
    const action = (text, title, name) => h('button', { type: 'button', title, style: { border: 0, background: 'transparent', color: 'inherit', padding: '2px 4px', margin: 0, cursor: 'pointer' }, onclick: e => { e.stopPropagation(); this.emit('action', { action: name, node: this.getNode(id), id }); } }, text);
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: '1px', width: '100%', minWidth: 0, paddingLeft: `${depth * 14}px`, boxSizing: 'border-box' } }, disclosure, label, h('span', { style: { display: 'flex', gap: '1px', opacity: '.72' } }, action('+', 'Add sub-list', 'add'), action('↑', 'Move up', 'up'), action('↓', 'Move down', 'down'), action('×', 'Delete list', 'delete')));
  }

  render() { if (this.grid) this.grid.source = this.visibleNodes(); }
}
window.eB = window.eB || {};
window.eB.RevoTree = RevoTree;
