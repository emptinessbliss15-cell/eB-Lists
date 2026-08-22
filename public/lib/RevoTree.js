/**
 * RevoGrid-backed tree adapter.
 *
 * Uses the MIT RevoGrid core today and keeps the same Tree API used by eB-Lists.
 * The hierarchy is flattened into the visible source; this makes the eventual
 * switch to RevoGrid Pro TreeDataPlugin a contained adapter change.
 */
export class RevoTree {
  constructor({ container, getId = node => node.id, getParentId = node => node.parentId ?? null } = {}) {
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
    const { defineCustomElement } = await import('https://cdn.jsdelivr.net/npm/@revolist/[email protected]/standalone/revo-grid.js/+esm');
    defineCustomElement();
    this.grid = document.createElement('revo-grid');
    this.grid.className = 'eb-revo-tree-grid';
    this.grid.theme = 'compact';
    this.grid.readonly = true;
    this.grid.range = false;
    this.grid.resize = false;
    this.grid.rowSize = 30;
    this.grid.stretch = true;
    this.grid.columns = [{
      prop: 'name',
      name: '',
      size: 360,
      readonly: true,
      cellTemplate: (h, { model }) => this.cellTemplate(h, model),
    }];
    this.container.replaceChildren(this.grid);
    this.render();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event, detail) {
    for (const handler of this.listeners.get(event) ?? []) handler(detail);
  }

  setData(nodes) {
    this.nodes = Array.isArray(nodes) ? [...nodes] : [];
    this.render();
  }

  getNode(id) {
    return this.nodes.find(node => String(this.getId(node)) === String(id)) ?? null;
  }

  getChildren(parentId = null) {
    return this.nodes.filter(node => (this.getParentId(node) ?? null) === parentId);
  }

  hasChildren(id) {
    return this.getChildren(id).length > 0;
  }

  isExpanded(id) {
    return this.expandedIds.has(id);
  }

  setExpanded(id, expanded) {
    if (expanded) this.expandedIds.add(id);
    else this.expandedIds.delete(id);
    this.emit('expand', { id, expanded, node: this.getNode(id) });
    this.render();
  }

  toggleExpanded(id) {
    this.setExpanded(id, !this.isExpanded(id));
  }

  select(id) {
    this.selectedId = id;
    this.emit('select', { node: this.getNode(id), id });
    this.render();
  }

  isDescendant(candidateId, ancestorId) {
    let node = this.getNode(candidateId);
    while (node) {
      const parentId = this.getParentId(node);
      if (parentId == null) return false;
      if (String(parentId) === String(ancestorId)) return true;
      node = this.getNode(parentId);
    }
    return false;
  }

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
    const hasChildren = !!model.__treeHasChildren;
    const expanded = !!model.__treeExpanded;
    const selected = String(this.selectedId) === String(id);

    const disclosure = hasChildren
      ? h('button', {
          type: 'button',
          title: expanded ? 'Collapse' : 'Expand',
          style: { border: '0', background: 'transparent', padding: '0 4px', cursor: 'pointer', color: 'inherit' },
          onclick: event => { event.stopPropagation(); this.toggleExpanded(id); },
        }, expanded ? '▾' : '▸')
      : h('span', { style: { display: 'inline-block', width: '20px' } }, '');

    const label = h('button', {
      type: 'button',
      title: model.name ?? '',
      style: {
        border: '0',
        background: selected ? 'var(--eb-tree-selected, #8882)' : 'transparent',
        color: 'inherit',
        padding: '4px 6px',
        margin: '0',
        borderRadius: '3px',
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: '1',
        fontWeight: selected ? '600' : '400',
        cursor: 'pointer',
      },
      onclick: event => { event.stopPropagation(); this.select(id); },
    }, `${model.name ?? ''}${model.ordered ? ' ☷' : ' ☰'}`);

    const action = (text, title, eventName) => h('button', {
      type: 'button',
      title,
      style: { border: '0', background: 'transparent', color: 'inherit', padding: '2px 4px', margin: '0', cursor: 'pointer' },
      onclick: event => { event.stopPropagation(); this.emit('action', { action: eventName, node: this.getNode(id), id }); },
    }, text);

    return h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        width: '100%',
        minWidth: '0',
        paddingLeft: `${depth * 14}px`,
        boxSizing: 'border-box',
      },
    }, disclosure, label,
      h('span', { style: { display: 'flex', gap: '1px', opacity: '.72' } },
        action('+', 'Add sub-list', 'add'),
        action('↑', 'Move up', 'up'),
        action('↓', 'Move down', 'down'),
        action('×', 'Delete list', 'delete'),
      )
    );
  }

  render() {
    if (!this.grid) return;
    this.grid.source = this.visibleNodes();
    this.emit('render', { tree: this });
  }
}

window.eB = window.eB || {};
window.eB.RevoTree = RevoTree;
