const $=id=>document.getElementById(id);

const chat=$("chat");
const input=$("messageInput");
const send=$("sendButton");
const mic=$("micButton");

const voiceMode=$("voiceMode");
const voiceLogo=$("voiceLogo");
const voiceStatus=$("voiceStatus");
const voiceSubtitle=$("voiceSubtitle");

const miniVoice=$("miniVoiceButton");
const floating=$("floatingKairo");

const historyButton=$("historyButton");
const historyPanel=$("historyPanel");
const historyBackdrop=$("historyBackdrop");

let voiceOn=false;
let recognition=null;
let speaking=false;
let starting=false;


/* =========================
   CHAT
========================= */

function message(type,text){

    if(!chat)return;

    const welcome=chat.querySelector(".welcome");
    if(welcome)welcome.remove();

    const box=document.createElement("div");

    box.className=
        type==="user"
        ?"message user-message"
        :"message ai-message";

    box.textContent=text;

    chat.appendChild(box);
    chat.scrollTop=chat.scrollHeight;
}


/* =========================
   AI
========================= */

async function askKairo(text){

    try{

        const r=await fetch("/api/api",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                message:text
            })
        });

        const data=await r.json();

        if(!r.ok||!data.success)
            throw new Error(data.error||"API error");

        return data.reply||"";

    }catch(e){

        console.error("KAIRO:",e);

        return "Sorry, I couldn't connect right now.";

    }
}


/* =========================
   TEXT SEND
========================= */

async function sendMessage(){

    const text=input?.value.trim();

    if(!text)return;

    input.value="";

    message("user",text);

    const reply=await askKairo(text);

    if(reply){

        message("ai",reply);

        /* Normal chat never speaks automatically */

    }
}

send?.addEventListener("click",sendMessage);

input?.addEventListener("keydown",e=>{

    if(e.key==="Enter"&&!e.shiftKey){

        e.preventDefault();
        sendMessage();

    }

});


/* =========================
   VOICE STATUS
========================= */

function setVoice(status,sub){

    if(voiceStatus)
        voiceStatus.textContent=status;

    if(voiceSubtitle)
        voiceSubtitle.textContent=sub;

}


/* =========================
   SPEECH RECOGNITION
========================= */

const Speech=
    window.SpeechRecognition||
    window.webkitSpeechRecognition;


function startListening(){

    if(!voiceOn||speaking||starting)return;

    if(!Speech){

        setVoice(
            "Voice unavailable",
            "Speech recognition is not supported"
        );

        return;
    }

    starting=true;

    recognition=new Speech();

    recognition.continuous=false;
    recognition.interimResults=false;
    recognition.maxAlternatives=1;

    /*
      English locale.
      Bangla/Banglish will be improved
      later with native speech recognition.
    */

    recognition.lang="en-US";


    recognition.onstart=()=>{

        starting=false;

        setVoice(
            "Listening...",
            "I'm listening"
        );

    };


    recognition.onresult=async e=>{

        const text=
            e.results[0][0].transcript.trim();

        recognition=null;
        starting=false;

        if(!text||!voiceOn)return;


        setVoice(
            "Thinking...",
            "KAIRO is processing"
        );


        message("user",text);


        const reply=
            await askKairo(text);


        if(!reply||!voiceOn){

            if(voiceOn)
                setTimeout(startListening,700);

            return;
        }


        message("ai",reply);


        /*
          ONLY VOICE MODE speaks.
        */

        await speak(reply);


        if(voiceOn){

            setTimeout(
                startListening,
                700
            );

        }

    };


    recognition.onerror=e=>{

        console.log(
            "Recognition:",
            e.error
        );

        recognition=null;
        starting=false;


        if(!voiceOn)return;


        if(
            e.error==="not-allowed"||
            e.error==="service-not-allowed"
        ){

            setVoice(
                "Microphone permission",
                "Allow microphone access"
            );

            return;

        }


        /*
          Ignore normal recognition errors
          and quietly try again.
        */

        setTimeout(
            startListening,
            1200
        );

    };


    recognition.onend=()=>{

        recognition=null;
        starting=false;


        if(
            voiceOn&&
            !speaking
        ){

            setTimeout(
                startListening,
                700
            );

        }

    };


    try{

        recognition.start();

    }catch(e){

        recognition=null;
        starting=false;

        setTimeout(
            startListening,
            1200
        );

    }

}


/* =========================
   STOP LISTENING
========================= */

function stopListening(){

    if(recognition){

        try{
            recognition.stop();
        }catch(e){}

    }

    recognition=null;
    starting=false;

}


/* =========================
   SPEAK
========================= */

function speak(text){

    return new Promise(resolve=>{

        if(
            !voiceOn||
            !("speechSynthesis" in window)
        ){

            resolve();
            return;
        }


        speechSynthesis.cancel();


        const clean=String(text)
            .replace(/[*#_`]/g,"")
            .trim();


        if(!clean){

            resolve();
            return;
        }


        const u=
            new SpeechSynthesisUtterance(clean);


        const voices=
            speechSynthesis.getVoices();


        const voice=
            voices.find(v=>
                /en-US|en-GB/i.test(v.lang)
            );


        if(voice)
            u.voice=voice;


        u.lang=
            voice?.lang||"en-US";

        u.rate=.92;
        u.pitch=1;
        u.volume=1;


        u.onstart=()=>{

            speaking=true;

            setVoice(
                "Speaking...",
                "KAIRO is talking"
            );

        };


        u.onend=()=>{

            speaking=false;

            resolve();

        };


        u.onerror=()=>{

            speaking=false;

            resolve();

        };


        speechSynthesis.speak(u);

    });

}


/* =========================
   OPEN VOICE
========================= */

function openVoice(){

    if(!voiceMode)return;


    voiceOn=true;


    voiceMode.classList.add("active");

    voiceMode.setAttribute(
        "aria-hidden",
        "false"
    );


    setVoice(
        "Listening...",
        "I'm listening"
    );


    stopListening();


    setTimeout(
        startListening,
        400
    );

}


/* =========================
   CLOSE VOICE
   Tap KAIRO bubble to return
========================= */

function closeVoice(){

    voiceOn=false;

    stopListening();


    if("speechSynthesis" in window)
        speechSynthesis.cancel();


    speaking=false;


    voiceMode?.classList.remove("active");

    voiceMode?.setAttribute(
        "aria-hidden",
        "true"
    );


    setVoice(
        "Ready",
        "Talk to KAIRO"
    );

}


/* =========================
   VOICE BUTTONS
========================= */

mic?.addEventListener(
    "click",
    openVoice
);

miniVoice?.addEventListener(
    "click",
    openVoice
);


/* =========================
   FLOATING KAIRO
========================= */

floating?.addEventListener(
    "click",
    ()=>{

        /*
          If Voice Mode is open,
          bubble works as BACK.
        */

        if(
            voiceMode?.classList.contains("active")
        ){

            closeVoice();

        }else{

            openVoice();

        }

    }
);


/* =========================
   AI CORE
   Tap core = BACK
========================= */

voiceLogo?.addEventListener(
    "click",
    closeVoice
);


/* =========================
   HISTORY
========================= */

historyButton?.addEventListener(
    "click",
    ()=>{

        historyPanel?.classList.add("active");
        historyBackdrop?.classList.add("active");

    }
);


historyBackdrop?.addEventListener(
    "click",
    ()=>{

        historyPanel?.classList.remove("active");
        historyBackdrop?.classList.remove("active");

    }
);


/* =========================
   BROWSER VOICES
========================= */

if("speechSynthesis" in window){

    speechSynthesis.onvoiceschanged=()=>{
        speechSynthesis.getVoices();
    };

}


/* =========================
   READY
========================= */

console.log("KAIRO READY");
