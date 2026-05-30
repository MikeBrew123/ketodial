(function(){
  "use strict";

  /* ---------- analytics ---------- */
  function track(event,params){
    if(window.gtag) window.gtag('event',event,params||{});
  }

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

  /* ---------- clear invalid on input ---------- */
  $all('.input input').forEach(function(inp){
    inp.addEventListener('input',function(){
      inp.closest('.input').classList.remove('invalid');
    });
  });

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

  /* ---------- MACRO CALCULATOR (Mifflin-St Jeor) ---------- */
  function getFormData(){
    var sexBtn=$('[data-seg="sex"] .on');
    var sex=sexBtn?sexBtn.dataset.val:'female';
    var age=parseFloat($('#age').value)||0;
    var isMetric=($('#unitSeg .on')||{}).dataset;
    var metric=isMetric&&isMetric.unit==='metric';
    var weightKg,heightCm;
    if(metric){
      weightKg=parseFloat($('#weight').value)||0;
      heightCm=parseFloat($('#heightCm').value)||0;
    }else{
      var lbs=parseFloat($('#weight').value)||0;
      var ft=parseFloat($('#heightFt').value)||0;
      var inches=parseFloat($('#heightIn').value)||0;
      weightKg=lbs*0.453592;
      heightCm=(ft*12+inches)*2.54;
    }
    var activity=parseFloat($('#activity').value)||1.375;
    var goalBtn=$('[data-seg="goal"] .on');
    var goal=goalBtn?goalBtn.dataset.val:'lose';
    return{sex:sex,age:age,weightKg:weightKg,heightCm:heightCm,activity:activity,goal:goal,weightLbs:metric?weightKg*2.20462:(parseFloat($('#weight').value)||0)};
  }

  function computeMacros(d){
    // Mifflin-St Jeor BMR
    var bmr;
    if(d.sex==='male'){
      bmr=10*d.weightKg+6.25*d.heightCm-5*d.age+5;
    }else{
      bmr=10*d.weightKg+6.25*d.heightCm-5*d.age-161;
    }
    var tdee=Math.round(bmr*d.activity);
    // Goal adjustment
    var multiplier=1;
    if(d.goal==='lose') multiplier=0.80; // 20% deficit
    if(d.goal==='gain') multiplier=1.10; // 10% surplus
    var calories=Math.round(tdee*multiplier);
    // Keto ratio: 70% fat, 25% protein, 5% carbs
    var fatCal=calories*0.70;
    var proteinCal=calories*0.25;
    var carbCal=calories*0.05;
    var fatG=Math.round(fatCal/9);
    var proteinG=Math.round(proteinCal/4);
    var carbG=Math.round(carbCal/4);
    var deficitPct=d.goal==='lose'?20:(d.goal==='gain'?-10:0);
    return{calories:calories,tdee:tdee,fatG:fatG,proteinG:proteinG,carbG:carbG,deficitPct:deficitPct};
  }

  /* ---------- GATE 1: free results ---------- */
  var freeBtn=$('#freeBtn');
  var freeResults=$('#freeResults');
  var step2=$('#step2');
  var gaugeShown=false;
  var lastMacros=null;

  function animateGauge(m){
    var valueArc=$('#valueArc'), needle=$('#needle'), kcalEl=$('#kcal'),
        liveDot=$('#liveDot'), liveText=$('#liveText');
    // Gauge range: 1000-3500 kcal
    var pct=Math.max(0,Math.min(1,(m.calories-1000)/2500));
    if(valueArc) valueArc.style.strokeDashoffset=377*(1-pct);
    // Needle: -90 (left) to +90 (right), mapped from pct
    var angle=-90+pct*180;
    if(needle) needle.setAttribute('transform','rotate('+angle+' 150 168)');
    if(kcalEl) kcalEl.textContent=m.calories.toLocaleString();
    if(liveDot) liveDot.style.background='#2dd4bf';
    if(liveText) liveText.textContent='Results ready';
    // Macro grams
    var gMap={fat:m.fatG+' g',protein:m.proteinG+' g',carbs:m.carbG+' g'};
    Object.keys(gMap).forEach(function(k){var el=$('[data-g="'+k+'"]');if(el)el.textContent=gMap[k];});
    // TDEE row
    var tdeeStats=$all('.tdee-stat .v');
    if(tdeeStats[0]) tdeeStats[0].innerHTML=m.tdee.toLocaleString()+' <small>kcal</small>';
    if(tdeeStats[1]) tdeeStats[1].textContent=m.deficitPct>0?'−'+m.deficitPct+'%':(m.deficitPct<0?'+'+Math.abs(m.deficitPct)+'%':'0%');
    if(tdeeStats[2]) tdeeStats[2].innerHTML=m.carbG+' <small>g</small>';
    // Food equivalents (approximate)
    var feqAmts=$all('.feq .lead .amt');
    if(feqAmts[0]) feqAmts[0].textContent=m.fatG+'g';
    if(feqAmts[1]) feqAmts[1].textContent=m.proteinG+'g';
    if(feqAmts[2]) feqAmts[2].textContent=m.carbG+'g';
    // Food descriptions based on actual amounts
    var feqDescs=$all('.feq .desc');
    if(feqDescs[0]) feqDescs[0].textContent='≈ '+Math.round(m.fatG/14)+' tbsp olive oil worth of fat across the day, or avocado + eggs + nuts.';
    if(feqDescs[1]){
      var oz=Math.round(m.proteinG/7);
      feqDescs[1].textContent='≈ '+oz+' oz of meat/fish across your meals (a '+Math.round(oz/2)+' oz portion at lunch and dinner).';
    }
    if(feqDescs[2]) feqDescs[2].textContent='≈ '+Math.round(m.carbG/5)+' cups of leafy greens plus a small handful of berries.';
  }

  function validateStep1(){
    var d=getFormData();
    var valid=true;
    var fields={age:d.age,weight:d.weightKg,height:d.heightCm};
    // Check age
    if(!d.age||d.age<10||d.age>120){$('#age').closest('.input').classList.add('invalid');valid=false;}
    // Check weight
    if(!d.weightKg||d.weightKg<20){$('#weight').closest('.input').classList.add('invalid');valid=false;}
    // Check height
    var metric=($('#unitSeg .on')||{}).dataset&&($('#unitSeg .on')||{}).dataset.unit==='metric';
    if(metric){
      if(!d.heightCm||d.heightCm<100){$('#heightCm').closest('.input').classList.add('invalid');valid=false;}
    }else{
      if(!$('#heightFt').value){$('#heightFt').closest('.input').classList.add('invalid');valid=false;}
    }
    return valid;
  }

  // Show/hide validation message
  var step1Msg=document.createElement('div');
  step1Msg.style.cssText='display:none;margin-top:10px;font-size:12.5px;color:#dc2626;text-align:center;font-weight:600';
  step1Msg.textContent='Fill in the highlighted fields to see your results.';
  if(freeBtn) freeBtn.parentNode.insertBefore(step1Msg,freeBtn.nextSibling.nextSibling);

  if(freeBtn){
    freeBtn.addEventListener('click',function(){
      if(!validateStep1()){
        step1Msg.style.display='block';
        return;
      }
      step1Msg.style.display='none';
      var d=getFormData();
      lastMacros=computeMacros(d);
      track('kd_free_results',{calories:lastMacros.calories,goal:d.goal,sex:d.sex});
      freeResults.classList.add('show');
      step2.classList.add('show');
      if(!gaugeShown){ setTimeout(function(){animateGauge(lastMacros);},180); gaugeShown=true; }
      else{ animateGauge(lastMacros); }
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
      track('kd_profile_completed',{email_provided:!!emailReq.value.trim()});
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

  /* ---------- CHECKOUT (Stripe Embedded) ---------- */
  var API_BASE='https://ketodial-api.iambrew.workers.dev';
  var STRIPE_PK='pk_live_51SjRKPEVDfkpGz8wSeZfQ87US3LUHKBg2I8KP1JmWIxtiDnDh2R9ViGQlThNBWbvEbiB9vvTLpyx2HHix4zYqqKH00jsXBAIc7';
  var checkoutBtn=$('#checkoutBtn');
  var checkoutOverlay=$('#checkoutOverlay');
  var stripeInstance=null;
  var embeddedCheckout=null;

  function collectFormData(){
    var d=getFormData();
    var selects=$all('#step2 select');
    var dairy=selects[0]?selects[0].value:'';
    var cooking=selects[1]?selects[1].value:'';
    var prepTime=selects[2]?selects[2].value:'';
    var cookingFor=selects[3]?selects[3].value:'';
    var conditions=[];$all('#step2 [data-multi]')[0]&&$all('#step2 [data-multi]')[0].querySelectorAll('.on').forEach(function(b){conditions.push(b.dataset.val);});
    var symptoms=[];$all('#step2 [data-multi]')[1]&&$all('#step2 [data-multi]')[1].querySelectorAll('.on').forEach(function(b){symptoms.push(b.dataset.val);});
    var diets=[];$all('#step2 [data-multi]')[2]&&$all('#step2 [data-multi]')[2].querySelectorAll('.on').forEach(function(b){diets.push(b.dataset.val);});
    var budgetBtn=$('#step2 [data-seg="budget"] .on');
    var meds=$('#step2 input[type="text"]')?$('#step2 input[type="text"]').value:'';
    var challenge=$('#step2 textarea')?$('#step2 textarea').value:'';
    return {
      sex:d.sex,age:d.age,weightKg:Math.round(d.weightKg),heightCm:Math.round(d.heightCm),
      goal:d.goal,activity:d.activity,
      calories:lastMacros?lastMacros.calories:0,
      fatG:lastMacros?lastMacros.fatG:0,
      proteinG:lastMacros?lastMacros.proteinG:0,
      carbG:lastMacros?lastMacros.carbG:0,
      tdee:lastMacros?lastMacros.tdee:0,
      dairy:dairy,cooking:cooking,prepTime:prepTime,cookingFor:cookingFor,
      conditions:conditions,symptoms:symptoms,diets:diets,
      budget:budgetBtn?budgetBtn.dataset.val:'',
      meds:meds,challenge:challenge
    };
  }

  if(checkoutBtn){
    checkoutBtn.addEventListener('click',function(){
      if(selected.size===0) return;
      var items=Array.from(selected);
      var email=(emailReq&&emailReq.value.trim())||($('#emailOpt')&&$('#emailOpt').value.trim())||'';
      var name=(nameReq&&nameReq.value.trim())||'';
      var formData=collectFormData();

      track('kd_checkout_opened',{items:items.join(',')});

      checkoutBtn.disabled=true;
      checkoutBtn.textContent='Loading checkout…';

      // Clean up previous checkout if any
      if(embeddedCheckout){ embeddedCheckout.destroy(); embeddedCheckout=null; }
      var container=$('#checkout-container');
      if(container) container.innerHTML='';

      // Initialize Stripe
      if(!stripeInstance) stripeInstance=Stripe(STRIPE_PK);

      fetch(API_BASE+'/checkout',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({items:items,email:email,name:name,formData:formData})
      })
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.clientSecret){
          checkoutOverlay.classList.add('show');
          return stripeInstance.initEmbeddedCheckout({clientSecret:data.clientSecret});
        }else{
          throw new Error(data.error||'Failed to create checkout session');
        }
      })
      .then(function(checkout){
        embeddedCheckout=checkout;
        checkout.mount('#checkout-container');
        checkoutBtn.disabled=false;
        render();
      })
      .catch(function(err){
        console.error('Checkout error:',err);
        checkoutOverlay.classList.remove('show');
        alert('Checkout error: '+err.message);
        checkoutBtn.disabled=false;
        render();
      });
    });
  }

  // Close checkout modal
  var checkoutClose=$('#checkoutClose');
  if(checkoutClose) checkoutClose.addEventListener('click',function(){
    checkoutOverlay.classList.remove('show');
    if(embeddedCheckout){ embeddedCheckout.destroy(); embeddedCheckout=null; }
  });
  if(checkoutOverlay) checkoutOverlay.addEventListener('click',function(e){
    if(e.target===checkoutOverlay){
      checkoutOverlay.classList.remove('show');
      if(embeddedCheckout){ embeddedCheckout.destroy(); embeddedCheckout=null; }
    }
  });

  /* ---------- SUCCESS (return from Stripe embedded) ---------- */
  var successOverlay=$('#successOverlay');
  var urlParams=new URLSearchParams(window.location.search);
  if(urlParams.get('success')==='true'){
    var successEmail=$('#successEmail');
    if(successEmail) successEmail.textContent='your inbox';
    var wrap=$('#reportRows');
    if(wrap){
      wrap.innerHTML='';
      var freeRow=document.createElement('div');
      freeRow.className='rrow';
      freeRow.innerHTML='<span class="rdot" style="background:var(--accent)"></span><span class="rnm">Macro Results</span><span class="rtag mono">FREE</span>';
      wrap.appendChild(freeRow);
      var paidRow=document.createElement('div');
      paidRow.className='rrow';
      paidRow.innerHTML='<span class="rdot" style="background:var(--protein)"></span><span class="rnm">Your reports are being generated</span><span class="rtag mono">EMAIL</span><span style="font-size:13px;color:var(--ink-soft)">Check your inbox in a few minutes</span>';
      wrap.appendChild(paidRow);
    }
    track('kd_payment_complete',{session_id:urlParams.get('session_id')||''});
    successOverlay.classList.add('show');
  }

  var successClose=$('#successClose'), successDone=$('#successDone');
  if(successClose) successClose.addEventListener('click',function(){successOverlay.classList.remove('show');window.history.replaceState({},'','/');});
  if(successDone) successDone.addEventListener('click',function(){successOverlay.classList.remove('show');window.history.replaceState({},'','/');});
  if(successOverlay) successOverlay.addEventListener('click',function(e){if(e.target===successOverlay){successOverlay.classList.remove('show');window.history.replaceState({},'','/');}});

})();
