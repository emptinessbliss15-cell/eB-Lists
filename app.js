console.log("=== NEW APP.JS LOADED ===");
console.log("app.js timestamp test");

import { initAuth } from './auth.js';
import { loadHolons } from './holons.js';
import { createTree } from './tree.js';
import { status } from './status.js';
import {
  createHolonGrid,
  createRelationshipGrid,
  setRelationships,
} from './grid.js';

const supabase = window.supabase.createClient(
  'https://zaabghrczrbqkxrhkinj.supabase.co',
  'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF'
);

const elements = {
  app: document.getElementById('app'),
  auth: document.getElementById('auth'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  tree: document.getElementById('treeGrid'),
  treeRoot: document.getElementById('treeRoot'),
  treeRelationship: document.getElementById('treeRelationship'),
  grid: document.getElementById('grid'),
  detailGrid: document.getElementById('detailGrid'),
  activeList: document.getElementById('activeList'),
  listMode: document.getElementById('listMode'),
  user: document.getElementById('user'),
  signIn: document.getElementById('signIn'),
  signUp: document.getElementById('signUp'),
  signOut: document.getElementById('signOut'),
  refresh: document.getElementById('refresh'),
};

let holons = [];
let relationships = [];
let relationshipTypes = [];
let treeGrid = null;
let holonGrid = null;
let relationshipGrid = null;

function setStatus(text)
{
  if (!text)
  {
    status.clear();
    return;
  }

  status.info(text);
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
    const relationshipResult = await supabase
      .from('relationships')
      .delete()
      .or(`source_holon_id.eq.${holon.id},target_holon_id.eq.${holon.id}`);

    if (relationshipResult.error)
    {
      throw new Error(`Relationships: ${relationshipResult.error.message}`);
    }

    const holonResult = await supabase
      .from('holons')
      .delete()
      .eq('id', holon.id);

    if (holonResult.error)
    {
      throw new Error(`Holon: ${holonResult.error.message}`);
    }

    await loadModel();
    setStatus(`Deleted ${name}`);
  }
  catch (error)
  {
    setStatus(error.message || 'Unable to delete Holon');
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
    const model = await loadHolons(supabase);
    holons = model.holons;
    relationships = model.relationships;
    relationshipTypes = model.relationshipTypes;

    populateTreeSelectors();
    createViews();
    setStatus(`${holons.length} holons · ${relationships.length} relationships`);
  }
  catch (error)
  {
    setStatus(error.message || 'Unable to load Holon model');
  }
}

async function applySession(session)
{
  const user = session?.user || null;
  elements.auth.hidden = !!user;
  elements.app.hidden = !user;
  elements.user.textContent = user?.email || '';
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

const authResult = initAuth({
  supabase,
  elements: {
    signIn: elements.signIn,
    signUp: elements.signUp,
    signOut: elements.signOut,
    email: elements.email,
    password: elements.password,
    setStatus,
  },
  onSession: applySession,
});

authResult.then(({ data, error }) =>
{
  if (error)
  {
    setStatus(error.message);
    return;
  }

  applySession(data.session);
});
