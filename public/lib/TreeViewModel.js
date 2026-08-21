/**
 * Reusable MVVM state for any hierarchical Tree.
 * No DOM, Supabase, or app-specific knowledge.
 */
import { ViewModel } from './ViewModel.js';

export class TreeViewModel extends ViewModel {
  constructor({ getId = node => node.id, getParentId = node => node.parentId ?? null } = {}) {
    super({ nodes: [], selectedId: null, expandedIds: new Set() });
    this.getId = getId;
    this.getParentId = getParentId;
  }

  setNodes(nodes) {
    const next = Array.isArray(nodes) ? [...nodes] : [];
    const validIds = new Set(next.map(this.getId));
    const expandedIds = new Set([...this.state.expandedIds].filter(id => validIds.has(id)));
    this.set({ nodes: next, expandedIds });
  }

  node(id) { return this.state.nodes.find(node => this.getId(node) === id) ?? null; }
  children(parentId = null) { return this.state.nodes.filter(node => this.getParentId(node) === parentId); }
  hasChildren(id) { return this.children(id).length > 0; }
  isExpanded(id) { return this.state.expandedIds.has(id); }

  toggle(id) {
    const expandedIds = new Set(this.state.expandedIds);
    if (expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
    this.set({ expandedIds });
  }

  select(id) { this.set({ selectedId: id }); }

  expandAll() {
    this.set({ expandedIds: new Set(this.state.nodes.filter(node => this.hasChildren(this.getId(node))).map(this.getId)) });
  }

  collapseAll() { this.set({ expandedIds: new Set() }); }
}

window.eB = window.eB || {};
window.eB.TreeViewModel = TreeViewModel;
