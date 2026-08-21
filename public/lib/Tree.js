/**
 * Reusable, data-source-agnostic tree model/view helper.
 *
 * The Tree knows about nodes, hierarchy, selection, expansion, and
 * presentation hooks. It deliberately knows nothing about Supabase,
 * Lists, or any particular persistence layer.
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
  }

  setData(nodes) {
    this.nodes = Array.isArray(nodes) ? [...nodes] : [];
    this.render();
  }

  getNode(id) {
    return this.nodes.find(node => this.getId(node) === id) ?? null;
  }

  getChildren(parentId = null) {
    return this.nodes.filter(node => this.getParentId(node) === parentId);
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
    this.emit('expand', { id, expanded });
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

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit(event, detail) {
    for (const handler of this.listeners.get(event) ?? []) handler(detail);
  }

  render() {
    this.container.replaceChildren();
    const walk = (parentId, depth) => {
      for (const node of this.getChildren(parentId)) {
        const id = this.getId(node);
        const element = this.renderNode(node, {
          depth,
          selected: this.selectedId === id,
          expanded: this.isExpanded(id),
          hasChildren: this.hasChildren(id),
          toggle: () => this.toggleExpanded(id),
          select: () => this.select(id),
          emit: (event, detail) => this.emit(event, { node, id, ...detail })
        });
        if (element) this.container.append(element);
        if (this.hasChildren(id) && this.isExpanded(id)) walk(id, depth + 1);
      }
    };
    walk(null, 0);
    this.emit('render', { tree: this });
  }
}

window.eB = window.eB || {};
window.eB.Tree = Tree;
