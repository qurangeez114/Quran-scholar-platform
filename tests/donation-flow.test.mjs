import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const PAYPAL='https://www.paypal.com/donate/?hosted_button_id=YRYY537HG4RX2';

test('global donate script parses and only yields to a visible donate control',()=>{
 const js=read('donate-global.js');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/function isShown/);
 assert.match(js,/closest\('#donateModal'\)/,'links inside the hidden modal must not count');
 assert.match(js,/getComputedStyle/);
 assert.match(js,/hasVisibleDonateControl\(\)\) return;/);
 assert.match(js,/SUPPORT_URL = '\/support\.html'/);
 assert.doesNotMatch(js,/existingDonate/,'old any-link-anywhere check is gone');
});

test('support page explains the gift and hands off to the PayPal button',()=>{
 const html=read('support.html');
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/);
 assert.ok(html.includes(PAYPAL),'uses the same hosted PayPal button');
 assert.match(html,/data-qh-money="donate_checkout"/);
 assert.match(html,/rel="noopener"/);
 assert.match(html,/What your gift pays for/);
 assert.match(html,/never sees your card/);
 assert.doesNotMatch(html,/tax[- ]deductible|zakat/i,'no tax or zakat claims until confirmed');
});

test('thank-you page exists and is not indexed',()=>{
 const html=read('thank-you.html');
 assert.match(html,/<meta name="robots" content="noindex">/);
 assert.match(html,/Thank you for supporting Quran Hikma/);
});

test('collector honours an explicit funnel label and keeps keyword fallback',()=>{
 const js=read('behavior-collector.js');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/data-qh-money/);
 assert.match(js,/\^\[a-z_\]\{1,40\}\$/);
 assert.match(js,/if \(\/donate\/i\.test/);
});

test('home menu links to the Support page and counts as a donate click',()=>{
 const html=read('index.html');
 assert.match(html,/<a href="support\.html" data-qh-money="donate"[^>]*>Support<\/a>/);
 assert.match(read('donate-global.js'),/a\[href\$="support\.html"\]/);
});
