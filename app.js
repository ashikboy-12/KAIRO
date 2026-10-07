const $=id=>document.getElementById(id);

const chat=$("chat");
const input=$("messageInput");
const send=$("sendButton");
const mic=$("micButton");
const voice=$("voiceMode");
const status=$("voiceStatus");
const sub=$("voiceSubtitle");
const closeV=$("closeVoiceButton");
const mini=$("miniVoiceButton");
const floating=$("floatingKairo");

const newChatBtn=$("newChatButton");
const memoryBtn=$("memoryButton");
const historyBtn=$("historyButton");

const historyPanel=$("historyPanel");
const historyBackdrop=$("historyBackdrop");
const historyList=$("historyList");
const closeHistory=$("closeHistoryButton");
const historySearch=$("historySearch");

const memoryPanel=$("memoryPanel");
const memoryBackdrop=$("memoryBackdrop");
const memoryList=$("memoryList");
const closeMemory=$("closeMemoryButton");
const clearMemory=$("clearMemoryButton");

const attachButton=$("attachButton");
const fileInput=$("fileInput");
const attachmentPreview=$("attachmentPreview");
const attachmentName=$("attachmentName");
const removeAttachment=$("removeAttachmentButton");

let busy=false;
let voiceMode=false;
let listening=false;
let speaking=false;
let recognition=null;
let restartTimer=null;

let sessions=JSON.parse(localStorage.kairoSessions||"[]");
let memory=JSON.parse(localStorage.kairoMemory||"[]");

let currentSessionId=localStorage.kairoCurrentSession||"";

let selectedFile=null;

function id(){
  return Date.now().toString(36)+Math.random().toString(36).slice(2,7);
}

function createSession(){
  const s={
    id:id(),
    title:"New conversation",
    time:Date.now(),
    messages:[]
  };

  sessions.push(s);
  currentSessionId=s.id;
  localStorage.kairoCurrentSession=currentSessionId;
  save();
  return s;
}

function currentSession(){
  return sessions.find(s=>s.id===currentSessionId);
}

function ensureSession(){
  let s=currentSession();

  if(!s)s=createSession();

  return s;
}

function save(){
  localStorage.kairoSessions=JSON.stringify(sessions.slice(-100));
  localStorage.kairoMemory=JSON.stringify(memory.slice(-100));
  localStorage.kairoCurrentSession=currentSessionId;
}

function cleanReply(text){
  return String(text||"")
    .replace(/```[\s\S]*?```/g,"")
    .replace(/^\s*#{1,6}\s*/gm,"")
    .replace(/\*\*(.*?)\*\*/g,"$1")
    .replace(/__(.*?)__/g,"$1")
    .replace(/^\s*[-*•]\s+/gm,"")
    .replace(/^\s*>\s+/gm,"")
    .replace(/^\s*---+\s*$/gm,"")
    .replace(/⭐|🌟/g,"")
    .replace(/[ \t]{2,}/g," ")
    .trim();
}

function addMessage(text,user,saveMessage=true){

  const clean=String(text||"").trim();

  if(!clean)return;

  const d=document.createElement("div");

  d.className=user
    ?"message user-message"
    :"message ai-message";

  d.textContent=user?clean:cleanReply(clean);

  chat.appendChild(d);
  chat.scrollTop=chat.scrollHeight;

  if(saveMessage){

    const s=ensureSession();

    s.messages.push({
      role:user?"user":"assistant",
      text:clean,
      time:Date.now()
    });

    if(user&&s.title==="New conversation"){
      s.title=clean.slice(0,42);
    }

    s.time=Date.now();

    save();
  }
}

function renderCurrentChat(){

  chat.innerHTML="";

  const s=currentSession();

  if(!s||!s.messages.length){

    chat.innerHTML=`
      <div class="welcome">
        <div class="welcome-logo">
          <div class="welcome-core"></div>
        </div>
        <h1>Hello, I'm KAIRO</h1>
        <p>Your AI companion for conversation, answers and ideas.</p>
      </div>
    `;

    return;
  }

  s.messages.forEach(m=>{
    addMessage(m.text,m.role==="user",false);
  });

  chat.scrollTop=chat.scrollHeight;
}

function relatedHistory(text){

  const words=String(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(w=>w.length>2);

  const result=[];

  for(const s of sessions){

    for(const m of s.messages){

      const low=m.text.toLowerCase();

      if(words.some(w=>low.includes(w))){
        result.push(m);
      }

    }
  }

  return result.slice(-12);
}

function addMemory(text){

  const clean=String(text||"").trim();

  if(!clean)return;

  if(memory.some(x=>x.text.toLowerCase()===clean.toLowerCase())){
    return;
  }

  memory.push({
    id:id(),
    text:clean,
    time:Date.now()
  });

  save();
  renderMemory();
}

function removeMemory(memoryId){

  memory=memory.filter(x=>x.id!==memoryId);

  save();
  renderMemory();
}

function renderMemory(){

  if(!memoryList)return;

  memoryList.innerHTML="";

  if(!memory.length){

    memoryList.innerHTML=`
      <div class="memory-item">
        KAIRO এখনো কোনো saved memory রাখেনি।
      </div>
    `;

    return;
  }

  memory.slice().reverse().forEach(item=>{

    const d=document.createElement("div");

    d.className="memory-item";

    d.innerHTML=`
      <span></span>
      <button
        class="memory-delete"
        type="button"
        aria-label="Delete memory">
        ×
      </button>
    `;

    d.querySelector("span").textContent=item.text;

    d.querySelector("button").onclick=()=>{
      removeMemory(item.id);
    };

    memoryList.appendChild(d);
  });
}

function renderHistory(search=""){

  if(!historyList)return;

  historyList.innerHTML="";

  const q=search.toLowerCase();

  const list=sessions
    .slice()
    .reverse()
    .filter(s=>
      !q||
      s.title.toLowerCase().includes(q)||
      s.messages.some(m=>m.text.toLowerCase().includes(q))
    );

  if(!list.length){

    historyList.innerHTML=`
      <div class="history-item">
        No conversations found.
      </div>
    `;

    return;
  }

  list.forEach(s=>{

    const d=document.createElement("div");

    d.className="history-item";

    d.textContent=
      `${s.title} · ${s.messages.length} messages`;

    d.onclick=()=>{

      currentSessionId=s.id;

      save();
      renderCurrentChat();
      closeHistoryPanel();
    };

    historyList.appendChild(d);
  });
}

function newChat(){

  createSession();
  renderCurrentChat();

  input.value="";
  input.focus();
}

function openHistoryPanel(){

  renderHistory(historySearch?.value||"");

  historyPanel.setAttribute("aria-hidden","false");
  historyBackdrop.setAttribute("aria-hidden","false");
}

function closeHistoryPanel(){

  historyPanel.setAttribute("aria-hidden","true");
  historyBackdrop.setAttribute("aria-hidden","true");
}

function openMemoryPanel(){

  renderMemory();

  memoryPanel.setAttribute("aria-hidden","false");
  memoryBackdrop.setAttribute("aria-hidden","false");
}

function closeMemoryPanel(){

  memoryPanel.setAttribute("aria-hidden","true");
  memoryBackdrop.setAttribute("aria-hidden","true");
}

async function ask(text,speak=false){

  text=String(text||"").trim();

  if(!text||busy)return;

  busy=true;

  send.disabled=true;

  if(voiceMode){
    cancelRecognition();
  }

  addMessage(text,true);

  try{

    const r=await fetch("/api/api",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({

        message:text,

        memory:memory,

        history:ensureSession().messages.slice(-12),

        relevantHistory:relatedHistory(text),

        gameMode:"normal"

      })
    });

    const data=await r.json();

    const reply=cleanReply(
      data.reply||
      "আমি এখন উত্তর দিতে পারছি না।"
    );

    addMessage(reply,false);

    if(speak&&voiceMode){
      speakText(reply);
    }

  }catch(e){

    addMessage(
      "Connection problem. আবার চেষ্টা করো।",
      false
    );

  }finally{

    busy=false;
    send.disabled=false;

    if(voiceMode&&!speaking){
      restartListening(450);
    }
  }
}

send.onclick=()=>{

  const text=input.value.trim();

  if(!text)return;

  input.value="";

  ask(text,false);
};

input.onkeydown=e=>{

  if(e.key==="Enter"&&!e.shiftKey){

    e.preventDefault();

    send.click();
  }
};


/* =========================
   VOICE
========================= */

const SR=
  window.SpeechRecognition||
  window.webkitSpeechRecognition;

function isStopCommand(text){

  const t=String(text)
    .toLowerCase()
    .trim();

  return [
    "থামো",
    "থাম",
    "চুপ",
    "চুপ কর",
    "বন্ধ",
    "stop",
    "stop talking",
    "be quiet",
    "shut up"
  ].some(x=>t===x||t.includes(x));
}

function cancelRecognition(){

  if(!recognition)return;

  try{
    recognition.abort();
  }catch(e){}

  listening=false;

  if(mic){
    mic.classList.remove("listening");
  }
}

function startListening(){

  if(
    !recognition||
    !voiceMode||
    busy||
    speaking||
    listening
  )return;

  try{
    recognition.start();
  }catch(e){}
}

function restartListening(delay=400){

  clearTimeout(restartTimer);

  restartTimer=setTimeout(()=>{

    if(
      voiceMode&&
      !busy&&
      !speaking&&
      !listening
    ){
      startListening();
    }

  },delay);
}

function stopKairoSpeaking(){

  if(window.speechSynthesis){
    speechSynthesis.cancel();
  }

  speaking=false;

  if(status){
    status.textContent="Listening...";
  }

  restartListening(450);
}

if(SR){

  recognition=new SR();

  recognition.lang="bn-BD";
  recognition.continuous=false;
  recognition.interimResults=false;

  recognition.onstart=()=>{

    listening=true;

    if(mic){
      mic.classList.add("listening");
    }

    if(voiceMode&&status){
      status.textContent="Listening...";
    }
  };

  recognition.onresult=e=>{

    const text=
      e.results[0][0].transcript.trim();

    listening=false;

    if(mic){
      mic.classList.remove("listening");
    }

    if(!text){
      restartListening();
      return;
    }

    if(voiceMode){

      if(isStopCommand(text)){

        stopKairoSpeaking();
        return;
      }

      ask(text,true);

    }else{

      input.value=text;
      input.focus();
    }
  };

  recognition.onend=()=>{

    listening=false;

    if(mic){
      mic.classList.remove("listening");
    }

    if(
      voiceMode&&
      !busy&&
      !speaking
    ){
      restartListening(500);
    }
  };

  recognition.onerror=()=>{

    listening=false;

    if(mic){
      mic.classList.remove("listening");
    }

    if(
      voiceMode&&
      !busy&&
      !speaking
    ){
      restartListening(800);
    }
  };
}

function listen(){
  startListening();
}

function speakText(text){

  if(!window.speechSynthesis){
    restartListening();
    return;
  }

  speaking=true;

  cancelRecognition();

  speechSynthesis.cancel();

  const u=
    new SpeechSynthesisUtterance(
      cleanReply(text)
    );

  u.lang=
    /[\u0980-\u09FF]/.test(text)
      ?"bn-BD"
      :"en-US";

  u.rate=.9;
  u.pitch=1;

  u.onstart=()=>{

    speaking=true;

    if(status){
      status.textContent="Speaking...";
    }
  };

  u.onend=()=>{

    speaking=false;

    if(
      voiceMode&&
      !busy
    ){

      if(status){
        status.textContent="Listening...";
      }

      restartListening(450);
    }
  };

  u.onerror=()=>{

    speaking=false;

    if(voiceMode&&!busy){
      restartListening(500);
    }
  };

  speechSynthesis.speak(u);
}

function openVoice(){

  clearTimeout(restartTimer);

  if(window.speechSynthesis){
    speechSynthesis.cancel();
  }

  cancelRecognition();

  speaking=false;
  voiceMode=true;

  voice.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "kairo-voice-active"
  );

  if(status){
    status.textContent="Listening...";
  }

  if(sub){
    sub.textContent="Talk to KAIRO";
  }

  restartListening(500);
}

function closeVoice(){

  voiceMode=false;

  clearTimeout(restartTimer);

  speaking=false;

  if(window.speechSynthesis){
    speechSynthesis.cancel();
  }

  cancelRecognition();

  voice.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "kairo-voice-active"
  );

  if(status){
    status.textContent="Ready";
  }
}

if(mini)mini.onclick=openVoice;
if(floating)floating.onclick=openVoice;
if(closeV)closeV.onclick=closeVoice;

if(mic){

  mic.onclick=()=>{

    if(voiceMode)return;

    if(listening){
      cancelRecognition();
    }else{
      startNormalMic();
    }
  };
}

function startNormalMic(){

  if(!recognition)return;

  try{
    recognition.start();
  }catch(e){}
}


/* =========================
   NEW CHAT / HISTORY / MEMORY
========================= */

if(newChatBtn){
  newChatBtn.onclick=newChat;
}

if(historyBtn){
  historyBtn.onclick=openHistoryPanel;
}

if(closeHistory){
  closeHistory.onclick=closeHistoryPanel;
}

if(historyBackdrop){
  historyBackdrop.onclick=closeHistoryPanel;
}

if(historySearch){

  historySearch.oninput=()=>{
    renderHistory(historySearch.value);
  };
}

if(memoryBtn){
  memoryBtn.onclick=openMemoryPanel;
}

if(closeMemory){
  closeMemory.onclick=closeMemoryPanel;
}

if(memoryBackdrop){
  memoryBackdrop.onclick=closeMemoryPanel;
}

if(clearMemory){

  clearMemory.onclick=()=>{

    memory=[];

    save();
    renderMemory();
  };
}


/* =========================
   ATTACHMENTS
========================= */

if(attachButton&&fileInput){

  attachButton.onclick=()=>{
    fileInput.click();
  };
}

if(fileInput){

  fileInput.onchange=()=>{

    const file=fileInput.files?.[0];

    if(!file)return;

    selectedFile=file;

    if(attachmentName){
      attachmentName.textContent=
        file.name;
    }

    if(attachmentPreview){
      attachmentPreview.setAttribute(
        "aria-hidden",
        "false"
      );
    }
  };
}

if(removeAttachment){

  removeAttachment.onclick=()=>{

    selectedFile=null;

    if(fileInput){
      fileInput.value="";
    }

    if(attachmentPreview){
      attachmentPreview.setAttribute(
        "aria-hidden",
        "true"
      );
    }
  };
}


/* =========================
   DRAGGABLE KAIRO BUBBLE
========================= */

let dragging=false;
let dragX=0;
let dragY=0;

function makeBubbleDraggable(el){

  if(!el)return;

  el.addEventListener(
    "pointerdown",
    e=>{

      dragging=true;

      dragX=e.clientX-el.offsetLeft;
      dragY=e.clientY-el.offsetTop;

      el.setPointerCapture?.(e.pointerId);
    }
  );

  el.addEventListener(
    "pointermove",
    e=>{

      if(!dragging)return;

      const parent=el.offsetParent;

      if(!parent)return;

      let x=e.clientX-dragX;
      let y=e.clientY-dragY;

      x=Math.max(
        5,
        Math.min(
          parent.clientWidth-el.offsetWidth-5,
          x
        )
      );

      y=Math.max(
        75,
        Math.min(
          parent.clientHeight-el.offsetHeight-5,
          y
        )
      );

      el.style.left=x+"px";
      el.style.top=y+"px";
      el.style.right="auto";
      el.style.bottom="auto";
    }
  );

  el.addEventListener(
    "pointerup",
    ()=>{
      dragging=false;
    }
  );

  el.addEventListener(
    "pointercancel",
    ()=>{
      dragging=false;
    }
  );
}

makeBubbleDraggable(mini);
makeBubbleDraggable(floating);


/* =========================
   START
========================= */

if(!currentSession()){
  createSession();
}

renderCurrentChat();
renderMemory();

window.KAIRO={
  ask,
  listen,
  openVoice,
  closeVoice,
  newChat,
  addMemory
};
