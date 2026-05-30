(function(){
  "use strict";

  /* ---------- helpers ---------- */
  function $(s,ctx){return (ctx||document).querySelector(s);}
  function $all(s,ctx){return Array.prototype.slice.call((ctx||document).querySelectorAll(s));}
  function money(n){return '$'+n.toFixed(2);}
  function scrollToEl(el,extra){
    var nav=70, pad=(extra||24);
    var y=el.getBoundingClientRect().top+window.scrollY-nav-pad;
    window.scrollTo({top:y,behavior:'smooth'});
  }

  /* ---------- gauge ticks ---------- */
  var ticks=$('#ticks');
  if(ticks){
    var cx=150,cy=168,r1=120,r0=104;
    for(var i=0;i<=10;i++){
      var ang=Math.PI-(i/10)*Math.PI;
      var ln=document.createElementNS('http://www.w3.org/2000/svg','line');
      ln.setAttribute('x1',cx+r0*Math.cos(ang));ln.setAttribute('y1',cy-r0*Math.sin(ang));
      ln.setAttribute('x2',cx+r1*Math.cos(ang));ln.setAttribute('y2',cy-r1*Math.sin(ang));
      ticks.appendChild(ln);
    }
  }

  /* ---------- single-select segmented groups ---------- */
  $all('[data-seg]').forEach(function(group){
    group.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click',function(){
        group.querySelectorAll('button').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on');
      });
    });
  });

  /* ---------- multi-select checkchips (with "None" exclusivity) ---------- */
  $all('[data-multi]').forEach(function(group){
    group.querySelectorAll('.checkchip').forEach(function(b){
      b.addEventListener('click',function(){
        var isNone=b.dataset.none!==undefined;
        if(isNone){
          group.querySelectorAll('.checkchip').forEach(function(x){x.classList.remove('on');});
          b.classList.add('on');
        }else{
          var none=group.querySelector('.checkchip[data-none]');
          if(none) none.classList.remove('on');
          b.classList.toggle('on');
        }
      });
    });
  });

  /* ---------- unit toggle ---------- */
  var unitSeg=$('#unitSeg'), weightUnit=$('#weightUnit');
  if(unitSeg){
    unitSeg.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click',function(){
        unitSeg.querySelectorAll('button').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on');
        var u=b.dataset.unit;
        $all('[data-unitgroup]').forEach(function(g){g.classList.toggle('hidden',g.dataset.unitgroup!==u);});
        if(weightUnit) weightUnit.textContent=(u==='imperial')?'lbs':'kg';
      });
    });
  }

  /* ---------- GATE 1: free results ---------- */
  var freeBtn=$('#freeBtn');
  var freeResults=$('#freeResults');
  var step2=$('#step2');
  var gaugeShown=false;

  function animateGauge(){
    var valueArc=$('#valueArc'), needle=$('#needle'), kcal=$('#kcal'),
        liveDot=$('#liveDot'), liveText=$('#liveText');
    if(valueArc) valueArc.style.strokeDashoffset=377*(1-0.62);
    if(needle) needle.setAttribute('transform','rotate(21.6 150 168)');
    if(kcal) kcal.textContent='1,840';
    if(liveDot) liveDot.style.background='#2dd4bf';
    if(liveText) liveText.textContent='Results ready';
    var g={fat:'143 g',protein:'115 g',carbs:'23 g'};
    Object.keys(g).forEach(function(k){var el=$('[data-g="'+k+'"]');if(el)el.textContent=g[k];});
  }

  if(freeBtn){
    freeBtn.addEventListener('click',function(){
      freeResults.classList.add('show');
      step2.classList.add('show');
      if(!gaugeShown){ setTimeout(animateGauge,180); gaugeShown=true; }
      setTimeout(function(){scrollToEl(freeResults);},120);
    });
  }

  /* ---------- GATE 2: build reports ---------- */
  var buildBtn=$('#buildBtn');
  var reportPicker=$('#reportPicker');
  var emailReq=$('#emailReq'), nameReq=$('#nameReq');

  function flagInvalid(el){
    if(!el) return false;
    var ok=el.value.trim().length>0;
    el.closest('.input').classList.toggle('invalid',!ok);
    return ok;
  }

  if(buildBtn){
    buildBtn.addEventListener('click',function(){
      var ok1=flagInvalid(nameReq);
      var ok2=flagInvalid(emailReq) && /.+@.+\..+/.test(emailReq.value);
      if(emailReq) emailReq.closest('.input').classList.toggle('invalid',!ok2);
      if(!ok1||!ok2){
        var msg=$('#reqMsg'); if(msg) msg.classList.add('show');
        return;
      }
      var msg=$('#reqMsg'); if(msg) msg.classList.remove('show');
      reportPicker.classList.add('show');
      setTimeout(function(){scrollToEl(reportPicker);},120);
    });
  }

  /* ---------- REPORT PICKER ---------- */
  var PRODUCTS={
    doctor:{name:"Doctor's Report",price:5.99},
    meal:{name:"7-Day Meal Plan",price:5.99},
    starter:{name:"Keto Starter Kit",price:3.99},
    essentials:{name:"Keto Essentials Bundle",price:7.99,contains:['meal','starter']},
    protocol:{name:"Full Protocol Bundle",price:10.99,contains:['doctor','meal','starter']}
  };
  var selected=new Set();

  function toggleProduct(key){
    if(selected.has(key)){ selected.delete(key); }
    else{
      selected.add(key);
      var p=PRODUCTS[key];
      if(p.contains){
        Object.keys(PRODUCTS).forEach(function(k){
          if(k!==key && (PRODUCTS[k].contains || p.contains.indexOf(k)>-1)) selected.delete(k);
        });
      }else{
        Object.keys(PRODUCTS).forEach(function(k){
          if(PRODUCTS[k].contains && PRODUCTS[k].contains.indexOf(key)>-1) selected.delete(k);
        });
      }
    }
    render();
  }

  function render(){
    $all('[data-product]').forEach(function(card){
      card.classList.toggle('on',selected.has(card.dataset.product));
      var p=PRODUCTS[card.dataset.product];
      if(p.contains){
        var full=p.contains.reduce(function(a,c){return a+PRODUCTS[c].price;},0);
        var badge=card.querySelector('.save-badge');
        if(badge) badge.textContent='SAVE '+money(full-p.price);
      }
    });
    var total=0; selected.forEach(function(k){total+=PRODUCTS[k].price;});
    // savings calc
    var saved=0;
    selected.forEach(function(k){
      var p=PRODUCTS[k];
      if(p.contains){
        var full=p.contains.reduce(function(a,c){return a+PRODUCTS[c].price;},0);
        saved+=(full-p.price);
      }
    });
    var amtEl=$('#totalAmt'); if(amtEl) amtEl.textContent=money(total);
    var saveEl=$('#totalSave');
    if(saveEl){
      if(saved>0.001){ saveEl.textContent='You save '+money(saved); saveEl.style.display='block'; }
      else { saveEl.style.display='none'; }
    }
    var co=$('#checkoutBtn');
    if(co){
      co.disabled=(total<=0);
      co.textContent= total<=0 ? 'Select a report to continue' : 'Continue to checkout · '+money(total);
    }
    var freeLine=$('#freeOnlyNote');
    if(freeLine) freeLine.style.display = total<=0 ? 'block':'none';
  }

  $all('[data-product]').forEach(function(card){
    card.addEventListener('click',function(){toggleProduct(card.dataset.product);});
  });
  render();

  /* ---------- CHECKOUT ---------- */
  var checkoutOverlay=$('#checkoutOverlay');
  var checkoutBtn=$('#checkoutBtn');

  function buildSummary(){
    var wrap=$('#orderSummary'); if(!wrap) return 0;
    wrap.innerHTML='';
    var total=0;
    // always include free macro results
    var free=document.createElement('div');
    free.className='os-row';
    free.innerHTML='<span>Macro Results <em class="os-free">FREE</em></span><span>$0.00</span>';
    wrap.appendChild(free);
    selected.forEach(function(k){
      var p=PRODUCTS[k]; total+=p.price;
      var row=document.createElement('div');
      row.className='os-row';
      row.innerHTML='<span>'+p.name+'</span><span>'+money(p.price)+'</span>';
      wrap.appendChild(row);
    });
    var tr=document.createElement('div');
    tr.className='os-total';
    tr.innerHTML='<span>Total</span><span>'+money(total)+'</span>';
    wrap.appendChild(tr);
    var pay=$('#payBtn'); if(pay) pay.textContent='Pay '+money(total);
    return total;
  }

  if(checkoutBtn){
    checkoutBtn.addEventListener('click',function(){
      if(selected.size===0) return;
      buildSummary();
      checkoutOverlay.classList.add('show');
    });
  }
  var checkoutClose=$('#checkoutClose');
  if(checkoutClose) checkoutClose.addEventListener('click',function(){checkoutOverlay.classList.remove('show');});
  if(checkoutOverlay) checkoutOverlay.addEventListener('click',function(e){if(e.target===checkoutOverlay)checkoutOverlay.classList.remove('show');});

  /* ---------- PAY → SUCCESS ---------- */
  var successOverlay=$('#successOverlay');
  var payBtn=$('#payBtn');

  function buildReportRows(){
    var wrap=$('#reportRows'); if(!wrap) return;
    wrap.innerHTML='';
    var rows=[{name:'Macro Results',tag:'FREE',color:'var(--accent)'}];
    var colors={doctor:'#f0abfc',meal:'var(--protein)',starter:'#fbbf24',essentials:'var(--accent)',protocol:'var(--accent)'};
    selected.forEach(function(k){
      rows.push({name:PRODUCTS[k].name,tag:'PDF',color:colors[k]||'var(--accent)'});
    });
    rows.forEach(function(r){
      var el=document.createElement('div');
      el.className='rrow';
      el.innerHTML='<span class="rdot" style="background:'+r.color+'"></span>'+
        '<span class="rnm">'+r.name+'</span>'+
        '<span class="rtag mono">'+r.tag+'</span>'+
        '<button class="ropen">Open</button>';
      wrap.appendChild(el);
    });
    var em=$('#successEmail');
    if(em && emailReq && emailReq.value.trim()) em.textContent=emailReq.value.trim();
  }

  if(payBtn){
    payBtn.addEventListener('click',function(){
      var orig=payBtn.textContent;
      payBtn.disabled=true;
      payBtn.innerHTML='<span class="pay-spin"></span> Processing…';
      setTimeout(function(){
        checkoutOverlay.classList.remove('show');
        buildReportRows();
        successOverlay.classList.add('show');
        payBtn.disabled=false; payBtn.textContent=orig;
      },1400);
    });
  }
  var successClose=$('#successClose'), successDone=$('#successDone');
  if(successClose) successClose.addEventListener('click',function(){successOverlay.classList.remove('show');});
  if(successDone) successDone.addEventListener('click',function(){successOverlay.classList.remove('show');});
  if(successOverlay) successOverlay.addEventListener('click',function(e){if(e.target===successOverlay)successOverlay.classList.remove('show');});

})();
