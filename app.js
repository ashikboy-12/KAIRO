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
const histBtn=$("historyButton");
const hist=$("historyPanel");
const backdrop=$("historyBackdrop");
const histList=$("historyList");

let busy=false;
let voiceMode=false;
let listening=false;
let recognition=null;

let history=JSON.parse(localStorage.kairoHistory||"[]");
let memory=JSON.parse(localStorage.kairoMemory||"[]");

function save(){
 localStorage.kairoHistory=JSON.stringify(history.slice(-100));
 localStorage.kairoMemory=JSON.stringify(memory.slice(-50));
}

function add(text,user){
 const d=document.createElement("div");
 d.className=user?"message user-message":"message ai-message";
 d.textContent=text;
 chat.appendChild(d);
 chat.scrollTop=chat.scrollHeight;

 history.push({
  role:user?"user":"assistant",
  text:text,
  time:Date.now()
 });

 save();
}

function related(text){
 const words=text.toLowerCase().split(/\s+/).filter(x=>x.length>2);

 return history
  .filter(x=>words.some(w=>x.text.toLowerCase().includes(w)))
  .slice(-8);
}

async function ask(text,speak=false){

 if(busy||!text)return;

 busy=true;
 send.disabled=true;

 add(text,true);

 try{

  const r=await fetch("/api/api",{
   method:"POST",
   headers:{
    "Content-Type":"application/json"
   },
   body:JSON.stringify({
    message:text,
    memory:memory,
    history:history.slice(-12),
    relevantHistory:related(text),
    gameMode:"normal"
   })
  });

  const data=await r.json();
  const reply=data.reply||"আমি এখন উত্তর দিতে পারছি না।";

  add(reply,false);

  if(speak) speakText(reply);

 }catch(e){

  add("Connection problem. আবার চেষ্টা করো।",false);

 }finally{

  busy=false;
  send.disabled=false;
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

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

if(SR){

 recognition=new SR();

 recognition.lang="bn-BD";
 recognition.continuous=false;
 recognition.interimResults=false;

 recognition.onstart=()=>{

  listening=true;

  if(mic)mic.classList.add("listening");

  if(voiceMode&&status){
   status.textContent="Listening...";
  }
 };

 recognition.onresult=e=>{

  const text=e.results[0][0].transcript;

  if(voiceMode){

   ask(text,true);

  }else{

   input.value=text;
   input.focus();
  }
 };

 recognition.onend=()=>{

  listening=false;

  if(mic)mic.classList.remove("listening");

  if(voiceMode&&!busy){
   setTimeout(listen,500);
  }
 };

 recognition.onerror=()=>{

  listening=false;

  if(mic)mic.classList.remove("listening");
 };
}

function listen(){

 if(!recognition)return;

 if(listening)return;

 try{
  recognition.start();
 }catch(e){}
}

mic.onclick=()=>{

 if(voiceMode)return;

 if(listening){

  try{
   recognition.stop();
  }catch(e){}

 }else{

  listen();
 }
};

function speakText(text){

 if(!window.speechSynthesis)return;

 speechSynthesis.cancel();

 const u=new SpeechSynthesisUtterance(text);

 u.lang=/[\u0980-\u09FF]/.test(text)
  ?"bn-BD"
  :"en-US";

 u.rate=.9;
 u.pitch=1;

 u.onend=()=>{

  if(voiceMode&&!busy){
   setTimeout(listen,500);
  }
 };

 speechSynthesis.speak(u);
}

function openVoice(){

 voiceMode=true;

 voice.setAttribute("aria-hidden","false");

 document.body.classList.add("kairo-voice-active");

 if(status)status.textContent="Listening...";
 if(sub)sub.textContent="Talk to KAIRO";

 setTimeout(listen,300);
}

function closeVoice(){

 voiceMode=false;

 voice.setAttribute("aria-hidden","true");

 document.body.classList.remove("kairo-voice-active");

 try{
  recognition.stop();
 }catch(e){}

 speechSynthesis.cancel();

 listening=false;

 if(mic)mic.classList.remove("listening");
}

if(mini)mini.onclick=openVoice;
if(floating)floating.onclick=openVoice;
if(closeV)closeV.onclick=closeVoice;

function renderHistory(search=""){

 if(!histList)return;

 histList.innerHTML="";

 history
  .filter(x=>x.text.toLowerCase().includes(search.toLowerCase()))
  .slice(-40)
  .forEach(x=>{

   const d=document.createElement("div");

   d.className="history-item";

   d.textContent=
    (x.role==="user"?"You: ":"KAIRO: ")+x.text;

   histList.appendChild(d);
  });
}

histBtn.onclick=()=>{

 renderHistory("");

 hist.setAttribute("aria-hidden","false");
 backdrop.setAttribute("aria-hidden","false");
};

backdrop.onclick=()=>{

 hist.setAttribute("aria-hidden","true");
 backdrop.setAttribute("aria-hidden","true");
};

window.KAIRO={
 ask:ask,
 listen:listen,
 openVoice:openVoice,
 closeVoice:closeVoice
};
