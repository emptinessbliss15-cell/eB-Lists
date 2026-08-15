// Type-driven content routing foundation.
// The selected tree object supplies a type; this module maps that type to a view.
const routes = new Map([
  ['list', 'list'],
  ['theme', 'theme-editor'],
  ['type', 'type-editor'],
  ['agent', 'agent'],
  ['document', 'document']
]);

function normalizeType(value) {
  return String(value || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
}

window.eBlissViewRouter = {
  register(type, view) { routes.set(normalizeType(type), view); },
  resolve(node) { return routes.get(normalizeType(node?.type || node?.kind || node?.type_name)) || 'default'; },
  async show(node) {
    const view = this.resolve(node);
    document.dispatchEvent(new CustomEvent('eb:view-requested', { detail: { node, view } }));
    return view;
  }
};

document.addEventListener('eb:list-selected', event => {
  const list = event.detail?.list;
  if (list) window.eBlissViewRouter.show({ ...list, type: 'list' });
});
