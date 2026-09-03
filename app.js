console.log("=== NEW APP.JS LOADED ===");
console.log("app.js timestamp test");

import { initAuth } from './auth.js';
import { eBliss } from './ebliss.js';
import { loadHolons } from './holons.js';
import { createTree } from './tree.js';
import { status } from './status.js';
import {
  createHolonGrid,
  createRelationshipGrid,
  setRelationships,
} from './grid.js';

const elements = {
  app: document.getElementById('app'),
  auth: document.getElementById('auth'),
  tree: document.getElementById('treeGrid'),
  treeRoot: document.getElementById('treeRoot'),
  treeRelationship: document.getElementById('treeRelationship'),
  grid: document.getElementById('grid'),
  detailGrid: document.getElementById('detailGrid'),
  activeList: document.getElementById('activeList'),
  listMode: document.getElementById('listMode'),
  refresh: document.getElementById('refresh'),
  refreshApp: document.getElementById('refreshApp'),
  debugApp: document.getElementById('debugApp'),
  testStatusSuccess: document.getElementById('testStatusSuccess'),
  testStatusWarn: document.getElementById('testStatusWarn'),
  testStatusError: document.getElementById('testStatusError'),
};

let holons = [];
let relationships = [];
let relationshipTypes = [];
let treeGrid = null;
let holonGrid = null;
let relationshipGrid = null;

function setStatus(text, level = 'info')
{
  if (!text)
  {
    status.clear();
    return;
  }

  status[level](text);
}

function openHolon(holon)
{
  elements.activeList.textContent = holon.name || '(unnamed)';
  elements.listMode.textContent = holon.holon_type || 'Holon';

  const related = relationships.filter(relationship =>
    relationship.source_holon_id === holon.id ||
    relationship.target_holon_id === holon.id
  );

  setRelationships(relationshipGrid, related);
}

function populateTreeSelectors()
{
  elements.treeRoot.innerHTML = '';
  holons.forEach(holon =>
  {
    const option = document.createElement('option');
    option.value = holon.id;
    option.textContent = holon.name || '(unnamed)';
    elements.treeRoot.appendChild(option);
  });

  elements.treeRelationship.innerHTML = '';
  relationshipTypes.forEach(type =>
  {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.name || '(unnamed)';
    elements.treeRelationship.appendChild(option);
  });

  const root = holons.find(holon => holon.name === 'Lists Tree');
  const relationship = relationshipTypes.find(type =>
    type.name?.toLowerCase() === 'branch of'
  );

  if (root) elements.treeRoot.value = root.id;
  if (relationship) elements.treeRelationship.value = relationship.id;
}

async function deleteHolon(holon)
{
  const name = holon.name || '(unnamed)';
  if (!confirm(`Delete “${name}”?`)) return;

  setStatus(`Deleting ${name}…`);

  try
  {
    await eBliss.holons.delete(holon.id);
    await loadModel();
    setStatus(`Deleted ${name}`, 'success');
  }
  catch (error)
  {
    setStatus(error.message || 'Unable to delete Holon', 'error');
  }
}

function createViews()
{
  treeGrid?.destroy();
  holonGrid?.destroy();
  relationshipGrid?.destroy();

  treeGrid = createTree({
    element: elements.tree,
    holons,
    relationships,
    rootId: elements.treeRoot.value,
    relationshipTypeId: elements.treeRelationship.value,
    onSelect: openHolon,
    onDelete: deleteHolon,
  });

  holonGrid = createHolonGrid({
    element: elements.grid,
    holons,
    onSelect: openHolon,
  });

  relationshipGrid = createRelationshipGrid({
    element: elements.detailGrid,
    relationships,
  });
}

async function loadModel()
{
  setStatus('Loading Holon model…');

  try
  {
    const model = await loadHolons(eBliss);
    holons = model.holons;
    relationships = model.relationships;
    relationshipTypes = model.relationshipTypes;

    populateTreeSelectors();
    createViews();
    setStatus(`${holons.length} holons · ${relationships.length} relationships`, 'success');
  }
  catch (error)
  {
    setStatus(error.message || 'Unable to load Holon model', 'error');
  }
}

async function applySession(session)
{
  const user = session?.user || null;
  elements.app.hidden = !user;
  elements.refresh.disabled = !user;

  if (user)
  {
    await loadModel();
    return;
  }

  holons = [];
  relationships = [];
  relationshipTypes = [];
  treeGrid?.destroy();
  holonGrid?.destroy();
  relationshipGrid?.destroy();
  treeGrid = null;
  holonGrid = null;
  relationshipGrid = null;
  setStatus('Sign in to open the Holon Workspace');
}

elements.treeRoot.addEventListener('change', createViews);
elements.treeRelationship.addEventListener('change', createViews);
elements.refresh.addEventListener('click', loadModel);
elements.refreshApp.addEventListener('click', () =>
{
  location.reload();
});
elements.debugApp.addEventListener('click', () =>
{
  setStatus('Debugger paused', 'warn');
  debugger;
});
elements.testStatusSuccess.addEventListener('click', () =>
{
  setStatus('Test success message', 'success');
});
elements.testStatusWarn.addEventListener('click', () =>
{
  setStatus('Test warning message', 'warn');
});
elements.testStatusError.addEventListener('click', () =>
{
  setStatus('Test error message', 'error');
});

const authResult = initAuth({
  api: eBliss,
  container: elements.auth,
  setStatus,
  onSession: applySession,
});

authResult.then(({ data, error }) =>
{
  if (error)
  {
    setStatus(error.message, 'error');
    return;
  }

  applySession(data.session);
});
