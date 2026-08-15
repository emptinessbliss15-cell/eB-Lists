const content=document.querySelector('.eb-content');
const originalContent=content?.innerHTML;

function renderSystemView(node){
  if(!content)return;
  if(node.type==='theme'){
    content.innerHTML=`<div class="eb-subheader"><div class="eb-subheader-inner"><strong>Theme Editor</strong><span class="eb-muted">Database-driven presentation</span></div></div><section class="eb-card"><h2>Theme</h2><p class="eb-muted">Theme settings will be editable here. This view is now selected by the tree node type rather than by the Lists application.</p><div class="eb-row"><label>Density <select><option>Compact</option><option>Comfortable</option></select></label><label>Appearance <select><option>System</option><option>Light</option><option>Dark</option></select></label></div></section>`;
  }else if(node.type==='type'){
    content.innerHTML=`<div class="eb-subheader"><div class="eb-subheader-inner"><strong>Type Editor</strong><span class="eb-muted">Data schema and UI fields</span></div></div><section class="eb-card"><h2>Types</h2><p class="eb-muted">Choose or create an object type. Its fields will determine the content UI rendered on the right.</p><div class="eb-row"><button type="button" class="secondary">Todo</button><button type="button" class="secondary">Shopping Item</button><button type="button">+ New Type</button></div></section>`;
  }
}

document.addEventListener('eb:view-requested',e=>{const {node,view}=e.detail||{};if(view==='theme-editor'||view==='type-editor')renderSystemView(node);});
