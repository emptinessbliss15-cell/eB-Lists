import './build-status.js';

const items = document.getElementById('items');

function addCheckbox(row) {
  if (row.querySelector('.eb-item-check')) return;
  const textButton = row.querySelector('.eb-item-text');
  if (!textButton) return;

  const checked = textButton.textContent.trim().startsWith('✓ ');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'eb-item-check';
  checkbox.checked = checked;
  checkbox.title = checked ? 'Mark incomplete' : 'Mark complete';
  checkbox.setAttribute('aria-label', checked ? 'Mark incomplete' : 'Mark complete');
  checkbox.addEventListener('click', event => {
    event.stopPropagation();
    textButton.click();
  });
  row.insertBefore(checkbox, textButton);
}

function scan() {
  items.querySelectorAll('.eb-item-row').forEach(addCheckbox);
}

new MutationObserver(scan).observe(items, { childList: true });
scan();
