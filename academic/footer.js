// Classic-script loader so any page can add the academic footer with one tag.
(function(){var s=document.createElement('script');s.type='module';s.textContent="import {renderFooter} from '/academic/academic.js';renderFooter();";
if(!document.querySelector('link[href="/academic/academic.css"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='/academic/academic.css';document.head.appendChild(l);}
(document.readyState==='loading')?document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(s);}):document.body.appendChild(s);})();
