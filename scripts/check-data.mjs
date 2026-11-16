import {starter,validate,safeUrl} from '../src/data.ts';
import assert from 'node:assert/strict';

const backup=validate(JSON.parse(JSON.stringify(starter)));
assert.equal(backup.domains.length,6);
assert.equal(safeUrl('javascript:alert(1)'), '');
assert.equal(safeUrl('https://example.com/'), 'https://example.com/');

const cyclic=structuredClone(backup);
cyclic.projects[0].parentId=cyclic.projects[0].id;
assert.throws(()=>validate(cyclic),/hierarchy/);

const broken=structuredClone(backup);
broken.tasks.push({id:'qa',title:'Broken',description:'',domainId:'hmaa',projectId:'missing',priority:'High',status:'Ready',dueDate:'',assignee:'',notes:'',createdAt:'',completedAt:''});
assert.throws(()=>validate(broken),/project link/);

const duplicate=structuredClone(backup);
duplicate.domains.push({...duplicate.domains[0]});
assert.throws(()=>validate(duplicate),/Duplicate/);

console.log('Backup validation and URL checks passed.');
