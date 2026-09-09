(function(){
  "use strict";

  /* ---------- analytics ---------- */
  function track(event,params){
    if(window.gtag) window.gtag('event',event,params||{});
    // Mirror the key conversion moments to the Pinterest tag so pin -> ketodial
    // traffic is attributable in Pinterest reporting (not just GA).
    if(window.pintrk){
      if(event==='kd_plan_emailed'){
        window.pintrk('track','lead',{lead_type:'keto_calculator'});
      }else if(event==='kd_payment_complete'){
        window.pintrk('track','checkout',{currency:'USD',lead_type:'keto_report'});
      }
    }
  }

  /* ---------- helpers ---------- */
  function $(s,ctx){return (ctx||document).querySelector(s);}
  function $all(s,ctx){return Array.prototype.slice.call((ctx||document).querySelectorAll(s));}
  function money(n){return '$'+n.toFixed(2);}
  var API_BASE='https://ketodial-api.iambrew.workers.dev';
  var sessionToken=null;
  var sessionReady=null;
  // Set once POST /resume has resolved the row an emailed link pointed at. It makes
  // the results button CONTINUE that row instead of opening a second one.
  var resumedSession=false;
  var urlParams=new URLSearchParams(window.location.search);
  var utmData={
    utm_source:urlParams.get('utm_source')||null,
    utm_medium:urlParams.get('utm_medium')||null,
    utm_campaign:urlParams.get('utm_campaign')||null,
    utm_content:urlParams.get('utm_content')||null,
    utm_term:urlParams.get('utm_term')||null
  };
  // Writes that checkout depends on. Checkout AWAITS this chain instead of racing
  // it: the kidney answer decides which products we are allowed to sell, and the
  // session row has to exist before /checkout can validate it at all. Fire-and-
  // forget was how the step-2 PATCH failed silently in production for months.
  var pendingWrites = Promise.resolve();
  // STICKY. This was `lastWriteError`, cleared on every successful PATCH — and
  // checkout itself queues `step_completed:3`, so a failed profile save could be
  // followed by that success and the failure would vanish before writesSettled()
  // ever looked. A failure is only resolved by retrying the thing that failed, so
  // only the profile submit clears it.
  var writeFailures = 0;
  var lastWriteError = null;
  var lastCheckpointFailed = false;

  function updateSession(data){
    if(!sessionReady) return pendingWrites;
    pendingWrites = pendingWrites.then(function(){
      return sessionReady.then(function(){
        if(!sessionToken) return;
        return fetch(API_BASE+'/session',{
          method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify(Object.assign({token:sessionToken},data))
        }).then(function(r){
          lastCheckpointFailed = !r.ok;
          if(!r.ok){
            writeFailures++;
            lastWriteError='Your answers did not save. Please try again.';
            console.warn('KD session update rejected:',r.status);
          }
        });
      });
    }).catch(function(e){
      lastCheckpointFailed = true;
      writeFailures++;
      lastWriteError='Your answers did not save. Please check your connection and try again.';
      console.warn('KD session update failed:',e);
    });
    return pendingWrites;
  }

  /** Resolve once every save checkout depends on has landed. Rejects with a message. */
  function writesSettled(){
    return pendingWrites.then(function(){
      if(!sessionToken) throw new Error('We could not save your calculator results. Please reload and try again.');
      if(writeFailures>0) throw new Error(lastWriteError);
    });
  }
  function scrollToEl(el,extra){
    var nav=70, pad=(extra||24);
    var y=el.getBoundingClientRect().top+window.scrollY-nav-pad;
    window.scrollTo({top:y,behavior:'smooth'});
    // Some webviews/emulators silently drop smooth programmatic scrolls.
    // If nothing moved after 700ms and the user hasn't scrolled, snap.
    // behavior:'instant' is required — this page sets html{scroll-behavior:
    // smooth}, which turns even default scrollTo calls into (droppable)
    // smooth animations.
    var start=window.scrollY;
    setTimeout(function(){
      var yNow=el.getBoundingClientRect().top+window.scrollY-nav-pad;
      if(Math.abs(window.scrollY-start)<4 && Math.abs(yNow-window.scrollY)>60){
        try{window.scrollTo({top:yNow,behavior:'instant'});}
        catch(e){window.scrollTo(0,yNow);}
      }
    },700);
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
        // Placeholder must match the unit — "165" reads as 165 kg in metric
        var weightInput=$('#weight');
        if(weightInput) weightInput.placeholder=(u==='imperial')?'165':'75';
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
    // Macro grams. For a customer who told us about their kidney function we print a
    // referral where the protein target would be — NOT a smaller number. Picking a
    // gentler figure is the same clinical decision in a quieter voice, and protein
    // needs with reduced kidney function depend on labs this page has never seen.
    var suppress=proteinSuppressed();
    var gMap={fat:m.fatG+' g',protein:m.proteinG+' g',carbs:m.carbG+' g'};
    Object.keys(gMap).forEach(function(k){
      var el=$('[data-g="'+k+'"]'); if(!el) return;
      if(k==='protein'&&suppress){
        el.textContent='Ask your doctor or renal dietitian';
        el.classList.add('protein-referral');
      }else{
        el.textContent=gMap[k];
        el.classList.remove('protein-referral');
      }
    });
    // The generic 70/25/5 keto split is static markup shown to everyone, but next to
    // a referral a "25%" reads as this reader's protein target. Blank it.
    var protPct=$('[data-g="protein"]')&&$('[data-g="protein"]').parentNode.querySelector('.pct');
    if(protPct) protPct.textContent=suppress?'':'25%';
    // One sentence of explanation, added once, removed if they change the answer.
    var noteHost=$('[data-g="protein"]')&&$('[data-g="protein"]').closest('.macros');
    var note=$('#proteinNote');
    if(suppress&&!note&&noteHost){
      note=document.createElement('p');
      note.id='proteinNote'; note.className='protein-note';
      note.textContent='Protein needs can vary with kidney function, so KetoDial won\u2019t set a personalized target for you.';
      noteHost.appendChild(note);
    }else if(!suppress&&note){ note.remove(); }
    // TDEE row
    var tdeeStats=$all('.tdee-stat .v');
    if(tdeeStats[0]) tdeeStats[0].innerHTML=m.tdee.toLocaleString()+' <small>kcal</small>';
    if(tdeeStats[1]) tdeeStats[1].textContent=m.deficitPct>0?'−'+m.deficitPct+'%':(m.deficitPct<0?'+'+Math.abs(m.deficitPct)+'%':'0%');
    if(tdeeStats[2]) tdeeStats[2].innerHTML=m.carbG+' <small>g</small>';
    // Food equivalents (approximate)
    var feqAmts=$all('.feq .lead .amt');
    if(feqAmts[0]) feqAmts[0].textContent=m.fatG+'g';
    if(feqAmts[1]) feqAmts[1].textContent=suppress?'—':m.proteinG+'g';
    if(feqAmts[2]) feqAmts[2].textContent=m.carbG+'g';
    // Food descriptions based on actual amounts
    var feqDescs=$all('.feq .desc');
    if(feqDescs[0]) feqDescs[0].textContent='≈ '+Math.round(m.fatG/14)+' tbsp olive oil worth of fat across the day, or avocado + eggs + nuts.';
    if(feqDescs[1]){
      if(suppress){
        // The same figure in ounces is still the figure. Route, do not restate.
        feqDescs[1].textContent='Your doctor or a renal dietitian sets this one.';
      }else{
        var oz=Math.round(m.proteinG/7);
        feqDescs[1].textContent='≈ '+oz+' oz of meat/fish across your meals (a '+Math.round(oz/2)+' oz portion at lunch and dinner).';
      }
    }
    if(feqDescs[2]) feqDescs[2].textContent='≈ '+Math.round(m.carbG/5)+' cups of leafy greens plus a small handful of berries.';
  }

  /**
   * The early renal gate's answer: 'no' | 'yes' | 'unsure', or '' if not answered yet.
   * Read from the DOM rather than kept in a variable so there is one place it lives
   * on the client and no chance of a stale copy disagreeing with the chips.
   */
  function kidneyStatus(){
    var b=$('[data-seg="kidney"] .on');
    return b?b.dataset.val:'';
  }

  /** Anything that is not an explicit 'no' suppresses the personalized protein target. */
  function proteinSuppressed(){ return kidneyStatus()!=='no'; }

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
      // Inches were unbounded — "5 ft 25 in" passed silently and skewed the math
      var inch=parseFloat($('#heightIn').value)||0;
      if(inch<0||inch>11){$('#heightIn').closest('.input').classList.add('invalid');valid=false;}
    }
    // One tap, and it decides what we are allowed to show and sell. Unanswered is
    // not "no" — see deriveKdMedicalContext in the worker, which fails closed the
    // same way.
    if(!kidneyStatus()){
      var kf=$('#kidneyField'); if(kf) kf.classList.add('invalid');
      valid=false;
    }
    return valid;
  }

  // Show/hide validation message
  var step1Msg=document.createElement('div');
  step1Msg.style.cssText='display:none;margin-top:10px;font-size:12.5px;color:#dc2626;text-align:center;font-weight:600';
  step1Msg.textContent='Enter your age, height, and weight to calculate your macros.';
  if(freeBtn) freeBtn.parentNode.insertBefore(step1Msg,freeBtn.nextSibling.nextSibling);

  /* ---------- EMAIL MY PLAN ---------- */
  // lastProfile is snapshotted at compute time alongside lastMacros, so the
  // email always describes the same inputs that produced its numbers. Reading
  // the live form here was the old bug: change the goal chip after computing
  // and the email paired fresh goal copy with stale macros.
  var planSentTo={};
  var lastProfile=null;
  function sendPlanEmail(email,newsletterOptIn,isAuto){
    var msg=$('#planEmailMsg'), btn=$('#planResendBtn');
    function show(text,color){if(msg){msg.style.display='block';msg.style.color=color;msg.textContent=text;}}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      if(!isAuto)show('We need a valid email on file. Fix it in Step 1 and recalculate.','#dc2626');
      return;
    }
    // Explicit resends (the "updated numbers" button) bypass the dedupe map —
    // the whole point is sending again with new numbers. Auto-sends stay
    // deduped so recomputes never fire emails on their own.
    if(isAuto&&planSentTo[email])return;
    planSentTo[email]=true;
    if(btn){btn.disabled=true;btn.textContent='Sending…';}
    function doSend(){
      return fetch(API_BASE+'/email-plan',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          token:sessionToken,
          email:email,
          newsletter_opt_in:!!newsletterOptIn,
          goal:(lastProfile||{}).goal,
          age:(lastProfile||{}).age||null,
          sex:(lastProfile||{}).sex||null,
          activity:(lastProfile||{}).activity||null,
          macros:lastMacros?{calories:lastMacros.calories,fatG:lastMacros.fatG,proteinG:lastMacros.proteinG,carbG:lastMacros.carbG,tdee:lastMacros.tdee}:null,
          utm_source:utmData.utm_source,
          utm_medium:utmData.utm_medium,
          utm_campaign:utmData.utm_campaign
        })
      }).then(function(r){return{ok:r.ok};});
    }
    var start=sessionReady?sessionReady.then(doSend,doSend):doSend();
    start.then(function(res){
      if(btn){btn.disabled=false;btn.textContent='Email me these updated numbers';}
      if(res&&res.ok){
        track('kd_plan_emailed',{auto:!!isAuto,newsletter_opt_in:!!newsletterOptIn});
        if(!isAuto){
          if(btn)btn.style.display='none';
          show('Sent! Your updated numbers are on the way.','#15803d');
        }
      }else{
        planSentTo[email]=false;
        if(!isAuto)show('Something went wrong sending your plan. Try again in a minute.','#dc2626');
      }
    }).catch(function(){
      planSentTo[email]=false;
      if(btn){btn.disabled=false;btn.textContent='Email me these updated numbers';}
      if(!isAuto)show('Something went wrong sending your plan. Try again in a minute.','#dc2626');
    });
  }
  var planResendBtn=$('#planResendBtn');
  if(planResendBtn){
    planResendBtn.addEventListener('click',function(){
      var em=($('#emailOpt')&&$('#emailOpt').value.trim())||'';
      sendPlanEmail(em,true,false);
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
      lastProfile={goal:d.goal,age:d.age,sex:d.sex,activity:d.activity};
      track('kd_free_results',{calories:lastMacros.calories,goal:d.goal,sex:d.sex});
      // Save session to Supabase via worker
      var emailField=$('#emailOpt');
      // ONE ROW PER CUSTOMER. After an email resume we already hold the authoritative
      // session, so pressing the results button again must rewrite THAT row. A second
      // row would split the intake, and the half the Doctor's Report gets built from
      // would be whichever half checkout happened to reference.
      if(resumedSession&&sessionToken){
        updateSession({
          sex:d.sex,age:d.age,goal:d.goal,
          lifestyle_activity:d.activity,
          kidney_status:kidneyStatus(),
          height_cm:Math.round(d.heightCm),
          weight_value:Math.round(d.weightLbs||d.weightKg*2.205),
          weight_unit:'lbs',
          email:(emailField&&emailField.value.trim())||undefined,
          macros:{calories:lastMacros.calories,fatG:lastMacros.fatG,proteinG:lastMacros.proteinG,carbG:lastMacros.carbG,tdee:lastMacros.tdee}
        });
      }else{
      // Email is now required to reach this point; giving it is the opt-in.
      sessionReady=fetch(API_BASE+'/session',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sex:d.sex,age:d.age,goal:d.goal,
          // Persisted because the Doctor's Report prints it. It was computed here to
          // derive TDEE and then thrown away, so the report could only ever have shown
          // a value it made up. Store it or do not print it.
          lifestyle_activity:d.activity,
          // The early renal gate travels with the very first save, so the
          // authoritative record carries it from the moment the free result exists.
          // The client never becomes a second source of truth for it.
          kidney_status:kidneyStatus(),
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
      }
      freeResults.classList.add('show');
      step2.classList.add('show');
      // Reveal the priced report picker right after the free macros, moved above
      // the survey so prices are visible without completing the 12-field profile.
      // The survey stays below as optional personalization.
      var picker=$('#reportPicker');
      if(picker){
        if(step2&&step2.parentNode&&step2.parentNode===picker.parentNode){
          step2.parentNode.insertBefore(picker,step2);
        }
        picker.classList.add('show');
      }
      // The card is inside #freeResults and gated on that .show class, so this is
      // the first moment it can legitimately appear.
      render();
      var optEmail=$('#emailOpt');
      if(optEmail&&optEmail.value.trim()&&$('#emailReq')){
        $('#emailReq').value=optEmail.value.trim();
      }
      // Fulfill the step-1 promise: the FIRST results click auto-sends their
      // numbers. Recomputes only update the screen — someone playing what-if
      // with the sliders shouldn't fill their own inbox. Instead a resend
      // button appears so they can email the new numbers when they mean to.
      if(optEmail&&optEmail.value.trim()){
        var planEm=optEmail.value.trim();
        if($('#planSentEmail'))$('#planSentEmail').textContent=planEm;
        if(!planSentTo[planEm]){
          sendPlanEmail(planEm,true,true);
        }else if($('#planResendBtn')){
          $('#planResendBtn').style.display='inline-block';
          if($('#planEmailMsg'))$('#planEmailMsg').style.display='none';
        }
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

  var continueBtn=$('#kdContinueBtn');
  if(continueBtn){
    continueBtn.addEventListener('click',function(){
      track('kd_optional_profile_clicked',{kidney:kidneyStatus()});
      if(step2) scrollToEl(step2);
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
      // Clear ONLY on success. Resetting before the write meant a failed checkpoint
      // left the counter at zero and checkout sailed through on stale state.
      updateSession(collectProfile()).then(function(){
        if(writeFailures===0) return;
        // The checkpoint itself landed; earlier failures are superseded by it.
        if(!lastCheckpointFailed){ writeFailures=0; lastWriteError=null; }
      });
      reportPicker.classList.add('show');
      setTimeout(function(){scrollToEl(reportPicker);},120);
    });
  }

  /**
   * The step-2 profile. One collector, used by the pre-payment submit and by the
   * post-payment "finish your reports" flow, so the two can never drift apart.
   */
  function collectProfile(){
    return {
      step_completed:2,
      // THE SAFETY ANSWER RIDES THE CHECKPOINT.
      // Without this the sequence below silently disarms the gate:
      //   stored=No -> customer changes to Yes -> that PATCH fails -> profile
      //   submit resets writeFailures -> profile PATCH succeeds WITHOUT the kidney
      //   answer -> checkout proceeds -> the server still believes No.
      // The customer would see suppression on screen while the authoritative row —
      // the one that decides what we sell and what the report says — said the
      // opposite. Any write that is allowed to clear previous failures must carry
      // every checkout-critical answer, not just the fields on this form.
      kidney_status:kidneyStatus(),
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
    };
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

  /**
   * The 7-Day Meal Plan's whole value is an individualized protein target: the worker
   * picks eligible meals by protein density and scales every portion to hit the
   * number. There is no version of it that is not a protein prescription, so when we
   * are not setting a protein target we cannot build it — and must not sell it.
   *
   * Bundles containing it go too, because there is no Stripe price for half a bundle.
   * That is not a worse deal: Doctor's Report + Starter Kit is $9.98 against $10.99
   * for a Full Protocol they could not receive in full. Nobody pays more for less.
   *
   * Mirrors allowedProducts() in ketodial/worker/reports.js, which is the authority.
   * This copy exists so the picker never OFFERS something checkout would decline;
   * the worker still enforces it for a stale page.
   */
  var PROTEIN_ANCHORED=['meal'];
  function productAvailable(key){
    if(!proteinSuppressed()) return true;
    var parts=(PRODUCTS[key].contains||[key]);
    return !parts.some(function(part){return PROTEIN_ANCHORED.indexOf(part)>-1;});
  }

  /**
   * THE FEATURED OFFER, DERIVED RATHER THAN DECLARED.
   *
   * This runs the same PRODUCTS map through the same productAvailable() the
   * detailed picker uses, so the renal gate has exactly ONE implementation on this
   * page. A hand-written "Full Protocol $10.99" card would be a second, silent copy
   * of the medical rule that nobody updates when the rule changes, and advertising a
   * product the worker then declines at /checkout is the precise failure this audit
   * exists to prevent.
   *
   * Best available bundle if there is one; otherwise every individual report we can
   * still deliver. For a customer who answered 'no' that is the Full Protocol at
   * $10.99. For 'yes' or 'unsure' both bundles contain the protein-anchored Meal
   * Plan, so it becomes Doctor's Report + Starter Kit at $9.98.
   */
  function featuredOffer(){
    var bundles=['protocol','essentials'].filter(productAvailable);
    var items=bundles.length?[bundles[0]]:['doctor','meal','starter'].filter(productAvailable);
    var price=items.reduce(function(a,k){return a+PRODUCTS[k].price;},0);
    var parts=[];
    items.forEach(function(k){
      (PRODUCTS[k].contains||[k]).forEach(function(part){
        if(parts.indexOf(part)<0) parts.push(part);
      });
    });
    var list=parts.reduce(function(a,k){return a+PRODUCTS[k].price;},0);
    return {items:items,parts:parts,price:price,list:list,save:Math.round((list-price)*100)/100};
  }

  var UC_BULLETS={
    doctor:["A Doctor&rsquo;s Report for your next appointment, with the labs to ask about and what to discuss"],
    // The grocery list is part of the Meal Plan, so it appears and disappears with it
    // rather than being promised separately.
    meal:["A personalized 7-Day Meal Plan built around your macros","The grocery list for that week"],
    starter:["The Keto Starter Kit for your first 14 days"]
  };
  var UC_ORDER=['meal','starter','doctor'];

  function tick(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
  }

  /**
   * Paint the card. Called from render(), which is also what the kidney chips call,
   * so changing the answer re-derives the offer instead of leaving a stale one up.
   */
  function renderUpgradeCard(){
    var card=$('#kdUpgradeCard'); if(!card) return;
    var fr=$('#freeResults');
    // It lives inside #freeResults, but stays hidden until there are results to sit
    // under, so it can never be the first thing on the page.
    if(!fr||!fr.classList.contains('show')){ card.hidden=true; return; }
    var o=featuredOffer();
    if(!o.items.length){ card.hidden=true; return; }
    var suppressed=proteinSuppressed();

    var bullets='';
    UC_ORDER.forEach(function(k){
      if(o.parts.indexOf(k)<0) return;
      UC_BULLETS[k].forEach(function(line){
        bullets+='<li>'+tick()+'<span>'+line+'</span></li>';
      });
    });

    // Repaint only when the OFFER changes. render() runs on every macro tweak and
    // on every product tap, and the upgrade CTA itself calls render() to update the
    // total bar before opening checkout — rebuilding innerHTML there would detach
    // the button whose click handler is still executing.
    var sig=o.items.join(',')+'|'+(suppressed?'renal':'full');
    if(card.dataset.rendered===sig){ card.hidden=false; return; }
    card.dataset.rendered=sig;

    var head=suppressed
      ? 'Get the reports we can personalize safely'
      : 'Your macros are dialed in. Want the whole plan?';
    var sub=suppressed
      // Deliberately does NOT name the report we cannot sell them. Explaining what
      // they are missing, in appetising terms, is still advertising it. The note at
      // the foot of the card carries the only explanation they need.
      ? 'These are the reports we can put together for you without setting a personalized protein target.'
      : 'Turn these numbers into the things you actually use: what to eat, what to buy, and what to tell your doctor.';
    var ctaLabel=suppressed
      ? 'Get both reports for '+money(o.price)
      : 'Get the Full Protocol for '+money(o.price);

    var priceRow='<div class="uc-price-row"><span class="uc-price">'+money(o.price)+'</span>';
    // Only claim a saving when the bundle actually creates one. Doctor + Starter is
    // two full-price reports; inventing a discount there would be a lie.
    if(o.save>0.001){
      priceRow+='<span class="uc-was">'+money(o.list)+'</span>'
             +  '<span class="uc-save">Save '+money(o.save)+'</span>';
    }
    priceRow+='</div>';

    // The same neutral sentence the free result uses. It is true of 'yes' and of
    // 'unsure' alike and diagnoses neither.
    var note=suppressed
      ? '<p class="uc-note">Protein needs can vary with kidney function, so KetoDial won’t set a personalized protein target for you. Ask your doctor or renal dietitian for that number.</p>'
      : '';

    card.innerHTML=
      '<div class="uc-eyebrow">Your next step</div>'+
      '<h3 class="uc-head">'+head+'</h3>'+
      '<p class="uc-sub">'+sub+'</p>'+
      '<ul class="uc-list">'+bullets+'</ul>'+
      priceRow+
      '<button type="button" class="uc-cta" id="kdUpgradeCta">'+ctaLabel+'</button>'+
      '<div class="uc-trust"><span>'+tick()+'One-time purchase</span>'+
        '<span>'+tick()+'Delivered after personalization</span>'+
        '<span>'+tick()+'No subscription</span></div>'+
      '<button type="button" class="uc-secondary" id="kdSeeAllReports">See individual reports &amp; other options</button>'+
      note;
    card.hidden=false;

    if(card.dataset.seen!==o.items.join(',')){
      card.dataset.seen=o.items.join(',');
      track('kd_upgrade_card_viewed',{offer:o.items.join(','),price:o.price,kidney:kidneyStatus()});
    }

    $('#kdUpgradeCta').addEventListener('click',function(){
      track('kd_upgrade_cta_clicked',{offer:o.items.join(','),price:o.price,kidney:kidneyStatus()});
      // Drive the REAL picker state. The card owns no selection of its own, so the
      // order that reaches /checkout is the same object the picker would have built
      // and the total bar agrees with what the customer was just shown.
      selected.clear();
      o.items.forEach(function(k){ if(productAvailable(k)) selected.add(k); });
      render();
      beginCheckout(this);
    });
    $('#kdSeeAllReports').addEventListener('click',function(){
      track('kd_see_individual_reports',{kidney:kidneyStatus()});
      var picker=$('#reportPicker');
      if(picker){ picker.classList.add('show'); scrollToEl(picker); }
    });
  }

  /**
   * The confirmation under the results used to be static markup reading
   * "You told us your goal, that's how we set your protein floor." For a customer
   * who answered yes or I'm not sure that is flatly untrue: the page, the emailed
   * plan and the paid reports all withhold the protein target, and this one line
   * sat underneath them claiming we had set it. It also still pointed at a "Step 3"
   * that no longer exists. Derived from the same gate as everything else.
   */
  function renderPlanSentNote(){
    var el=$('#planSentDetail'); if(!el) return;
    el.textContent=proteinSuppressed()
      ? ' The details below are what we use to tailor the rest of your reports.'
      : ' You told us your goal, that is how we set your protein floor. The details below tune the rest.';
  }

  function toggleProduct(key){
    if(!productAvailable(key)) return;
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
    // SAFETY CHANGES THE OFFER, NOT THE ABILITY TO PURCHASE. Unavailable items are
    // removed from the catalogue, not greyed out behind a warning. The customer sees
    // a normal picker containing the things we can actually deliver to them; there is
    // no disabled button, no scary banner, and no second health form to fill in.
    $all('[data-product]').forEach(function(card){
      var ok=productAvailable(card.dataset.product);
      card.hidden=!ok;
      if(!ok) selected.delete(card.dataset.product);
    });
    var bundlesWrap=$('.bundles');
    if(bundlesWrap){
      var anyBundle=$all('.bundles [data-product]').some(function(c){return !c.hidden;});
      bundlesWrap.hidden=!anyBundle;
    }

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
    renderUpgradeCard();
    renderPlanSentNote();
  }

  $all('[data-product]').forEach(function(card){
    card.addEventListener('click',function(){
      var key=card.dataset.product;
      if(!productAvailable(key)) return;
      toggleProduct(key);
      track('kd_report_selected',{product:key,selected:selected.has(key),kidney:kidneyStatus()});
    });
  });
  // The answer can change before checkout, so the offer follows it.
  $all('[data-seg="kidney"] .chip').forEach(function(b){
    b.addEventListener('click',function(){
      var kf=$('#kidneyField'); if(kf) kf.classList.remove('invalid');
      render();
      if(lastMacros) animateGauge(lastMacros);
      updateSession({kidney_status:kidneyStatus()});
    });
  });
  render();

  /* ---------- CHECKOUT (Stripe Embedded) ---------- */
  var STRIPE_PK='pk_live_51SjRKPEVDfkpGz8wSeZfQ87US3LUHKBg2I8KP1JmWIxtiDnDh2R9ViGQlThNBWbvEbiB9vvTLpyx2HHix4zYqqKH00jsXBAIc7';
  var checkoutBtn=$('#checkoutBtn');
  var checkoutOverlay=$('#checkoutOverlay');
  var stripeInstance=null;
  var embeddedCheckout=null;

  // collectFormData() was DELETED on 2026-09-08. It existed only to build the object
  // that went into Stripe's metadata[form_data], and that store is gone: the
  // authoritative questionnaire is in calculator_sessions_v2, written by
  // updateSession() above and read back by the worker via session_token.
  // Do not reintroduce it. Serializing the questionnaire into a 500-character
  // metadata field is what truncated real customers' medications and conditions.

  /**
   * ONE checkout entry point, used by the picker's total bar and by the upgrade
   * card's primary CTA. Both send the same `selected` set through the same session
   * checkpoint and the same writesSettled() guard, so the immediate offer cannot
   * become a second, laxer path to payment.
   *
   * `btn` is whichever control the customer actually pressed; only its label needs
   * the busy state. Step 1 already requires a valid email before results exist, so
   * buying straight from the card asks for nothing the customer has not given.
   */
  /**
   * Busy state for WHICHEVER control started a checkout.
   *
   * startCheckout() used to hardcode `checkoutBtn.disabled=false` on both its
   * success and failure paths. That is the detailed picker's button. The featured
   * card's CTA was left disabled and still reading "Loading checkout…" forever,
   * because it is a different element and because renderUpgradeCard() deliberately
   * skips repainting when the offer signature has not changed — so render() could
   * not rescue it either. Opening checkout and closing it without paying killed the
   * buy button. The picker path only appeared to work because render() happens to
   * rewrite that one button's label and disabled state on every call.
   *
   * So the originating button travels with the operation. It captures the real
   * previous label and disabled state rather than assuming them, and restore() is
   * idempotent so a success path followed by a late failure cannot double-restore
   * into a wrong state.
   */
  function busyButton(btn){
    if(!btn) return { restore:function(){} };
    var html=btn.innerHTML, wasDisabled=btn.disabled, done=false;
    btn.disabled=true;
    btn.textContent='Loading checkout…';
    return { restore:function(){
      if(done) return;
      done=true;
      btn.disabled=wasDisabled;
      btn.innerHTML=html;
    } };
  }

  function beginCheckout(btn){
    if(selected.size===0) return;
    var items=Array.from(selected);
    var email=(emailReq&&emailReq.value.trim())||($('#emailOpt')&&$('#emailOpt').value.trim())||'';
    var name=(nameReq&&nameReq.value.trim())||'';
    track('kd_checkout_opened',{items:items.join(',')});
    updateSession({step_completed:3});

    var busy=busyButton(btn);

    // Await the saves the server is about to validate, and surface a failure
    // rather than letting checkout 409 on data that simply had not landed yet.
    writesSettled().then(function(){ startCheckout(items,email,name,busy); })
      .catch(function(err){
        alert(err.message);
        busy.restore();
        render();
      });
  }

  if(checkoutBtn){
    checkoutBtn.addEventListener('click',function(){ beginCheckout(checkoutBtn); });
  }

  function startCheckout(items,email,name,busy){
    {
      // Never undefined in practice; a guard so a future caller cannot leave a
      // button stuck by forgetting the argument.
      busy = busy || { restore:function(){} };

      // Clean up previous checkout if any
      if(embeddedCheckout){ embeddedCheckout.destroy(); embeddedCheckout=null; }
      var container=$('#checkout-container');
      if(container) container.innerHTML='';

      // Initialize Stripe
      if(!stripeInstance) stripeInstance=Stripe(STRIPE_PK);

      fetch(API_BASE+'/checkout',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        // formData is deliberately NOT sent any more. The worker reads the
        // authoritative questionnaire from calculator_sessions_v2 via this token.
        // It used to be serialized into Stripe metadata, where a 500-character cap
        // silently truncated it and the report was written from the wreckage.
        body:JSON.stringify({items:items,email:email,name:name,token:sessionToken})
      })
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.clientSecret){
          checkoutOverlay.classList.add('show');
          return stripeInstance.initEmbeddedCheckout({clientSecret:data.clientSecret});
        }else{
          throw new Error(data.message||data.error||'Failed to create checkout session');
        }
      })
      .then(function(checkout){
        embeddedCheckout=checkout;
        checkout.mount('#checkout-container');
        // Stripe is up. Give the button back straight away: the customer may close
        // the overlay without paying, and that must leave them able to click again.
        busy.restore();
        render();
      })
      .catch(function(err){
        console.error('Checkout error:',err);
        checkoutOverlay.classList.remove('show');
        alert('Checkout error: '+err.message);
        busy.restore();
        render();
      });
    }
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

  /* ---------- RESUME FROM THE FREE-RESULTS EMAIL ---------- */
  /**
   * The email's buy button used to land on /#calc, an empty form. Someone who had
   * already given us their stats, read their numbers and decided to buy was asked to
   * do the whole calculator again to find the checkout.
   *
   * WHAT `kdr_...` ACTUALLY IS.
   * A random, expiring resume credential. It cannot PATCH a session directly — that
   * is refused on the prefix — but possession lets the holder POST /resume and
   * exchange it for the authoritative session credential, which can write. So it is
   * NOT read-only and it is NOT harmless for a third party to hold. Two earlier
   * versions of this comment claimed otherwise and both were wrong.
   *
   * WHAT THE DESIGN ACTUALLY BUYS, stated no more strongly than that:
   *   1. the session_token itself never appears in the emailed URL, in browser
   *      history, in a Referer header or in any analytics parameter; and
   *   2. the resume credential is captured and stripped by a synchronous inline
   *      script in <head>, above GA, Pinterest and Stripe, so unrelated page
   *      analytics never receive it either.
   * The residual is real: anyone who can read the email click-tracking logs holds an
   * exchangeable credential until it expires. The 30-day reusable lifetime is a
   * tracked hardening item, not a claim of safety.
   *
   * The exchange is POST because prefetchers, mail security scanners and click
   * trackers issue GET, so merely following the link cannot spend it.
   *
   * THE PAGE DOES NOT DECIDE WHAT A RESUMED CUSTOMER MAY BUY. /resume returns the
   * server's own allowedProducts() list and the authoritative kidney answer; the chip
   * is set from that and every product is re-checked through productAvailable().
   * Neither gate is load-bearing alone: /checkout re-derives eligibility from the
   * stored row regardless.
   */
  function resumeFromEmail(){
    // Captured in <head> before any third-party tag ran, and consumed exactly once.
    var ref=window.__kdResumeRef||null;
    try{ delete window.__kdResumeRef; }catch(e){ window.__kdResumeRef=undefined; }
    if(!ref||!/^kdr_[0-9a-f]{16,96}$/.test(ref)) return;

    // A RESUMED SESSION IS A WRITABLE CONTINUATION OF THE ORIGINAL ROW.
    // updateSession() returns early unless sessionReady is set, so setting only
    // sessionToken made every later profile save a silent no-op: the customer filled
    // in their conditions and medications, the page looked like it saved, and nothing
    // reached the row the Doctor's Report is built from. sessionReady IS this
    // exchange, so queued writes wait for it exactly as they wait for /session on the
    // normal path, and they address the ORIGINAL row rather than creating a second one.
    sessionReady=fetch(API_BASE+'/resume',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({resume_token:ref})
    })
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(d){
        if(!d||!d.session_token||!d.macros||!d.macros.calories){
          // Nothing to continue. Leave sessionToken null so writesSettled() refuses
          // checkout rather than letting it race a row we never resolved.
          return null;
        }
        // Held in a closure variable only. Never location, storage, DOM or analytics.
        sessionToken=d.session_token;
        resumedSession=true;

        if(d.kidney_status){
          var chip=$('[data-seg="kidney"] [data-val="'+d.kidney_status+'"]');
          if(chip){
            $all('[data-seg="kidney"] .chip').forEach(function(b){b.classList.remove('on');});
            chip.classList.add('on');
          }
        }

        // proteinG is ABSENT from the response for a suppressed reader, not zero and
        // not a gentler number. animateGauge already routes to the clinician line
        // when proteinSuppressed(), which the chip above has just made true.
        lastMacros=d.macros;
        animateGauge(d.macros);
        freeResults.classList.add('show');
        var picker=$('#reportPicker');
        if(picker) picker.classList.add('show');
        if(step2) step2.classList.add('show');

        // BOTH gates, not either. The server's list decides what is on offer, and
        // productAvailable() re-checks it against the kidney answer we just set from
        // that same response.
        selected.clear();
        var allowed=Array.isArray(d.allowed)?d.allowed:[];
        var take=function(k){ if(allowed.indexOf(k)>-1&&productAvailable(k)) selected.add(k); };
        if(allowed.indexOf('protocol')>-1&&productAvailable('protocol')) take('protocol');
        else { take('doctor'); take('starter'); }
        render();

        track('kd_email_resume',{offer:Array.from(selected).join(',')});
        setTimeout(function(){ scrollToEl($('#kdUpgradeCard')||freeResults); },150);
        return d;
      })
      .catch(function(e){ console.warn('KD resume failed:',e); return null; });
  }
  resumeFromEmail();

  /* ---------- SUCCESS (return from Stripe embedded) ---------- */
  var successOverlay=$('#successOverlay');
  var urlParams=new URLSearchParams(window.location.search);
  var paidSessionId=urlParams.get('session_id')||urlParams.get('finish')||'';

  var REPORT_META={
    doctor:{name:"Doctor's Report",color:'#f0abfc'},
    meal:{name:'7-Day Meal Plan',color:'var(--protein)'},
    starter:{name:'Keto Starter Kit',color:'#fbbf24'}
  };

  /**
   * Render the success screen from what the SERVER says was purchased.
   *
   * It used to hardcode all three reports. A renal customer who was correctly
   * prevented from buying the meal plan was still shown an "Open 7-Day Meal Plan"
   * link, which 403s. Telling someone they own something we deliberately did not
   * sell them is worse than the 403 it leads to.
   */
  function renderSuccess(status){
    var wrap=$('#reportRows');
    if(!wrap) return;
    wrap.innerHTML='';
    var base=API_BASE+'/report/'+paidSessionId;

    var free=document.createElement('div');
    free.className='rrow';
    free.innerHTML='<span class="rdot" style="background:var(--accent)"></span>'+
      '<span class="rnm">Macro Results</span><span class="rtag mono">FREE</span>';
    wrap.appendChild(free);

    (status.purchased||[]).forEach(function(type){
      var meta=REPORT_META[type]; if(!meta) return;
      var el=document.createElement('div');
      el.className='rrow';
      var right=status.profileComplete
        ? '<a class="ropen" href="'+base+'?type='+type+'" target="_blank">Open</a>'
        : '<span class="rtag mono" style="opacity:.7">PENDING</span>';
      el.innerHTML='<span class="rdot" style="background:'+meta.color+'"></span>'+
        '<span class="rnm">'+meta.name+'</span><span class="rtag mono">PDF</span>'+right;
      wrap.appendChild(el);
    });

    var notice=$('#finishNotice');
    if(!notice){
      notice=document.createElement('div');
      notice.id='finishNotice';
      notice.style.cssText='margin-top:16px;padding:14px 16px;border-radius:10px;'+
        'background:rgba(244,228,212,0.08);border:1px solid rgba(244,228,212,0.18);line-height:1.55';
      wrap.parentNode.appendChild(notice);
    }
    if(status.profileComplete){
      notice.style.display='none';
    }else if(status.recoverable===false){
      notice.style.display='';
      notice.innerHTML='<b>We could not build your reports yet.</b><br>'+
        (status.message||'Please email ketodial@carnivoreweekly.com and we will sort it out.');
    }else{
      notice.style.display='';
      notice.innerHTML='<b>One short step and your reports are ready.</b><br>'+
        'They are built from the short health profile below — it takes about a minute, and we would '+
        'rather ask than guess at your details.<br>'+
        '<button id="finishProfileBtn" class="generate" style="margin-top:12px">Finish my reports</button>';
      var btn=$('#finishProfileBtn');
      if(btn) btn.addEventListener('click',function(){
        successOverlay.classList.remove('show');
        if(step2){ step2.classList.add('show'); scrollToEl(step2); }
        armPostPaymentProfile();
      });
    }
  }

  /**
   * After payment the browser has NO session token — Stripe redirects to a freshly
   * loaded page and nothing persisted it. So the post-payment profile submit is keyed
   * on the paid Stripe session id instead, and the server resolves it back to the
   * original row. Same form, same collector, different handle.
   */
  function armPostPaymentProfile(){
    var build=$('#buildBtn');
    if(!build||build.dataset.postPayment==='1') return;
    build.dataset.postPayment='1';
    build.textContent='Finish my reports';
    build.addEventListener('click',function(ev){
      ev.stopImmediatePropagation();
      if(!emailReq.value.trim()||!nameReq.value.trim()){
        flagInvalid(nameReq); flagInvalid(emailReq); return;
      }
      build.disabled=true; build.textContent='Saving…';
      var payload=collectProfile();
      payload.stripe_session_id=paidSessionId;
      fetch(API_BASE+'/session',{
        method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      }).then(function(r){
        if(!r.ok) throw new Error('Your answers did not save. Please try again.');
        build.textContent='Building your reports…';
        return fetch(API_BASE+'/fulfill',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({stripe_session_id:paidSessionId})
        });
      }).then(function(r){return r.json().then(function(j){
        if(!r.ok) throw new Error(j.message||'We could not build your reports yet.');
        return j;
      });}).then(function(){
        build.textContent='Done — check your email';
        return loadPurchaseStatus();
      }).catch(function(err){
        alert(err.message);
        build.disabled=false; build.textContent='Finish my reports';
      });
    },true);
  }

  function loadPurchaseStatus(){
    return fetch(API_BASE+'/purchase/'+encodeURIComponent(paidSessionId))
      .then(function(r){return r.json();})
      .then(function(status){
        if(status.error) return;
        renderSuccess(status);
        successOverlay.classList.add('show');
        if(!status.profileComplete && status.recoverable!==false) armPostPaymentProfile();
      })
      .catch(function(e){console.warn('KD purchase status failed:',e);});
  }

  if(paidSessionId && (urlParams.get('success')==='true'||urlParams.get('finish'))){
    var successEmail=$('#successEmail');
    if(successEmail) successEmail.textContent='the email you provided';
    loadPurchaseStatus();
    // Fire once per purchase — the success URL survives reloads and bookmarks.
    var payKey='kd_purchase_fired_'+paidSessionId;
    var alreadyFired=false;
    try{alreadyFired=!!localStorage.getItem(payKey);}catch(e){}
    if(!alreadyFired&&urlParams.get('success')==='true'){
      track('kd_payment_complete',{session_id:paidSessionId});
      try{localStorage.setItem(payKey,'1');}catch(e){}
    }
  }

  var successClose=$('#successClose'), successDone=$('#successDone');
  if(successClose) successClose.addEventListener('click',function(){successOverlay.classList.remove('show');window.history.replaceState({},'','/');});
  if(successDone) successDone.addEventListener('click',function(){successOverlay.classList.remove('show');window.history.replaceState({},'','/');});
  if(successOverlay) successOverlay.addEventListener('click',function(e){if(e.target===successOverlay){successOverlay.classList.remove('show');window.history.replaceState({},'','/');}});

})();
