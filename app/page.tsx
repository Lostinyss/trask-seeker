"use client";
import { useEffect, useMemo, useState } from "react";

type Camera = { id:number; name:string; source:string; status:"online"|"offline"; waste:number; annotated?:string; scanStatus?:"idle"|"scanning"|"detected"|"clear"|"error"; message?:string };
type Place = { id:number; name:string; address:string; members:string[]; cameras:Camera[] };
const API_BASE_URL=process.env.NEXT_PUBLIC_TRASHTRACK_API_URL||"http://127.0.0.1:8080";

const initial:Place[] = [
  { id:1, name:"Pak Chong Market", address:"Pak Chong, Nakhon Ratchasima", members:["kie@trashseeker.app","staff@market.local"], cameras:[
    {id:1,name:"Entrance camera",source:"rtsp://192.168.1.24/live",status:"online",waste:3},
    {id:2,name:"Food court",source:"Uploaded image",status:"online",waste:7},
  ]},
  { id:2, name:"Bangkok University", address:"Rangsit, Pathum Thani", members:["kie@trashseeker.app"], cameras:[
    {id:3,name:"Building A3",source:"rtsp://10.0.0.8/stream",status:"offline",waste:0},
  ]},
];

export default function Home(){
  const [logged,setLogged]=useState(false);
  const [places,setPlaces]=useState(initial);
  const [selected,setSelected]=useState<number|null>(1);
  const [query,setQuery]=useState("");
  const [modal,setModal]=useState<null|"place"|"edit"|"camera"|"camera-edit"|"invite">(null);
  const [editCameraId,setEditCameraId]=useState<number|null>(null);
  const [field1,setField1]=useState("");
  const [field2,setField2]=useState("");
  const [secondsToScan,setSecondsToScan]=useState(600);
  const [lastScan,setLastScan]=useState("ยังไม่ได้สแกนใน Session นี้");
  const [viewer,setViewer]=useState<{name:string;image:string;count:number}|null>(null);
  const [scanningCamera,setScanningCamera]=useState<number|null>(null);
  useEffect(()=>{const timer=setInterval(()=>setSecondsToScan(s=>s<=1?600:s-1),1000);return()=>clearInterval(timer)},[]);
  const countdown=`${String(Math.floor(secondsToScan/60)).padStart(2,"0")}:${String(secondsToScan%60).padStart(2,"0")}`;
  const current=places.find(p=>p.id===selected);
  const detectCamera=async(c:Camera):Promise<Camera>=>{if(!c.source.startsWith("http"))return{...c,status:"offline",scanStatus:"error",message:"ข้อผิดพลาด: RTSP ต้องเชื่อมผ่าน Backend Proxy"};try{const response=await fetch(`${API_BASE_URL}/detect-url`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:c.source})});if(!response.ok){let detail="";try{detail=(await response.json()).detail||""}catch{}throw new Error(detail||`API ตอบกลับ ${response.status}`)}const data=await response.json();const count=Number(data.detection_count||0);return{...c,waste:count,annotated:data.image,status:"online",scanStatus:count>0?"detected":"clear",message:count>0?`พบขยะ ${count} จุด`:"ไม่พบขยะ"}}catch(error){return{...c,status:"offline",scanStatus:"error",message:`ข้อผิดพลาด: ${error instanceof Error?error.message:"ไม่สามารถเข้าถึง URL ได้"}`}}};
  const scanCamera=async(c:Camera)=>{setScanningCamera(c.id);if(current)update({...current,cameras:current.cameras.map(x=>x.id===c.id?{...x,scanStatus:"scanning",message:"กำลังสแกน..."}:x)});const scanned=await detectCamera(c);setPlaces(v=>v.map(p=>p.id===selected?{...p,cameras:p.cameras.map(x=>x.id===c.id?scanned:x)}:p));if(scanned.annotated)setViewer({name:scanned.name,image:scanned.annotated,count:scanned.waste});setScanningCamera(null)};
  const scanNow=async()=>{if(!current)return;setSecondsToScan(600);update({...current,cameras:current.cameras.map(c=>({...c,scanStatus:"scanning",message:"กำลังสแกน..."}))});const scanned=await Promise.all(current.cameras.map(detectCamera));setPlaces(v=>v.map(p=>p.id===current.id?{...p,cameras:scanned}:p));setLastScan(`สแกนล่าสุด ${new Date().toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}`)};
  const filtered=useMemo(()=>places.filter(p=>(p.name+" "+p.address+" "+p.members.join(" ")+" "+p.cameras.map(c=>c.name).join(" ")).toLowerCase().includes(query.toLowerCase())),[places,query]);
  const update=(place:Place)=>setPlaces(v=>v.map(p=>p.id===place.id?place:p));
  const openModal=(type:typeof modal,a="",b="")=>{setField1(a);setField2(b);setModal(type)};
  const submitModal=()=>{if(!field1.trim())return;if(modal==="place"){const p={id:Date.now(),name:field1,address:field2||"ยังไม่ระบุที่อยู่",members:["kie@trashseeker.app"],cameras:[]};setPlaces(v=>[...v,p]);setSelected(p.id)}else if(modal==="edit"&&current)update({...current,name:field1,address:field2||current.address});else if(modal==="camera"&&current&&field2)update({...current,cameras:[...current.cameras,{id:Date.now(),name:field1,source:field2,status:"online",waste:0}]});else if(modal==="camera-edit"&&current&&editCameraId&&field2)update({...current,cameras:current.cameras.map(c=>c.id===editCameraId?{...c,name:field1,source:field2}:c)});else if(modal==="invite"&&current&&!current.members.includes(field1))update({...current,members:[...current.members,field1]});setModal(null)};

  if(!logged) return <main className="login"><section><div className="mark">TS</div><p className="eyebrow">ระบบตรวจสอบขยะอัจฉริยะ</p><h1>Trash<span>Seeker</span></h1><p>มองเห็นปัญหาขยะในทุกพื้นที่<br/>จากแดชบอร์ดเดียว</p><label>อีเมล<input defaultValue="kie@trashseeker.app"/></label><label>รหัสผ่าน<input type="password" defaultValue="trashseeker"/></label><button onClick={()=>setLogged(true)}>เข้าสู่ระบบ →</button><small>บัญชีสาธิต — กดเข้าสู่ระบบได้ทันที</small></section><aside><b>01</b><h2>สังเกต<br/>ตรวจจับ<br/><em>จัดการ</em></h2><p>เชื่อมต่อกล้องและระบบตรวจจับด้วย AI เพื่อช่วยให้ทีมดูแลพื้นที่ตอบสนองได้เร็วขึ้น</p></aside></main>;

  return <main className="app">
    <header><div><b className="mark">TS</b><strong>TRASHSEEKER</strong></div><div className="scan"><i/> ตรวจจับอัตโนมัติทุก 10 นาที</div><button className="avatar" onClick={()=>setLogged(false)}>KM</button></header>
    <div className="shell">
      <aside className="sidebar"><button className="active">⌂ ภาพรวม</button><button>◎ สถานที่</button><button>◉ กล้อง</button><button>♙ สมาชิก</button><button>⚙ ตั้งค่า</button><footer>TRASHTRACK API<br/><span>● เชื่อมต่อแล้ว</span></footer></aside>
      <section className="content">
        <div className="top"><div><p className="eyebrow">การจัดการพื้นที่</p><h1>สถานที่ทั้งหมด</h1></div><button className="primary" onClick={()=>openModal("place")}>＋ เพิ่มสถานที่</button></div>
        <input className="search" placeholder="ค้นหา Place, Camera หรือ User..." value={query} onChange={e=>setQuery(e.target.value)}/>
        <div className="workspace">
          <div className="places">{filtered.map(p=><button className={p.id===selected?"place selected":"place"} onClick={()=>setSelected(p.id)} key={p.id}><span>{p.cameras.reduce((n,c)=>n+c.waste,0)}</span><div><b>{p.name}</b><small>{p.address}</small><em>{p.cameras.length} กล้อง · {p.members.length} สมาชิก</em></div></button>)}</div>
          {current&&<article className="detail">
            <div className="detail-head"><div><p className="eyebrow">PLACE / {current.id}</p><h2>{current.name}</h2><p>{current.address}</p></div><div><button onClick={()=>openModal("edit",current.name,current.address)}>แก้ไข</button><button className="danger" onClick={()=>{setPlaces(v=>v.filter(p=>p.id!==current.id));setSelected(null)}}>ลบ</button></div></div>
            <div className="summary"><div><span>จำนวนกล้อง</span><b>{current.cameras.length}</b></div><div><span>ขยะที่ตรวจพบ</span><b>{current.cameras.reduce((n,c)=>n+c.waste,0)}</b></div><div className="scan-control"><span>สแกนครั้งถัดไป</span><b className="countdown">{countdown}</b><small>{lastScan}</small><button onClick={scanNow}>↻ สแกนทันที</button></div></div>
            <div className="section-title"><h3>รายการกล้อง</h3><button onClick={()=>openModal("camera")}>＋ เพิ่มกล้อง</button></div>
            <div className="cameras">{current.cameras.map(c=><div className="camera" key={c.id}><button className="feed" onClick={()=>scanCamera(c)} disabled={scanningCamera===c.id}>{c.annotated?<img src={c.annotated} alt={c.name}/>:c.source.startsWith("http")?<img src={c.source} alt={c.name}/>:null}<span>{scanningCamera===c.id?"กำลังสแกน...":"กดเพื่อสแกนและดูภาพ"}</span><b>{c.waste}</b><small>จุดที่ตรวจพบ</small></button><div><b>{c.name}</b><small className="camera-source">{c.source}</small><em className={`camera-status ${c.scanStatus||"idle"}`}>{c.scanStatus==="detected"?"● พบ":c.scanStatus==="clear"?"● ไม่พบ":c.scanStatus==="error"?"● ERROR":c.scanStatus==="scanning"?"● กำลังสแกน":"● รอสแกน"}</em>{c.message&&<small className={`camera-message ${c.scanStatus==="error"?"error":""}`}>{c.message}</small>}<button className="camera-edit" onClick={()=>{setEditCameraId(c.id);openModal("camera-edit",c.name,c.source)}}>แก้ไข</button></div><button aria-label={`ลบ ${c.name}`} onClick={()=>update({...current,cameras:current.cameras.filter(x=>x.id!==c.id)})}>×</button></div>)}</div>
            <div className="section-title"><h3>สมาชิก</h3><button onClick={()=>openModal("invite")}>＋ เชิญผู้ใช้</button></div>
            <div className="members">{current.members.map((m,i)=><div key={m}><span>{m[0].toUpperCase()}</span><b>{m}</b><small>{i===0?"เจ้าของ":"สมาชิก"}</small>{i>0&&<button onClick={()=>update({...current,members:current.members.filter(x=>x!==m)})}>นำออก</button>}</div>)}</div>
          </article>}
        </div>
      </section>
    </div>
    {viewer&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setViewer(null)}><section className="camera-viewer" onMouseDown={e=>e.stopPropagation()}><button className="viewer-close" onClick={()=>setViewer(null)} aria-label="ปิด">×</button><div><p className="eyebrow">ผลการตรวจจับ</p><h2>{viewer.name}</h2></div><img src={viewer.image} alt={`ผลตรวจจับจาก ${viewer.name}`}/><strong className={viewer.count>0?"viewer-detected":"viewer-clear"}>{viewer.count>0?`พบขยะ ${viewer.count} จุด`:"ไม่พบขยะ"}</strong></section></div>}
    {modal&&<div className="modal-backdrop" role="presentation" onMouseDown={()=>setModal(null)}><form className="modal" onSubmit={e=>{e.preventDefault();submitModal()}} onMouseDown={e=>e.stopPropagation()}><div><p className="eyebrow">TRASHSEEKER</p><button type="button" onClick={()=>setModal(null)} aria-label="ปิด">×</button></div><h2>{modal==="place"?"เพิ่ม Place":modal==="edit"?"แก้ไข Place":modal==="camera"?"เพิ่ม Camera":modal==="camera-edit"?"แก้ไข Camera":"เชิญ Member"}</h2><label>{modal==="invite"?"Email":"ชื่อ"}<input autoFocus value={field1} onChange={e=>setField1(e.target.value)} required/></label>{modal!=="invite"&&<label>{modal==="camera"||modal==="camera-edit"?"Image URL หรือ RTSP URL":"ที่อยู่"}<input value={field2} onChange={e=>setField2(e.target.value)} onPaste={e=>{if(modal!=="camera"&&modal!=="camera-edit")return;const text=e.clipboardData.getData("text").trim();if(text){e.preventDefault();setField2(text)}}} placeholder={modal==="camera"||modal==="camera-edit"?"กด Ctrl + V เพื่อวาง URL":""} required={modal==="camera"||modal==="camera-edit"}/>{(modal==="camera"||modal==="camera-edit")&&<small className="paste-hint">รองรับ Ctrl + V สำหรับ Image URL และ RTSP URL</small>}</label>}<div className="modal-actions"><button type="button" onClick={()=>setModal(null)}>ยกเลิก</button><button className="primary" type="submit">บันทึก</button></div></form></div>}
  </main>
}
