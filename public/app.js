import './build-status.js';

const items = document.getElementById('items');

function addCheckbox(row) {
  if (row.querySelector('.eb-item-check')) return;
  const textButton = row.querySelector('.eb-item-text');
  if (!textButton) return;
  const checked = textButton.textContent.trim().startsWith('✓ ');
  const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.className='eb-item-check'; checkbox.checked=checked; checkbox.title=checked?'Mark incomplete':'Mark complete'; checkbox.setAttribute('aria-label',checkbox.title);
  checkbox.addEventListener('click',event=>{event.stopPropagation();textButton.click()}); row.insertBefore(checkbox,textButton);
}
function addUrlButton(row){
  if(row.querySelector('.eb-item-url')) return;
  const button=row.querySelector('.eb-item-text'); if(!button)return;
  const url=document.createElement('button'); url.className='secondary eb-item-url'; url.type='button'; url.textContent='↗'; url.title='Add or edit item URL';
  url.onclick=async e=>{e.stopPropagation(); const current=row.dataset.itemUrl||''; const value=prompt('Shopping/item URL:',current); if(value===null)return; const normalized=value.trim(); if(normalized && !/^https?:\/\//i.test(normalized)) return alert('URL must start with http:// or https://'); row.dataset.itemUrl=normalized; button.dataset.itemUrl=normalized; if(normalized) button.title=`Open: ${normalized}`; else button.removeAttribute('title'); document.dispatchEvent(new CustomEvent('eb:item-url-changed',{detail:{row,url:normalized}}));};
  const controls=row.querySelector('.eb-item-controls'); if(controls) controls.insertBefore(url,controls.firstChild); else row.appendChild(url);
}
function scan(){items.querySelectorAll('.eb-item-row').forEach(row=>{addCheckbox(row);addUrlButton(row)})}
new MutationObserver(scan).observe(items,{childList:true,subtree:true}); scan();
