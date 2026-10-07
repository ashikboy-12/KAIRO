const $=id=>document.getElementById(id);

const chat=$("chat"),input=$("messageInput"),send=$("sendButton"),
mic=$("micButton"),voice=$("voiceMode"),vlogo=$("voiceLogo"),
vstatus=$("voiceStatus"),vsub=$("voiceSubtitle"),
history=$("historyPanel"),back=$("historyBackdrop"),
hbtn=$("historyButton"),list=$("historyList");

const KEY="kairo_chats";
let current=null,rec=null,listening=false,starting=false,busy=false;


/* ---------- STORAGE ---------- */

const chats=()=>JSON.parse(localStorage.getItem(KEY)||"[]");

function save(){
    let a=chats(),i=a.findIndex(x=>x.id===current.id);
    if(i<0)a.unshift(current);else a[i]=current;
    localStorage.setItem(KEY,JSON.stringify(a));
}

function topic(t){
    let s=t.toLowerCase();
    let map={
        anime:"Anime",manga:"Manga",game:"Gaming",
        gaming:"Gaming","free fire":"Free Fire",
        football:"Football",trading:"Trading",
        quotex:"Trading",study:"Study",ssc:"SSC Study",
        math:"Math",physics:"Physics",chemistry:"Chemistry",
        biology:"Biology",coding:"Coding",html:"Coding",
        javascript:"Coding",phone:"Phone",android:"Android",
        news:"News",youtube:"YouTube",kairo:"KAIRO"
    };
    for(let k in map)if(s.includes(k))return map[k];
    return t.trim().split(/\s+/).slice(0,5).join(" ")||"New Chat";
}

function newChat(first=""){
    current={
        id:Date.now()+Math.random(),
        title:topic(first),
        time:Date.now(),
        messages:[]
    };
    let a=chats();a.unshift(current);
    localStorage.setItem(KEY,JSON.stringify(a));
}


/* ---------- UI ---------- */

function clearWelcome(){
    chat.querySelector(".welcome")?.remove();
}

function add(text,type){
    let e=document.createElement("div");
    e.className="message "+(type==="user"?"user-message":"ai-message");
    e.textContent=text;
    chat.appendChild(e);
    chat.scrollTop=chat.scrollHeight;
    return e;
}

function store(role,text){
    if(!current)newChat(text);
    current.messages.push({role,text,time:Date.now()});
    current.time=Date.now();
    save();
}


/* ---------- AI ---------- */

async function ask(text){

    let old=chats(),words=text.toLowerCase().split(/\s+/);

    let relevant=old.filter(c=>
        c.messages.some(m=>
            words.some(w=>w.length>2&&m.text.toLowerCase().includes(w))
        )
    ).slice(0,3);

    let context=relevant.map(c=>
        `[${c.title}]\n`+
        c.messages.slice(-6).map(m=>
            (m.role==="user"?"User: ":"KAIRO: ")+m.text
        ).join("\n")
    ).join("\n---\n");

    let r=await fetch("/api/api",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            message:text,
            context,
            conversation:current?.messages.slice(-10)||[]
        })
    });

    if(!r.ok)throw Error("API "+r.status);

    let d=await r.json();

    if(!d.reply)throw Error("No reply");

    return d.reply;
}


/* ---------- TEXT CHAT ---------- */

async function sendMsg(){

    let text=input.value.trim();
    if(!text||send.disabled)return;

    clearWelcome();

    if(!current)newChat(text);

    add(text,"user");
    store("user",text);

    input.value="";
    input.style.height="auto";

    let thinking=add("Thinking…","ai");
    send.disabled=true;

    try{
        let reply=await ask(text);
        thinking.remove();
        add(reply,"ai");
        store("ai",reply);
    }catch(e){
        console.error(e);
        thinking.textContent=
            "I'm having trouble connecting right now. Please try again.";
        store("ai",thinking.textContent);
    }

    send.disabled=false;
}

send.onclick=sendMsg;

input.onkeydown=e=>{
    if(e.key==="Enter"&&!e.shiftKey){
        e.preventDefault();
        sendMsg();
    }
};

input.oninput=()=>{
    input.style.height="auto";
    input.style.height=Math.min(input.scrollHeight,110)+"px";
};


/* ---------- VOICE ---------- */

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

if(SR){
    rec=new SR();
    rec.continuous=false;
    rec.interimResults=false;
    rec.lang="en-US";

    rec.onstart=()=>{
        listening=true;
        starting=false;
        if(vstatus)vstatus.textContent="Listening";
        if(vsub)vsub.textContent="Talk to KAIRO";
    };

    rec.onresult=async e=>{
        if(busy)return;

        let text=e.results[0][0].transcript.trim();
        if(!text)return;

        busy=true;
        stopListen();

        clearWelcome();

        if(!current)newChat(text);

        add(text,"user");
        store("user",text);

        if(vstatus)vstatus.textContent="Thinking…";
        if(vsub)vsub.textContent="KAIRO is thinking";

        try{
            let reply=await ask(text);

            add(reply,"ai");
            store("ai",reply);

            if(vstatus)vstatus.textContent="Speaking";
            if(vsub)vsub.textContent="KAIRO is replying";

            await speak(reply);

        }catch(e){
            let msg="Sorry, I couldn't connect right now.";
            add(msg,"ai");
            store("ai",msg);
            await speak(msg);
        }

        busy=false;

        if(voice.classList.contains("active")){
            if(vstatus)vstatus.textContent="Listening";
            setTimeout(startListen,600);
        }
    };

    rec.onerror=e=>{
        listening=false;
        starting=false;
        if(e.error==="not-allowed"){
            if(vstatus)vstatus.textContent="Mic permission needed";
        }
    };

    rec.onend=()=>{
        listening=false;
        starting=false;
    };
}

function startListen(){
    if(!rec||!voice.classList.contains("active")||
       listening||starting||busy)return;

    starting=true;

    try{rec.start()}
    catch(e){starting=false}
}

function stopListen(){
    if(!rec)return;
    try{rec.stop()}catch(e){}
    listening=false;
    starting=false;
}

function speak(text){
    return new Promise(done=>{
        if(!speechSynthesis)return done();

        speechSynthesis.cancel();

        let u=new SpeechSynthesisUtterance(text);
        u.lang="en-US";
        u.rate=.92;
        u.pitch=1;
        u.onend=done;
        u.onerror=done;

        speechSynthesis.speak(u);
    });
}


/* ---------- VOICE MODE ---------- */

function openVoice(){
    voice.classList.add("active");
    voice.setAttribute("aria-hidden","false");
    if(vstatus)vstatus.textContent="Listening";
    if(vsub)vsub.textContent="Talk to KAIRO";

    stopListen();
    setTimeout(startListen,400);
}

function closeVoice(){
    voice.classList.remove("active");
    voice.setAttribute("aria-hidden","true");
    stopListen();
    speechSynthesis?.cancel();
}

mic.onclick=openVoice;
vlogo.onclick=closeVoice;


/* ---------- HISTORY ---------- */

function render(q=""){

    list.innerHTML="";

    let a=chats();
    q=q.toLowerCase();

    let filtered=a.filter(c=>
        !q||
        c.title.toLowerCase().includes(q)||
        c.messages.some(m=>m.text.toLowerCase().includes(q))
    );

    let n=document.createElement("button");
    n.className="kairo-history-new";
    n.textContent="+ New chat";
    list.appendChild(n);
    n.onclick=()=>{
        newChat();
        chat.innerHTML=`
        <div class="welcome">
        <div class="welcome-logo"><div class="welcome-core"></div></div>
        <h1>Hello, I'm KAIRO</h1>
        <p>Your AI companion for conversation, answers and ideas.</p>
        </div>`;
        closeHistory();
    };

    filtered.forEach(c=>{
        let e=document.createElement("div");
        e.className="kairo-history-card";

        let last=c.messages.findLast?.(m=>m.role==="user")||
                 [...c.messages].reverse().find(m=>m.role==="user");

        e.innerHTML=`
        <div class="kairo-history-topic">${c.title}</div>
        <div class="kairo-history-preview">${last?.text||"Conversation"}</div>
        <div class="kairo-history-meta">
        ${c.messages.length} messages
        </div>`;

        list.appendChild(e);

        e.onclick=()=>{
            current=c;
            chat.innerHTML="";
            c.messages.forEach(m=>add(
                m.text,m.role==="user"?"user":"ai"
            ));
            closeHistory();
        };
    });
}

function openHistory(){
    if(!history.querySelector(".kairo-history-search")){
        let s=document.createElement("input");
        s.className="kairo-history-search";
        s.placeholder="Search conversations…";
        history.insertBefore(s,list);
        s.oninput=()=>render(s.value);
    }

    render();

    history.classList.add("open","active");
    back.classList.add("open","active");
}

function closeHistory(){
    history.classList.remove("open","active");
    back.classList.remove("open","active");
}

hbtn.onclick=openHistory;
back.onclick=closeHistory;


/* ---------- INIT ---------- */

render();
console.log("KAIRO ready");
