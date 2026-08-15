export function createHolabase(client) {
  return {
    async getTemplates(ownerId) {
      const { data, error } = await client
        .from('templates')
        .select('*, template_fields(*)')
        .eq('owner_id', ownerId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    async createHolon({ ownerId, template, values = {} }) {
      const { data: holon, error } = await client.from('holons').insert({
        owner_id: ownerId,
        template_id: template?.id || null,
        type_name: template?.name || null
      }).select().single();
      if (error) throw error;
      const fields = (template?.template_fields || []).map((field, position) => ({
        holon_id: holon.id,
        name: field.name,
        field_type: field.field_type,
        value: Object.prototype.hasOwnProperty.call(values, field.name) ? values[field.name] : field.default_value,
        position
      }));
      if (fields.length) {
        const { error: fieldError } = await client.from('holon_fields').insert(fields);
        if (fieldError) throw fieldError;
      }
      return holon;
    },
    async addToList({ listId, holonId, ownerId, position }) {
      const { data, error } = await client.from('list_holons').insert({
        list_id: listId, holon_id: holonId, owner_id: ownerId, position
      }).select().single();
      if (error) throw error;
      return data;
    },
    async getListHolons(listId) {
      const { data, error } = await client
        .from('list_holons')
        .select('id, position, created_at, holon:holons(id, type_name, template_id, holon_fields(id, name, field_type, value, position))')
        .eq('list_id', listId)
        .order('position')
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
    async updateField(fieldId, value) {
      const { error } = await client.from('holon_fields').update({ value }).eq('id', fieldId);
      if (error) throw error;
    }
  };
}
