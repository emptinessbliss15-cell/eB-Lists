/*
 * eB-Lists -> Holabase adapter
 *
 * The legacy lists/list_items model remains intact. This module provides the
 * first bridge into the generalized Holon model without changing existing
 * list behavior.
 */

export function createHolabaseAdapter(supabaseClient) {
  async function createHolon({ ownerId, typeName = null, templateId = null, fields = [], parent = null }) {
    const { data: holon, error } = await supabaseClient
      .from('holons')
      .insert({ owner_id: ownerId, type_name: typeName, template_id: templateId })
      .select()
      .single();
    if (error) throw error;

    if (fields.length) {
      const rows = fields.map((field, position) => ({
        holon_id: holon.id,
        name: field.name,
        field_type: field.fieldType ?? field.field_type ?? 'text',
        value: field.value ?? null,
        position
      }));
      const { error: fieldError } = await supabaseClient.from('holon_fields').insert(rows);
      if (fieldError) throw fieldError;
    }

    if (parent) {
      const { error: childError } = await supabaseClient.from('holon_children').insert({
        parent_holon_id: parent.parentHolonId,
        child_holon_id: holon.id,
        relationship_name: parent.relationshipName ?? null,
        position: parent.position ?? 0
      });
      if (childError) throw childError;
    }

    return holon;
  }

  async function attachHolonToList({ listId, holonId, ownerId, position = 0 }) {
    const { data, error } = await supabaseClient
      .from('list_holons')
      .insert({ list_id: listId, holon_id: holonId, owner_id: ownerId, position })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function getListHolons(listId) {
    const { data, error } = await supabaseClient
      .from('list_holons')
      .select('id, list_id, holon_id, position, holons(*)')
      .eq('list_id', listId)
      .order('position');
    if (error) throw error;
    return data ?? [];
  }

  async function getTemplates(ownerId) {
    const { data, error } = await supabaseClient
      .from('templates')
      .select('*, template_fields(*), template_children(*)')
      .eq('owner_id', ownerId)
      .order('name');
    if (error) throw error;
    return data ?? [];
  }

  return { createHolon, attachHolonToList, getListHolons, getTemplates };
}
