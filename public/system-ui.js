(() => {
  const SUPABASE_URL='https://zaabghrczrbqkxrhkinj.supabase.co';
  const SUPABASE_KEY='sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF';
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const tree=document.getElementById('tree');
  if(!tree)return;

  const style=document.createElement('style');
  style.textContent=`
    .eb-system-break{border-top:1px solid #8886;margin:7px 4px 4px}
    .eb-system-node{display:flex;min-width:0}
    .eb-system-node button{width:100%;text-align:left;border:0;background:transparent;color:inherit;padding:4px 6px;margin:0;border-radius:3px;font-size:13px}
    .eb-system-node button:hover,.eb-system-node button[aria-current="true"]{background:#8882}
    .eb-system-view{padding:8px 0}
    .eb-system-view h3{margin:0 0 8px;font-size:16px}
    .eb-system-view .eb-system-card{border:1px solid #8886;border-radius:5px;padding:8px;margin:6px 0}
    .eb-system-view .eb-system-card h4{margin:0 0 5px;font-size:14px}
    .eb-system-view label{display:flex;align-items:center;gap:6px;margin:5px 0;font-size:13px}
    .eb-system-view input,.eb-system-view select{max-width:360px}
    .eb-template-field{font-size:12px;opacity:.8;margin-left:12px}
  `;
  document.head.appendChild(style);

  function systemView(){
    let view=document.getElementById('systemView');
    if(!view){
      view=document.createElement('div');view.id='systemView';view.className='eb-system-view';
      const workspace=document.getElementById('listWorkspace');
      workspace.parentNode.insertBefore(view,workspace);
    }
    document.getElementById('listWorkspace').hidden=true;
    document.getElementById('contentFrame').hidden=true;
    view.hidden=false;
    return view;
  }

  function hideSystemView(){const v=document.getElementById('systemView');if(v)v.hidden=true;document.getElementById('listWorkspace').hidden=false;}

  function addSystemNodes(){
    if(!tree || tree.dataset.systemNodes==='1')return;
    const breakEl=document.createElement('div');breakEl.className='eb-system-break';
    tree.appendChild(breakEl);
    for(const node of [{name:'Themes',key:'theme'},{name:'Templates',key:'templates'}]){
      const row=document.createElement('div');row.className='eb-system-node';
      const button=document.createElement('button');button.type='button';button.textContent='• '+node.name;
      button.onclick=()=>node.key==='theme'?showTheme():showTemplates();
      row.appendChild(button);tree.appendChild(row);
    }
    tree.dataset.systemNodes='1';
  }

  function refreshSystemNodes(){
    tree.dataset.systemNodes='';
    tree.querySelectorAll('.eb-system-break,.eb-system-node').forEach(el=>el.remove());
    addSystemNodes();
  }

  async function showTheme(){
    hideTreeSelection();
    const view=systemView();
    document.getElementById('appTitle').textContent='Themes';
    const savedDensity=localStorage.getItem('eb-density')||'compact';
    const savedAppearance=localStorage.getItem('eb-appearance')||'system';
    view.innerHTML=`<h3>Theme</h3><div class="eb-system-card"><label>Density <select id="ebThemeDensity"><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label><label>Appearance <select id="ebThemeAppearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><p class="muted">Theme controls are applied locally to this browser.</p></div>`;
    document.getElementById('ebThemeDensity').value=savedDensity;
    document.getElementById('ebThemeAppearance').value=savedAppearance;
    document.getElementById('ebThemeDensity').onchange=e=>{localStorage.setItem('eb-density',e.target.value);document.body.dataset.density=e.target.value;};
    document.getElementById('ebThemeAppearance').onchange=e=>{localStorage.setItem('eb-appearance',e.target.value);applyAppearance(e.target.value);};
    document.body.dataset.density=savedDensity;applyAppearance(savedAppearance);
  }

  function applyAppearance(value){
    document.documentElement.dataset.appearance=value;
    document.documentElement.style.colorScheme=value==='system'?'':value;
  }

  function hideTreeSelection(){tree.querySelectorAll('.eb-tree-node[aria-current="true"],.eb-system-node button[aria-current="true"]').forEach(b=>b.setAttribute('aria-current','false'));}

  async function showTemplates(){
    hideTreeSelection();
    const view=systemView();
    document.getElementById('appTitle').textContent='Templates';
    view.innerHTML='<h3>Templates</h3><div id="ebTemplatesList" class="muted">Loading…</div><button id="ebNewTemplate" type="button">+ New template</button>';
    const userResult=await db.auth.getUser();
    const user=userResult.data?.user;
    if(!user){view.querySelector('#ebTemplatesList').textContent='Sign in to manage templates.';return;}
    const {data,error}=await db.from('templates').select('id,name,description,created_at,template_fields(*)').eq('owner_id',user.id).order('name');
    if(error){view.querySelector('#ebTemplatesList').textContent=error.message;return;}
    const list=view.querySelector('#ebTemplatesList');list.innerHTML='';
    (data||[]).forEach(template=>renderTemplateCard(list,template));
    view.querySelector('#ebNewTemplate').onclick=async()=>{
      const name=prompt('Template name:');if(!name?.trim())return;
      const {error}=await db.from('templates').insert({owner_id:user.id,name:name.trim(),description:''});
      if(error)return alert(error.message);showTemplates();
    };
  }

  function renderTemplateCard(parent,template){
    const card=document.createElement('div');card.className='eb-system-card';
    card.innerHTML=`<h4></h4><label>Name <input data-name></label><label>Description <input data-description></label><div class="muted">Fields</div><div data-fields></div><button type="button" data-save>Save</button>`;
    card.querySelector('h4').textContent=template.name;
    card.querySelector('[data-name]').value=template.name;
    card.querySelector('[data-description]').value=template.description||'';
    const fields=card.querySelector('[data-fields]');
    (template.template_fields||[]).sort((a,b)=>a.position-b.position).forEach(field=>{const row=document.createElement('div');row.className='eb-template-field';row.textContent=`${field.name} · ${field.field_type} · ${field.cardinality}`;fields.appendChild(row);});
    card.querySelector('[data-save]').onclick=async()=>{
      const name=card.querySelector('[data-name]').value.trim();if(!name)return;
      const description=card.querySelector('[data-description]').value.trim();
      const {error}=await db.from('templates').update({name,description}).eq('id',template.id);
      if(error)return alert(error.message);showTemplates();
    };
    parent.appendChild(card);
  }

  const observer=new MutationObserver(()=>{
    if(!tree.dataset.systemNodes && tree.children.length) addSystemNodes();
  });
  observer.observe(tree,{childList:true});
  setTimeout(addSystemNodes,300);
  window.addEventListener('eb:lists-rendered',refreshSystemNodes);
})();
