// eBComboBox - eBliss wrapper around hcg-autocomplete.
// Keeps the third-party component generic while giving eB a stable Holon-friendly interface.

export function createEBComboBox(target, options = {})
{
  if (!window.hcgAutocomplete) throw new Error('hcg-autocomplete is not loaded');

  const source = options.source || [];
  const api = window.hcgAutocomplete(target, {
    source,
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

  // hcg-autocomplete only considers committed selections part of getValue().
  // eB also needs to preserve a freeform value that is still in the input
  // when the surrounding form is submitted.
  const baseGetValue = api.getValue.bind(api);
  const getPendingValue = () => (api.input?.value || '').trim();

  const findSourceValue = (text) => {
    const normalized = text.toLowerCase();
    const match = Array.isArray(source)
      ? source.find(item => {
          const value = typeof item === 'object' && item !== null ? item.value : item;
          const label = typeof item === 'object' && item !== null ? item.label : item;
          return String(label ?? '').toLowerCase() === normalized
            || String(value ?? '').toLowerCase() === normalized;
        })
      : null;
    if (!match) return text;
    return typeof match === 'object' && match !== null
      ? String(match.value ?? match.label ?? text)
      : String(match);
  };

  api.getValue = () => {
    const selected = baseGetValue();
    const pending = getPendingValue();
    if (!pending) return selected;

    const pendingValue = findSourceValue(pending);
    if (Array.isArray(selected)) {
      return selected.includes(pendingValue) ? selected : [...selected, pendingValue];
    }
    return selected || pendingValue;
  };

  return api;
}

export function holonComboOptions(holons = [])
{
  return holons.map(holon => ({
    value: holon.id,
    label: holon.name || '(unnamed)',
  }));
}
