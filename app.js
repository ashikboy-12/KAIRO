const $=id=>document.getElementById(id);
const chat=$("chat"),input=$("messageInput"),send=$("sendButton"),mic=$("micButton");
const historyBtn=$("historyButton"),panel=$("historyPanel"),back=$("historyBackdrop"),list=$("historyList");
const float=$("floatingKairo"),voiceMode=$("voiceMode"),voiceStatus=$("voiceStatus"),voiceSub=$("voiceSubtitle"),closeVoice=$("closeVoiceButton"),mini=$("miniVoiceButton");

const HK="kairo_history",MK="kairo_memory";
let chats=JSON.parse(localStorage.getItem(HK)||"[]");
let memory=JSON.parse(localStorage.getItem(MK)||"[]");
let current=chats[0]||null,rec=null,listening=false,voiceOn=false;

function save(){
 localStorage.setItem(HK,JSON.stringify(chats));
 localStorage.setItem(MK,JSON.stringify(memory));
}

function newChat(){
 current={id:Date.now(),title:"New Chat",messages:[]};
 chats.unshift(current);save();chat.innerHTML="";
}

function bubble(t,w){
 let e=document.createElement("div");
 e.className="message "+w;e.textContent=t;chat.appendChild(e);
 chat.scrollTop=chat.scrollHeight;
}

function remember(t){
 if(/my name is |amar nam |i like |i love |i live in |my favorite |amar favourite |amar favorite /i.test(t)){
  if(!memory.includes(t)){memory.push(t);save();}
 }
}

function context(){
 return chats.filter(x=>!current||x.id!=current.id).slice(0,5)
 .map(x=>x.title+": "+x.messages.slice(-2).map(m=>m.text).join(" | ")).join("\n");
}

function title(t){
 let x=t.toLowerCase();
 if(x.includes("anime"))return"Anime";
 if(/trading|forex|trade/.test(x))return"Trading";
 if(/ssc|study|exam|math|physics|chemistry/.test(x))return"Study";
 if(/game|gaming|free fire|efootball/.test(x))return"Gaming";
 if(/code|coding|html|javascript|app/.test(x))return"Coding";
 return t.slice(0,24)||"New Chat";
}

async function ask(text,voice=false){
 text=text.trim();if(!text)return;
 if(!current)newChat();
 if(current.title=="New Chat")current.title=title(text);
 remember(text);current.messages.push({role:"user",text});bubble(text,"user");
 if(!voice)input.value="";

 let e=document.createElement("div");
 e.className="message ai";e.textContent="Thinking...";chat.appendChild(e);

 if(voice){voiceStatus.textContent="Thinking...";voiceSub.textContent="KAIRO is thinking...";}

 try{
  let r=await fetch("/api/api",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({message:text,context:context(),memory:memory.join("\n")})
  });
  let d=await r.json(),reply=d.reply||"Sorry, I couldn't answer that.";
  e.remove();current.messages.push({role:"assistant",text:reply});bubble(reply,"ai");save();

  if(voice&&voiceOn){
   speak(reply);
  }
 }catch(err){
  console.log(err);e.textContent="Connection problem.";
  if(voice)voiceStatus.textContent="Connection problem.";
 }
}

function speak(text){
 if(!("speechSynthesis"in window)){startListen();return;}
 speechSynthesis.cancel();
 let u=new SpeechSynthesisUtterance(text);
 let v=speechSynthesis.getVoices().find(x=>x.lang?.toLowerCase().startsWith("bn"))
      ||speechSynthesis.getVoices().find(x=>x.lang?.toLowerCase().startsWith("en"));
 if(v){u.voice=v;u.lang=v.lang;}else u.lang="bn-BD";
 u.rate=.95;u.pitch=1;u.volume=1;
 voiceStatus.textContent="KAIRO is speaking...";
 voiceSub.textContent="Listen...";
 u.onend=()=>{if(voiceOn)setTimeout(startListen,500)};
 u.onerror=()=>{if(voiceOn)startListen()};
 speechSynthesis.speak(u);
}

function startListen(){
 if(!voiceOn||!("webkitSpeechRecognition"in window))return;
 if(listening)return;
 rec=new webkitSpeechRecognition();
 rec.lang="bn-BD";rec.interimResults=false;rec.continuous=false;
 listening=true;voiceStatus.textContent="Listening...";voiceSub.textContent="Speak naturally";
 rec.onresult=e=>{
  listening=false;
  let t=e.results[0][0].transcript.trim();
  if(t)ask(t,true);
 };
 rec.onerror=()=>{listening=false;if(voiceOn)setTimeout(startListen,500)};
 rec.onend=()=>{listening=false};
 try{rec.start()}catch(e){listening=false}
}

function stopListen(){
 listening=false;
 if(rec){try{rec.stop()}catch(e){}rec=null}
}

function openVoice(){
 voiceOn=true;voiceMode.classList.add("active");voiceMode.setAttribute("aria-hidden","false");
 voiceStatus.textContent="Listening...";voiceSub.textContent="Talk to KAIRO";startListen();
}

function closeVoiceMode(){
 voiceOn=false;stopListen();
 if("speechSynthesis"in window)speechSynthesis.cancel();
 voiceMode.classList.remove("active");voiceMode.setAttribute("aria-hidden","true");
}

send.onclick=()=>ask(input.value);
input.addEventListener("keydown",e=>{
 if(e.key=="Enter"&&!e.shiftKey){e.preventDefault();ask(input.value)}
});

mic.onclick=()=>{
 if("webkitSpeechRecognition"in window){
  let r=new webkitSpeechRecognition();
  r.lang="bn-BD";r.interimResults=false;r.onresult=e=>ask(e.results[0][0].transcript);
  r.start();
 }else alert("Voice recognition unavailable.");
};

historyBtn.onclick=()=>{
 list.innerHTML='<button class="kairo-history-new">+ New Chat</button><button class="kairo-history-new">🧠 Memory</button>';
 chats.forEach(x=>{
  let b=document.createElement("button");b.className="kairo-history-card";b.textContent=x.title;
  b.onclick=()=>{current=x;chat.innerHTML="";x.messages.forEach(m=>bubble(m.text,m.role=="user"?"user":"ai"));panel.setAttribute("aria-hidden","true");back.setAttribute("aria-hidden","true")};
  list.appendChild(b);
 });
 list.children[0].onclick=()=>{newChat();panel.setAttribute("aria-hidden","true");back.setAttribute("aria-hidden","true")};
 list.children[1].onclick=()=>alert(memory.length?memory.join("\n"):"No memories yet.");
 panel.setAttribute("aria-hidden","false");back.setAttribute("aria-hidden","false");
};

back.onclick=()=>{panel.setAttribute("aria-hidden","true");back.setAttribute("aria-hidden","true")};
closeVoice.onclick=closeVoiceMode;
voiceMode.onclick=e=>{if(e.target===voiceMode)closeVoiceMode()};
mini.onclick=openVoice;

/* KAIRO DRAG */
if(float){
 let down=false,moved=false,sx,sy,l,t;
 float.style.touchAction="none";
 float.onpointerdown=e=>{
  let r=float.getBoundingClientRect();down=true;moved=false;
  sx=e.clientX;sy=e.clientY;l=r.left;t=r.top;
  float.style.left=l+"px";float.style.top=t+"px";float.style.right="auto";float.style.bottom="auto";
  float.setPointerCapture(e.pointerId);
 };
 float.onpointermove=e=>{
  if(!down)return;
  let x=Math.max(0,Math.min(innerWidth-float.offsetWidth,l+e.clientX-sx));
  let y=Math.max(0,Math.min(innerHeight-float.offsetHeight,t+e.clientY-sy));
  if(Math.abs(e.clientX-sx)>4||Math.abs(e.clientY-sy)>4)moved=true;
  float.style.left=x+"px";float.style.top=y+"px";
 };
 float.onpointerup=e=>{
  down=false;try{float.releasePointerCapture(e.pointerId)}catch(x){}
  if(!moved)openVoice();
 };
}

if(chats.length)current=chats[0];
console.log("KAIRO ready");
