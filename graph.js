export function createHolonGraph({ element, holons, relationships, onSelect })
{
  const cy = cytoscape({
    container: element,
    elements: [],
    style: [
      { selector: 'node', style: { 'label': 'data(label)', 'text-valign': 'center', 'text-halign': 'center', 'background-color': '#666', 'color': '#fff', 'font-size': 12, 'width': 54, 'height': 54, 'border-width': 1, 'border-color': '#aaa' } },
      { selector: 'node.root', style: { 'background-color': '#7a5', 'width': 72, 'height': 72, 'font-weight': 'bold' } },
      { selector: 'edge', style: { 'curve-style': 'bezier', 'width': 2, 'line-color': '#888', 'target-arrow-color': '#888', 'target-arrow-shape': 'triangle', 'label': 'data(label)', 'font-size': 9, 'text-background-opacity': 1, 'text-background-color': '#fff', 'text-background-padding': 2 } },
    ],
    layout: { name: 'preset' },
  });

  cy.on('tap', 'node', event => onSelect?.(event.target.data('holon')));
  cy.on('dbltap', 'node', event => focus(event.target.id()));
  return { cy, holons, relationships, focus };

  function focus(rootId)
  {
    const root = holons.find(h => h.id === rootId);
    if (!root) return;

    const childRelations = relationships.filter(r => r.target_holon_id === rootId);
    const childIds = childRelations.map(r => r.source_holon_id);
    const visibleIds = [rootId, ...childIds];
    const visible = holons.filter(h => visibleIds.includes(h.id));

    cy.elements().remove();
    cy.add(visible.map(h => ({
      group: 'nodes',
      data: { id: h.id, label: h.name || '(unnamed)', holon: h },
      classes: h.id === rootId ? 'root' : '',
    })));
    cy.add(childRelations.map(r => ({
      group: 'edges',
      data: {
        id: r.id,
        source: r.source_holon_id,
        target: r.target_holon_id,
        label: r.relationship_type || '',
      },
    })));

    cy.layout({
      name: 'concentric',
      concentric: node => node.id() === rootId ? 2 : 1,
      levelWidth: () => 1,
      minNodeSpacing: 80,
      padding: 50,
      animate: true,
    }).run();

    cy.getElementById(rootId).select();
    cy.center(cy.getElementById(rootId));
  }
}
