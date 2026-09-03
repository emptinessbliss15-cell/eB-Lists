// eBComboBox - eBliss wrapper around hcg-autocomplete.
// Keeps the third-party component generic while giving eB a stable Holon-friendly interface.

export function createEBComboBox(target, options = {})
{
  if (!window.hcgAutocomplete) throw new Error('hcg-autocomplete is not loaded');

  const api = window.hcgAutocomplete(target, {
    source: options.source || [],
    minChars: options.minChars ?? 1,
    debounce: options.debounce ?? 300,
    multiple: !!options.multiple,
    allowCustom: !!options.allowCustom,
    clearable: options.clearable ?? true,
    highlight: options.highlight ?? true,
    maxItems: options.maxItems ?? null,
    noResultsText: options.noResultsText || 'No results',
    onInput: options.onInput,
    onOpen: options.onOpen,
    onClose: options.onClose,
    onSelect: options.onSelect,
    onRemove: options.onRemove,
    onChange: options.onChange,
  });

  if (!api) throw new Error('Unable to initialize eBComboBox');
  return api;
}

export function holonComboOptions(holons = [])
{
  return holons.map(holon => ({
    value: holon.id,
    label: holon.name || '(unnamed)',
  }));
}
