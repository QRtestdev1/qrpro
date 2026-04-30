import { useState, useMemo, useEffect } from "react";

const WORKER_URL = "https://qrpro-redirect.j-beelen.workers.dev";
const SUPA_URL = "https://emilkcrtidhfcpiadngo.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtaWxrY3J0aWRoZmNwaWFkbmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MzMwMDYsImV4cCI6MjA5MTMwOTAwNn0.0JyaFF5BC4dA0VVe80pmZOM9lNWNyzgtsJV6asqT3xI";
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
  "X-Client-Info": "qrpro-app"
};

async function signUp(email, password) {
  const res = await fetch(SUPA_URL + "/auth/v1/signup", {
    method: "POST",
    headers: { ...HEADERS },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function signIn(email, password) {
  const res = await fetch(SUPA_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { ...HEADERS },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

async function getQRCodes(userId) {
  const { data } = await supaFetch("/rest/v1/qr_codes?user_id=eq." + userId + "&order=created_at.desc&select=*");
  return data || [];
}

async function saveQRCode(userId, shortId, type, destUrl, name, userToken) {
  const authHeader = userToken || SUPA_KEY;
  const res = await fetch(SUPA_URL + "/rest/v1/qr_codes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPA_KEY,
      "Authorization": "Bearer " + authHeader,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ user_id: userId, short_id: shortId, type, destination_url: destUrl, name, active: true })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("saveQRCode failed:", res.status, err);
    return { error: err };
  }
  return { error: null };
}

async function updateQRUrl(id, newUrl) {
  await supaFetch("/rest/v1/qr_codes?id=eq." + id, {
    method: "PATCH",
    body: JSON.stringify({ destination_url: newUrl })
  });
}

async function toggleQRActive(id, active) {
  await supaFetch("/rest/v1/qr_codes?id=eq." + id, {
    method: "PATCH",
    body: JSON.stringify({ active })
  });
}

async function getScanStats(userId) {
  const { data } = await supaFetch("/rest/v1/scan_events?select=short_id,scanned_at,country,device&short_id=in.(select short_id from qr_codes where user_id=eq." + userId + ")");
  return data || [];
}
import { Globe, FileText, Link2, CreditCard, Briefcase, Play, Image, Share2, MessageCircle, Music, UtensilsCrossed, Smartphone, Tag, Wifi, Check, Download, Users, MousePointer, MapPin, TrendingUp, Edit3, ToggleLeft, ToggleRight, LogOut, Eye, EyeOff, Zap, RefreshCw, X, Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft, Upload, Clock, ArrowUp, ArrowDown } from "lucide-react";

const G="#22C55E", GL="#F0FDF4", GM="#16A34A";

// ── QR Display using qrcode library ──
function QRDisplay({value, color, size}) {
  const [svgData, setSvgData] = useState('');
  color = color || '#111827';
  size = size || 160;
  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    const generate = async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const svg = await QRCode.toString(value, {
          type: 'svg',
          color: { dark: color, light: '#ffffff' },
          width: size,
          margin: 1,
          errorCorrectionLevel: 'H'
        });
        if (!cancelled) setSvgData(svg);
      } catch(e) {
        console.error('QR generation error:', e);
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [value, color, size]);

  if (!svgData) return (
    <div style={{width:size,height:size,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:11,color:"#9CA3AF"}}>Generating...</span>
    </div>
  );
  return <div style={{lineHeight:0}} dangerouslySetInnerHTML={{__html:svgData}}/>;
}

async function buildQRSvg(value, color, size) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toString(value, {
    type: 'svg',
    color: { dark: color || '#111827', light: '#ffffff' },
    width: size || 512,
    margin: 1,
    errorCorrectionLevel: 'H'
  });
}

function dlPng(svgStr, fname) {
  try {
    const svg64 = btoa(unescape(encodeURIComponent(svgStr)));
    const dataUri = "data:image/svg+xml;base64," + svg64;
    const imgEl = document.createElement("img");
    imgEl.crossOrigin = "anonymous";
    imgEl.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(imgEl, 0, 0, 512, 512);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.download = fname;
        a.href = pngUrl;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      } catch(e) {
        triggerSvgDownload(svgStr, fname);
      }
    };
    imgEl.onerror = () => triggerSvgDownload(svgStr, fname);
    imgEl.src = dataUri;
  } catch(e) {
    triggerSvgDownload(svgStr, fname);
  }
}

function triggerSvgDownload(svgStr, fname) {
  const a = document.createElement("a");
  a.download = fname.replace(".png", ".svg");
  a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 100);
}

// ── Style constants ──
const inp = {width:"100%",boxSizing:"border-box",border:"1px solid #E5E7EB",borderRadius:8,padding:"9px 12px",fontSize:13,outline:"none",fontFamily:"inherit",background:"#fff",color:"#111"};
const cardS = {background:"#fff",borderRadius:14,border:"1px solid #E8EDE8",marginBottom:12,overflow:"hidden"};

// ── Primitives ──
function Field({label,required,hint,children}) {
  return (
    <div style={{marginBottom:14}}>
      {label && <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>{label}{required && <span style={{color:"#EF4444",marginLeft:2}}>*</span>}</label>}
      {children}
      {hint && <p style={{fontSize:11,color:"#9CA3AF",marginTop:3}}>{hint}</p>}
    </div>
  );
}

function FInput({label,required,placeholder,value,onChange,type,hint,prefix}) {
  type = type||"text";
  return (
    <Field label={label} required={required} hint={hint}>
      <div style={{display:"flex",alignItems:"center",border:"1px solid #E5E7EB",borderRadius:8,overflow:"hidden",background:"#fff"}}
        onFocus={e=>e.currentTarget.style.borderColor=G} onBlur={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
        {prefix && <span style={{padding:"9px 10px",color:"#9CA3AF",fontSize:13,borderRight:"1px solid #E5E7EB",background:"#F9FAFB",whiteSpace:"nowrap"}}>{prefix}</span>}
        <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{...inp,border:"none",borderRadius:0,flex:1,outline:"none"}}/>
      </div>
    </Field>
  );
}

function FTextarea({label,required,placeholder,value,onChange,rows,maxLen}) {
  rows=rows||3; maxLen=maxLen===undefined?4000:maxLen;
  return (
    <Field label={label} required={required}>
      <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{...inp,resize:"vertical",minHeight:rows*28}}
        onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor="#E5E7EB"}/>
      {maxLen>0 && <p style={{fontSize:11,color:"#9CA3AF",textAlign:"right",marginTop:2}}>{(value||"").length} / {maxLen}</p>}
    </Field>
  );
}

function FSelect({label,value,onChange,options}) {
  return (
    <Field label={label}>
      <select value={value||""} onChange={e=>onChange(e.target.value)}
        style={{...inp,appearance:"none",paddingRight:30}}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function Toggle({label,checked,onChange}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <button onClick={()=>onChange(!checked)}
        style={{width:40,height:22,borderRadius:999,background:checked?G:"#E5E7EB",border:"none",cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
        <div style={{position:"absolute",width:18,height:18,borderRadius:"50%",background:"#fff",top:2,left:checked?20:2,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
      </button>
      <span style={{fontSize:12,color:"#374151"}}>{label}</span>
    </div>
  );
}

function Checkbox({label,checked,onChange}) {
  return (
    <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#6B7280",cursor:"pointer",marginBottom:8}}>
      <div onClick={()=>onChange(!checked)}
        style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(checked?G:"#D1D5DB"),background:checked?G:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
        {checked && <Check size={10} color="#fff"/>}
      </div>
      {label}
    </label>
  );
}

function Accordion({iconEl,title,subtitle,required,defaultOpen,children}) {
  defaultOpen = defaultOpen===undefined?true:defaultOpen;
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div style={cardS}>
      <button onClick={()=>setOpen(!open)}
        style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
        <div style={{width:32,height:32,borderRadius:8,background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {iconEl || <span style={{fontSize:14}}>☰</span>}
        </div>
        <div style={{flex:1}}>
          <p style={{fontSize:13,fontWeight:700,color:"#111",margin:0}}>{title}{required && <span style={{color:"#EF4444",marginLeft:2}}>*</span>}</p>
          <p style={{fontSize:11,color:"#9CA3AF",margin:0,marginTop:1}}>{subtitle}</p>
        </div>
        {open ? <ChevronDown size={16} color="#9CA3AF"/> : <ChevronRight size={16} color="#9CA3AF"/>}
      </button>
      {open && <div style={{padding:"0 16px 16px"}}>{children}</div>}
    </div>
  );
}

function AccRow({title,subtitle,iconEl}) {
  return (
    <div style={{...cardS,cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px"}}>
        <div style={{width:32,height:32,borderRadius:8,background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {iconEl || <span style={{fontSize:13}}>☰</span>}
        </div>
        <div style={{flex:1}}>
          <p style={{fontSize:13,fontWeight:700,color:"#111",margin:0}}>{title}</p>
          <p style={{fontSize:11,color:"#9CA3AF",margin:0,marginTop:1}}>{subtitle}</p>
        </div>
        <ChevronRight size={16} color="#9CA3AF"/>
      </div>
    </div>
  );
}

function UploadZone({label,maxSize}) {
  return (
    <div style={{border:"1.5px dashed #86EFAC",borderRadius:10,background:GL,padding:"24px 16px",textAlign:"center",cursor:"pointer",marginBottom:10}}>
      <div style={{width:40,height:40,borderRadius:"50%",background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
        <Upload size={18} color={GM}/>
      </div>
      <button style={{background:G,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:6}}>{label}</button>
      <p style={{fontSize:11,color:"#9CA3AF",margin:0}}>Maximum size: {maxSize}</p>
    </div>
  );
}

function ImgBox({size}) {
  size=size||64;
  return (
    <div style={{width:size,height:size,border:"1.5px dashed #86EFAC",borderRadius:8,background:GL,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",marginBottom:12}}>
      <Image size={Math.round(size*0.35)} color={G}/>
    </div>
  );
}

function AddBtn({label,onClick}) {
  return (
    <button onClick={onClick}
      style={{width:"100%",border:"1.5px solid "+G,borderRadius:8,padding:"10px",fontSize:13,fontWeight:600,color:G,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:8}}>
      <Plus size={14}/>{label}
    </button>
  );
}

function PlusRow({label}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",border:"1px solid #E5E7EB",borderRadius:8,marginBottom:8,background:"#fff",cursor:"pointer"}}>
      <span style={{fontSize:13,color:"#374151",fontWeight:500}}>{label}</span>
      <div style={{width:24,height:24,borderRadius:6,background:G,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Plus size={14} color="#fff"/>
      </div>
    </div>
  );
}

function CommonBottom() {
  return (
    <div>
      <AccRow iconEl={<span style={{fontSize:12,fontWeight:700}}>T</span>} title="Fonts" subtitle="Make your page unique with original fonts."/>
      <AccRow iconEl={<span style={{fontSize:14}}>🙂</span>} title="Welcome Screen" subtitle="Display an image while your page loads."/>
    </div>
  );
}
function QRNamePassword({d,s}) {
  return (
    <div>
      <Accordion iconEl={<span style={{fontSize:12}}>⊞</span>} title="Name of the QR Code" subtitle="Give a name to your QR code." defaultOpen={false}>
        <FInput label="QR Code name" placeholder="E.g. My Website QR" value={d.qrName} onChange={v=>s({...d,qrName:v})}/>
      </Accordion>
      <Accordion iconEl={<span style={{fontSize:13}}>🔒</span>} title="Password" subtitle="Protect your QR code with a password." defaultOpen={false}>
        <FInput label="Password" type="password" placeholder="Enter a password" value={d.qrPassword} onChange={v=>s({...d,qrPassword:v})}/>
        <p style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>Users will need this password to view the QR code destination.</p>
      </Accordion>
    </div>
  );
}

// ── Color Palette (functional) ──
const PRESETS=[["#527AC9","#7EC09F"],["#fff","#222"],["#a8d4f5","#2563EB"],["#c4b5fd","#1e1b4b"],["#4ade80","#14532d"],["#fde68a","#92400e"]];

function ColorPalette({primary,secondary,onChange}) {
  const [picker,setPicker]=useState(null);
  primary=primary||"#527AC9"; secondary=secondary||"#7EC09F";
  return (
    <div style={{marginBottom:16}}>
      <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:8}}>Color palette</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
        {PRESETS.map((pr,i) => (
          <button key={i} onClick={()=>onChange(pr[0],pr[1])}
            style={{width:56,height:28,borderRadius:6,border:(primary===pr[0]&&secondary===pr[1])?"2.5px solid "+G:"2px solid #E5E7EB",cursor:"pointer",padding:0,overflow:"hidden",display:"flex"}}>
            <div style={{flex:1,background:pr[0]}}/>
            <div style={{flex:1,background:pr[1]}}/>
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"end"}}>
        <div>
          <label style={{fontSize:11,color:"#9CA3AF",display:"block",marginBottom:4}}>Primary color</label>
          <div style={{display:"flex",alignItems:"center",gap:6,border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 10px",background:"#fff",cursor:"pointer"}} onClick={()=>setPicker(picker==="p"?null:"p")}>
            <div style={{width:18,height:18,borderRadius:4,background:primary,border:"1px solid #E5E7EB"}}/>
            <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{primary.toUpperCase()}</span>
          </div>
          {picker==="p" && <input type="color" value={primary} onChange={e=>onChange(e.target.value,secondary)} style={{width:"100%",height:36,border:"none",borderRadius:8,cursor:"pointer",marginTop:4}}/>}
        </div>
        <button onClick={()=>onChange(secondary,primary)}
          style={{width:32,height:32,borderRadius:"50%",border:"1.5px solid "+G,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2}}>
          <RefreshCw size={13} color={G}/>
        </button>
        <div>
          <label style={{fontSize:11,color:"#9CA3AF",display:"block",marginBottom:4}}>Secondary color</label>
          <div style={{display:"flex",alignItems:"center",gap:6,border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 10px",background:"#fff",cursor:"pointer"}} onClick={()=>setPicker(picker==="s"?null:"s")}>
            <div style={{width:18,height:18,borderRadius:4,background:secondary,border:"1px solid #E5E7EB"}}/>
            <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{secondary.toUpperCase()}</span>
          </div>
          {picker==="s" && <input type="color" value={secondary} onChange={e=>onChange(primary,e.target.value)} style={{width:"100%",height:36,border:"none",borderRadius:8,cursor:"pointer",marginTop:4}}/>}
        </div>
      </div>
    </div>
  );
}

// ── Opening Hours ──
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
function OpeningHours({hours,onChange}) {
  hours=hours||{};
  return (
    <div>
      {DAYS.map(d => {
        const en=hours[d]&&hours[d].enabled;
        return (
          <div key={d} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div onClick={()=>{const h={...hours};h[d]={...h[d],enabled:!en};onChange(h);}}
              style={{width:18,height:18,borderRadius:4,border:"1.5px solid "+(en?G:"#D1D5DB"),background:en?G:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
              {en && <Check size={11} color="#fff"/>}
            </div>
            <span style={{fontSize:12,color:"#374151",width:76,flexShrink:0}}>{d}</span>
            <div style={{display:"flex",alignItems:"center",gap:6,flex:1,opacity:en?1:0.35}}>
              <input type="time" value={(hours[d]&&hours[d].from)||""} onChange={e=>{const h={...hours};h[d]={...h[d],from:e.target.value};onChange(h);}} disabled={!en}
                style={{...inp,flex:1,fontSize:11,padding:"6px 8px"}}/>
              <span style={{fontSize:11,color:"#9CA3AF",flexShrink:0}}>to</span>
              <input type="time" value={(hours[d]&&hours[d].to)||""} onChange={e=>{const h={...hours};h[d]={...h[d],to:e.target.value};onChange(h);}} disabled={!en}
                style={{...inp,flex:1,fontSize:11,padding:"6px 8px"}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Social Networks ──
const SNETS=[{id:"facebook",icon:"f",label:"Facebook",color:"#1877F2"},{id:"instagram",icon:"📷",label:"Instagram",color:"#E1306C"},{id:"tiktok",icon:"♪",label:"TikTok",color:"#000"},{id:"youtube",icon:"▶",label:"YouTube",color:"#FF0000"},{id:"twitter",icon:"𝕏",label:"X",color:"#000"},{id:"linkedin",icon:"in",label:"LinkedIn",color:"#0A66C2"},{id:"whatsapp",icon:"W",label:"WhatsApp",color:"#25D366"},{id:"pinterest",icon:"P",label:"Pinterest",color:"#E60023"},{id:"telegram",icon:"✈",label:"Telegram",color:"#26A5E4"},{id:"spotify",icon:"♫",label:"Spotify",color:"#1DB954"},{id:"reddit",icon:"R",label:"Reddit",color:"#FF4500"},{id:"website",icon:"🌐",label:"Website",color:"#374151"}];

function SocialNetworks({nets,onChange}) {
  nets=nets||{};
  const [exp,setExp]=useState(null);
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
        {SNETS.map(n => {
          const on=nets[n.id]!==undefined;
          return (
            <button key={n.id} onClick={()=>{setExp(exp===n.id?null:n.id);if(!on){const nn={...nets};nn[n.id]="";onChange(nn);}}}
              style={{width:34,height:34,borderRadius:"50%",background:on?(n.color||"#374151"):"#F3F4F6",border:on?"2px solid "+(n.color||"#374151"):"2px solid transparent",cursor:"pointer",fontSize:11,fontWeight:700,color:on?"#fff":"#374151",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {n.icon}
            </button>
          );
        })}
      </div>
      {SNETS.filter(n=>n.id===exp&&nets[n.id]!==undefined).map(n => (
        <div key={n.id} style={{background:"#F9FAFB",borderRadius:8,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>{n.label} URL</label>
            <button onClick={()=>{const nn={...nets};delete nn[n.id];onChange(nn);setExp(null);}} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444"}}>
              <X size={13}/>
            </button>
          </div>
          <input value={nets[n.id]||""} onChange={e=>{const nn={...nets};nn[n.id]=e.target.value;onChange(nn);}}
            placeholder={"https://"+n.label.toLowerCase()+".com/..."} style={inp}/>
        </div>
      ))}
    </div>
  );
}

// ── Phone Preview ──
function PhonePreview({type,data,qrColor,qrValue,shortId}) {
  const [tab,setTab]=useState("preview");
  const primary=(data&&data.primary)||"#527AC9";
  const secondary=(data&&data.secondary)||"#7EC09F";
  const qrSvg=useMemo(()=>buildQRSvg(qrValue||"https://qrpro.app",qrColor,160),[qrValue,qrColor]);

  function renderContent() {
    if (tab==="qr") {
      return (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:"1rem"}}>
          <p style={{fontSize:10,color:"#9CA3AF",marginBottom:8}}>Your QR Code</p>
          <div style={{background:"#fff",padding:8,borderRadius:8,border:"1px solid #E5E7EB"}} dangerouslySetInnerHTML={{__html:qrSvg}}/>
          <p style={{fontSize:8,color:"#9CA3AF",marginTop:8,fontFamily:"monospace"}}>qr.pro/{shortId}</p>
        </div>
      );
    }
    if (!type) {
      return (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:"1rem"}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12}}><Zap size={24} color={G}/></div>
          <p style={{fontSize:12,fontWeight:700,color:"#111",marginBottom:6}}>QRPro</p>
          <p style={{fontSize:10,color:"#9CA3AF",lineHeight:1.5,textAlign:"center"}}>Select a QR type to see your live preview</p>
        </div>
      );
    }
    const d=data||{};
    if (type==="website") return (
      <div style={{height:"100%",background:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{background:primary,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
          <Globe size={12} color="#fff"/>
          <span style={{fontSize:9,color:"#fff",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.url||"https://yourwebsite.com"}</span>
        </div>
        <div style={{flex:1,background:"#f3f4f6",display:"flex",flexDirection:"column",gap:8,padding:"12px 10px"}}>
          <div style={{height:80,background:"#E5E7EB",borderRadius:6}}/>
          <div style={{height:8,background:"#E5E7EB",borderRadius:4,width:"90%"}}/>
          <div style={{height:8,background:"#E5E7EB",borderRadius:4,width:"75%"}}/>
          <div style={{height:8,background:"#E5E7EB",borderRadius:4,width:"60%"}}/>
          <div style={{height:28,background:"#E5E7EB",borderRadius:6,marginTop:8}}/>
        </div>
      </div>
    );
    if (type==="whatsapp") return (
      <div style={{height:"100%",display:"flex",flexDirection:"column",background:"#ECE5DD"}}>
        <div style={{background:"#075E54",padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10}}>👤</span></div>
          <span style={{fontSize:10,color:"#fff",fontWeight:600}}>{d.phone||"+123 456 789"}</span>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:"12px 10px"}}>
          <div style={{background:"#DCF8C6",borderRadius:"10px 0 10px 10px",padding:"6px 10px",maxWidth:"80%"}}>
            <p style={{fontSize:9,color:"#111",margin:0}}>{d.message||"Type a message."}</p>
            <p style={{fontSize:7,color:"#9CA3AF",margin:"3px 0 0",textAlign:"right"}}>✓✓</p>
          </div>
        </div>
        <div style={{background:"#fff",padding:"6px 10px",display:"flex",alignItems:"center",gap:6}}>
          <div style={{flex:1,background:"#F3F4F6",borderRadius:999,padding:"6px 10px"}}><span style={{fontSize:9,color:"#9CA3AF"}}>Message</span></div>
          <div style={{width:28,height:28,borderRadius:"50%",background:"#25D366",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12}}>🎤</span></div>
        </div>
      </div>
    );
    if (type==="wifi") return (
      <div style={{height:"100%",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
        <div style={{width:"100%",background:primary,borderRadius:10,padding:"16px 12px",textAlign:"center",marginBottom:12}}>
          <Wifi size={40} color="rgba(255,255,255,0.4)" style={{display:"block",margin:"0 auto"}}/>
        </div>
        <p style={{fontSize:11,fontWeight:700,color:"#111",marginBottom:16,textAlign:"center"}}>Join the "{d.ssid||"Wi-Fi Name"}" Wi-fi network?</p>
        <button style={{width:"100%",background:primary,color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:11,fontWeight:700,marginBottom:8,cursor:"default"}}>Connect</button>
        <button style={{width:"100%",background:"#fff",color:primary,border:"1px solid "+primary,borderRadius:8,padding:"10px",fontSize:11,fontWeight:600,cursor:"default"}}>Close</button>
      </div>
    );
    if (type==="vcard") return (
      <div style={{height:"100%",background:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{background:primary,padding:"20px 12px",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:"50%",background:secondary,margin:"0 auto 8px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:20}}>👤</span></div>
          <p style={{fontSize:12,fontWeight:700,color:"#fff",margin:0}}>{[d.name,d.surname].filter(Boolean).join(" ")||"Your Name"}</p>
          <p style={{fontSize:9,color:"rgba(255,255,255,0.8)",margin:"2px 0 0"}}>{d.profession||"Job Title"}</p>
        </div>
        <div style={{padding:"10px 12px",flex:1}}>
          {d.company&&<p style={{fontSize:10,color:"#6B7280",margin:"0 0 4px"}}>🏢 {d.company}</p>}
          <p style={{fontSize:9,color:"#374151",margin:0,lineHeight:1.5}}>{d.summary||"Your bio will appear here."}</p>
        </div>
      </div>
    );
    if (type==="coupon") return (
      <div style={{height:"100%",background:primary,display:"flex",flexDirection:"column",padding:"12px"}}>
        <p style={{fontSize:10,color:"#fff",fontWeight:700,margin:"0 0 8px",textAlign:"center"}}>{d.company||"Your Store"}</p>
        <div style={{background:"#fff",borderRadius:10,padding:"12px",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          {d.badge&&<div style={{background:secondary,fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:999,marginBottom:8}}>{d.badge}</div>}
          <p style={{fontSize:14,fontWeight:800,color:"#111",margin:"0 0 4px",textAlign:"center"}}>{d.title||"Your Offer"}</p>
          <p style={{fontSize:9,color:"#9CA3AF",margin:"0 0 10px",textAlign:"center"}}>{d.desc||"Description"}</p>
          <div style={{width:"100%",borderTop:"2px dashed #E5E7EB",margin:"6px 0"}}/>
          <button style={{background:secondary,color:"#111",border:"none",borderRadius:8,padding:"8px 16px",fontSize:10,fontWeight:700,cursor:"default",width:"100%"}}>{d.btnLabel||"GET COUPON"}</button>
        </div>
      </div>
    );
    if (type==="instagram") return (
      <div style={{height:"100%",background:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"8px 12px",borderBottom:"1px solid #E5E7EB"}}><span style={{fontSize:10,fontWeight:700,color:"#111"}}>@{d.username||"username"}</span></div>
        <div style={{padding:"12px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:14}}>👤</span></div>
          </div>
          <div style={{display:"flex",gap:14,flex:1,justifyContent:"center"}}>
            {["Posts","Following","Followers"].map((l,i)=>(
              <div key={l} style={{textAlign:"center"}}>
                <p style={{fontSize:11,fontWeight:700,color:"#111",margin:0}}>{["1","3","0"][i]}</p>
                <p style={{fontSize:8,color:"#9CA3AF",margin:0}}>{l}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,padding:"0 2px"}}>
          {[0,1,2,3,4,5].map(i=><div key={i} style={{aspectRatio:"1",background:"#F3F4F6"}}/>)}
        </div>
      </div>
    );
    if (type==="facebook") return (
      <div style={{height:"100%",background:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{height:60,background:primary}}/>
        <div style={{padding:"0 12px 12px",textAlign:"center"}}>
          <div style={{width:50,height:50,borderRadius:"50%",background:"#1877F2",border:"3px solid #fff",margin:"-25px auto 8px",display:"flex",alignItems:"center",justifyContent:"center"}}><Facebook size={24} color="#fff"/></div>
          <p style={{fontSize:11,fontWeight:700,color:"#111",margin:"0 0 2px"}}>{d.title||"Your Facebook Page"}</p>
          <p style={{fontSize:9,color:"#9CA3AF",margin:"0 0 8px"}}>{d.desc||"Description"}</p>
          <button style={{background:"#1877F2",color:"#fff",border:"none",borderRadius:8,padding:"7px",fontSize:10,fontWeight:600,cursor:"default",width:"100%"}}>Go to our Facebook page</button>
        </div>
      </div>
    );
    if (type==="pdf") return (
      <div style={{height:"100%",background:primary,display:"flex",flexDirection:"column",padding:"12px 10px"}}>
        <p style={{fontSize:9,color:"rgba(255,255,255,0.9)",margin:"0 0 4px",textAlign:"center"}}>{d.company||"Enterprise Inc."}</p>
        <p style={{fontSize:13,fontWeight:800,color:"#fff",margin:"0 0 6px",textAlign:"center"}}>{d.title||"Annual Report"}</p>
        <p style={{fontSize:8,color:"rgba(255,255,255,0.8)",margin:"0 0 10px",textAlign:"center",lineHeight:1.4}}>{d.desc||"Description of your PDF"}</p>
        <div style={{background:"#F3F4F6",borderRadius:6,flex:1,margin:"0 0 10px"}}/>
        <button style={{width:"100%",background:secondary,color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:10,fontWeight:700,cursor:"default"}}>{d.button||"View PDF"}</button>
      </div>
    );
    if (type==="menu") return (
      <div style={{height:"100%",background:primary,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"12px",textAlign:"center"}}>
          <p style={{fontSize:11,fontWeight:800,color:"#fff",margin:0}}>{d.name||"Restaurant Name"}</p>
          <p style={{fontSize:8,color:"rgba(255,255,255,0.8)",margin:"2px 0 0"}}>{d.desc||"Fresh, local food."}</p>
        </div>
        <div style={{flex:1,background:"#fff",borderRadius:"12px 12px 0 0",padding:"12px 10px"}}>
          {((d.sections&&d.sections.length>0)?d.sections:[{name:"Starters"},{name:"Mains"},{name:"Drinks"}]).slice(0,4).map((sec,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F3F4F6"}}>
              <span style={{fontSize:10,fontWeight:600,color:"#111"}}>{sec.name||"Section"}</span>
              <ChevronRight size={12} color="#9CA3AF"/>
            </div>
          ))}
        </div>
      </div>
    );
    if (type==="mp3") return (
      <div style={{height:"100%",background:primary,display:"flex",flexDirection:"column"}}>
        <div style={{height:80,background:secondary,borderRadius:"0 0 12px 12px",margin:"0 0 10px"}}/>
        <div style={{padding:"0 12px",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <p style={{fontSize:12,fontWeight:700,color:"#fff",margin:"0 0 2px",textAlign:"center"}}>{d.title||"Track Title"}</p>
          <p style={{fontSize:9,color:"rgba(255,255,255,0.7)",margin:"0 0 12px"}}>{d.artist||"Artist"}</p>
          <div style={{width:"100%",height:4,background:"rgba(255,255,255,0.3)",borderRadius:99,marginBottom:12,position:"relative"}}>
            <div style={{width:"30%",height:"100%",background:"#fff",borderRadius:99}}/>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            {["⏮","⏪","▶","⏩","⏭"].map((c,i)=><span key={i} style={{fontSize:i===2?20:14,color:"#fff",cursor:"default"}}>{c}</span>)}
          </div>
        </div>
      </div>
    );
    // default preview
    return (
      <div style={{height:"100%",background:primary,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
        <p style={{fontSize:11,fontWeight:700,color:"#fff",textAlign:"center"}}>{d.name||d.title||d.company||"Fill in the form"}</p>
        <p style={{fontSize:9,color:"rgba(255,255,255,0.7)",textAlign:"center",marginTop:4}}>{type}</p>
      </div>
    );
  }

  return (
    <div style={{position:"sticky",top:"5rem",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{display:"flex",gap:4,marginBottom:10,background:"#fff",borderRadius:999,padding:3,border:"1.5px solid "+G}}>
        {["preview","qr"].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{fontSize:11,fontWeight:600,padding:"4px 14px",borderRadius:999,border:"none",background:tab===t?G:"transparent",color:tab===t?"#fff":"#9CA3AF",cursor:"pointer"}}>
            {t==="preview"?"Preview":"QR code"}
          </button>
        ))}
      </div>
      <div style={{width:200,height:400,background:"#1a1a2e",borderRadius:32,padding:"0.5rem",border:"2px solid #2d2d44",position:"relative",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",width:52,height:6,background:"#2d2d44",borderRadius:4}}/>
        <div style={{background:"#fff",borderRadius:26,height:"100%",overflow:"hidden"}}>
          {renderContent()}
        </div>
      </div>
      <p style={{fontSize:9,color:"#9CA3AF",marginTop:8,fontFamily:"monospace"}}>qr.pro/{shortId}</p>
    </div>
  );
}

// ── Config panels ──
function CWebsite({d,s}) {
  return (
    <div>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Website Information" subtitle="Input the URL this QR will redirect to." required>
        <FInput label="Website URL" required placeholder="E.g. https://www.mywebsite.com/" value={d.url} onChange={v=>s({...d,url:v})}/>
      </Accordion>
      <QRNamePassword d={d} s={s}/>
    </div>
  );
}
function CPDF({d,s}) {
  return (
    <div>
      <Accordion iconEl={<FileText size={16} color="#6B7280"/>} title="PDF File" subtitle="Upload the PDF file you want to display." required>
        <UploadZone label="Upload PDF" maxSize="100MB"/>
        <Checkbox label="Directly show the PDF file." checked={d.direct||false} onChange={v=>s({...d,direct:v})}/>
      </Accordion>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="PDF Information" subtitle="Add some context to your PDF.">
        <FInput label="Company" placeholder="E.g. My Firm" value={d.company} onChange={v=>s({...d,company:v})}/>
        <FInput label="PDF title" placeholder="E.g. Annual Report" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Description" placeholder="E.g. My Firm's Annual Report" value={d.desc} onChange={v=>s({...d,desc:v})}/>
        <FInput label="Website" placeholder="E.g. https://www.myfirm.com/" value={d.website} onChange={v=>s({...d,website:v})}/>
        <FInput label="Button" placeholder="E.g. View pdf" value={d.button} onChange={v=>s({...d,button:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CLinks({d,s}) {
  const links=d.links||[];
  const upd=(i,k,v)=>{const l=[...links];l[i]={...l[i],[k]:v};s({...d,links:l});};
  const move=(i,dir)=>{const l=[...links];const t=l[i];l[i]=l[i+dir];l[i+dir]=t;s({...d,links:l});};
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Basic Information" subtitle="Add a headline and short description." required>
        <ImgBox/>
        <FInput label="Title" required placeholder="E.g. Find me on social networks" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Description" placeholder="E.g. New content every week" value={d.desc} onChange={v=>s({...d,desc:v})}/>
      </Accordion>
      <Accordion iconEl={<Link2 size={16} color="#6B7280"/>} title="List of Links" subtitle="Add your profiles or links.">
        {links.map((l,i)=>(
          <div key={i} style={{border:"1px solid #E5E7EB",borderRadius:8,padding:12,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>Link {i+1}</span>
              <div style={{display:"flex",gap:4}}>
                {i>0&&<button onClick={()=>move(i,-1)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF"}}><ArrowUp size={13}/></button>}
                {i<links.length-1&&<button onClick={()=>move(i,1)} style={{background:"none",border:"none",cursor:"pointer",color:"#9CA3AF"}}><ArrowDown size={13}/></button>}
                <button onClick={()=>s({...d,links:links.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444"}}><Trash2 size={13}/></button>
              </div>
            </div>
            <ImgBox size={48}/>
            <FInput label="Link text" placeholder="Name of the link" value={l.text} onChange={v=>upd(i,"text",v)}/>
            <FInput label="URL" placeholder="E.g. https://mywebsite.com/" value={l.url} onChange={v=>upd(i,"url",v)}/>
          </div>
        ))}
        <AddBtn label="Add Link" onClick={()=>s({...d,links:[...links,{text:"",url:""}]})}/>
      </Accordion>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Social Networks" subtitle="Add social media links to your page.">
        <SocialNetworks nets={d.nets||{}} onChange={v=>s({...d,nets:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CVCard({d,s}) {
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<CreditCard size={16} color="#6B7280"/>} title="Personal Information" subtitle="Fill in your information." required>
        <ImgBox/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FInput label="Name" required placeholder="E.g. John" value={d.name} onChange={v=>s({...d,name:v})}/>
          <FInput label="Surname" placeholder="E.g. Carlson" value={d.surname} onChange={v=>s({...d,surname:v})}/>
        </div>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Contact Details" subtitle="Provide the contact information you want to display.">
        <PlusRow label="Add Phone"/>
        <PlusRow label="Add Email"/>
        <PlusRow label="Add Website"/>
        <Checkbox label='"Add contact" at the top.' checked={d.addContact||false} onChange={v=>s({...d,addContact:v})}/>
      </Accordion>
      <Accordion iconEl={<MapPin size={16} color="#6B7280"/>} title="Location" subtitle="Provide your address and location information.">
        <div style={{display:"flex",gap:8}}>
          <input placeholder="Search here" style={{...inp,flex:1}} value={d.location||""} onChange={e=>s({...d,location:e.target.value})}/>
          <button style={{background:"none",border:"1px solid "+G,color:G,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Manual entry</button>
        </div>
      </Accordion>
      <Accordion iconEl={<Briefcase size={16} color="#6B7280"/>} title="Company Details" subtitle="Add more information about the business you are part of.">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FInput label="Company" placeholder="E.g. Firm ABC" value={d.company} onChange={v=>s({...d,company:v})}/>
          <FInput label="Profession" placeholder="E.g. Account manager" value={d.profession} onChange={v=>s({...d,profession:v})}/>
        </div>
        <FTextarea label="Summary" placeholder="As an account manager, I thrive on building lasting..." value={d.summary} onChange={v=>s({...d,summary:v})}/>
      </Accordion>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Social Networks" subtitle="Add social media links to your page.">
        <SocialNetworks nets={d.nets||{}} onChange={v=>s({...d,nets:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CBusiness({d,s}) {
  const FACS=["Wi-Fi","Seating","Accessible","Restroom","Child-friendly","Pet-friendly","Parking","Public transport","Taxi","Lodging","Coffee","Bar","Restaurant","Gym","Outdoor terrace"];
  const FICONS=["📶","🪑","♿","🚻","👶","🐾","🅿️","🚌","🚕","🛏","☕","🍸","🍽","💪","🌿"];
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<Briefcase size={16} color="#6B7280"/>} title="Business Information" subtitle="Introduce your business or organization." required>
        <ImgBox/>
        <FInput label="Company" required placeholder="E.g. My Company" value={d.company} onChange={v=>s({...d,company:v})}/>
        <FInput label="Title" placeholder="E.g. Clothing store" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FInput label="Subtitle" placeholder="E.g. Selling clothes for over 15 years" value={d.subtitle} onChange={v=>s({...d,subtitle:v})}/>
        <AddBtn label="Add Button" onClick={()=>{}}/>
      </Accordion>
      <Accordion iconEl={<Clock size={16} color="#6B7280"/>} title="Opening Hours" subtitle="Business hours for each day of the week.">
        <OpeningHours hours={d.hours||{}} onChange={v=>s({...d,hours:v})}/>
      </Accordion>
      <Accordion iconEl={<MapPin size={16} color="#6B7280"/>} title="Location" subtitle="Provide your address and location information.">
        <div style={{display:"flex",gap:8}}>
          <input placeholder="Search here" style={{...inp,flex:1}} value={d.address||""} onChange={e=>s({...d,address:e.target.value})}/>
          <button style={{background:"none",border:"1px solid "+G,color:G,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Manual entry</button>
        </div>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Contact Information" subtitle="Provide contact information.">
        <FInput label="Contact Name" placeholder="E.g. Robert Junior" value={d.contact} onChange={v=>s({...d,contact:v})}/>
        <PlusRow label="Add Phone"/>
        <PlusRow label="Add Email"/>
        <PlusRow label="Add Website"/>
      </Accordion>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Social Networks" subtitle="Add social media links to your page.">
        <SocialNetworks nets={d.nets||{}} onChange={v=>s({...d,nets:v})}/>
      </Accordion>
      <Accordion iconEl={<span>🏢</span>} title="About Company" subtitle="Add more information about your business.">
        <FTextarea placeholder="E.g. Los Angeles based clothing store selling innovative designs for over 15 years" value={d.about} onChange={v=>s({...d,about:v})}/>
      </Accordion>
      <Accordion iconEl={<span>⊞</span>} title="Facilities" subtitle="Choose amenities available at your venue.">
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
          {FACS.map((f,i) => {
            const on=(d.facs||{})[f];
            return (
              <button key={f} onClick={()=>s({...d,facs:{...(d.facs||{}),[f]:!on}})}
                style={{background:on?GL:"#F9FAFB",border:"1px solid "+(on?G:"#E5E7EB"),borderRadius:10,padding:"8px 4px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:14,marginBottom:3}}>{FICONS[i]}</div>
                <p style={{fontSize:9,color:on?GM:"#9CA3AF",margin:0,lineHeight:1.3}}>{f}</p>
              </button>
            );
          })}
        </div>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CVideo({d,s}) {
  return (
    <div>
      <Accordion iconEl={<Play size={16} color="#6B7280"/>} title="Video" subtitle="Add one or more videos to your page." required>
        <Field label="Video URL">
          <div style={{display:"flex",gap:8}}>
            <input placeholder="https://www.youtube.com/watch..." style={{...inp,flex:1}} value={d.url||""} onChange={e=>s({...d,url:e.target.value})}/>
            <button style={{background:G,color:"#fff",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add video</button>
          </div>
        </Field>
        <UploadZone label="Upload video(s)" maxSize="250MB"/>
        <Checkbox label="Show the video directly" checked={d.direct||false} onChange={v=>s({...d,direct:v})}/>
      </Accordion>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Video Information" subtitle="Add some context to your video page.">
        <FInput label="Company" placeholder="E.g. My Company" value={d.company} onChange={v=>s({...d,company:v})}/>
        <FInput label="Video Title" placeholder="E.g. My Video" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Description" placeholder="E.g. Here is a video about..." value={d.desc} onChange={v=>s({...d,desc:v})}/>
        <AddBtn label="Add Button" onClick={()=>{}}/>
      </Accordion>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Social Networks" subtitle="Add social media links to your page.">
        <SocialNetworks nets={d.nets||{}} onChange={v=>s({...d,nets:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CImages({d,s}) {
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<Image size={16} color="#6B7280"/>} title="Image" subtitle="Upload or drag and drop images." required>
        <UploadZone label="Upload Images" maxSize="10MB"/>
        <Checkbox label="Vertical images" checked={d.vertical||false} onChange={v=>s({...d,vertical:v})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Image Information" subtitle="Add some context to your image gallery.">
        <FInput label="Gallery title" placeholder="E.g. My gallery" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Gallery description" placeholder="E.g. Summer Pictures" value={d.desc} onChange={v=>s({...d,desc:v})}/>
        <FInput label="Website" placeholder="E.g. https://www.mypictures.com/" value={d.website} onChange={v=>s({...d,website:v})}/>
        <AddBtn label="Add Button" onClick={()=>{}}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CFacebook({d,s}) {
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <Field label="Background Color">
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            {["#FFFFFF","#2563EB","#22C55E","#a5f3fc"].map(c=>(
              <button key={c} onClick={()=>s({...d,primary:c})}
                style={{flex:1,height:32,borderRadius:6,background:c,border:"1.5px solid "+(d.primary===c?G:"#E5E7EB"),cursor:"pointer"}}/>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 10px",background:"#fff"}}>
            <div style={{width:18,height:18,borderRadius:4,background:d.primary||"#FFFFFF",border:"1px solid #E5E7EB"}}/>
            <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{(d.primary||"#FFFFFF").toUpperCase()}</span>
            <input type="color" value={d.primary||"#ffffff"} onChange={e=>s({...d,primary:e.target.value})} style={{width:24,height:24,border:"none",borderRadius:4,cursor:"pointer",padding:0,marginLeft:"auto"}}/>
          </div>
        </Field>
      </Accordion>
      <Accordion iconEl={<span style={{fontSize:14}}>f</span>} title="Basic Information" subtitle="Provide information about your Facebook page.">
        <FInput label="Facebook URL" required placeholder="https://facebook.com/yourpage" value={d.url} onChange={v=>s({...d,url:v})}/>
        <FInput label="Title" placeholder="E.g. My Facebook page" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Description" placeholder="E.g. Click on the Like button below..." value={d.desc} onChange={v=>s({...d,desc:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CInstagram({d,s}) {
  return (
    <div>
      <Accordion iconEl={<span style={{fontSize:14}}>📷</span>} title="Basic Information" subtitle="Enter the Instagram username that this QR code will redirect to.">
        <FInput label="Username" required placeholder="Username" value={d.username} onChange={v=>s({...d,username:v})} prefix="@"/>
      </Accordion>
      <Accordion iconEl={<span>⊞</span>} title="Name of the QR Code" subtitle="Give a name to your QR code." defaultOpen={false}>
        <FInput label="QR Code name" placeholder="E.g. My Instagram QR" value={d.qrName} onChange={v=>s({...d,qrName:v})}/>
      </Accordion>
      <div style={{background:"#2563EB",borderRadius:10,padding:"14px 16px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:"#fff",margin:0}}>Looking to share all your social media profiles?</p>
          <p style={{fontSize:11,color:"#BFDBFE",margin:0}}>We have a special QR code for that!</p>
        </div>
        <button style={{background:"#fff",color:"#2563EB",border:"none",borderRadius:999,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Try it now!</button>
      </div>
    </div>
  );
}
function CSocial({d,s}) {
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Basic Information" subtitle="Provide some information to introduce your social media page.">
        <FInput label="Title" required placeholder="e.g. Ariel Campbell" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Description" placeholder="e.g. Welcome to my digital hub..." value={d.desc} onChange={v=>s({...d,desc:v})}/>
      </Accordion>
      <Accordion iconEl={<Image size={16} color="#6B7280"/>} title="Image" subtitle="Upload or drag and drop images.">
        <UploadZone label="Upload Images" maxSize="10MB"/>
        <Checkbox label="Vertical images" checked={d.vertical||false} onChange={v=>s({...d,vertical:v})}/>
      </Accordion>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Social Networks" subtitle="Add social media links to your page.">
        <SocialNetworks nets={d.nets||{}} onChange={v=>s({...d,nets:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CWhatsApp({d,s}) {
  const COUNTRIES=[{flag:"🇳🇱",code:"+31"},{flag:"🇩🇪",code:"+49"},{flag:"🇺🇸",code:"+1"},{flag:"🇬🇧",code:"+44"},{flag:"🇫🇷",code:"+33"}];
  const [ci,setCi]=useState(0);
  const [showCC,setShowCC]=useState(false);
  return (
    <div>
      <Accordion iconEl={<MessageCircle size={16} color="#6B7280"/>} title="WhatsApp Information" subtitle="Scanning this QR code will open WhatsApp ready to text the provided phone number." required>
        <Field label="Phone number" required>
          <div style={{display:"flex",alignItems:"stretch",border:"1px solid #E5E7EB",borderRadius:8,overflow:"visible",background:"#fff",position:"relative"}}>
            <button onClick={()=>setShowCC(!showCC)} style={{padding:"9px 10px",background:"#F9FAFB",border:"none",borderRight:"1px solid #E5E7EB",cursor:"pointer",display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <span style={{fontSize:14}}>{COUNTRIES[ci].flag}</span>
              <ChevronDown size={11} color="#9CA3AF"/>
            </button>
            {showCC && (
              <div style={{position:"absolute",top:"100%",left:0,background:"#fff",border:"1px solid #E5E7EB",borderRadius:8,zIndex:99,minWidth:120,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
                {COUNTRIES.map((c,i)=>(
                  <button key={i} onClick={()=>{setCi(i);setShowCC(false);}}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",background:ci===i?GL:"#fff",border:"none",cursor:"pointer",fontSize:12}}>
                    <span>{c.flag}</span><span style={{color:"#374151"}}>{c.code}</span>
                  </button>
                ))}
              </div>
            )}
            <input placeholder="06 12345678" value={d.phone||""} onChange={e=>s({...d,phone:e.target.value})} style={{...inp,border:"none",flex:1,borderRadius:0}}/>
          </div>
        </Field>
        <FTextarea label="Message" placeholder="Write your message" value={d.message} onChange={v=>s({...d,message:v})} rows={4} maxLen={0}/>
      </Accordion>
      <AccRow iconEl={<span>⊞</span>} title="Name of the QR Code" subtitle="Give a name to your QR code."/>
    </div>
  );
}
function CMP3({d,s}) {
  return (
    <div>
      <Accordion iconEl={<Music size={16} color="#6B7280"/>} title="MP3" subtitle="Upload an audio file from your device." required>
        <UploadZone label="Upload MP3" maxSize="25MB"/>
        <Checkbox label="Add download option" checked={d.download||false} onChange={v=>s({...d,download:v})}/>
      </Accordion>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Basic Information" subtitle="Add some context to your MP3 file.">
        <ImgBox/>
        <FInput label="Title" placeholder="Song or audio file name" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FInput label="Artist" placeholder="Artist name" value={d.artist} onChange={v=>s({...d,artist:v})}/>
        <FTextarea label="Description" placeholder="Provide any relevant information about your audio file" value={d.desc} onChange={v=>s({...d,desc:v})}/>
        <FInput label="Website" placeholder="E.g. https://mywebsite.com/" value={d.website} onChange={v=>s({...d,website:v})}/>
        <AddBtn label="Add Button" onClick={()=>{}}/>
      </Accordion>
      <Accordion iconEl={<Globe size={16} color="#6B7280"/>} title="Social Networks" subtitle="Add social media links to your page.">
        <SocialNetworks nets={d.nets||{}} onChange={v=>s({...d,nets:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CMenu({d,s}) {
  const [sub,setSub]=useState(null);
  const sections=d.sections||[];
  const setSections=(v)=>s({...d,sections:v});
  if (sub===null) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:280}}>
        <div style={{background:"#fff",borderRadius:16,padding:"24px",width:"100%",border:"1px solid #E5E7EB"}}>
          <h3 style={{fontSize:16,fontWeight:800,color:"#111",textAlign:"center",marginBottom:4}}>How do you want to create your Menu QR Code?</h3>
          <div style={{height:1,background:"#F3F4F6",margin:"14px 0"}}/>
          {[{icon:"≡",label:"I want to create a digital menu"},{icon:"📄",label:"I have a PDF version of my menu"},{icon:"🔗",label:"I have a link that redirects to my menu"}].map((o,i)=>(
            <button key={i} onClick={()=>setSub(i)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 14px",border:"1px solid #E5E7EB",borderRadius:10,marginBottom:8,background:"#fff",cursor:"pointer",textAlign:"left"}}>
              <div style={{width:36,height:36,borderRadius:8,background:G,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff",fontSize:16}}>{o.icon}</div>
              <span style={{fontSize:13,fontWeight:500,color:"#111",flex:1}}>{o.label}</span>
              <ChevronRight size={16} color="#9CA3AF"/>
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (sub===2) {
    return (
      <div>
        <Accordion iconEl={<UtensilsCrossed size={16} color="#6B7280"/>} title="Menu Link" subtitle="Enter a link to your menu." required>
          <FInput label="Menu URL" required placeholder="https://yourmenu.com" value={d.url} onChange={v=>s({...d,url:v})}/>
        </Accordion>
        <CommonBottom/>
      </div>
    );
  }
  if (sub===1) {
    return (
      <div>
        <Accordion iconEl={<FileText size={16} color="#6B7280"/>} title="PDF Menu" subtitle="Upload your PDF menu." required>
          <UploadZone label="Upload PDF" maxSize="100MB"/>
        </Accordion>
        <CommonBottom/>
      </div>
    );
  }
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<UtensilsCrossed size={16} color="#6B7280"/>} title="Restaurant Information" subtitle="Introduce your restaurant in a few words.">
        <ImgBox/>
        <FInput label="Restaurant name" placeholder="E.g. Tasty Food" value={d.name} onChange={v=>s({...d,name:v})}/>
        <FTextarea label="Description" placeholder="E.g. Fresh, local food." value={d.desc} onChange={v=>s({...d,desc:v})}/>
      </Accordion>
      <Accordion iconEl={<span style={{fontSize:14}}>≡</span>} title="Menu" subtitle="Provide your menu information." required>
        {sections.map((sec,si)=>(
          <div key={si} style={{border:"1px solid #E5E7EB",borderRadius:10,padding:12,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>Section {si+1}</span>
              <button onClick={()=>setSections(sections.filter((_,j)=>j!==si))} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444"}}>
                <X size={13}/>
              </button>
            </div>
            <FInput label="Name of the section" required placeholder="E.g. Appetizers" value={sec.name} onChange={v=>{const ns=[...sections];ns[si]={...ns[si],name:v};setSections(ns);}}/>
            <FInput label="Description" placeholder="E.g. Irresistible selection of appetizers" value={sec.desc} onChange={v=>{const ns=[...sections];ns[si]={...ns[si],desc:v};setSections(ns);}}/>
            {(sec.items||[]).map((item,ii)=>(
              <div key={ii} style={{background:"#F9FAFB",borderRadius:8,padding:10,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <p style={{fontSize:12,fontWeight:600,color:"#374151",margin:0}}>Product {ii+1}</p>
                  <button onClick={()=>{const ns=[...sections];ns[si].items=ns[si].items.filter((_,j)=>j!==ii);setSections(ns);}} style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444"}}>
                    <X size={12}/>
                  </button>
                </div>
                <ImgBox size={48}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <FInput label="Name" required placeholder="E.g. Salmon tartare" value={item.name} onChange={v=>{const ns=[...sections];ns[si].items[ii]={...ns[si].items[ii],name:v};setSections(ns);}}/>
                  <FInput label="Translated name" placeholder="E.g. Tartare de saumon" value={item.tname} onChange={v=>{const ns=[...sections];ns[si].items[ii]={...ns[si].items[ii],tname:v};setSections(ns);}}/>
                </div>
                <FInput label="Description" placeholder="E.g. Served with arugula salad" value={item.desc} onChange={v=>{const ns=[...sections];ns[si].items[ii]={...ns[si].items[ii],desc:v};setSections(ns);}}/>
                <FInput label="Price (optional)" placeholder="E.g. $10" value={item.price} onChange={v=>{const ns=[...sections];ns[si].items[ii]={...ns[si].items[ii],price:v};setSections(ns);}}/>
              </div>
            ))}
            <AddBtn label="Add product" onClick={()=>{const ns=[...sections];ns[si].items=[...(ns[si].items||[]),{name:"",tname:"",desc:"",price:""}];setSections(ns);}}/>
          </div>
        ))}
        <AddBtn label="Add section" onClick={()=>setSections([...sections,{name:"",desc:"",items:[]}])}/>
      </Accordion>
      <Accordion iconEl={<Clock size={16} color="#6B7280"/>} title="Opening Hours" subtitle="Business hours for each day of the week.">
        <OpeningHours hours={d.hours||{}} onChange={v=>s({...d,hours:v})}/>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CApps({d,s}) {
  const [stores,setStores]=useState({google:false,apple:false,amazon:false});
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<Smartphone size={16} color="#6B7280"/>} title="App Information" subtitle="Provide information about your app." required>
        <FInput label="App name" required placeholder="E.g. My App" value={d.name} onChange={v=>s({...d,name:v})}/>
        <FInput label="Developer/Company" placeholder="Name of app developer" value={d.dev} onChange={v=>s({...d,dev:v})}/>
        <Field label="App Logo"><ImgBox size={56}/></Field>
        <FTextarea label="Description" placeholder="E.g. Health and Wellness App" value={d.desc} onChange={v=>s({...d,desc:v})}/>
        <FInput label="Website" placeholder="E.g. https://www.myapp.com/" value={d.website} onChange={v=>s({...d,website:v})}/>
      </Accordion>
      <Accordion iconEl={<Link2 size={16} color="#6B7280"/>} title="Links to the Different Platforms" subtitle="Link your app to different app stores." required>
        <p style={{fontSize:12,color:G,fontWeight:600,marginBottom:10}}>Choose at least one store below and add a link to your app</p>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["google","apple","amazon"].map(k=>(
            <button key={k} onClick={()=>setStores({...stores,[k]:!stores[k]})}
              style={{flex:1,border:"1.5px solid "+(stores[k]?G:"#E5E7EB"),borderRadius:8,padding:"8px",fontSize:12,fontWeight:700,color:stores[k]?G:"#9CA3AF",background:stores[k]?GL:"#fff",cursor:"pointer",textTransform:"capitalize"}}>
              {k}
            </button>
          ))}
        </div>
        {stores.google && <FInput label="Google Play URL" placeholder="https://play.google.com/..." value={d.google} onChange={v=>s({...d,google:v})}/>}
        {stores.apple && <FInput label="App Store URL" placeholder="https://apps.apple.com/..." value={d.apple} onChange={v=>s({...d,apple:v})}/>}
        {stores.amazon && <FInput label="Amazon URL" placeholder="https://amazon.com/..." value={d.amazon} onChange={v=>s({...d,amazon:v})}/>}
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CCoupon({d,s}) {
  const [useBarcode,setUseBarcode]=useState(false);
  return (
    <div>
      <Accordion iconEl={<span>🎨</span>} title="Design" subtitle="Choose a color theme for your page.">
        <ColorPalette primary={d.primary} secondary={d.secondary} onChange={(p,sc)=>s({...d,primary:p,secondary:sc})}/>
      </Accordion>
      <Accordion iconEl={<Tag size={16} color="#6B7280"/>} title="Offer Information" subtitle="Provide information about your company.">
        <ImgBox/>
        <FInput label="Company" placeholder="E.g. Video Game Company" value={d.company} onChange={v=>s({...d,company:v})}/>
        <FInput label="Title" placeholder="E.g. Holiday Sale" value={d.title} onChange={v=>s({...d,title:v})}/>
        <FTextarea label="Description" placeholder="E.g. Available on all products for a limited time only!" value={d.desc} onChange={v=>s({...d,desc:v})} maxLen={0}/>
        <FInput label="Sales badge" placeholder="E.g. 25% OFF" value={d.badge} onChange={v=>s({...d,badge:v})}/>
        <FInput label="Button label" placeholder="E.g. Get Coupon" value={d.btnLabel} onChange={v=>s({...d,btnLabel:v})}/>
      </Accordion>
      <Accordion iconEl={<span>ℹ</span>} title="Coupon Information" subtitle="Provide information about this coupon." required>
        <Toggle label="Use barcode?" checked={useBarcode} onChange={setUseBarcode}/>
        <FInput label="Coupon code" required placeholder="E.g. SALE25OFF" value={d.code} onChange={v=>s({...d,code:v})}/>
        <FInput label="Valid until" type="date" value={d.expires||new Date().toISOString().split("T")[0]} onChange={v=>s({...d,expires:v})}/>
        <FTextarea label="Terms and Conditions" placeholder="E.g. This coupon is only valid for a limited time" value={d.terms} onChange={v=>s({...d,terms:v})}/>
        <Field label="Button">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <input placeholder="E.g. View More" style={inp} value={d.btnText||""} onChange={e=>s({...d,btnText:e.target.value})}/>
            <input placeholder="https://..." style={inp} value={d.btnUrl||""} onChange={e=>s({...d,btnUrl:e.target.value})}/>
          </div>
        </Field>
      </Accordion>
      <Accordion iconEl={<MapPin size={16} color="#6B7280"/>} title="Location" subtitle="Add a location to your coupon.">
        <div style={{display:"flex",gap:8}}>
          <input placeholder="Search here" style={{...inp,flex:1}} value={d.location||""} onChange={e=>s({...d,location:e.target.value})}/>
          <button style={{background:"none",border:"1px solid "+G,color:G,borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Manual entry</button>
        </div>
      </Accordion>
      <CommonBottom/>
    </div>
  );
}
function CWifi({d,s}) {
  return (
    <div>
      <Accordion iconEl={<Wifi size={16} color="#6B7280"/>} title="Wi-Fi Information" subtitle="Provide your network information." required>
        <FInput label="Network name" required placeholder="E.g. Wi-Fi name" value={d.ssid} onChange={v=>s({...d,ssid:v})}/>
        <FInput label="Network password" placeholder="E.g. Wi-Fi Password" value={d.pass} onChange={v=>s({...d,pass:v})} type="password"/>
        <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <FSelect label="Encryption type" value={d.enc||"WPA"} onChange={v=>s({...d,enc:v})} options={[{value:"WPA",label:"WPA"},{value:"WEP",label:"WEP"},{value:"nopass",label:"None"}]}/>
          </div>
          <div style={{marginBottom:14}}>
            <Checkbox label="Hidden network" checked={d.hidden||false} onChange={v=>s({...d,hidden:v})}/>
          </div>
        </div>
      </Accordion>
      <AccRow iconEl={<span>⊞</span>} title="Name of the QR Code" subtitle="Give a name to your QR code."/>
    </div>
  );
}

const CONFIG_MAP={website:CWebsite,pdf:CPDF,links:CLinks,vcard:CVCard,business:CBusiness,video:CVideo,images:CImages,facebook:CFacebook,instagram:CInstagram,social:CSocial,whatsapp:CWhatsApp,mp3:CMP3,menu:CMenu,apps:CApps,coupon:CCoupon,wifi:CWifi};
const QR_TYPES=[{id:"website",label:"Website",icon:Globe,desc:"Link to any website URL"},{id:"pdf",label:"PDF",icon:FileText,desc:"Show a PDF"},{id:"links",label:"List of Links",icon:Link2,desc:"Share multiple links"},{id:"vcard",label:"vCard",icon:CreditCard,desc:"Share a digital business card"},{id:"business",label:"Business",icon:Briefcase,desc:"Share information about your business"},{id:"video",label:"Video",icon:Play,desc:"Show a video"},{id:"images",label:"Images",icon:Image,desc:"Share multiple images"},{id:"facebook",label:"Facebook",icon:Share2,desc:"Share your Facebook page"},{id:"instagram",label:"Instagram",icon:Share2,desc:"Share your Instagram"},{id:"social",label:"Social Media",icon:Share2,desc:"Share your social channels"},{id:"whatsapp",label:"WhatsApp",icon:MessageCircle,desc:"Get WhatsApp messages"},{id:"mp3",label:"MP3",icon:Music,desc:"Share an audio file"},{id:"menu",label:"Menu",icon:UtensilsCrossed,desc:"Create a restaurant menu"},{id:"apps",label:"Apps",icon:Smartphone,desc:"Redirect to an app store"},{id:"coupon",label:"Coupon",icon:Tag,desc:"Share a coupon"},{id:"wifi",label:"WiFi",icon:Wifi,desc:"Connect to a Wi-Fi network"}];

function buildPayload(type,d) {
  if (type==="website") return d.url||"https://qrpro.app";
  if (type==="whatsapp") return "https://wa.me/"+(d.phone||"").replace(/[^0-9]/g,"")+(d.message?"?text="+encodeURIComponent(d.message):"");
  if (type==="wifi") return "WIFI:T:"+(d.enc||"WPA")+";S:"+(d.ssid||"")+";P:"+(d.pass||"")+";H:"+(d.hidden?"true":"false")+";;";
  if (type==="instagram") return "https://instagram.com/"+(d.username||"");
  if (type==="facebook") return d.url||"https://facebook.com";
  if (type==="vcard") return "BEGIN:VCARD\nVERSION:3.0\nFN:"+(d.name||"")+" "+(d.surname||"")+"\nORG:"+(d.company||"")+"\nTITLE:"+(d.profession||"")+"\nEND:VCARD";
  return d.url||d.name||"https://qrpro.app/"+type;
}

// ── Dashboard ──
const MOCK_QRS=[{id:1,name:"Company Website",type:"website",url:"https://acme.com",scans:1284,active:true,shortId:"A1B2C3"},{id:2,name:"Annual Report",type:"pdf",url:"https://acme.com/report.pdf",scans:432,active:true,shortId:"D4E5F6"},{id:3,name:"Contact Card",type:"vcard",url:"https://qr.pro/G7H8I9",scans:98,active:false,shortId:"G7H8I9"},{id:4,name:"Office WiFi",type:"wifi",url:"WIFI:T:WPA;S:AcmeHQ;;",scans:211,active:true,shortId:"J1K2L3"}];
const SCAN_DATA=[{d:"Apr 1",s:42},{d:"Apr 2",s:67},{d:"Apr 3",s:55},{d:"Apr 4",s:89},{d:"Apr 5",s:103},{d:"Apr 6",s:78},{d:"Apr 7",s:132},{d:"Apr 8",s:118},{d:"Apr 9",s:145}];

function MiniChart() {
  const max=Math.max(...SCAN_DATA.map(d=>d.s)),w=280,h=80,p=4;
  const pts=SCAN_DATA.map((d,i)=>({x:p+(i/(SCAN_DATA.length-1))*(w-p*2),y:h-p-(d.s/max)*(h-p*2)}));
  const path=pts.map((pt,i)=>(i===0?"M":"L")+pt.x+","+pt.y).join(" ");
  return (
    <svg width="100%" viewBox={"0 0 "+w+" "+h} preserveAspectRatio="none" style={{display:"block"}}>
      <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={G} stopOpacity="0.2"/><stop offset="100%" stopColor={G} stopOpacity="0"/></linearGradient></defs>
      <path d={path+" L"+pts[pts.length-1].x+","+h+" L"+pts[0].x+","+h+" Z"} fill="url(#cg)"/>
      <path d={path} fill="none" stroke={G} strokeWidth="2" strokeLinejoin="round"/>
      {pts.map((pt,i)=><circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill={G}/>)}
    </svg>
  );
}

function Dashboard({onLogout, user, onGoHome}) {
  const [qrs,setQrs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null);
  const [editUrl,setEditUrl]=useState("");
  const totalScans=qrs.reduce((a,q)=>a+((q.scan_count)||0),0);
  useEffect(()=>{
    if(user?.id) getQRCodes(user.id).then(data=>{ setQrs(data); setLoading(false); });
  },[user]);
  const handleToggle=async(q)=>{
    setQrs(qrs.map(r=>r.id===q.id?{...r,active:!r.active}:r));
    await toggleQRActive(q.id,!q.active);
  };
  const handleSaveUrl=async(q)=>{
    setQrs(qrs.map(r=>r.id===q.id?{...r,destination_url:editUrl}:r));
    await updateQRUrl(q.id,editUrl);
    setEditing(null);
  };
  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:"1.5rem 1rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,background:G,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}><Zap size={16} color="#fff"/></div>
          <span style={{fontWeight:800,fontSize:18,color:"#111"}}>QRPro</span>
          <span style={{background:GL,color:GM,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:999}}>PRO</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onGoHome} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:G,background:GL,border:"1px solid #86EFAC",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600}}>
            + Create QR
          </button>
          <span style={{fontSize:12,color:"#9CA3AF"}}>{user?.email}</span>
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#6B7280",background:"none",border:"1px solid #E5E7EB",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>
            <LogOut size={14}/>Sign out
          </button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:"1.5rem"}}>
        {[{label:"Total Scans",value:totalScans.toLocaleString(),icon:MousePointer,color:G,bg:GL},{label:"QR Codes",value:qrs.length.toString(),icon:Users,color:"#2563EB",bg:"#EFF6FF"},{label:"Active Codes",value:qrs.filter(q=>q.active).length.toString(),icon:MapPin,color:"#D97706",bg:"#FFFBEB"}].map(k=>(
          <div key={k.label} style={{background:"#fff",border:"1px solid #F3F4F6",borderRadius:16,padding:"1rem 1.25rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <p style={{fontSize:12,color:"#9CA3AF",fontWeight:500}}>{k.label}</p>
              <div style={{width:28,height:28,borderRadius:8,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><k.icon size={14} color={k.color}/></div>
            </div>
            <p style={{fontSize:24,fontWeight:700,color:"#111"}}>{k.value}</p>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:"1.5rem"}}>
        <div style={{background:"#fff",border:"1px solid #F3F4F6",borderRadius:16,padding:"1.25rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
            <p style={{fontWeight:600,fontSize:14,color:"#111"}}>Scans over time</p>
            <span style={{fontSize:12,color:G,display:"flex",alignItems:"center",gap:4}}><TrendingUp size={12}/>+24% this week</span>
          </div>
          <MiniChart/>
        </div>
        <div style={{background:"#fff",border:"1px solid #F3F4F6",borderRadius:16,padding:"1.25rem"}}>
          <p style={{fontWeight:600,fontSize:14,color:"#111",marginBottom:"1rem"}}>By country</p>
          {[{c:"🇳🇱 NL",p:31},{c:"🇩🇪 DE",p:22},{c:"🇺🇸 US",p:18},{c:"🇬🇧 GB",p:14},{c:"Other",p:15}].map(g=>(
            <div key={g.c} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                <span style={{color:"#6B7280"}}>{g.c}</span>
                <span style={{fontWeight:600,color:"#111"}}>{g.p}%</span>
              </div>
              <div style={{height:5,background:"#F3F4F6",borderRadius:99}}>
                <div style={{height:"100%",width:g.p+"%",background:G,borderRadius:99}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff",border:"1px solid #F3F4F6",borderRadius:16,overflow:"hidden"}}>
        <div style={{padding:"1.25rem",borderBottom:"1px solid #F3F4F6",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <p style={{fontWeight:600,fontSize:14,color:"#111"}}>My QR Codes</p>
          <span style={{fontSize:12,color:"#9CA3AF"}}>Edit destination URL anytime — no reprint needed</span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#F9FAFB"}}>
              {["Name","Short link","Scans","Status","Destination",""].map(h=>(
                <th key={h} style={{padding:"0.75rem 1rem",textAlign:"left",fontSize:11,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {qrs.map(q=>(
              <tr key={q.id} style={{borderTop:"1px solid #F3F4F6"}}>
                <td style={{padding:"0.875rem 1rem",fontWeight:500,color:"#111"}}>{q.name}</td>
                <td style={{padding:"0.875rem 1rem"}}>
                  <span style={{fontFamily:"monospace",fontSize:11,background:"#F3F4F6",color:GM,padding:"2px 8px",borderRadius:6}}>qr.pro/{q.shortId}</span>
                </td>
                <td style={{padding:"0.875rem 1rem",fontWeight:500,color:"#374151"}}>{q.scans.toLocaleString()}</td>
                <td style={{padding:"0.875rem 1rem"}}>
                  <button onClick={()=>setQrs(qrs.map(r=>r.id===q.id?{...r,active:!r.active}:r))}
                    style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:q.active?G:"#9CA3AF",fontSize:12,fontWeight:500}}>
                    {q.active?<ToggleRight size={16}/>:<ToggleLeft size={16}/>}{q.active?"Active":"Paused"}
                  </button>
                </td>
                <td style={{padding:"0.875rem 1rem",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12}}>
                  {editing===q.id
                    ? <input value={editUrl} onChange={e=>setEditUrl(e.target.value)} style={{width:"100%",fontSize:12,border:"1px solid "+G,borderRadius:6,padding:"4px 8px",outline:"none"}}/>
                    : <span style={{color:"#6B7280"}}>{q.url}</span>}
                </td>
                <td style={{padding:"0.875rem 1rem"}}>
                  {editing===q.id
                    ? <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>{setQrs(qrs.map(r=>r.id===q.id?{...r,url:editUrl}:r));setEditing(null);}} style={{fontSize:11,background:G,color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer"}}>Save</button>
                        <button onClick={()=>setEditing(null)} style={{fontSize:11,background:"#F3F4F6",color:"#6B7280",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer"}}>Cancel</button>
                      </div>
                    : <button onClick={()=>{setEditing(q.id);setEditUrl(q.url);}} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:GM,background:GL,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:500}}>
                        <Edit3 size={11}/>Edit URL
                      </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Login({onLogin}) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [show,setShow]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [mode,setMode]=useState("login");
  const handle=async()=>{
    setLoading(true);setErr("");
    try {
      let result;
      if(mode==="signup") {
        result = await signUp(email,pass);
        if(result.error) { setErr(result.error.message||"Sign up failed"); setLoading(false); return; }
        setErr(""); alert("Check your email to confirm your account, then sign in!");
        setMode("login"); setLoading(false); return;
      } else {
        result = await signIn(email,pass);
        if(result.error||!result.access_token) { setErr(result.error?.message||result.error_description||"Invalid credentials"); setLoading(false); return; }
        onLogin(result.user, result.access_token);
      }
    } catch(e) { setErr("Network error. Try again."); setLoading(false); }
  };
  return (
    <div style={{minHeight:"100vh",background:"#F9FAFB",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:24,border:"1px solid #E5E7EB",padding:"2.5rem",width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{width:48,height:48,background:G,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}><Zap size={24} color="#fff"/></div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#111",marginBottom:6}}>Welcome back</h1>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:13,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@test.com" type="email" style={inp} onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor="#E5E7EB"}/>
        </div>
        <div style={{marginBottom:16,position:"relative"}}>
          <label style={{fontSize:13,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Password</label>
          <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="tester123" type={show?"text":"password"} style={{...inp,paddingRight:40}} onFocus={e=>e.target.style.borderColor=G} onBlur={e=>e.target.style.borderColor="#E5E7EB"}/>
          <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:34,background:"none",border:"none",cursor:"pointer",color:"#9CA3AF"}}>
            {show?<EyeOff size={16}/>:<Eye size={16}/>}
          </button>
        </div>
        {err&&<p style={{fontSize:12,color:"#EF4444",marginBottom:12,background:"#FEF2F2",padding:"8px 12px",borderRadius:8}}>{err}</p>}
        <button onClick={handle} disabled={loading} style={{width:"100%",background:loading?"#9CA3AF":G,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:15,fontWeight:600,cursor:"pointer",marginBottom:10}}>
          {loading?(mode==="signup"?"Creating account…":"Signing in…"):(mode==="signup"?"Create account":"Sign in")}
        </button>
        <p style={{textAlign:"center",fontSize:13,color:"#6B7280"}}>
          {mode==="login"?"Don't have an account? ":"Already have an account? "}
          <button onClick={()=>{setMode(mode==="login"?"signup":"login");setErr("");}} style={{color:G,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>
            {mode==="login"?"Sign up":"Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [page,setPage]=useState("home");
  const [user,setUser]=useState(()=>{
    try {
      const stored = localStorage.getItem("qrpro_user");
      return stored ? JSON.parse(stored) : null;
    } catch(e) { return null; }
  });
  const [token,setToken]=useState(()=>{
    try { return localStorage.getItem("qrpro_token")||null; } catch(e) { return null; }
  });

  const handleLogin=(u,t)=>{
    setUser(u);
    setToken(t);
    try {
      localStorage.setItem("qrpro_user", JSON.stringify(u));
      localStorage.setItem("qrpro_token", t);
    } catch(e) {}
    setPage("home");
  };

  const handleLogout=()=>{
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem("qrpro_user");
      localStorage.removeItem("qrpro_token");
    } catch(e) {}
    setPage("home");
  };
  const [selected,setSelected]=useState(null);
  const [data,setData]=useState({});
  const [qrColor,setQrColor]=useState("#111827");
  const [downloaded,setDownloaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [savedMsg,setSavedMsg]=useState("");
  const [shortId]=useState(()=>Math.random().toString(36).slice(2,8).toUpperCase());
  const workerQrValue = selected ? `${WORKER_URL}/${shortId}` : WORKER_URL;

  const qrType=QR_TYPES.find(q=>q.id===selected);
  const ConfigComp=selected?CONFIG_MAP[selected]:null;
  const payload=selected?buildPayload(selected,data):"https://qrpro.app";
  const qrSvg=useMemo(()=>buildQRSvg(workerQrValue,qrColor,200),[workerQrValue,qrColor]);

  const handleDl=async()=>{
    dlPng(qrSvg,"QRPro-"+(selected||"qr")+"-"+shortId+".png");
    setDownloaded(true);
    if(user) {
      setSaving(true);
      const name=data.qrName||Object.values(data).find(v=>v&&typeof v==="string")||qrType?.label||selected;
      const result = await saveQRCode(user.id, shortId, selected, payload, name, token);
      if(result.error) console.error("Save failed:", result.error);
      else setSavedMsg("Saved to dashboard!");
      setSaving(false);
      setTimeout(()=>setSavedMsg(""),3000);
    }
    setTimeout(()=>setDownloaded(false),2500);
  };

  if(page==="dashboard"&&user) return <Dashboard onLogout={handleLogout} user={user} onGoHome={()=>setPage("home")}/>;
  if(page==="login"&&!user) return <Login onLogin={handleLogin}/>;

  return (
    <div style={{fontFamily:"system-ui,sans-serif",minHeight:"100vh",background:"#F0F4F0"}}>
      <nav style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 2rem",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,background:G,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}><Zap size={15} color="#fff"/></div>
          <span style={{fontWeight:800,fontSize:17,color:"#111"}}>QRPro</span>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {[{id:"home",l:"Generator"},{id:"pricing",l:"Pricing"}].map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{fontSize:14,fontWeight:n.id===page?700:400,color:n.id===page?G:"#6B7280",background:n.id===page?GL:"none",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer"}}>{n.l}</button>
          ))}
          {user ? (
            <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6,background:GL,border:"1px solid #86EFAC",borderRadius:999,padding:"5px 12px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:G}}/>
                <span style={{fontSize:12,color:GM,fontWeight:600}}>{user.email}</span>
              </div>
              <button onClick={()=>setPage("dashboard")} style={{fontSize:13,fontWeight:600,color:"#fff",background:G,border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer"}}>Dashboard</button>
              <button onClick={handleLogout} style={{fontSize:13,color:"#6B7280",background:"none",border:"1px solid #E5E7EB",borderRadius:8,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                <LogOut size={13}/>
              </button>
            </div>
          ) : (
            <button onClick={()=>setPage("login")} style={{fontSize:14,fontWeight:600,color:"#fff",background:G,border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",marginLeft:8}}>Sign in</button>
          )}
        </div>
      </nav>

      {page==="pricing" ? (
        <div style={{padding:"3rem 1rem",textAlign:"center",maxWidth:900,margin:"0 auto"}}>
          <h2 style={{fontSize:28,fontWeight:800,color:"#111",marginBottom:8}}>Simple pricing</h2>
          <p style={{color:"#6B7280",marginBottom:"2.5rem"}}>All plans include dynamic QR codes with redirect tracking.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[{name:"Free",price:0,features:["5 QR codes","Basic analytics","PNG download","Dynamic links"],cta:"Get started free",hi:false},{name:"Pro",price:12,features:["Unlimited QR codes","Full analytics","SVG & PDF download","Custom domains","Priority support"],cta:"Start Pro trial",hi:true},{name:"Business",price:49,features:["Everything in Pro","Team collaboration","API access","White-label"],cta:"Contact sales",hi:false}].map(pl=>(
              <div key={pl.name} style={{background:"#fff",borderRadius:20,border:pl.hi?"2px solid "+G:"1px solid #E5E7EB",padding:"1.75rem 1.25rem",position:"relative"}}>
                {pl.hi&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:G,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 14px",borderRadius:999}}>MOST POPULAR</div>}
                <p style={{fontWeight:700,fontSize:16,color:"#111",marginBottom:8}}>{pl.name}</p>
                <p style={{fontSize:36,fontWeight:800,color:"#111",marginBottom:4}}>${pl.price}<span style={{fontSize:14,fontWeight:400,color:"#9CA3AF"}}>/mo</span></p>
                <button onClick={pl.hi?()=>setPage("login"):undefined} style={{width:"100%",background:pl.hi?G:"#F9FAFB",color:pl.hi?"#fff":"#374151",border:pl.hi?"none":"1px solid #E5E7EB",borderRadius:10,padding:"10px",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:16,marginTop:8}}>{pl.cta}</button>
                {pl.features.map(f=>(
                  <div key={f} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,textAlign:"left"}}>
                    <Check size={14} color={G}/><span style={{fontSize:13,color:"#374151"}}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{maxWidth:1140,margin:"0 auto",padding:"2rem 1rem"}}>
          <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
            <h1 style={{fontSize:32,fontWeight:900,color:"#111",marginBottom:6,lineHeight:1.2}}>Easily create a QR code <span style={{color:G}}>for any occasion</span></h1>
            <p style={{color:"#6B7280",fontSize:15}}>All codes are dynamic — change the destination anytime without reprinting.</p>
          </div>
          <div style={{display:"flex",gap:24,alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:18,fontSize:12,flexWrap:"wrap"}}>
                {["Select QR type","Add content","Design QR code","Download QR code"].map((step,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:i===0?G:i===1&&selected?"#111":"#E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {i===0?<Check size={11} color="#fff"/>:<span style={{fontSize:10,fontWeight:700,color:i===1&&selected?"#fff":"#9CA3AF"}}>{i+1}</span>}
                    </div>
                    <span style={{color:i===0?G:i===1&&selected?"#111":"#9CA3AF",fontWeight:i<2?600:400,whiteSpace:"nowrap"}}>{step}</span>
                    {i<3&&<div style={{width:16,height:1,background:"#E5E7EB",flexShrink:0}}/>}
                  </div>
                ))}
              </div>

              {!selected ? (
                <div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#fff",border:"1.5px solid "+G,color:G,fontSize:12,fontWeight:700,padding:"7px 16px",borderRadius:10,marginBottom:14}}>Choose a QR Type</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    {QR_TYPES.map(qt=>(
                      <button key={qt.id} onClick={()=>{setSelected(qt.id);setData({});}}
                        style={{background:"#fff",border:"1.5px solid #E8EDE8",borderRadius:16,padding:"1.25rem 0.75rem",textAlign:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",transition:"all 0.15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=G;e.currentTarget.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#E8EDE8";e.currentTarget.style.transform="none";}}>
                        <div style={{width:50,height:50,borderRadius:"50%",background:GL,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
                          <qt.icon size={22} color={G}/>
                        </div>
                        <p style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:3}}>{qt.label}</p>
                        <p style={{fontSize:10,color:"#9CA3AF",lineHeight:1.4}}>{qt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <h2 style={{fontSize:17,fontWeight:800,color:"#111"}}>2. Add content to your QR code</h2>
                  </div>
                  <button onClick={()=>{setSelected(null);setData({});}} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#6B7280",background:"none",border:"none",cursor:"pointer",marginBottom:12,padding:0}}>
                    <ArrowLeft size={14}/> All QR types
                  </button>
                  <ConfigComp d={data} s={setData}/>
                  <div style={{background:"#fff",borderRadius:14,border:"1px solid #E8EDE8",padding:"16px",marginTop:4}}>
                    <p style={{fontSize:13,fontWeight:700,color:"#111",marginBottom:10}}>QR code color</p>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                      {["#111827",G,"#2563EB","#DC2626","#7C3AED","#D97706","#0891B2","#EC4899"].map(c=>(
                        <button key={c} onClick={()=>setQrColor(c)}
                          style={{width:28,height:28,borderRadius:"50%",background:c,border:qrColor===c?"3px solid #374151":"2px solid transparent",outline:qrColor===c?"2px solid white":"none",cursor:"pointer",boxSizing:"border-box"}}/>
                      ))}
                      <label style={{width:28,height:28,borderRadius:"50%",border:"1.5px dashed #9CA3AF",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#9CA3AF",overflow:"hidden",position:"relative"}}>
                        +<input type="color" value={qrColor} onChange={e=>setQrColor(e.target.value)} style={{position:"absolute",opacity:0,width:"100%",height:"100%",cursor:"pointer"}}/>
                      </label>
                    </div>
                    <div style={{background:GL,border:"1px solid #86EFAC",borderRadius:8,padding:"9px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                      <RefreshCw size={12} color={GM}/>
                      <span style={{fontSize:11,color:"#15803D"}}>Dynamic link: <code style={{fontFamily:"monospace",fontWeight:700}}>qrpro-redirect.j-beelen.workers.dev/{shortId}</code></span>
                    </div>
                    <button onClick={handleDl}
                      style={{width:"100%",background:downloaded?"#059669":G,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.3s"}}>
                      {downloaded?<><Check size={15}/>Downloaded!</>:<><Download size={15}/>Download QR Code</>}
                    </button>
                    {savedMsg && <p style={{fontSize:12,color:GM,textAlign:"center",marginTop:6,fontWeight:600}}>{savedMsg}</p>}
                    {!user && <p style={{fontSize:11,color:"#9CA3AF",textAlign:"center",marginTop:8}}>
                      <button onClick={()=>setPage("login")} style={{color:GM,background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>Sign in</button> to save QR codes to your dashboard
                    </p>}
                  </div>
                </div>
              )}
            </div>

            <div style={{width:240,flexShrink:0,position:"sticky",top:"5rem"}}>
              <PhonePreview type={selected} data={data} qrColor={qrColor} qrValue={workerQrValue} shortId={shortId}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
