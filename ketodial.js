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
  var API_BASE='https://ketodial-api.iambrew.workers.dev';
  var sessionToken=null;
  var sessionReady=null;
  var urlParams=new URLSearchParams(window.location.search);
  var utmData={
    utm_source:urlParams.get('utm_source')||null,
    utm_medium:urlParams.get('utm_medium')||null,
    utm_campaign:urlParams.get('utm_campaign')||null,
    utm_content:urlParams.get('utm_content')||null,
    utm_term:urlParams.get('utm_term')||null
  };
  function updateSession(data){
    if(!sessionReady) return;
    sessionReady.then(function(){
      if(!sessionToken) return;
      fetch(API_BASE+'/session',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(Object.assign({token:sessionToken},data))
      }).catch(function(e){console.warn('KD session update failed:',e);});
    });
  }
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
    // Email is required — it gates the free results (email captured in exchange).
    var emailEl=$('#emailOpt');
    if(!emailEl||!/.+@.+\..+/.test(emailEl.value.trim())){if(emailEl)emailEl.closest('.input').classList.add('invalid');valid=false;}
    // Check age
    if(!d.age||d.age<10||d.age>120){$('#age').closest('.input').classList.add('invalid');valid=false;}
    // Check weight (20-350 kg / ~44-770 lbs — reject absurd values, not just empty)
    if(!d.weightKg||d.weightKg<20||d.weightKg>350){$('#weight').closest('.input').classList.add('invalid');valid=false;}
    // Check height. Imperial only checked for a non-empty ft field before, so
    // "175" in the ft box passed and produced a 32,000 kcal TDEE. Bound both units.
    var metric=($('#unitSeg .on')||{}).dataset&&($('#unitSeg .on')||{}).dataset.unit==='metric';
    if(metric){
      if(!d.heightCm||d.heightCm<100||d.heightCm>250){$('#heightCm').closest('.input').classList.add('invalid');valid=false;}
    }else{
      var ft=parseFloat($('#heightFt').value);
      if(!ft||ft<3||ft>8){$('#heightFt').closest('.input').classList.add('invalid');valid=false;}
    }
    return valid;
  }

  // Show/hide validation message
  var step1Msg=document.createElement('div');
  step1Msg.style.cssText='display:none;margin-top:10px;font-size:12.5px;color:#dc2626;text-align:center;font-weight:600';
  step1Msg.textContent='Enter your age, height, and weight to calculate your macros.';
  if(freeBtn) freeBtn.parentNode.insertBefore(step1Msg,freeBtn.nextSibling.nextSibling);

  /* ---------- EMAIL MY PLAN ---------- */
  var planSentTo={};
  function sendPlanEmail(email,newsletterOptIn,isAuto){
    var msg=$('#planEmailMsg'), btn=$('#planEmailBtn');
    function show(text,color){if(msg){msg.style.display='block';msg.style.color=color;msg.textContent=text;}}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      if(!isAuto)show('Please enter a valid email.','#fca5a5');
      return;
    }
    if(planSentTo[email]){
      if(!isAuto)show('Already sent to this address. Check your inbox (and spam folder).','#4ade80');
      return;
    }
    planSentTo[email]=true;
    if(btn){btn.disabled=true;btn.textContent='Sending…';}
    function doSend(){
      return fetch(API_BASE+'/email-plan',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          token:sessionToken,
          email:email,
          newsletter_opt_in:!!newsletterOptIn,
          goal:(getFormData()||{}).goal,
          macros:lastMacros?{calories:lastMacros.calories,fatG:lastMacros.fatG,proteinG:lastMacros.proteinG,carbG:lastMacros.carbG,tdee:lastMacros.tdee}:null,
          utm_source:utmData.utm_source,
          utm_medium:utmData.utm_medium,
          utm_campaign:utmData.utm_campaign
        })
      }).then(function(r){return{ok:r.ok};});
    }
    var start=sessionReady?sessionReady.then(doSend,doSend):doSend();
    start.then(function(res){
      if(btn){btn.disabled=false;btn.textContent='Email me my plan';}
      if(res&&res.ok){
        track('kd_plan_emailed',{auto:!!isAuto,newsletter_opt_in:!!newsletterOptIn});
        show('Sent! Check your inbox for your plan.','#4ade80');
      }else{
        planSentTo[email]=false;
        show('Something went wrong sending your plan. Try again in a minute.','#fca5a5');
      }
    }).catch(function(){
      planSentTo[email]=false;
      if(btn){btn.disabled=false;btn.textContent='Email me my plan';}
      show('Something went wrong sending your plan. Try again in a minute.','#fca5a5');
    });
  }
  var planBtn=$('#planEmailBtn');
  if(planBtn){
    planBtn.addEventListener('click',function(){
      var em=($('#planEmail')&&$('#planEmail').value.trim())||'';
      var nl=$('#planNlOpt');
      sendPlanEmail(em,!!(nl&&nl.checked),false);
    });
  }

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
      // Save session to Supabase via worker
      var emailField=$('#emailOpt');
      // Email is now required to reach this point; giving it is the opt-in.
      sessionReady=fetch(API_BASE+'/session',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sex:d.sex,age:d.age,goal:d.goal,
          height_cm:Math.round(d.heightCm),weight_value:Math.round(d.weightLbs||d.weightKg*2.205),weight_unit:'lbs',
          email:(emailField&&emailField.value.trim())||null,
          newsletter_opt_in:!!(emailField&&emailField.value.trim()),
          macros:{calories:lastMacros.calories,fatG:lastMacros.fatG,proteinG:lastMacros.proteinG,carbG:lastMacros.carbG,tdee:lastMacros.tdee},
          referrer:document.referrer||null,
          device_type:window.innerWidth<768?'mobile':(window.innerWidth<1024?'tablet':'desktop'),
          utm_source:utmData.utm_source,
          utm_medium:utmData.utm_medium,
          utm_campaign:utmData.utm_campaign,
          utm_content:utmData.utm_content,
          utm_term:utmData.utm_term
        })
      }).then(function(r){return r.json();}).then(function(j){if(j.token)sessionToken=j.token;}).catch(function(e){console.warn('KD session create failed:',e);});
      freeResults.classList.add('show');
      step2.classList.add('show');
      var optEmail=$('#emailOpt');
      if(optEmail&&optEmail.value.trim()&&$('#emailReq')){
        $('#emailReq').value=optEmail.value.trim();
      }
      // Fulfill the step-1 promise: email is required, so always send their results.
      if(optEmail&&optEmail.value.trim()&&$('#planEmail')){
        $('#planEmail').value=optEmail.value.trim();
        sendPlanEmail(optEmail.value.trim(),true,true);
      }
      if(!gaugeShown){ setTimeout(function(){animateGauge(lastMacros);},180); gaugeShown=true; }
      else{ animateGauge(lastMacros); }
      setTimeout(function(){scrollToEl(freeResults);},120);
      // Wire share buttons with actual results
      if(lastMacros){
        var m=lastMacros;
        var txt='Free keto macro calculator — get your personalized targets in 30 seconds. No signup needed.';
        var u=encodeURIComponent('https://ketodial.com/#calc');
        var t=encodeURIComponent(txt);
        var fb=$('#calcShareFb'),xb=$('#calcShareX'),pb=$('#calcSharePin');
        if(fb)fb.href='https://www.facebook.com/sharer/sharer.php?u='+u+'&quote='+t;
        if(xb)xb.href='https://twitter.com/intent/tweet?text='+t+'&url='+u;
        if(pb)pb.href='https://pinterest.com/pin/create/button/?url='+u+'&description='+t;
      }
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
      updateSession({
        step_completed:2,
        email:emailReq.value.trim(),
        first_name:nameReq.value.trim(),
        conditions:$all('#step2 [data-multi]')[0]?Array.from($all('#step2 [data-multi]')[0].querySelectorAll('.on')).map(function(b){return b.dataset.val;}):[],
        symptoms:$all('#step2 [data-multi]')[1]?Array.from($all('#step2 [data-multi]')[1].querySelectorAll('.on')).map(function(b){return b.dataset.val;}):[],
        medications:$('#step2 input[type="text"]')?$('#step2 input[type="text"]').value:'',
        dairy_tolerance:$all('#step2 select')[0]?$all('#step2 select')[0].value:'',
        cooking_skill:$all('#step2 select')[1]?$all('#step2 select')[1].value:'',
        meal_prep_time:$all('#step2 select')[2]?$all('#step2 select')[2].value:'',
        family_situation:$all('#step2 select')[3]?$all('#step2 select')[3].value:'',
        budget:$('#step2 [data-seg="budget"] .on')?$('#step2 [data-seg="budget"] .on').dataset.val:'',
        biggest_challenge:$('#step2 textarea')?$('#step2 textarea').value:'',
        previous_diets:$all('#step2 [data-multi]')[2]?Array.from($all('#step2 [data-multi]')[2].querySelectorAll('.on')).map(function(b){return b.dataset.val;}):[]
      });
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
      updateSession({step_completed:3});

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
    var sessionId=urlParams.get('session_id')||'';
    var successEmail=$('#successEmail');
    var wrap=$('#reportRows');

    // Build report links using the session ID
    var reportBase=API_BASE+'/report/'+sessionId;
    var reportTypes=[
      {name:'Macro Results',type:'free',color:'var(--accent)',tag:'FREE'},
      {name:"Doctor's Report",type:'doctor',color:'#f0abfc',tag:'PDF'},
      {name:'7-Day Meal Plan',type:'meal',color:'var(--protein)',tag:'PDF'},
      {name:'Keto Starter Kit',type:'starter',color:'#fbbf24',tag:'PDF'}
    ];

    if(wrap){
      wrap.innerHTML='';
      reportTypes.forEach(function(r){
        var el=document.createElement('div');
        el.className='rrow';
        if(r.type==='free'){
          el.innerHTML='<span class="rdot" style="background:'+r.color+'"></span><span class="rnm">'+r.name+'</span><span class="rtag mono">'+r.tag+'</span>';
        }else{
          el.innerHTML='<span class="rdot" style="background:'+r.color+'"></span><span class="rnm">'+r.name+'</span><span class="rtag mono">'+r.tag+'</span><a class="ropen" href="'+reportBase+'?type='+r.type+'" target="_blank">Open</a>';
        }
        wrap.appendChild(el);
      });
    }

    if(successEmail) successEmail.textContent=sessionId?'the email you provided':'your inbox';
    track('kd_payment_complete',{session_id:sessionId});
    successOverlay.classList.add('show');
  }

  var successClose=$('#successClose'), successDone=$('#successDone');
  if(successClose) successClose.addEventListener('click',function(){successOverlay.classList.remove('show');window.history.replaceState({},'','/');});
  if(successDone) successDone.addEventListener('click',function(){successOverlay.classList.remove('show');window.history.replaceState({},'','/');});
  if(successOverlay) successOverlay.addEventListener('click',function(e){if(e.target===successOverlay){successOverlay.classList.remove('show');window.history.replaceState({},'','/');}});

})();
