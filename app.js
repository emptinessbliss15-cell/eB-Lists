debugger;

console.log("=== NEW APP.JS LOADED ===");
console.log("app.js timestamp test");

import { initAuth } from './auth.js';
import { loadHolons } from './holons.js';
import { createTree } from './tree.js';
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
  status: document.getElementById('status'),
  app: document.getElementById('app'),
  auth: document.getElementById('auth'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  tree: document.getElementById('tree'),
  grid: document.getElementById('grid'),
  detailGrid: document.getElementById('detailGrid'),
  activeList: document.getElementById('activeList'),
  listMode: document.getElementById('listMode'),
  subheader: document.getElementById('subheader'),
  user: document.getElementById('user'),
  signIn: document.getElementById('signIn'),
  signUp: document.getElementById('signUp'),
  signOut: document.getElementById('signOut'),
};

let holons = [];
let relationships = [];
let treeGrid = null;
let holonGrid = null;
let relationshipGrid = null;

function setStatus(text)
{
  elements.status.textContent = text || '';
}

function setSubheader(text)
{
  elements.subheader.textContent = text || '';
}

function openHolon(holon)
{
  elements.activeList.textContent = holon.name || '(unnamed)';
  elements.listMode.textContent = holon.holon_type || 'Holon';
  setSubheader(`${holon.holon_type || 'Holon'} · ${holon.name || '(unnamed)'}`);

  const related = relationships.filter(relationship =>
    relationship.source_holon_id === holon.id ||
    relationship.target_holon_id === holon.id
  );

  setRelationships(relationshipGrid, related);
}

function createViews()
{
  debugger;
  treeGrid?.destroy();
  holonGrid?.destroy();
  relationshipGrid?.destroy();

  treeGrid = createTree({
    element: elements.tree,
    holons,
    relationships,
    onSelect: openHolon,
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
  debugger;

  try
  {
    const model = await loadHolons(supabase);
    holons = model.holons;
    relationships = model.relationships;

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

  if (user)
  {
    await loadModel();
    return;
  }

  holons = [];
  relationships = [];
  treeGrid?.destroy();
  holonGrid?.destroy();
  relationshipGrid?.destroy();
  treeGrid = null;
  holonGrid = null;
  relationshipGrid = null;
  setSubheader('Sign in to open the Holon Workspace');
  setStatus('');
}

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
