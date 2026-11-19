import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const PAYPAL='https://www.paypal.com/donate/?hosted_button_id=YRYY537HG4RX2';

test('global donate button shows on every page except Support and Thank-you',()=>{
 const js=read('donate-global.js');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/SUPPORT_URL = '\/support\.html'/);
 assert.match(js,/NO_FLOAT_PATHS = /);
 assert.doesNotMatch(js,/hasVisibleDonateControl|existingDonate/,'nothing else on a page suppresses it');
});

test('floating controls have no minimise toggle that can hide Donate',()=>{
 const js=read('mobile-floating-layout.js');
 assert.doesNotThrow(()=>new Function(js));
 assert.doesNotMatch(js,/qh-float-toggle|addToggle|Hide floating buttons/);
 assert.doesNotMatch(js,/\.floating-ui-hidden #quranhikma-global-donate/);
 assert.match(js,/localStorage\.removeItem\('floatingUIHidden'\)/,'clears a saved hidden state');
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
});
