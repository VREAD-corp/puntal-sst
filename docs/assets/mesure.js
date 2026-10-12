/*! Puntal SST: conteo anónimo. Sin cookies, sin identificador, sin guardar IP; respeta Do Not Track y GPC. Mismo patrón que octave-checkout/gas/web/mesure.js. */
((n,l,d)=>{var A='https://script.google.com/macros/s/AKfycbyr5CPMm54351x_oo3r92A5MfE0AfJGVtgzZNDXoKC2mbYCgMdsOiw1Mkbfeg4CB4uw/exec',q=new URLSearchParams(l.search),b,k;
window.PUNTAL_API=A;window.puntalTrack=function(){};
if(n.doNotTrack=='1'||n.globalPrivacyControl||['outils.vread.fr','vread-corp.github.io','puntal-sst.github.io'].indexOf(l.hostname)<0)return;
b={action:'track',page:l.pathname,ref_domain:d.referrer.split('/')[2]||'',device:innerWidth<768?'mobile':'desktop'};
for(k of['source','medium','campaign'])b['utm_'+k]=q.get('utm_'+k);
window.puntalTrack=function(e){b.event=e;b.variant=window.PUNTAL_VARIANT||'';b.ts=Date.now();try{fetch(A+'?action=track',{method:'POST',keepalive:!0,credentials:'omit',redirect:'manual',body:JSON.stringify(b)}).catch(function(){})}catch(x){}};
window.puntalTrack('view')})(navigator,location,document);
