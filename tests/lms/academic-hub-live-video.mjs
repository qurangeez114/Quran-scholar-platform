import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const js=readFileSync('accounts/academic-hub.js','utf8');
const html=readFileSync('academic-hub.html','utf8');
const from=js.indexOf('function renderLiveVideo(session){');
const to=js.indexOf('async function liveRead()',from);
assert.ok(from>=0&&to>from,'Live stream gate must be present');
const fn=js.slice(from,to);
let calls=0;
const surface={
 children:[],
 replaceChildren(){this.children=[];calls++;},
 appendChild(item){this.children.push(item);}
};
const el=(tag,text)=>({tag,textContent:text||'',src:'',title:''});
const add=(parent,item)=>{parent.appendChild(item);return item;};
const $=id=>{assert.equal(id,'live-video');return surface;};
const videoURL=url=>url==='https://youtu.be/abcdefghijk'
 ?'https://www.youtube-nocookie.com/embed/abcdefghijk':null;
const link=(href,text)=>({tag:'a',href,textContent:text});
const https=x=>x?.startsWith('https://')?x:null;
const render=runInNewContext(`(()=>{let displayedLiveKey=null;${fn};return renderLiveVideo;})()`,
 {el,add,$,videoURL,link,https});
const example={id:'room-one',title:'Recorded research seminar',
 video_url:'https://youtu.be/abcdefghijk',status:'scheduled'};
render(example);
assert.equal(surface.children.length,1);
assert.equal(surface.children[0].tag,'p','Video must not appear before instructor starts class');
assert.match(surface.children[0].textContent,/not started/);
render({...example,status:'live'});
assert.equal(surface.children[0].tag,'iframe');
assert.equal(surface.children[0].src,'https://www.youtube-nocookie.com/embed/abcdefghijk');
const before=calls;
render({...example,status:'live'});
assert.equal(calls,before,'Polls must not reload an active video stream');
render({...example,status:'ended'});
assert.equal(surface.children[0].tag,'p','Ended rooms must unload video');
assert.match(surface.children[0].textContent,/ended/);
render({...example,status:'live',id:'room-two'});
assert.equal(surface.children[0].tag,'iframe','A new session can launch a new stream');
assert.match(html,/unlisted external video links are not secure access controls/i);
assert.match(js,/Unavailable, private, or expired/,'Unavailable package items must be visibly labeled');
console.log('PASS: scheduled video hidden, started video visible, polling does not reload stream, ended stream removed and external privacy explained.');
