// npm install --prefix /tmp/qh-validation linkedom
// QH_TEST_DEPENDENCIES=/tmp/qh-validation/node_modules node tests/membership-account-ui.mjs
import {createRequire} from 'node:module';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {parseHTML}=require(process.env.QH_TEST_DEPENDENCIES?process.env.QH_TEST_DEPENDENCIES+'/linkedom':'linkedom');
const html=await readFile(new URL('../account.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../accounts/account.js',import.meta.url),'utf8')).replace(/^import .*?;\n/,'');
for(const search of ['', '?mode=signup']){
 const {document}=parseHTML(html);let session=null;
 const auth={getSession:async()=>({data:{session}}),onAuthStateChange(){},signUp:async()=>({data:{user:{identities:[{}]}},error:null})};
 const db={auth,rpc:async()=>({data:false,error:null})};
 vm.runInNewContext(source,{document,db,message:t=>{document.getElementById('status').textContent=t;},exportResearch(){},location:{hash:'',search,origin:'https://example.test'},history:{},URLSearchParams,setTimeout,console});
 await new Promise(resolve=>setImmediate(resolve));
 const get=id=>document.getElementById(id);
 assert.ok(document.querySelector('#guest-choice a[href="/"]').textContent.includes('Continue as guest'));
 assert.equal(get('firstName').required,false);assert.equal(get('lastName').required,false);
 assert.equal(get('submit').textContent,search?'Create account':'Log in');
 document.querySelector('[data-mode="recover"]').onclick();assert.equal(get('password').required,false);assert.equal(get('password-label').hidden,true);
 document.querySelector('[data-mode="signup"]').onclick();assert.equal(get('password-confirm').required,true);assert.equal(get('password').minLength,12);
 document.querySelector('[data-mode="login"]').onclick();assert.equal(get('password-confirm').required,false);assert.equal(get('firstName').required,false);assert.equal(get('password').minLength,1);
 assert.equal(get('staff-dashboard').hidden,true);
}
console.log('PASS: guest link, optional names, signup deep link, recovery, mode switching, hidden staff navigation.');
