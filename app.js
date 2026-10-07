const $=id=>document.getElementById(id),chat=$("chat"),input=$("messageInput"),send=$("sendButton"),mic=$("micButton"),voice=$("voiceMode"),vStatus=$("voiceStatus"),vSub=$("voiceSubtitle"),closeV=$("closeVoiceButton"),mini=$("miniVoiceButton"),floating=$("floatingKairo"),histBtn=$("historyButton"),hist=$("historyPanel"),backdrop=$("historyBackdrop"),histList=$("historyList");

let busy=false,listening=false,speaking=false,recognition=null;
let messages=JSON.parse(localStorage.kairoHistory||"[]");
let memory=JSON.parse(localStorage.kairoMemory||"[]");

function save(){
    localStorage.kairoHistory=JSON.stringify(messages.slice(-100));
    localStorage.kairoMemory=JSON.stringify(memory.slice(-50));
}

function bubble(text,user){
    const d=document.createElement("div");
    d.className=user?"message user-message":"message ai-message";
    d.textContent=text;
    chat.appendChild(d);
    chat.scrollTop=chat.scrollHeight;
}

function add(text,user){
    bubble(text,user);
    messages.push({
        role:user?"user":"assistant",
        text:text,
        time:Date.now()
    });
    save();
}

function renderHistory(query=""){
    histList.innerHTML="";
    const list=messages
        .filter(x=>!query||x.text.toLowerCase().includes(query.toLowerCase()))
        .slice(-40);

    if(!list.length){
        histList.textContent="No conversations yet.";
        return;
    }

    list.forEach(x=>{
        const d=document.createElement("div");
        d.className="history-item";
        d.textContent=(x.role==="user"?"You: ":"KAIRO: ")+x.text;
        histList.appendChild(d);
    });
}

function historyTools(){
    if(document.getElementById("historyTools"))return;

    const d=document.createElement("div");
    d.id="historyTools";

    d.innerHTML=`
        <input id="historySearch" placeholder="Search history...">
        <button id="newChat" type="button">+ New Conversation</button>
        <button id="memoryBtn" type="button">Memory</button>
    `;

    hist.insertBefore(d,histList);

    document.getElementById("historySearch").oninput=e=>{
        renderHistory(e.target.value);
    };

    document.getElementById("newChat").onclick=()=>{
        chat.innerHTML="";
        closeHistory();
    };

    document.getElementById("memoryBtn").onclick=()=>{
        alert(
            memory.length
            ? memory.join("\n")
            : "No saved memory yet."
        );
    };
}

function openHistory(){
    historyTools();
    renderHistory();
    hist.setAttribute("aria-hidden","false");
    backdrop.setAttribute("aria-hidden","false");
}

function closeHistory(){
    hist.setAttribute("aria-hidden","true");
    backdrop.setAttribute("aria-hidden","true");
}

histBtn.onclick=openHistory;
backdrop.onclick=closeHistory;

function remember(text){
    if(!memory.includes(text)&&text.length<180){
        memory.push(text);
        save();
    }
}

function relevantHistory(){
    const words=input.value
        .toLowerCase()
        .split(/\W+/)
        .filter(x=>x.length>2);

    return messages
        .filter(x=>words.some(w=>x.text.toLowerCase().includes(w)))
        .slice(-8);
}

async function ask(){

    if(busy)return;

    const text=input.value.trim();

    if(!text)return;

    busy=true;
    send.disabled=true;

    add(text,true);
    input.value="";

    const low=text.toLowerCase();

    if(
        /^(stop|চুপ|চুপ কর|থাম)/.test(low)
    ){
        speechSynthesis.cancel();
        busy=false;
        send.disabled=false;
        return;
    }

    try{

        const response=await fetch("/api/api",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                message:text,
                memory:memory,
                relevantHistory:relevantHistory(),
                history:messages.slice(-12),
                gameMode:"normal"
            })
        });

        const data=await response.json();

        const reply=
            data.reply||
            "KAIRO এখন উত্তর দিতে পারছে না।";

        add(reply,false);

        if(
            /my name is|আমার নাম|remember|মনে রাখ/.test(low)
        ){
            remember(text);
        }

        if(speaking){
            talk(reply);
        }

    }catch(error){

        add(
            "Connection problem. আবার চেষ্টা করো।",
            false
        );

    }finally{

        busy=false;
        send.disabled=false;

    }
}

send.onclick=ask;

input.onkeydown=e=>{
    if(
        e.key==="Enter"&&
        !e.shiftKey
    ){
        e.preventDefault();
        ask();
    }
};

function setupRecognition(){

    const R=
        window.SpeechRecognition||
        window.webkitSpeechRecognition;

    if(!R)return null;

    const r=new R();

    r.lang="bn-BD";
    r.interimResults=false;
    r.continuous=false;

    r.onstart=()=>{
        listening=true;
        if(vStatus)vStatus.textContent="Listening...";
    };

    r.onresult=e=>{
        input.value=
            e.results[0][0].transcript;
        ask();
    };

    r.onend=()=>{
        listening=false;
        if(vStatus)vStatus.textContent="Ready";
    };

    r.onerror=()=>{
        listening=false;
        if(vStatus)vStatus.textContent="Try again";
    };

    return r;
}

recognition=setupRecognition();

function listen(){

    if(!recognition){
        alert("Voice input is not supported here.");
        return;
    }

    try{
        recognition.start();
    }catch(e){}
}

mic.onclick=listen;

function talk(text){

    if(!("speechSynthesis" in window))return;

    speechSynthesis.cancel();

    const u=
        new SpeechSynthesisUtterance(text);

    u.lang=
        /[\u0980-\u09FF]/.test(text)
        ?"bn-BD"
        :"en-US";

    u.rate=.95;

    u.onstart=()=>{
        speaking=true;
    };

    u.onend=()=>{
        speaking=false;

        if(
            voice&&
            voice.getAttribute("aria-hidden")==="false"
        ){
            listen();
        }
    };

    speechSynthesis.speak(u);
}

function openVoice(){

    voice.setAttribute("aria-hidden","false");

    speaking=true;

    if(vStatus)vStatus.textContent="Listening...";
    if(vSub)vSub.textContent="Talk to KAIRO";

    listen();
}

function closeVoice(){

    voice.setAttribute("aria-hidden","true");

    speechSynthesis.cancel();

    speaking=false;
    listening=false;

    try{
        if(recognition)recognition.stop();
    }catch(e){}
}

if(mini)mini.onclick=openVoice;
if(floating)floating.onclick=openVoice;
if(closeV)closeV.onclick=closeVoice;

window.KAIRO={
    ask:ask,
    listen:listen,
    openVoice:openVoice,
    closeVoice:closeVoice,
    history:messages,
    memory:memory
};

renderHistory();
