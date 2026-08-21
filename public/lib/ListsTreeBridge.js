export function connectListsTree(tree, { supabase, refresh }) {
  if (!tree || !supabase) return () => {};

  return tree.on('move', async ({ node, target }) => {
    if (!node || !target) return;

    // Lists owns persistence semantics; Tree only reports the requested move.
    const sameParent = (node.parent_list_id ?? null) === (target.parent_list_id ?? null);
    if (!sameParent) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data: siblings, error } = await supabase
      .from('lists')
      .select('id, position')
      .eq('owner_id', userId)
      .is('parent_list_id', node.parent_list_id ?? null)
      .order('position')
      .order('created_at');

    if (error) throw error;

    const source = siblings?.find(item => item.id === node.id);
    const destination = siblings?.find(item => item.id === target.id);
    if (!source || !destination) return;

    const first = await supabase
      .from('lists')
      .update({ position: destination.position })
      .eq('id', source.id)
      .eq('owner_id', userId);
    if (first.error) throw first.error;

    const second = await supabase
      .from('lists')
      .update({ position: source.position })
      .eq('id', destination.id)
      .eq('owner_id', userId);
    if (second.error) throw second.error;

    await refresh();
  });
}
