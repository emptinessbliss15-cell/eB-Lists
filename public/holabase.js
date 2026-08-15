export function createHolabase(client) {
  return {
    async getTemplates(ownerId) {
      const { data, error } = await client.from('templates').select('*, template_fields(*)').eq('owner_id', ownerId).order('name');
      if (error) throw error;
      return data || [];
    },
    async createHolon({ ownerId, template, values = {} }) {
      const { data: holon, error } = await client.from('holons').insert({ owner_id: ownerId, template_id: template?.id || null, type_name: template?.name || null }).select().single();
      if (error) throw error;
      const fields = (template?.template_fields || []).map((field, position) => ({ holon_id: holon.id, name: field.name, field_type: field.field_type, value: Object.prototype.hasOwnProperty.call(values, field.name) ? values[field.name] : field.default_value, position }));
      if (fields.length) { const { error: fieldError } = await client.from('holon_fields').insert(fields); if (fieldError) throw fieldError; }
      return holon;
    },
    async addToList({ listId, holonId, ownerId, position, parentHolonId = null, executionMode = 'parallel' }) {
      const { data, error } = await client.from('list_holons').insert({ list_id: listId, holon_id: holonId, owner_id: ownerId, position, parent_holon_id: parentHolonId, execution_mode: executionMode }).select().single();
      if (error) throw error;
      return data;
    },
    async getListHolons(listId) {
      // Explicitly select the item relationship. list_holons also references holons
      // through parent_holon_id, so an implicit embed is ambiguous in Supabase/PostgREST.
      const { data, error } = await client.from('list_holons').select('id, list_id, holon_id, position, parent_holon_id, execution_mode, created_at, holon:holons!list_holons_holon_id_fkey(id, type_name, template_id, holon_fields(id, name, field_type, value, position))').eq('list_id', listId).order('position').order('created_at');
      if (error) throw error;
      return data || [];
    },
    async updateField(fieldId, value) {
      const { error } = await client.from('holon_fields').update({ value }).eq('id', fieldId);
      if (error) throw error;
    },
    async updateListHolon(id, patch) {
      const allowed = {};
      if (Object.prototype.hasOwnProperty.call(patch, 'parent_holon_id')) allowed.parent_holon_id = patch.parent_holon_id;
      if (Object.prototype.hasOwnProperty.call(patch, 'execution_mode')) allowed.execution_mode = patch.execution_mode;
      if (Object.prototype.hasOwnProperty.call(patch, 'position')) allowed.position = patch.position;
      const { data, error } = await client.from('list_holons').update(allowed).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
  };
}
