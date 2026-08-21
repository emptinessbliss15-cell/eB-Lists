(() => {
  const status = document.querySelector('.cf-build-status');
  const tree = document.getElementById('tree');
  if (!status || !tree) return;
  const style = document.createElement('style');
  style.textContent = `.eb-tree-actions{opacity:1!important;visibility:visible!important}.eb-tree-action{border:1px solid transparent!important}.eb-tree-action:hover,.eb-tree-action:focus-visible{border-color:#8886!important;background:#8882!important;opacity:1!important}.eb-db-refresh{border:0;background:transparent;color:inherit;padding:3px 6px;margin:0 0 4px 0;border-radius:4px;cursor:pointer;font:inherit;font-size:12px;text-align:left}.eb-db-refresh:hover{background:#8882}.eb-tree-toolbar{display:flex;align-items:center;padding:2px 6px}.eb-tree-refresh{font-weight:600}.eb-list-refresh-row{display:flex;align-items:center;gap:6px;margin:0 0 4px 0}.eb-list-refresh-row button{border:0;background:transparent;color:inherit;padding:3px 6px;margin:0;border-radius:4px;cursor:pointer;font:inherit}.eb-list-refresh-row button:hover{background:#8882}.cf-build-status{cursor:default}.cf-build-status.is-error{opacity:.8}`;
  document.head.appendChild(style);
  const removeLegacyHelpText = () => document.querySelectorAll('p').forEach(p => { if (p.textContent.includes('Click the circle to complete.') || p.textContent.includes('Ordered lists also have move controls.')) p.remove(); });
  removeLegacyHelpText();
  let statusText = status.querySelector('.cf-status-text');
  if (!statusText) { statusText = document.createElement('span'); statusText.className='cf-status-text'; status.appendChild(statusText); }
  function setStatus(text,title,error=false){ statusText.textContent=text; status.title=title||''; status.classList.toggle('is-error',error); }
  function getListsApi(){ return window.eBLists||{}; }
  function installTreeRefresh(){
    if (!tree.isConnected) return;
    const existing=document.getElementById('treeDbRefreshToolbar');
    if(existing) return;
    const toolbar=document.createElement('div'); toolbar.id='treeDbRefreshToolbar'; toolbar.className='eb-tree-toolbar';
    const button=document.createElement('button'); button.id='treeDbRefresh'; button.className='eb-db-refresh eb-tree-refresh'; button.type='button'; button.title='Refresh Lists tree from database'; button.textContent='↻ Lists';
    button.onclick=async event=>{event.stopPropagation();const api=getListsApi();if(typeof api.refreshTree!=='function')return;button.disabled=true;try{await api.refreshTree();}finally{button.disabled=false;}};
    toolbar.append(button); tree.parentElement.insertBefore(toolbar,tree);
  }
  function installListRefresh(){
    const view=document.getElementById('listView'); if(!view||view.querySelector('#listDbRefreshRow'))return;
    const row=document.createElement('div');row.id='listDbRefreshRow';row.className='eb-list-refresh-row';
    const button=document.createElement('button');button.id='listDbRefresh';button.type='button';button.title='Refresh current list from database';button.textContent='↻';button.setAttribute('aria-label','Refresh current list from database');
    button.onclick=async event=>{event.stopPropagation();const api=getListsApi();if(typeof api.refreshList!=='function')return;button.disabled=true;try{await api.refreshList();}finally{button.disabled=false;}};
    row.append(button);view.prepend(row);
  }
  let currentFingerprint=null;
  let reloadScheduled=false;
  let checking=false;
  const WATCH_FILES=['/','/public/app.js','/public/build-status.js'];
  async function digest(text){
    const bytes=new TextEncoder().encode(text);
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,8);
  }
  async function getDeploymentFingerprint(){
    const parts=[];
    for(const path of WATCH_FILES){
      const response=await fetch(`${path}?__cf_watch=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
      const text=await response.text();
      parts.push(`${path}:${await digest(text)}`);
    }
    return parts.join('|');
  }
  async function refreshBuildStatus(){
    if(reloadScheduled||checking)return;
    checking=true;
    try{
      const fingerprint=await getDeploymentFingerprint();
      const shortFingerprint=await digest(fingerprint);
      const branch=location.hostname.includes('dev')?'dev':'main';
      const details=[`Branch ${branch}`,`Deployment fingerprint ${shortFingerprint}`,`Watcher checks every 5 seconds`,`Detection uses live application assets`];
      if(currentFingerprint&&fingerprint!==currentFingerprint){
        reloadScheduled=true;
        setStatus(`⚡ NEW DEPLOYMENT DETECTED · ${shortFingerprint}`,`NEW DEPLOYMENT DETECTED\n${details.join('\n')}\nRefreshing in 1 second…`);
        window.setTimeout(()=>{setStatus('↻ REFRESHING…','Loading the new Cloudflare deployment…');window.setTimeout(()=>window.location.reload(),350);},650);
        return;
      }
      currentFingerprint=fingerprint;
      setStatus(`● CF LIVE · ${branch} · ${shortFingerprint}`,details.join('\n'));
    }catch(error){
      setStatus('○ CF WATCHER OFFLINE',`Cloudflare watcher unavailable: ${error.message}\nThe application itself may still be running.`,true);
    }finally{checking=false;}
  }
  const observer=new MutationObserver(()=>{installTreeRefresh();installListRefresh();removeLegacyHelpText();});
  observer.observe(document.body,{childList:true,subtree:true});
  installTreeRefresh();installListRefresh();refreshBuildStatus();window.setInterval(refreshBuildStatus,5000);
})();