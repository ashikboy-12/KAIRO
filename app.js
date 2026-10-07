const $=id=>document.getElementById(id);

const chat=$("chat"),input=$("messageInput"),send=$("sendButton");
const mic=$("micButton"),voice=$("voiceMode"),status=$("voiceStatus");
const sub=$("voiceSubtitle"),closeV=$("closeVoiceButton");
const mini=$("miniVoiceButton"),floating=$("floatingKairo");
const histBtn=$("historyButton"),hist=$("historyPanel");
const backdrop=$("historyBackdrop"),histList=$("historyList");

let busy=false,voiceMode=false,listening=false,speaking=false;
let recognition=null,restartTimer=null;

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
    text,
    time:Date.now()
  });

  save();
}

function related(text){
  const words=text.toLowerCase()
    .split(/\s+/)
    .filter(x=>x.length>2);

  return history
    .filter(x=>words.some(w=>x.text.toLowerCase().includes(w)))
    .slice(-8);
}

function isStopCommand(text){
  const t=text.toLowerCase().trim();

  return [
    "থামো","থাম","চুপ","চুপ কর","বন্ধ",
    "stop","stop talking","be quiet",
    "shut up"
  ].some(x=>t===x||t.includes(x));
}

function cancelRecognition(){
  if(!recognition)return;

  try{
    recognition.abort();
  }catch(e){}

  listening=false;

  if(mic)mic.classList.remove("listening");
}

function startListening(){
  if(!voiceMode||busy||speaking||listening||!recognition)return;

  clearTimeout(restartTimer);

  try{
    recognition.start();
  }catch(e){}
}

function restartListening(delay=400){
  clearTimeout(restartTimer);

  restartTimer=setTimeout(()=>{
    if(voiceMode&&!busy&&!speaking&&!listening){
      startListening();
    }
  },delay);
}

function stopKairoSpeaking(){
  speaking=false;

  if(window.speechSynthesis){
    speechSynthesis.cancel();
  }

  if(status){
    status.textContent="Listening...";
  }

  restartListening(350);
}

async function ask(text,speak=false){

  text=text.trim();

  if(!text||busy)return;

  if(voiceMode&&isStopCommand(text)){
    stopKairoSpeaking();
    return;
  }

  busy=true;
  send.disabled=true;

  cancelRecognition();

  add(text,true);

  try{

    const r=await fetch("/api/api",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        message:text,
        memory,
        history:history.slice(-12),
        relevantHistory:related(text),
        gameMode:"normal"
      })
    });

    const data=await r.json();

    const reply=data.reply||
      "আমি এখন উত্তর দিতে পারছি না।";

    add(reply,false);

    if(speak&&voiceMode){
      speakText(reply);
    }

  }catch(e){

    add(
      "Connection problem. আবার চেষ্টা করো।",
      false
    );

  }finally{

    busy=false;
    send.disabled=false;

    if(voiceMode&&!speaking){
      restartListening(400);
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

const SR=
  window.SpeechRecognition||
  window.webkitSpeechRecognition;

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
      restartListening(450);
    }
  };

  recognition.onerror=()=>{
    listening=false;

    if(mic){
      mic.classList.remove("listening");
    }

    if(voiceMode&&!busy&&!speaking){
      restartListening(700);
    }
  };
}

function listen(){
  startListening();
}

mic.onclick=()=>{

  if(voiceMode)return;

  if(listening){
    cancelRecognition();
  }else{
    startNormalMic();
  }
};

function startNormalMic(){

  if(!recognition)return;

  try{
    recognition.start();
  }catch(e){}
}

function speakText(text){

  if(!window.speechSynthesis){
    restartListening();
    return;
  }

  speaking=true;
  cancelRecognition();

  speechSynthesis.cancel();

  const u=new SpeechSynthesisUtterance(text);

  u.lang=/[\u0980-\u09FF]/.test(text)
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

    if(voiceMode&&!busy){
      if(status){
        status.textContent="Listening...";
      }

      restartListening(350);
    }
  };

  u.onerror=()=>{
    speaking=false;

    if(voiceMode&&!busy){
      restartListening(350);
    }
  };

  speechSynthesis.speak(u);
}

function openVoice(){

  clearTimeout(restartTimer);

  speechSynthesis?.cancel();

  cancelRecognition();

  speaking=false;
  voiceMode=true;

  voice.setAttribute("aria-hidden","false");

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

  voice.setAttribute("aria-hidden","true");

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

histBtn.onclick=()=>{

  if(histList){

    histList.innerHTML="";

    history.slice(-40).forEach(x=>{

      const d=document.createElement("div");

      d.className="history-item";

      d.textContent=
        (x.role==="user"
          ?"You: "
          :"KAIRO: ")+x.text;

      histList.appendChild(d);
    });
  }

  hist.setAttribute(
    "aria-hidden",
    "false"
  );

  backdrop.setAttribute(
    "aria-hidden",
    "false"
  );
};

backdrop.onclick=()=>{

  hist.setAttribute(
    "aria-hidden",
    "true"
  );

  backdrop.setAttribute(
    "aria-hidden",
    "true"
  );
};

window.KAIRO={
  ask,
  listen,
  openVoice,
  closeVoice
};
