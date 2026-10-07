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
let speaking=false;
let requestRunning=false;


/* ================================
   SAVE
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
   MESSAGE
================================ */

function bubble(text,who){

 const e=document.createElement("div");

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
   CONTEXT
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
   TITLE
================================ */

function title(text){

 const x=text.toLowerCase();

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

 text=String(text||"").trim();

 if(!text)return;

 if(requestRunning)
  return;

 requestRunning=true;


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


 let thinking=bubble("Thinking...","ai");


 if(voice){

  voiceStatus.textContent="Thinking...";
  voiceSub.textContent="KAIRO is thinking...";

 }


 try{

  const response=await fetch("/api/api",{
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


  const data=await response.json();

  const reply=
   String(data.reply||"Sorry, I couldn't answer that.")
   .trim();


  thinking.remove();


  current.messages.push({
   role:"assistant",
   text:reply
  });


  bubble(reply,"ai");

  save();


  requestRunning=false;


  /*
    ONLY VOICE MODE speaks.
  */

  if(voice && voiceOn){

   speak(reply);

  }else if(voiceOn){

   startListen();

  }


 }catch(error){

  console.log("KAIRO API ERROR:",error);

  thinking.textContent="Connection problem.";

  requestRunning=false;


  if(voice && voiceOn){

   voiceStatus.textContent="Connection problem.";
   voiceSub.textContent="Try again.";

   setTimeout(startListen,300);

  }

 }
}


/* ================================
   CLEAN TEXT FOR TTS
================================ */

function cleanForSpeech(text){

 let x=String(text||"");


 /*
   KAIRO pronunciation fix
 */

 x=x.replace(/K-A-I-R-O/gi,"কাইরো");
 x=x.replace(/\bKAIRO\b/gi,"কাইরো");


 /*
   Remove markdown
 */

 x=x.replace(/```[\s\S]*?```/g,"");
 x=x.replace(/[*_#>`~]/g,"");


 /*
   Remove invisible characters
 */

 x=x.replace(/[\u200B-\u200D\uFEFF]/g,"");


 /*
   Remove weird repeated punctuation
 */

 x=x.replace(/[-_=]{2,}/g," ");
 x=x.replace(/[•●▪■□◆◇]/g," ");
 x=x.replace(/[※※]+/g," ");
 x=x.replace(/\s+/g," ");


 return x.trim();
}


/* ================================
   SPEAK
================================ */

function speak(text){

 if(!voiceOn)
  return;


 if(!("speechSynthesis" in window)){

  startListen();
  return;
 }


 stopListen();

 speechSynthesis.cancel();

 speaking=true;


 const clean=cleanForSpeech(text);


 if(!clean){

  speaking=false;

  setTimeout(startListen,100);

  return;
 }


 const u=new SpeechSynthesisUtterance(clean);

 const voices=speechSynthesis.getVoices();

 const bangla=/[\u0980-\u09FF]/.test(clean);

 let v=null;


 if(bangla){

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

  u.lang=bangla?"bn-BD":"en-US";

 }


 /*
   Natural but fast response
 */

 u.rate=1.0;
 u.pitch=1;
 u.volume=1;


 voiceStatus.textContent="KAIRO is speaking...";
 voiceSub.textContent="Listen...";


 u.onend=()=>{

  speaking=false;


  if(voiceOn){

   voiceStatus.textContent="Listening...";
   voiceSub.textContent="Talk to KAIRO";


   /*
      Almost zero extra delay.
   */

   setTimeout(startListen,100);

  }

 };


 u.onerror=()=>{

  speaking=false;

  if(voiceOn)
   setTimeout(startListen,100);

 };


 speechSynthesis.speak(u);
}


/* ================================
   START LISTENING
================================ */

function startListen(){

 if(!voiceOn)
  return;


 if(speaking)
  return;


 if(requestRunning)
  return;


 if(!("webkitSpeechRecognition" in window))
  return;


 if(listening)
  return;


 listening=true;


 voiceStatus.textContent="Listening...";
 voiceSub.textContent="Speak naturally";


 rec=new webkitSpeechRecognition();

 rec.lang="bn-BD";

 rec.interimResults=false;
 rec.continuous=false;


 rec.onresult=e=>{

  listening=false;

  const text=
   e.results[0][0].transcript.trim();


  if(!text){

   setTimeout(startListen,100);
   return;
  }


  /*
    Stop recognition before API request.
    Prevents duplicate listening.
  */

  try{
   rec.stop();
  }catch(error){}


  rec=null;


  ask(text,true);

 };


 rec.onerror=error=>{

  console.log("Recognition error:",error);

  listening=false;
  rec=null;


  if(voiceOn){

   setTimeout(startListen,300);

  }

 };


 rec.onend=()=>{

  listening=false;

 };


 try{

  rec.start();

 }catch(error){

  listening=false;
  rec=null;

  if(voiceOn)
   setTimeout(startListen,300);

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
 speaking=false;
 requestRunning=false;

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
 speaking=false;

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
   SEND
================================ */

send.onclick=()=>{

 ask(input.value);

};


/* ================================
   ENTER
================================ */

input.addEventListener("keydown",e=>{

 if(e.key==="Enter"&&!e.shiftKey){

  e.preventDefault();

  ask(input.value);

 }

});


/* ================================
   NORMAL MIC
================================ */

mic.onclick=()=>{

 if(!("webkitSpeechRecognition" in window)){

  alert("Voice recognition unavailable.");
  return;

 }


 const r=new webkitSpeechRecognition();

 r.lang="bn-BD";
 r.interimResults=false;
 r.continuous=false;


 r.onresult=e=>{

  const text=
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


 const newButton=
  document.createElement("button");

 newButton.className="kairo-history-new";
 newButton.textContent="+ New Chat";

 list.appendChild(newButton);


 const memoryButton=
  document.createElement("button");

 memoryButton.className="kairo-history-new";
 memoryButton.textContent="🧠 Memory";

 list.appendChild(memoryButton);


 chats.forEach(item=>{

  const button=
   document.createElement("button");

  button.className="kairo-history-card";
  button.textContent=item.title;


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


   panel.setAttribute("aria-hidden","true");
   back.setAttribute("aria-hidden","true");

  };


  list.appendChild(button);

 });


 newButton.onclick=()=>{

  newChat();

  panel.setAttribute("aria-hidden","true");
  back.setAttribute("aria-hidden","true");

 };


 memoryButton.onclick=()=>{

  alert(
   memory.length
    ?memory.join("\n")
    :"No memories yet."
  );

 };


 panel.setAttribute("aria-hidden","false");
 back.setAttribute("aria-hidden","false");

};


/* ================================
   CLOSE HISTORY
================================ */

back.onclick=()=>{

 panel.setAttribute("aria-hidden","true");
 back.setAttribute("aria-hidden","true");

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
   MINI VOICE
================================ */

mini.onclick=openVoice;


/* ================================
   FLOATING KAIRO
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

  const r=float.getBoundingClientRect();

  down=true;
  moved=false;

  sx=e.clientX;
  sy=e.clientY;

  startLeft=r.left;
  startTop=r.top;


  float.style.left=startLeft+"px";
  float.style.top=startTop+"px";

  float.style.right="auto";
  float.style.bottom="auto";


  try{
   float.setPointerCapture(e.pointerId);
  }catch(error){}

 };


 float.onpointermove=e=>{

  if(!down)return;


  const x=Math.max(
   0,
   Math.min(
    innerWidth-float.offsetWidth,
    startLeft+e.clientX-sx
   )
  );


  const y=Math.max(
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
   LOAD
================================ */

if(chats.length)
 current=chats[0];


console.log("KAIRO FAST VOICE READY");
