console.log("=== NEW APP.JS LOADED ===");

import { initAuth } from './auth.js';
import { eBliss } from './eBSDK.js';
import { loadHolons } from './holons.js';
import { createTree } from './tree.js';
import { eBStatus } from './eBStatus.js';
import { createHolonGrid, createRelationshipGrid, setRelationships } from './grid.js';

const status = eBStatus;
const elements = {
  app: document.getElementById('app'), auth: document.getElementById('auth'),
  tree: document.getElementById('treeGrid'), treeRoot: document.getElementById('treeRoot'),
  treeRelationship: document.getElementById('treeRelationship'), grid: document.getElementById('grid'),
  detailGrid: document.getElementById('detailGrid'), activeList: document.getElementById('activeList'),
  listMode: document.getElementById('listMode'), refresh: document.getElementById('refresh'),
  refreshApp: document.getElementById('refreshApp'), debugApp: document.getElementById('debugApp'),
  testStatusSuccess: document.getElementById('testStatusSuccess'), testStatusWarn: document.getElementById('testStatusWarn'),
  testStatusError: document.getElementById('testStatusError'),
};

let holons = [], relationships = [], relationshipTypes = [];
let treeGrid = null, holonGrid = null, relationshipGrid = null;

function setStatus(text, level = 'info')
{
  if (!text) return status.clear();
  status[level](text);
}

function openHolon(holon)
{
  elements.activeList.textContent = holon.name || '(unnamed)';
  elements.listMode.textContent = holon.holon_type || 'Holon';
  setRelationships(relationshipGrid, relationships.filter(r => r.source_holon_id === holon.id || r.target_holon_id === holon.id));
}

function populateTreeSelectors()
{
  elements.treeRoot.replaceChildren(...holons.map(h => Object.assign(document.createElement('option'), { value: h.id, textContent: h.name || '(unnamed)' })));
  elements.treeRelationship.replaceChildren(...relationshipTypes.map(t => Object.assign(document.createElement('option'), { value: t.id, textContent: t.name || '(unnamed)' })));
  const root = holons.find(h => h.name === 'Lists Tree');
  const relationship = relationshipTypes.find(t => t.name?.toLowerCase() === 'branch of');
  if (root) elements.treeRoot.value = root.id;
  if (relationship) elements.treeRelationship.value = relationship.id;
}

async function deleteHolon(holon)
{
  const name = holon.name || '(unnamed)';
  if (!confirm(`Delete “${name}”?`)) return;
  setStatus(`Deleting ${name}…`);
  try { await eBliss.holons.delete(holon.id); await loadModel(); setStatus(`Deleted ${name}`, 'success'); }
  catch (error) { setStatus(error.message || 'Unable to delete Holon', 'error'); }
}

async function createHolon()
{
  const name = prompt('Holon name:');
  if (!name?.trim()) return;
  const holonType = prompt('Holon type:', 'Holon');
  if (!holonType?.trim()) return;
  setStatus(`Creating ${name.trim()}…`);
  try { await eBliss.holons.create({ name: name.trim(), holon_type: holonType.trim() }); await loadModel(); setStatus(`Created ${name.trim()}`, 'success'); }
  catch (error) { setStatus(error.message || 'Unable to create Holon', 'error'); }
}

async function editHolon(holon)
{
  const name = prompt('Holon name:', holon.name || '');
  if (name === null) return;
  const holonType = prompt('Holon type:', holon.holon_type || 'Holon');
  if (holonType === null) return;
  setStatus(`Updating ${name.trim() || '(unnamed)'}…`);
  try { await eBliss.holons.update(holon.id, { name: name.trim(), holon_type: holonType.trim() }); await loadModel(); setStatus('Holon updated', 'success'); }
  catch (error) { setStatus(error.message || 'Unable to update Holon', 'error'); }
}

async function deleteRelationship(relationship)
{
  if (!confirm('Delete this relationship?')) return;
  setStatus('Deleting relationship…');
  try { await eBliss.relationships.delete(relationship.id); await loadModel(); setStatus('Relationship deleted', 'success'); }
  catch (error) { setStatus(error.message || 'Unable to delete relationship', 'error'); }
}

async function createRelationship()
{
  if (holons.length < 2 || !relationshipTypes.length) return setStatus('Need at least two holons and one relationship type', 'warn');
  const source = prompt(`Source Holon ID:\n${holons.map(h => `${h.id} — ${h.name}`).join('\n')}`);
  if (!source) return;
  const target = prompt(`Target Holon ID:\n${holons.map(h => `${h.id} — ${h.name}`).join('\n')}`);
  if (!target) return;
  const type = prompt(`Relationship Type ID:\n${relationshipTypes.map(t => `${t.id} — ${t.name}`).join('\n')}`);
  if (!type) return;
  setStatus('Creating relationship…');
  try { await eBliss.relationships.create({ source_holon_id: source, target_holon_id: target, relationship_type_id: type, position: 0 }); await loadModel(); setStatus('Relationship created', 'success'); }
  catch (error) { setStatus(error.message || 'Unable to create relationship', 'error'); }
}

async function editRelationship(relationship)
{
  const position = prompt('Position:', relationship.position ?? 0);
  if (position === null) return;
  setStatus('Updating relationship…');
  try { await eBliss.relationships.update(relationship.id, { position: Number(position) || 0 }); await loadModel(); setStatus('Relationship updated', 'success'); }
  catch (error) { setStatus(error.message || 'Unable to update relationship', 'error'); }
}

function holonMenu(event, holon, show)
{
  show([
    { label: 'New Holon', action: createHolon },
    { label: 'Edit', action: () => editHolon(holon) },
    { label: 'Delete', action: () => deleteHolon(holon) },
  ]);
}

function relationshipMenu(event, relationship, show)
{
  show([
    { label: 'New Relationship', action: createRelationship },
    { label: 'Edit', action: () => editRelationship(relationship) },
    { label: 'Delete', action: () => deleteRelationship(relationship) },
  ]);
}

function createViews()
{
  treeGrid?.destroy(); holonGrid?.destroy(); relationshipGrid?.destroy();
  treeGrid = createTree({ element: elements.tree, holons, relationships, rootId: elements.treeRoot.value, relationshipTypeId: elements.treeRelationship.value, onSelect: openHolon, onDelete: deleteHolon });
  holonGrid = createHolonGrid({ element: elements.grid, holons, onSelect: openHolon, onContextMenu: holonMenu });
  relationshipGrid = createRelationshipGrid({ element: elements.detailGrid, relationships, onContextMenu: relationshipMenu });
}

async function loadModel()
{
  setStatus('Loading Holon model…');
  try { const model = await loadHolons(eBliss); holons = model.holons; relationships = model.relationships; relationshipTypes = model.relationshipTypes; populateTreeSelectors(); createViews(); setStatus(`${holons.length} holons · ${relationships.length} relationships`, 'success'); }
  catch (error) { setStatus(error.message || 'Unable to load Holon model', 'error'); }
}

async function applySession(session)
{
  const user = session?.user || null;
  elements.app.hidden = !user; elements.refresh.disabled = !user;
  if (user) return loadModel();
  holons = []; relationships = []; relationshipTypes = [];
  treeGrid?.destroy(); holonGrid?.destroy(); relationshipGrid?.destroy();
  treeGrid = holonGrid = relationshipGrid = null;
  setStatus('Sign in to open the Holon Workspace');
}

elements.treeRoot.addEventListener('change', createViews);
elements.treeRelationship.addEventListener('change', createViews);
elements.refresh.addEventListener('click', loadModel);
elements.refreshApp.addEventListener('click', () => location.reload());
elements.debugApp.addEventListener('click', () => { setStatus('Debugger paused', 'warn'); debugger; });
elements.testStatusSuccess.addEventListener('click', () => setStatus('Test success message', 'success'));
elements.testStatusWarn.addEventListener('click', () => setStatus('Test warning message', 'warn'));
elements.testStatusError.addEventListener('click', () => setStatus('Test error message', 'error'));

const authResult = initAuth({ api: eBliss, container: elements.auth, setStatus, onSession: applySession });
authResult.then(({ data, error }) => { if (error) setStatus(error.message, 'error'); else applySession(data.session); });
