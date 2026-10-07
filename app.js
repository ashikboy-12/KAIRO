const $=id=>document.getElementById(id);
const chat=$("chat"),input=$("messageInput"),send=$("sendButton"),mic=$("micButton");
const voice=$("voiceMode"),status=$("voiceStatus"),sub=$("voiceSubtitle"),closeV=$("closeVoiceButton");
const mini=$("miniVoiceButton"),floating=$("floatingKairo");
const newBtn=$("newChatButton"),memBtn=$("memoryButton"),hisBtn=$("historyButton");
const hp=$("historyPanel"),hb=$("historyBackdrop"),hl=$("historyList"),hc=$("closeHistoryButton"),hs=$("historySearch");
const mp=$("memoryPanel"),mb=$("memoryBackdrop"),ml=$("memoryList"),mc=$("closeMemoryButton"),clearM=$("clearMemoryButton");
const attach=$("attachButton"),fileInput=$("fileInput"),preview=$("attachmentPreview"),fileName=$("attachmentName"),removeFile=$("removeAttachmentButton");

let busy=false,voiceMode=false,listening=false,speaking=false,recognition=null,restartTimer;
let sessions=JSON.parse(localStorage.kairoSessions||"[]");
let memory=JSON.parse(localStorage.kairoMemory||"[]");
let current=localStorage.kairoCurrentSession||"";
let selectedFile=null;

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function save(){
  localStorage.kairoSessions=JSON.stringify(sessions.slice(-100));
  localStorage.kairoMemory=JSON.stringify(memory.slice(-100));
  localStorage.kairoCurrentSession=current;
}

function newSession(){
  const s={id:uid(),title:"New conversation",time:Date.now(),messages:[]};
  sessions.push(s);current=s.id;save();return s;
}

function session(){
  return sessions.find(x=>x.id===current);
}

function ensure(){
  return session()||newSession();
}

function clean(text){
  return String(text||"")
    .replace(/```[\s\S]*?```/g,"")
    .replace(/^\s*#{1,6}\s*/gm,"")
    .replace(/\*\*(.*?)\*\*/g,"$1")
    .replace(/__(.*?)__/g,"$1")
    .replace(/^\s*[-*•]\s+/gm,"")
    .replace(/^\s*>\s+/gm,"")
    .replace(/^\s*---+\s*$/gm,"")
    .replace(/[⭐🌟]/g,"")
    .replace(/[ \t]{2,}/g," ")
    .trim();
}

function add(text,user=true,store=true){
  text=String(text||"").trim();
  if(!text)return;

  const d=document.createElement("div");
  d.className=user?"message user-message":"message ai-message";
  d.textContent=user?text:clean(text);
  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;

  if(store){
    const s=ensure();
    s.messages.push({role:user?"user":"assistant",text,time:Date.now()});
    if(user&&s.title==="New conversation")s.title=text.slice(0,42);
    s.time=Date.now();
    save();
  }
}

function renderChat(){
  chat.innerHTML="";
  const s=session();

  if(!s||!s.messages.length){
    chat.innerHTML=`<div class="welcome">
      <div class="welcome-logo"><div class="welcome-core"></div></div>
      <h1>Hello, I'm KAIRO</h1>
      <p>Your AI companion for conversation, answers and ideas.</p>
    </div>`;
    return;
  }

  s.messages.forEach(x=>add(x.text,x.role==="user",false));
  chat.scrollTop=chat.scrollHeight;
}

function related(text){
  const words=text.toLowerCase().split(/\s+/).filter(x=>x.length>2);
  return sessions.flatMap(s=>s.messages)
    .filter(m=>words.some(w=>m.text.toLowerCase().includes(w)))
    .slice(-12);
}

/* MEMORY */

function autoMemory(text){
  const t=text.trim();
  const low=t.toLowerCase();

  let value="";

  if(/মনে রাখ|মনে রাখবে|remember|save this/i.test(low)){
    value=t.replace(/^(kairo[,\s]*)?(মনে রাখবে?|মনে রাখ|remember|save this)\s*[:,-]?\s*/i,"").trim();
  }

  const name=t.match(/(?:আমার নাম|my name is)\s+(.+)/i);
  if(name)value="User's name is "+name[1].trim();

  if(!value)return;

  if(!memory.some(x=>x.text.toLowerCase()===value.toLowerCase())){
    memory.push({id:uid(),text:value,time:Date.now()});
    save();
    renderMemory();
  }
}

function renderMemory(){
  if(!ml)return;
  ml.innerHTML="";

  if(!memory.length){
    ml.innerHTML=`<div class="memory-item">KAIRO এখনো কোনো saved memory রাখেনি।</div>`;
    return;
  }

  memory.slice().reverse().forEach(x=>{
    const d=document.createElement("div");
    d.className="memory-item";
    d.innerHTML=`<span></span><button class="memory-delete" type="button">×</button>`;
    d.querySelector("span").textContent=x.text;
    d.querySelector("button").onclick=()=>{
      memory=memory.filter(m=>m.id!==x.id);
      save();renderMemory();
    };
    ml.appendChild(d);
  });
}

/* CHAT */

async function ask(text,speak=false){
  text=String(text||"").trim();
  if(!text||busy)return;

  busy=true;send.disabled=true;
  autoMemory(text);

  if(voiceMode)startListening(true);
  add(text,true);

  try{
    const r=await fetch("/api/api",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        message:text,
        memory,
        history:ensure().messages.slice(-12),
        relevantHistory:related(text),
        gameMode:"normal"
      })
    });

    const data=await r.json();
    const reply=clean(data.reply||"আমি এখন উত্তর দিতে পারছি না।");

    add(reply,false);

    if(speak&&voiceMode)speakText(reply);
  }catch(e){
    add("Connection problem. আবার চেষ্টা করো।",false);
  }

  busy=false;
  send.disabled=false;

  if(voiceMode&&!speaking)restartListening(300);
}

/* NORMAL CHAT */

send.onclick=()=>{
  const t=input.value.trim();
  if(!t)return;
  input.value="";
  ask(t,false);
};

input.onkeydown=e=>{
  if(e.key==="Enter"&&!e.shiftKey){
    e.preventDefault();
    send.click();
  }
};

/* VOICE */

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

function stopWords(t){
  t=String(t).toLowerCase().trim();
  return [
    "থামো","থাম","চুপ","চুপ কর","বন্ধ কর",
    "stop","stop talking","be quiet","shut up"
  ].some(x=>t===x||t.includes(x));
}

function stopSpeaking(){
  try{speechSynthesis.cancel()}catch(e){}
  speaking=false;
  if(status)status.textContent="Listening...";
  restartListening(150);
}

function abortListen(){
  if(!recognition)return;
  try{recognition.abort()}catch(e){}
  listening=false;
  mic?.classList.remove("listening");
}

function startListening(allowSpeaking=false){
  if(!recognition||!voiceMode||busy&&!allowSpeaking||listening)return;
  try{recognition.start()}catch(e){}
}

function restartListening(delay=350){
  clearTimeout(restartTimer);
  restartTimer=setTimeout(()=>{
    if(voiceMode&&!listening)startListening(speaking);
  },delay);
}

if(SR){
  recognition=new SR();
  recognition.lang="bn-BD";
  recognition.continuous=false;
  recognition.interimResults=false;

  recognition.onstart=()=>{
    listening=true;
    mic?.classList.add("listening");
    if(status&&!speaking)status.textContent="Listening...";
  };

  recognition.onresult=e=>{
    const t=e.results[0][0].transcript.trim();
    listening=false;
    mic?.classList.remove("listening");

    if(!t){
      restartListening();
      return;
    }

    /* During KAIRO speech, only stop commands are accepted */
    if(speaking){
      if(stopWords(t))stopSpeaking();
      else restartListening(100);
      return;
    }

    if(stopWords(t)){
      stopSpeaking();
      return;
    }

    if(voiceMode)ask(t,true);
    else{
      input.value=t;
      input.focus();
    }
  };

  recognition.onend=()=>{
    listening=false;
    mic?.classList.remove("listening");
    if(voiceMode)restartListening(speaking?120:350);
  };

  recognition.onerror=()=>{
    listening=false;
    mic?.classList.remove("listening");
    if(voiceMode)restartListening(500);
  };
}

function speakText(text){
  if(!window.speechSynthesis){
    restartListening();
    return;
  }

  speaking=true;
  abortListen();
  speechSynthesis.cancel();

  const u=new SpeechSynthesisUtterance(clean(text));
  u.lang=/[\u0980-\u09FF]/.test(text)?"bn-BD":"en-US";
  u.rate=.9;
  u.pitch=1;

  u.onstart=()=>{
    speaking=true;
    status.textContent="Speaking...";
    restartListening(100);
  };

  u.onend=()=>{
    speaking=false;
    status.textContent="Listening...";
    restartListening(250);
  };

  u.onerror=()=>{
    speaking=false;
    restartListening(300);
  };

  speechSynthesis.speak(u);
}

function openVoice(){
  clearTimeout(restartTimer);
  try{speechSynthesis.cancel()}catch(e){}
  abortListen();

  speaking=false;
  voiceMode=true;

  voice.setAttribute("aria-hidden","false");
  document.body.classList.add("kairo-voice-active");

  status.textContent="Listening...";
  sub.textContent="Talk to KAIRO";
  restartListening(300);
}

function closeVoice(){
  voiceMode=false;
  speaking=false;
  clearTimeout(restartTimer);

  try{speechSynthesis.cancel()}catch(e){}
  abortListen();

  voice.setAttribute("aria-hidden","true");
  document.body.classList.remove("kairo-voice-active");
  status.textContent="Ready";
}

mini?.addEventListener("click",openVoice);
floating?.addEventListener("click",openVoice);
closeV?.addEventListener("click",closeVoice);

mic?.addEventListener("click",()=>{
  if(voiceMode)return;
  if(listening)abortListen();
  else{
    if(!recognition)return;
    try{recognition.start()}catch(e){}
  }
});

/* NEW CHAT */

newBtn?.addEventListener("click",()=>{
  newSession();
  renderChat();
  input.value="";
  input.focus();
});

/* HISTORY */

function renderHistory(q=""){
  hl.innerHTML="";
  q=q.toLowerCase();

  const list=sessions.slice().reverse().filter(s=>
    !q||
    s.title.toLowerCase().includes(q)||
    s.messages.some(m=>m.text.toLowerCase().includes(q))
  );

  if(!list.length){
    hl.innerHTML=`<div class="history-item">No conversations found.</div>`;
    return;
  }

  list.forEach(s=>{
    const d=document.createElement("div");
    d.className="history-item";
    d.textContent=`${s.title} · ${s.messages.length} messages`;
    d.onclick=()=>{
      current=s.id;
      save();
      renderChat();
      closeHistory();
    };
    hl.appendChild(d);
  });
}

function openHistory(){
  renderHistory(hs?.value||"");
  hp.setAttribute("aria-hidden","false");
  hb.setAttribute("aria-hidden","false");
}

function closeHistory(){
  hp.setAttribute("aria-hidden","true");
  hb.setAttribute("aria-hidden","true");
}

hisBtn?.addEventListener("click",openHistory);
hc?.addEventListener("click",closeHistory);
hb?.addEventListener("click",closeHistory);
hs?.addEventListener("input",()=>renderHistory(hs.value));

/* MEMORY PANEL */

function openMemory(){
  renderMemory();
  mp.setAttribute("aria-hidden","false");
  mb.setAttribute("aria-hidden","false");
}

function closeMemory(){
  mp.setAttribute("aria-hidden","true");
  mb.setAttribute("aria-hidden","true");
}

memBtn?.addEventListener("click",openMemory);
mc?.addEventListener("click",closeMemory);
mb?.addEventListener("click",closeMemory);

clearM?.addEventListener("click",()=>{
  memory=[];
  save();
  renderMemory();
});

/* FILE */

attach?.addEventListener("click",()=>fileInput?.click());

fileInput?.addEventListener("change",()=>{
  const f=fileInput.files?.[0];
  if(!f)return;

  selectedFile=f;
  if(fileName)fileName.textContent=f.name;
  preview?.setAttribute("aria-hidden","false");
});

removeFile?.addEventListener("click",()=>{
  selectedFile=null;
  if(fileInput)fileInput.value="";
  preview?.setAttribute("aria-hidden","true");
});

/* DRAGGABLE BUBBLE */

function dragBubble(el,key){
  if(!el)return;

  let down=false,moved=false,dx=0,dy=0;

  const pos=JSON.parse(localStorage[key]||"null");

  if(pos){
    el.style.position="fixed";
    el.style.left=pos.x+"px";
    el.style.top=pos.y+"px";
    el.style.right="auto";
    el.style.bottom="auto";
  }

  el.addEventListener("pointerdown",e=>{
    down=true;moved=false;
    const r=el.getBoundingClientRect();
    dx=e.clientX-r.left;
    dy=e.clientY-r.top;
    el.setPointerCapture?.(e.pointerId);
  });

  el.addEventListener("pointermove",e=>{
    if(!down)return;

    const w=el.offsetWidth,h=el.offsetHeight;
    let x=e.clientX-dx,y=e.clientY-dy;

    x=Math.max(4,Math.min(innerWidth-w-4,x));
    y=Math.max(4,Math.min(innerHeight-h-4,y));

    if(Math.abs(x-(el.offsetLeft||0))>3||Math.abs(y-(el.offsetTop||0))>3)moved=true;

    el.style.position="fixed";
    el.style.left=x+"px";
    el.style.top=y+"px";
    el.style.right="auto";
    el.style.bottom="auto";
  });

  el.addEventListener("pointerup",()=>{
    if(down){
      const r=el.getBoundingClientRect();
      localStorage[key]=JSON.stringify({x:r.left,y:r.top});
    }
    down=false;
  });

  el.addEventListener("click",e=>{
    if(moved){
      e.preventDefault();
      e.stopPropagation();
      moved=false;
    }
  },true);
}

dragBubble(mini,"kairoBubblePosition");
dragBubble(floating,"kairoFloatingPosition");

/* INPUT BAR POSITION */

const fix=document.createElement("style");
fix.textContent=`
.input-area{bottom:18px!important}
.chat{padding-bottom:105px!important}
.mini-voice-button,.floating-kairo{touch-action:none;position:fixed}
`;
document.head.appendChild(fix);

/* START */

if(!current||!session()){
  const s=newSession();
  current=s.id;
}

renderChat();
renderMemory();

window.KAIRO={
  ask,
  openVoice,
  closeVoice,
  newChat:()=>newBtn?.click(),
  addMemory:text=>{
    if(text){
      memory.push({id:uid(),text:String(text),time:Date.now()});
      save();renderMemory();
    }
  }
};
