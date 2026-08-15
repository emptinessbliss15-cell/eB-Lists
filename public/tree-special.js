const listsEl = document.getElementById('lists');
const specialStyle = document.createElement('style');
specialStyle.textContent = `.eb-system-node{margin-top:6px!important;border-top:1px solid var(--eb-border,#ddd);padding-top:4px}.eb-system-node button{width:100%;text-align:left}.eb-system-child{margin-left:14px;width:calc(100% - 14px)!important}`;
document.head.appendChild(specialStyle);

function addSystemNodes(){
  if(!listsEl || listsEl.querySelector('.eb-system-node')) return;
  const root = listsEl.querySelector('.eb-list-tree');
  if(!root) return;
  const wrap = document.createElement('li');
  wrap.className='eb-system-node';
  for(const node of [
    {name:'Themes',type:'theme'},
    {name:'Types',type:'type'}
  ]){
    const button=document.createElement('button');
    button.className='secondary eb-system-child';
    button.type='button';
    button.textContent=node.name;
    button.onclick=()=>window.eBlissViewRouter?.show({id:`system:${node.type}`,name:node.name,type:node.type});
    wrap.appendChild(button);
  }
  root.appendChild(wrap);
}

new MutationObserver(()=>addSystemNodes()).observe(listsEl,{childList:true});
setTimeout(addSystemNodes,900);
window.eBlissAddSystemTreeNodes=addSystemNodes;
