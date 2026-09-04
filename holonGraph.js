// Holon Graph — visual model of Holons and their relationships.
// Cytoscape is kept as the rendering primitive; the app owns the Holon model.

let cy = null;
let currentModel = { holons: [], relationships: [], relationshipTypes: [] };

function relationshipLabel(relationship, relationshipTypes) {
  return relationship.relationship_type
    || relationship.relationship_type_name
    || relationshipTypes.find(type => type.id === relationship.relationship_type_id)?.name
    || 'relationship';
}

function buildElements(holons, relationships, relationshipTypes) {
  const nodes = holons.map(holon => ({
    data: {
      id: String(holon.id),
      label: holon.name || '(unnamed)',
      type: holon.holon_type || 'Holon',
      holon,
    },
  }));

  const edges = relationships
    .filter(relationship => holons.some(h => String(h.id) === String(relationship.source_holon_id))
      && holons.some(h => String(h.id) === String(relationship.target_holon_id)))
    .map(relationship => ({
      data: {
        id: String(relationship.id),
        source: String(relationship.source_holon_id),
        target: String(relationship.target_holon_id),
        label: relationshipLabel(relationship, relationshipTypes),
        relationship,
      },
    }));

  return [...nodes, ...edges];
}

function emitSelection(holon) {
  window.dispatchEvent(new CustomEvent('holon:selected', { detail: holon || null }));
}

export function createHolonGraph({ element, holons, relationships, relationshipTypes = [] }) {
  if (!element) return null;
  if (!window.cytoscape) throw new Error('Cytoscape is not loaded');

  cy?.destroy();
  currentModel = { holons, relationships, relationshipTypes };

  cy = window.cytoscape({
    container: element,
    elements: buildElements(holons, relationships, relationshipTypes),
    layout: { name: 'cose', animate: false, fit: true, padding: 40 },
    minZoom: 0.2,
    maxZoom: 3,
    wheelSensitivity: 0.25,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': '#5b8def',
          'color': '#fff',
          'font-size': 13,
          'font-weight': 600,
          'text-wrap': 'wrap',
          'text-max-width': 110,
          'width': 'label',
          'height': 'label',
          'padding': '14px',
          'shape': 'roundrectangle',
          'border-width': 2,
          'border-color': '#3769c5',
        },
      },
      {
        selector: 'node:selected',
        style: {
          'background-color': '#f59e0b',
          'border-color': '#b45309',
          'border-width': 3,
        },
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'bezier',
          'width': 2,
          'line-color': '#8a8a8a',
          'target-arrow-color': '#8a8a8a',
          'target-arrow-shape': 'triangle',
          'label': 'data(label)',
          'color': '#777',
          'font-size': 11,
          'text-background-color': '#fff',
          'text-background-opacity': 0.9,
          'text-background-padding': 2,
        },
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#f59e0b',
          'target-arrow-color': '#f59e0b',
          'width': 3,
        },
      },
    ],
  });

  cy.on('tap', 'node', event => emitSelection(event.target.data('holon')));
  cy.on('tap', event => {
    if (event.target === cy) emitSelection(null);
  });

  return cy;
}

export function updateHolonGraph(model) {
  if (!cy) return;
  const { holons = [], relationships = [], relationshipTypes = [] } = model || {};
  currentModel = { holons, relationships, relationshipTypes };
  cy.elements().remove();
  cy.add(buildElements(holons, relationships, relationshipTypes));
  cy.layout({ name: 'cose', animate: false, fit: true, padding: 40 }).run();
}

export function destroyHolonGraph() {
  cy?.destroy();
  cy = null;
  currentModel = { holons: [], relationships: [], relationshipTypes: [] };
}

export function getHolonGraph() {
  return cy;
}
