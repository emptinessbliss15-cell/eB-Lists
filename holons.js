export async function loadHolons(supabase)
{
  const [holonResult, relationshipResult] = await Promise.all([
    supabase.from('holons_view').select('*').order('created_at'),
    supabase.from('relationships_view').select('*').order('position').order('created_at'),
  ]);

  if (holonResult.error)
  {
    throw new Error(`Holons: ${holonResult.error.message}`);
  }

  if (relationshipResult.error)
  {
    throw new Error(`Relationships: ${relationshipResult.error.message}`);
  }

  return {
    holons: holonResult.data || [],
    relationships: relationshipResult.data || [],
  };
}

export function childrenOf(holonId, holons, relationships)
{
  return relationships
    .filter(relationship => relationship.target_holon_id === holonId)
    .sort((a, b) => (a.position ?? 999999) - (b.position ?? 999999))
    .map(relationship => holons.find(holon => holon.id === relationship.source_holon_id))
    .filter(Boolean);
}

export function buildTreeData(holons, relationships)
{
  const roots = holons.filter(holon =>
    !relationships.some(relationship => relationship.source_holon_id === holon.id)
  );
  const rows = roots.length ? roots : holons;

  return rows.map(root => addChildren(root, holons, relationships, new Set()));
}

function addChildren(holon, holons, relationships, path)
{
  if (path.has(holon.id))
  {
    return { ...holon };
  }

  const nextPath = new Set(path);
  nextPath.add(holon.id);

  const children = childrenOf(holon.id, holons, relationships);

  return {
    ...holon,
    children: children.map(child => addChildren(child, holons, relationships, nextPath)),
  };
}
