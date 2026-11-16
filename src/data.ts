export type Domain = { id:string; name:string; description:string; color:string; archived:boolean; origin?:'starter'|'user' };
export type Project = { id:string; domainId:string; parentId:string|null; name:string; description:string; archived:boolean; origin?:'starter'|'user' };
export type Resource = { id:string; name:string; description:string; category:string; domainId:string; projectId:string; url:string; tags:string[]; notes:string; origin?:'starter'|'user' };
export type TaskStatus = 'Planned'|'Ready'|'In Progress'|'Awaiting Approval'|'Blocked'|'Completed'|'Archived';
export type Task = { id:string; title:string; description:string; domainId:string; projectId:string; priority:'Low'|'Medium'|'High'|'Critical'; status:TaskStatus; dueDate:string; assignee:string; notes:string; createdAt:string; completedAt:string; origin?:'starter'|'user' };
export type Agent = { id:string; name:string; role:string; description:string; domainIds:string[]; capabilities:string; links:string; notes:string; status:'Not Connected'|'Manual Launch Available'|'API Connection Planned'; origin?:'starter'|'user' };
export type Assignment = { id:string; agentId:string; title:string; instructions:string; createdAt:string; taskId:string; origin?:'starter'|'user' };
export type Shortcut = { id:string; name:string; icon:string; domainId:string; url:string; origin?:'starter'|'user' };
export type Data = { version:1; domains:Domain[]; projects:Project[]; resources:Resource[]; tasks:Task[]; agents:Agent[]; assignments:Assignment[]; shortcuts:Shortcut[] };

const domainInfo:[string,string,string,string][] = [
  ['hmaa','HMAA','Henderson’s Martial Arts Academy','#e34761'],
  ['commerce','Commerce','Products, sales and experiments','#d7a452'],
  ['creative','Creative','Stories, art and media','#af73e5'],
  ['personal','Personal','Training, learning and goals','#24b5c2'],
  ['ai','AI Administration','Agents, assignments and systems','#7087e6'],
  ['archives','Archives','Documentation and research','#c4c3d1']
];
const projectInfo:Record<string,string[]> = {
  hmaa:['HMAA Website','HMAA Connect','Spark Membership','Tournament Hub','HMAA Home Training','Pillars Program'],
  commerce:['TikTok Shop','Etsy / Printify','Product Research','Marketing Experiments'],
  creative:['Tales of People','Writing Projects','Graphic Design','Media Projects','Future Video Games'],
  personal:['Eight Gua Training','Margin Hindi','Personal Goals','Learning Projects'],
  ai:['Agent Directory','Agent Assignments','Workflow Planning','System Development'],
  archives:['Documentation','Research','Historical Project Records','Important Resources']
};
const services:[string,string,string,string][] = [
  ['Spark Membership','hmaa','◈',''],
  ['HMAA Connect','hmaa','✦',''],
  ['HMAA Website','hmaa','⌂',''],
  ['Tournament Hub','hmaa','◇',''],
  ['TikTok Shop','commerce','◉','https://seller-us.tiktok.com/'],
  ['Etsy','commerce','✧','https://www.etsy.com/'],
  ['Printify','commerce','⬡','https://printify.com/'],
  ['Canva','creative','✺','https://www.canva.com/'],
  ['ChatGPT','ai','✦','https://chatgpt.com/'],
  ['Claude','ai','✳','https://claude.ai/'],
  ['Grok','ai','✹','https://grok.com/'],
  ['Notion','archives','▦','https://www.notion.so/'],
  ['Obsidian','archives','◆','https://obsidian.md/'],
  ['GitHub','ai','⌘','https://github.com/']
];
export const starter:Data = {
  version:1,
  domains:domainInfo.map(([id,name,description,color])=>({id,name,description,color,archived:false,origin:'starter'})),
  projects:Object.entries(projectInfo).flatMap(([domainId,names])=>names.map((name,index)=>({id:`${domainId}-${index}`,domainId,parentId:null,name,description:'',archived:false,origin:'starter' as const}))),
  resources:[],
  tasks:[],
  agents:[
    {id:'muse',name:'BB / Muse',role:'Chief of Staff and Operations Coordinator',description:'A profile for operations planning and coordination.',domainIds:['hmaa','commerce','creative','personal'],capabilities:'Planning, coordination, writing',links:'',notes:'',status:'Not Connected',origin:'starter'},
    {id:'chatgpt',name:'ChatGPT',role:'Systems Design, Development, Architecture, and Advisory',description:'A profile for design and development work.',domainIds:['ai','hmaa','personal'],capabilities:'Architecture, coding, advisory',links:'https://chatgpt.com/',notes:'',status:'Manual Launch Available',origin:'starter'},
    {id:'claude',name:'Claude',role:'Deep Development, Auditing, Analysis, and Advisory',description:'A profile for development and review.',domainIds:['ai','creative'],capabilities:'Development, auditing, analysis',links:'https://claude.ai/',notes:'',status:'Manual Launch Available',origin:'starter'},
    {id:'grok',name:'Grok',role:'Research, Prospect Intelligence, and External Discovery',description:'A profile for external discovery.',domainIds:['ai','commerce'],capabilities:'Research, discovery',links:'https://grok.com/',notes:'',status:'Manual Launch Available',origin:'starter'}
  ],
  assignments:[],
  shortcuts:services.map(([name,domainId,icon,url],i)=>({id:`shortcut-${i}`,name,icon,domainId,url,origin:'starter'}))
};
export const statuses:TaskStatus[] = ['Planned','Ready','In Progress','Awaiting Approval','Blocked','Completed','Archived'];
export const id = () => crypto.randomUUID();
export const safeUrl = (value:string) => { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const key='command-bridge-v1';
export function validate(input:unknown):Data {
  if(!input || typeof input!=='object') throw new Error('File is not a Command Bridge backup.');
  const d=input as Record<string,unknown>;
  if(d.version!==1) throw new Error('Unsupported backup version.');
  for(const k of ['domains','projects','resources','tasks','agents','assignments','shortcuts']) if(!Array.isArray(d[k]) || (d[k] as unknown[]).length>10000) throw new Error(`Invalid ${k} list.`);
  const required:Record<string,string[]> = {
    domains:['id','name','description','color','archived'],
    projects:['id','domainId','parentId','name','description','archived'],
    resources:['id','name','description','category','domainId','projectId','url','tags','notes'],
    tasks:['id','title','description','domainId','projectId','priority','status','dueDate','assignee','notes','createdAt','completedAt'],
    agents:['id','name','role','description','domainIds','capabilities','links','notes','status'],
    assignments:['id','agentId','title','instructions','createdAt','taskId'],
    shortcuts:['id','name','icon','domainId','url']
  };
  for(const [k,fields] of Object.entries(required)) {
    const ids=new Set<string>();
    for(const item of d[k] as unknown[]) {
      if(!item || typeof item!=='object') throw new Error(`Invalid ${k} record.`);
      const obj=item as Record<string,unknown>;
      for(const field of fields) {
        const v=obj[field];
        if(field==='parentId' && v===null) continue;
        if(field==='archived' && typeof v==='boolean') continue;
        if(['tags','domainIds'].includes(field) && Array.isArray(v) && v.every(x=>typeof x==='string')) continue;
        if(typeof v!=='string' || v.length>20000) throw new Error(`Invalid ${k}.${field}.`);
      }
      if(ids.has(obj.id as string)) throw new Error(`Duplicate ${k} ID.`);
      ids.add(obj.id as string);
      if(['resources','shortcuts','agents'].includes(k) && obj.url && !safeUrl(obj.url as string)) throw new Error('Backup contains an invalid URL.');
      if(k==='agents' && obj.links && !safeUrl(obj.links as string)) throw new Error('Backup contains an invalid agent link.');
    }
  }
  const domainIds=new Set((d.domains as Domain[]).map(x=>x.id));
  const projects=d.projects as Project[];
  const projectById=new Map(projects.map(x=>[x.id,x]));
  for(const p of projects) {
    if(!domainIds.has(p.domainId)) throw new Error('Backup project has an unknown domain.');
    let parent=p.parentId,steps=0;
    while(parent) {
      const ancestor=projectById.get(parent);
      if(!ancestor||ancestor.domainId!==p.domainId||++steps>projects.length) throw new Error('Backup has a broken project hierarchy.');
      parent=ancestor.parentId;
    }
  }
  for(const r of d.resources as Resource[])if((r.domainId&&!domainIds.has(r.domainId))||(r.projectId&&projectById.get(r.projectId)?.domainId!==r.domainId))throw new Error('Backup resource has an invalid project link.');
  for(const t of d.tasks as Task[])if((t.domainId&&!domainIds.has(t.domainId))||(t.projectId&&projectById.get(t.projectId)?.domainId!==t.domainId)||!['Low','Medium','High','Critical'].includes(t.priority)||!statuses.includes(t.status))throw new Error('Backup task has an invalid field or project link.');
  const agentIds=new Set((d.agents as Agent[]).map(x=>x.id));
  for(const a of d.assignments as Assignment[])if(!agentIds.has(a.agentId))throw new Error('Backup assignment has an unknown agent.');
  return d as Data;
}
export function load():Data {
  try { const raw=localStorage.getItem(key); return raw?validate(JSON.parse(raw)):structuredClone(starter); }
  catch { try { const raw=localStorage.getItem(key); if(raw) localStorage.setItem(key+'-corrupt',raw); } catch { /* storage unavailable */ } return structuredClone(starter); }
}
export function save(data:Data) { localStorage.setItem(key,JSON.stringify(data)); }
export function exportData(data:Data) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a'); a.href=url;a.download=`command-bridge-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
