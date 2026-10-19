"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, CarFront, ChevronDown, Clock3, Compass, Heart, House, MapPin, MessageCircle, Plane, Plus, Search, SlidersHorizontal, Sparkles, UserRound, Users, X } from "lucide-react";
import { sampleJourneys, dateLabel, type Journey } from "./data";
import { RouteCover } from "./route-cover";
import s from "./preview.module.css";

export default function Discovery({ today }: { today: string }) {
  const [category, setCategory] = useState<"airport" | "routes">("airport");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Journey | null>(null);
  const [interested, setInterested] = useState<string[]>([]);
  const posts = sampleJourneys(today).filter(p => (category === "airport" ? p.rideKind === "airport" : p.rideKind !== "airport") && `${p.title} ${p.fromLabel} ${p.toLabel}`.includes(query));
  return <div className={s.app} lang="zh-HK">
    <a href="#journeys" className={s.skip}>跳至同路動態</a>
    <header className={s.header}><div className={s.headerInner}>
      <a className={s.brand} href="/v2-preview"><span className={s.brandMark}><CarFront size={23}/></span><span>RidePod<small>同路，啱啱好。</small></span></a>
      <div className={s.desktopLinks}><span className={s.activeLink}>發現同路</span><span>香港 · HONG KONG</span></div>
      <span className={s.previewBadge}>V2 設計預覽</span>
    </div></header>
    <main className={s.main}>
      <section className={s.hero}><div><div className={s.eyebrow}><span/> EVERY JOURNEY STARTS WITH SOMEONE</div><h1>下一程，<br/>搵個<span>同路人。</span></h1><p>機場返屋企，定係聽朝返工。<br className={s.mobileBreak}/>搵到同路嘅人，分擔車費，分享沿途。</p><a href="#journeys" className={s.heroLink}>睇吓邊個同你同路 <ArrowDown size={15}/></a></div><div className={s.heroArt}><div className={s.heroStamp}>同路<br/><b>啱啱好</b><Sparkles size={18}/></div><svg viewBox="0 0 440 240" aria-hidden="true"><path d="M40 183 C120 183 68 59 167 59 S265 207 355 120" stroke="#b7cebc" strokeWidth="40" strokeLinecap="round" fill="none"/><path d="M40 183 C120 183 68 59 167 59 S265 207 355 120" stroke="#f8f6e7" strokeWidth="2" strokeDasharray="8 10" fill="none"/><circle cx="40" cy="183" r="13" fill="#167467"/><circle cx="355" cy="120" r="13" fill="#167467"/></svg><span className={s.mapLabel}>📍 香港機場</span><span className={s.mapLabelEnd}>屋企見 🏡</span><div className={s.mapCar}><CarFront size={35}/></div></div></section>
      <div className={s.demoNote}><span className={s.liveDot}/><b>示範旅程</b><span>試吓搵同路人 · 所有互動只供體驗，唔會預訂或收費</span></div>
      <section id="journeys" className={s.discovery}>
        <div className={s.discoverTop}><div className={s.tabs} role="tablist" aria-label="旅程類別"><button role="tab" aria-selected={category==="airport"} onClick={()=>setCategory("airport")}><Plane size={19}/>機場同路</button><button role="tab" aria-selected={category==="routes"} onClick={()=>setCategory("routes")}><Compass size={19}/>熱門路線</button></div><label className={s.search}><Search size={18}/><input aria-label="搜尋目的地或旅程" placeholder="你想去邊？" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
        <div className={s.sectionTitle}><div><h2>{category==="airport" ? "落機之後，一齊返屋企。" : "熟悉嘅路，識個新同路人。"}</h2><p>{category==="airport" ? "唔使同一班機，時間同路線啱就得。" : "返工、收工、出街，總有人同你順路。"}</p></div><span>{posts.length} 個示範旅程</span></div>
        <div className={s.feed}>{posts.map((p,i)=><article className={s.card} key={p.id}><button className={s.cardOpen} onClick={()=>setSelected(p)} aria-label={`睇旅程：${p.title}`}><div className={`${s.cardCover} ${i%3===1 ? s.tall : ""}`}><RouteCover scene={p.cover}/><span className={s.coverBadge}>{p.rideKind==="airport" ? <Plane size={12}/> : <CarFront size={12}/>} {p.direction==="to_airport" ? "出發去機場" : p.rideKind==="airport" ? "落機返屋企" : "日常同路"}</span><span className={s.coverArrow}><ArrowUpRight size={17}/></span></div><div className={s.cardBody}><h3>{p.title}</h3><div className={s.route}><MapPin size={13}/><span>{p.fromLabel}<ArrowRight size={12}/>{p.toLabel}</span></div><div className={s.cardTime}><Clock3 size={13}/>{dateLabel(p.date,today)} {p.time}</div><div className={s.seats}><span className={s.seatDots}>{[0,1,2,3].map(n=><i key={n} data-filled={n<p.seatsUsed+Number(interested.includes(p.id))}/>)}</span><span>{p.seatsUsed+Number(interested.includes(p.id))} / {p.seatsTotal} 人有興趣</span></div><div className={s.author}><Image src={`/avatars/animals/${p.avatar}.png`} alt="" width={25} height={25}/><span>{p.author}</span><span className={s.authorHint}>同路友</span></div></div></button><button className={s.save} aria-label={interested.includes(p.id)?"取消興趣":"我有興趣"} aria-pressed={interested.includes(p.id)} onClick={()=>setInterested(interested.includes(p.id)?interested.filter(id=>id!==p.id):[...interested,p.id])}><Heart size={17} fill={interested.includes(p.id)?"currentColor":"none"}/></button></article>)}</div>
        {!posts.length && <div className={s.empty}><Search size={32}/><h3>暫時搵唔到同路人</h3><p>試吓另一個地區，或者清除搜尋。</p><button onClick={()=>setQuery("")}>清除搜尋</button></div>}
        <div className={s.feedEnd}><span/> 每段路，都可以有個伴。<span/></div>
      </section>
    </main>
    <nav className={s.bottomNav} aria-label="主要導覽"><button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}><House/><span>首頁</span></button><button onClick={()=>document.querySelector<HTMLInputElement>("input")?.focus()}><Search/><span>搜尋</span></button><button onClick={()=>setSelected(posts[0]??null)} className={s.publishNav}><Plus/><span>發佈</span></button><button onClick={()=>setSelected(posts[0]??null)}><MessageCircle/><span>訊息</span></button><button onClick={()=>setSelected(posts[0]??null)}><UserRound/><span>我的</span></button></nav>
    {selected && <div className={s.overlay} onClick={()=>setSelected(null)}><section className={s.dialog} role="dialog" aria-modal="true" aria-label="旅程詳情" onClick={e=>e.stopPropagation()}><button className={s.close} onClick={()=>setSelected(null)} aria-label="關閉"><X/></button><div className={s.detailCover}><RouteCover scene={selected.cover}/></div><div className={s.detailBody}><span className={s.kicker}>示範旅程 · {selected.author}</span><h2>{selected.title}</h2><p>{selected.description}</p><div className={s.detailRoute}>{selected.fromLabel}<ArrowRight/>{selected.toLabel}</div><p>{dateLabel(selected.date,today)} {selected.time} · {selected.meeting}</p><button className={s.primary} onClick={()=>setInterested(interested.includes(selected.id)?interested.filter(id=>id!==selected.id):[...interested,selected.id])}><Heart size={18}/>{interested.includes(selected.id)?"取消興趣":"我有興趣"}</button><small>只記錄示範意向，唔代表已預訂座位。</small></div></section></div>}
  </div>;
}
