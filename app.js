const $=id=>document.getElementById(id);

const chat=$("chat");
const input=$("messageInput");
const send=$("sendButton");
const mic=$("micButton");

const historyBtn=$("historyButton");
const panel=$("historyPanel");
const back=$("historyBackdrop");
const list=$("historyList");

const float=$("floatingKairo");
const voiceMode=$("voiceMode");
const voiceStatus=$("voiceStatus");
const voiceSub=$("voiceSubtitle");
const closeVoice=$("closeVoiceButton");
const mini=$("miniVoiceButton");

const HK="kairo_history";
const MK="kairo_memory";

let chats=JSON.parse(localStorage.getItem(HK)||"[]");
let memory=JSON.parse(localStorage.getItem(MK)||"[]");

let current=chats[0]||null;
let rec=null;
let listening=false;
let voiceOn=false;


/* ================================
   SAVE DATA
================================ */

function save(){
 localStorage.setItem(HK,JSON.stringify(chats));
 localStorage.setItem(MK,JSON.stringify(memory));
}


/* ================================
   NEW CHAT
================================ */

function newChat(){
 current={
  id:Date.now(),
  title:"New Chat",
  messages:[]
 };

 chats.unshift(current);
 save();

 chat.innerHTML="";
}


/* ================================
   MESSAGE BUBBLE
================================ */

function bubble(text,who){
 let e=document.createElement("div");

 e.className="message "+who;
 e.textContent=text;

 chat.appendChild(e);
 chat.scrollTop=chat.scrollHeight;

 return e;
}


/* ================================
   MEMORY
================================ */

function remember(text){

 if(
  /my name is |amar nam |i like |i love |i live in |my favorite |amar favourite |amar favorite /i.test(text)
 ){

  if(!memory.includes(text)){
   memory.push(text);
   save();
  }
 }
}


/* ================================
   OLD CONTEXT
================================ */

function context(){

 return chats
  .filter(x=>!current||x.id!==current.id)
  .slice(0,5)
  .map(x=>
   x.title+": "+
   x.messages
    .slice(-2)
    .map(m=>m.text)
    .join(" | ")
  )
  .join("\n");
}


/* ================================
   CHAT TITLE
================================ */

function title(text){

 let x=text.toLowerCase();

 if(x.includes("anime"))return"Anime";

 if(/trading|forex|trade/.test(x))
  return"Trading";

 if(/ssc|study|exam|math|physics|chemistry/.test(x))
  return"Study";

 if(/game|gaming|free fire|efootball/.test(x))
  return"Gaming";

 if(/code|coding|html|javascript|app/.test(x))
  return"Coding";

 return text.slice(0,24)||"New Chat";
}


/* ================================
   ASK KAIRO
================================ */

async function ask(text,voice=false){

 text=text.trim();

 if(!text)return;

 if(!current)
  newChat();

 if(current.title==="New Chat")
  current.title=title(text);

 remember(text);

 current.messages.push({
  role:"user",
  text:text
 });

 bubble(text,"user");

 if(!voice)
  input.value="";


 let thinking=document.createElement("div");

 thinking.className="message ai";
 thinking.textContent="Thinking...";

 chat.appendChild(thinking);
 chat.scrollTop=chat.scrollHeight;


 if(voice){

  voiceStatus.textContent="Thinking...";
  voiceSub.textContent="KAIRO is thinking...";
 }


 try{

  let response=await fetch("/api/api",{
   method:"POST",
   headers:{
    "Content-Type":"application/json"
   },
   body:JSON.stringify({
    message:text,
    context:context(),
    memory:memory.join("\n")
   })
  });


  let data=await response.json();

  let reply=data.reply||
   "Sorry, I couldn't answer that.";


  thinking.remove();


  current.messages.push({
   role:"assistant",
   text:reply
  });


  bubble(reply,"ai");

  save();


  /*
     IMPORTANT:
     Normal text messages are NOT spoken.
     Only Voice Mode replies are spoken.
  */

  if(voice && voiceOn){
   speak(reply);
  }


 }catch(error){

  console.log("KAIRO ERROR:",error);

  thinking.textContent="Connection problem.";

  if(voice){
   voiceStatus.textContent="Connection problem.";
   voiceSub.textContent="Please try again.";
  }
 }
}


/* ================================
   KAIRO VOICE
================================ */

function speak(text){

 if(!("speechSynthesis" in window)){
  if(voiceOn)
   startListen();

  return;
 }


 speechSynthesis.cancel();


 /*
   Fix KAIRO pronunciation.

   Browser যেন KAIRO-কে
   K-I-R-O / অন্য কোনো শব্দ
   হিসেবে না পড়ে।
 */

 let clean=String(text)

  .replace(/K-A-I-R-O/gi,"কাইরো")

  .replace(/\bKAIRO\b/gi,"কাইরো")

  .replace(/[\u200B-\u200D\uFEFF]/g,"")

  .trim();


 if(!clean){
  if(voiceOn)
   startListen();

  return;
 }


 let u=new SpeechSynthesisUtterance(clean);


 let voices=speechSynthesis.getVoices();


 /*
   Bangla text থাকলে Bangla voice আগে।
   না থাকলে English voice।
 */

 let hasBangla=/[\u0980-\u09FF]/.test(clean);

 let v;

 if(hasBangla){

  v=voices.find(x=>
   x.lang &&
   x.lang.toLowerCase().startsWith("bn")
  );

 }


 if(!v){

  v=voices.find(x=>
   x.lang &&
   x.lang.toLowerCase().startsWith("en")
  );

 }


 if(v){

  u.voice=v;
  u.lang=v.lang;

 }else{

  u.lang=hasBangla?"bn-BD":"en-US";

 }


 u.rate=.95;
 u.pitch=1;
 u.volume=1;


 voiceStatus.textContent="KAIRO is speaking...";
 voiceSub.textContent="Listen...";


 u.onend=()=>{

  if(voiceOn){

   voiceStatus.textContent="Listening...";
   voiceSub.textContent="Talk to KAIRO";

   setTimeout(startListen,250);
  }

 };


 u.onerror=()=>{

  if(voiceOn)
   setTimeout(startListen,250);

 };


 speechSynthesis.speak(u);
}


/* ================================
   START LISTENING
================================ */

function startListen(){

 if(!voiceOn)
  return;

 if(!("webkitSpeechRecognition" in window))
  return;

 if(listening)
  return;


 rec=new webkitSpeechRecognition();

 /*
   Bangla + Banglish conversation
 */

 rec.lang="bn-BD";

 rec.interimResults=false;
 rec.continuous=false;

 listening=true;

 voiceStatus.textContent="Listening...";
 voiceSub.textContent="Speak naturally";


 rec.onresult=e=>{

  listening=false;

  let text=
   e.results[0][0].transcript.trim();


  if(text)
   ask(text,true);

 };


 rec.onerror=error=>{

  console.log("VOICE ERROR:",error);

  listening=false;

  if(voiceOn)
   setTimeout(startListen,400);
 };


 rec.onend=()=>{

  listening=false;

 };


 try{

  rec.start();

 }catch(error){

  listening=false;

 }
}


/* ================================
   STOP LISTENING
================================ */

function stopListen(){

 listening=false;

 if(rec){

  try{
   rec.stop();
  }catch(error){}

  rec=null;
 }
}


/* ================================
   OPEN VOICE MODE
================================ */

function openVoice(){

 voiceOn=true;

 voiceMode.classList.add("active");

 voiceMode.setAttribute(
  "aria-hidden",
  "false"
 );

 voiceStatus.textContent="Listening...";
 voiceSub.textContent="Talk to KAIRO";

 startListen();
}


/* ================================
   CLOSE VOICE MODE
================================ */

function closeVoiceMode(){

 voiceOn=false;

 stopListen();

 if("speechSynthesis" in window)
  speechSynthesis.cancel();

 voiceMode.classList.remove("active");

 voiceMode.setAttribute(
  "aria-hidden",
  "true"
 );
}


/* ================================
   SEND BUTTON
================================ */

send.onclick=()=>{

 ask(input.value);

};


/* ================================
   ENTER TO SEND
================================ */

input.addEventListener("keydown",e=>{

 if(e.key==="Enter" && !e.shiftKey){

  e.preventDefault();

  ask(input.value);
 }

});


/* ================================
   NORMAL MIC BUTTON
================================ */

mic.onclick=()=>{

 if(!("webkitSpeechRecognition" in window)){

  alert("Voice recognition unavailable.");

  return;
 }


 let r=new webkitSpeechRecognition();

 r.lang="bn-BD";
 r.interimResults=false;
 r.continuous=false;


 r.onresult=e=>{

  let text=
   e.results[0][0].transcript.trim();

  if(text)
   ask(text);
 };


 try{
  r.start();
 }catch(error){}

};


/* ================================
   HISTORY
================================ */

historyBtn.onclick=()=>{

 list.innerHTML="";


 let newButton=
  document.createElement("button");

 newButton.className=
  "kairo-history-new";

 newButton.textContent=
  "+ New Chat";


 list.appendChild(newButton);


 let memoryButton=
  document.createElement("button");

 memoryButton.className=
  "kairo-history-new";

 memoryButton.textContent=
  "🧠 Memory";


 list.appendChild(memoryButton);


 chats.forEach(item=>{

  let button=
   document.createElement("button");

  button.className=
   "kairo-history-card";

  button.textContent=
   item.title;


  button.onclick=()=>{

   current=item;

   chat.innerHTML="";


   item.messages.forEach(message=>{

    bubble(
     message.text,
     message.role==="user"
      ?"user"
      :"ai"
    );

   });


   panel.setAttribute(
    "aria-hidden",
    "true"
   );

   back.setAttribute(
    "aria-hidden",
    "true"
   );

  };


  list.appendChild(button);

 });


 newButton.onclick=()=>{

  newChat();

  panel.setAttribute(
   "aria-hidden",
   "true"
  );

  back.setAttribute(
   "aria-hidden",
   "true"
  );

 };


 memoryButton.onclick=()=>{

  alert(
   memory.length
    ?memory.join("\n")
    :"No memories yet."
  );

 };


 panel.setAttribute(
  "aria-hidden",
  "false"
 );

 back.setAttribute(
  "aria-hidden",
  "false"
 );

};


/* ================================
   CLOSE HISTORY
================================ */

back.onclick=()=>{

 panel.setAttribute(
  "aria-hidden",
  "true"
 );

 back.setAttribute(
  "aria-hidden",
  "true"
 );

};


/* ================================
   VOICE CLOSE
================================ */

closeVoice.onclick=closeVoiceMode;


voiceMode.onclick=e=>{

 if(e.target===voiceMode)
  closeVoiceMode();

};


/* ================================
   MINI VOICE BUTTON
================================ */

mini.onclick=openVoice;


/* ================================
   FLOATING KAIRO BUTTON
================================ */

if(float){

 let down=false;
 let moved=false;

 let sx=0;
 let sy=0;

 let startLeft=0;
 let startTop=0;


 float.style.touchAction="none";


 float.onpointerdown=e=>{

  let rect=
   float.getBoundingClientRect();

  down=true;
  moved=false;

  sx=e.clientX;
  sy=e.clientY;

  startLeft=rect.left;
  startTop=rect.top;


  float.style.left=
   startLeft+"px";

  float.style.top=
   startTop+"px";

  float.style.right="auto";
  float.style.bottom="auto";


  try{
   float.setPointerCapture(e.pointerId);
  }catch(error){}

 };


 float.onpointermove=e=>{

  if(!down)
   return;


  let x=Math.max(
   0,
   Math.min(
    innerWidth-float.offsetWidth,
    startLeft+e.clientX-sx
   )
  );


  let y=Math.max(
   0,
   Math.min(
    innerHeight-float.offsetHeight,
    startTop+e.clientY-sy
   )
  );


  if(
   Math.abs(e.clientX-sx)>4 ||
   Math.abs(e.clientY-sy)>4
  ){

   moved=true;

  }


  float.style.left=x+"px";
  float.style.top=y+"px";

 };


 float.onpointerup=e=>{

  down=false;


  try{
   float.releasePointerCapture(e.pointerId);
  }catch(error){}


  if(!moved)
   openVoice();

 };

}


/* ================================
   LOAD LAST CHAT
================================ */

if(chats.length)
 current=chats[0];


console.log("KAIRO ready");
