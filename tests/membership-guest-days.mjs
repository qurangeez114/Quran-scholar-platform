import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../accounts/guest-days.js',import.meta.url),'utf8');
const {recordDay,dismissToday,localDay}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const memory=new Map();const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
for(let i=1;i<=5;i++){
 const day=`2026-10-${String(i*2).padStart(2,'0')}`;
 const result=recordDay(storage,day);
 assert.equal(result.days.length,i);assert.equal(result.shouldRemind,false);
 assert.equal(recordDay(storage,day).days.length,i);assert.equal(recordDay(storage,day).shouldRemind,false);
}
assert.equal(recordDay(storage,'2026-10-12').shouldRemind,true);
dismissToday(storage,'2026-10-12');
assert.equal(recordDay(storage,'2026-10-12').shouldRemind,false);
assert.equal(recordDay(storage,'2026-10-13').shouldRemind,true);
assert.equal(recordDay(storage,'2026-10-13').days.length,5);
assert.doesNotThrow(()=>recordDay({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},'2026-10-13'));
assert.equal(recordDay({getItem:()=>'{bad',setItem(){}},'2026-10-13').days.length,1);
assert.equal(localDay(new Date(2026,9,13,23,59)),'2026-10-13');
console.log('PASS: distinct visit days, first five days, reminder, dismissal, storage failure, local dates.');
