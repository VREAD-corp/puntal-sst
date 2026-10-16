/*! Puntal SST: conteo anónimo. Sin cookies, sin identificador, sin guardar IP; respeta Do Not Track y GPC. Mismo patrón que octave-checkout/gas/web/mesure.js. */
((n,l,d)=>{var A='https://script.google.com/macros/s/AKfycbyr5CPMm54351x_oo3r92A5MfE0AfJGVtgzZNDXoKC2mbYCgMdsOiw1Mkbfeg4CB4uw/exec',q=new URLSearchParams(l.search),b,k,x='',s,o='octave_notrack',go,v;
window.PUNTAL_API=A;window.puntalTrack=function(){};
if(n.doNotTrack=='1'||n.globalPrivacyControl||['puntal.jalonel.com','outils.vread.fr','vread-corp.github.io','puntal-sst.github.io'].indexOf(l.hostname)<0)return;
// No es una visita: nuestras pruebas (?octave_notrack=1, recordado en este navegador; =0 lo borra), navegadores automatizados y robots. Se cuentan aparte; el user agent solo se lee aquí, nunca se envía.
try{s=localStorage;q.has(o)&&(q.get(o)=='1'?s.setItem(o,'1'):s.removeItem(o));s.getItem(o)=='1'&&(x='notrack')}catch(e){}
x=x||(q.get(o)=='1'?'notrack':n.webdriver?'webdriver':/bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|inspectiontool|googleother|mediapartners|bingpreview|phantom|puppeteer|playwright|selenium/i.test(n.userAgent||'')?'bot':'');
b={action:'track',page:l.pathname,ref_domain:d.referrer.split('/')[2]||'',device:innerWidth<768?'mobile':'desktop',v:2};
if(x)b.excluded=x;
for(k of['source','medium','campaign'])b['utm_'+k]=q.get('utm_'+k);
window.puntalTrack=function(e){b.event=e;b.variant=window.PUNTAL_VARIANT||'';b.ts=Date.now();try{fetch(A+'?action=track',{method:'POST',keepalive:!0,credentials:'omit',redirect:'manual',body:JSON.stringify(b)}).catch(function(){})}catch(x){}};
// Una página precargada solo cuenta si la persona la abre.
go=function(){window.puntalTrack('view')};
if(d.prerendering)d.addEventListener('prerenderingchange',go,{once:!0});else if(d.visibilityState=='prerender')d.addEventListener('visibilitychange',v=function(){d.visibilityState!='prerender'&&(d.removeEventListener('visibilitychange',v),go())});else go()})(navigator,location,document);
