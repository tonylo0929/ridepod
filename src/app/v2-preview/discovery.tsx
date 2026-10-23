"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Backpack,
  CalendarDays,
  CarFront,
  Check,
  Clock3,
  Compass,
  Heart,
  House,
  Luggage,
  MapPin,
  MessageCircle,
  Plane,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  addDays,
  corridors,
  dateLabel,
  normalizeFlight,
  sampleJourneys,
  type Journey,
} from "./data";
import { CreatePost } from "./create-post";
import { Modal } from "./modal";
import { Masonry } from "./masonry";
import { AirportTiming, FlightBadge } from "./airport-info";
import { RouteCover } from "./route-cover";
import { JourneyInterest } from "./journey-interest";
import s from "./preview.module.css";

type Panel = "create" | "filters" | "messages" | "profile" | null;
type Category = "airport" | "routes";

export default function Discovery({ today }: { today: string }) {
  const [category, setCategory] = useState<Category>("airport");
  const [journeys, setJourneys] = useState(() => sampleJourneys(today));
  const [query, setQuery] = useState("");
  const [interested, setInterested] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState<Journey>();
  const [toast, setToast] = useState("");
  const [day, setDay] = useState("");
  const [direction, setDirection] = useState("all");
  const [district, setDistrict] = useState("");
  const [corridor, setCorridor] = useState(corridors[0]);
  const [period, setPeriod] = useState("all");
  const [party, setParty] = useState(1);
  const [maxBags, setMaxBags] = useState(4);
  const [minimumWait, setMinimumWait] = useState(0);
  const [earliest, setEarliest] = useState("");
  const [flight, setFlight] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [sort, setSort] = useState("recommended");
  const searchRef = useRef<HTMLInputElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const app = appRef.current;
    const nav = app?.querySelector("nav");
    if (!app || !nav) return;
    const observer = new ResizeObserver(() => {
      app.style.setProperty("--navigation-height", `${Math.ceil(nav.getBoundingClientRect().height) + 16}px`);
    });
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const params = useSearchParams();
  const selected = journeys.find((p) => p.id === params.get("journey"));
  const filterCount =
    Number(Boolean(day)) +
    Number(direction !== "all" && category === "airport") +
    Number(Boolean(district)) +
    Number(party > 1) +
    Number(period !== "all") +
    Number(category === "airport" && maxBags < 4) +
    Number(category === "airport" && minimumWait > 0) +
    Number(Boolean(earliest)) +
    Number(category === "airport" && Boolean(flight)) +
    Number(category === "routes" && recurring);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function clearFilters() {
    setDay("");
    setDirection("all");
    setDistrict("");
    setParty(1);
    setPeriod("all");
    setMaxBags(4);
    setMinimumWait(0);
    setEarliest("");
    setFlight("");
    setRecurring(false);
    setQuery("");
    setCorridor(corridors[0]);
  }
  function switchCategory(next: Category) {
    setCategory(next);
    clearFilters();
  }
  function openPost(post: Journey) {
    setPanel(null);
    window.history.pushState(
      null,
      "",
      `/v2-preview?journey=${encodeURIComponent(post.id)}`,
    );
  }
  function closePost() {
    window.history.replaceState(null, "", "/v2-preview");
  }
  function startCreate() {
    setEditing(undefined);
    closePost();
    setPanel("create");
  }
  function editPost(post: Journey) {
    setEditing(post);
    closePost();
    setPanel("create");
  }
  function toggleInterest(post: Journey) {
    if (post.mine) {
      notify("呢個係你發佈嘅示範旅程，可以喺「我的」查看。");
      return;
    }
    const hasInterest = interested.includes(post.id);
    setInterested((current) =>
      hasInterest
        ? current.filter((id) => id !== post.id)
        : [...current, post.id],
    );
    notify(
      hasInterest
        ? "已撤回示範興趣。"
        : "已記低你嘅興趣！只供示範，未有預訂座位。",
    );
  }
  const posts = journeys
    .filter((post) => {
      const text =
        `${post.title} ${post.description} ${post.fromLabel} ${post.toLabel} ${post.flight} ${post.author}`.toLowerCase();
      const airport = post.rideKind === "airport";
      if (category === "airport" && !airport) return false;
      if (category === "routes" && airport && corridor !== "機場 → 屯門")
        return false;
      if (query.trim() && !text.includes(query.trim().toLowerCase()))
        return false;
      if (day && post.date !== day) return false;
      if (
        district &&
        !`${post.fromLabel} ${post.toLabel}`.includes(district.trim())
      )
        return false;
      if (post.offeredPlaces < party) return false;
      if (period === "morning" && Number(post.time.slice(0, 2)) >= 12)
        return false;
      if (period === "evening" && Number(post.time.slice(0, 2)) < 17)
        return false;
      if (earliest && post.time < earliest) return false;
      if (category === "airport") {
        if (direction !== "all" && post.direction !== direction) return false;
        if (maxBags < 4 && (post.luggage === undefined || post.luggage > maxBags)) return false;
        if (minimumWait > 0 && (post.wait === undefined || post.wait < minimumWait)) return false;
        if (
          flight.trim() &&
          !normalizeFlight(post.flight).includes(normalizeFlight(flight))
        )
          return false;
      } else {
        if (recurring && post.rideKind !== "recurring") return false;
        if (corridor !== corridors[0]) {
          const [from, to] = corridor.split(" → ");
          if (!post.fromLabel.includes(from) || !post.toLabel.includes(to))
            return false;
        }
      }
      return true;
    })
    .sort((a, b) =>
      sort === "earliest"
        ? `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
        : sort === "seats"
          ? b.offeredPlaces - a.offeredPlaces
          : 0,
    );
  function publish(post: Journey) {
    setJourneys((current) => current.some((p) => p.id === post.id)
      ? current.map((p) => p.id === post.id ? post : p)
      : [post, ...current]);
    switchCategory(post.rideKind === "airport" ? "airport" : "routes");
    setPanel(null);
    openPost(post);
    notify(editing ? "示範修改已儲存！重新整理頁面後會清除。" : "示範帖文已發佈！重新整理頁面後會清除。");
    setEditing(undefined);
  }
  function focusSearch() {
    searchRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    searchRef.current?.focus({ preventScroll: true });
  }
  const interestPosts = journeys.filter((p) => interested.includes(p.id));
  const myPosts = journeys.filter((p) => p.mine);
  const advancedFilterCount = Number(Boolean(earliest)) + (category === "airport"
    ? Number(maxBags < 4) + Number(minimumWait > 0) + Number(Boolean(flight)) : 0);

  return (
    <div className={s.app} ref={appRef} lang="zh-HK">
      <a href="#journeys" className={s.skip}>
        跳至同路動態
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <a className={s.brand} href="/v2-preview">
            <span className={s.brandMark}>
              <CarFront size={23} />
            </span>
            <span>
              Fare<span className={s.wordmarkAccent}>Enough</span>
              <small>同路就夾，車費齊齊慳。</small>
            </span>
          </a>
          <div className={s.desktopLinks}>
            <span className={s.activeLink}>發現同路</span>
            <span>香港 · HONG KONG</span>
          </div>
          <div className={s.headerActions}>
            <span className={s.previewBadge}>V2.3 預覽</span>
            <button
              onClick={startCreate}
              className={s.desktopPublish}
            >
              <Plus size={16} />
              分享行程
            </button>
          </div>
        </div>
      </header>
      <main className={s.main}>
        {params.has("journey") && !selected && (
          <div className={s.invalidPost} role="status">
            呢個示範旅程已清除，或者連結唔正確。
            <button onClick={closePost}>返回發現同路</button>
          </div>
        )}
        <section className={s.compactIntro}>
          <div>
            <h1>下一程，搵個同路人。</h1>
            <p>機場返屋企，返工出街，一齊順路。</p>
          </div>
          <span className={s.introEmblem} aria-hidden="true">
            <CarFront size={27} />
          </span>
        </section>
        <div className={s.demoNote}>
          <span className={s.liveDot} />
          <b>示範旅程</b>
          <span>試吓搵同路人 · 所有互動只供體驗，唔會預訂或收費</span>
        </div>
        <section id="journeys" className={s.discovery}>
          <div className={s.discoverTop}>
            <div className={s.tabs} role="tablist" aria-label="旅程類別">
              {(["airport", "routes"] as const).map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  role="tab"
                  tabIndex={category === tab ? 0 : -1}
                  aria-selected={category === tab}
                  aria-controls="journey-panel"
                  onClick={() => switchCategory(tab)}
                  onKeyDown={(event) => {
                    if (
                      ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "airport"
                          : event.key === "End"
                            ? "routes"
                            : category === "airport"
                              ? "routes"
                              : "airport";
                      switchCategory(next);
                      document.getElementById(`tab-${next}`)?.focus();
                    }
                  }}
                >
                  {tab === "airport" ? (
                    <Plane size={19} />
                  ) : (
                    <Compass size={19} />
                  )}
                  {tab === "airport" ? "機場同路" : "熱門路線"}
                </button>
              ))}
            </div>
            <label className={s.search}>
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label="搜尋目的地或旅程"
                placeholder="你想去邊？"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="清除搜尋" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
          {category === "airport" && (
            <div className={s.airportDirections} role="group" aria-label="機場方向">
              {([
                ["to_airport", "✈️", "準備飛啦！", "去機場"],
                ["from_airport", "🧳", "落機返屋企！", "由機場出發"],
              ] as const).map(([value, icon, title, subtitle]) => (
                <button
                  key={value}
                  type="button"
                  className={s.airportDirection}
                  aria-pressed={direction === value}
                  onClick={() => setDirection(direction === value ? "all" : value)}
                >
                  <span className={s.directionIcon} aria-hidden="true">{icon}</span>
                  <span className={s.directionTitle}>{title}</span>
                  <span className={s.directionSubtitle}>{subtitle}</span>
                  <span className={s.directionCheck} aria-hidden="true">
                    {direction === value && <Check size={14} strokeWidth={3} />}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className={s.filterBar}>
            <div className={s.quickFilters} data-category={category}>
              <button aria-pressed={!day} onClick={() => setDay("")}>
                全部日期
              </button>
              <button
                aria-pressed={day === today}
                onClick={() => setDay(day === today ? "" : today)}
              >
                今日
              </button>
              <button
                aria-pressed={day === addDays(today, 1)}
                onClick={() =>
                  setDay(day === addDays(today, 1) ? "" : addDays(today, 1))
                }
              >
                聽日
              </button>
              {category === "routes" && (
                <>
                  <button
                    aria-pressed={period === "morning"}
                    onClick={() =>
                      setPeriod(period === "morning" ? "all" : "morning")
                    }
                  >
                    朝早
                  </button>
                  <button
                    aria-pressed={period === "evening"}
                    onClick={() =>
                      setPeriod(period === "evening" ? "all" : "evening")
                    }
                  >
                    傍晚
                  </button>
                  <button
                    aria-pressed={recurring}
                    onClick={() => setRecurring(!recurring)}
                  >
                    定期同路
                  </button>
                </>
              )}
            </div>
            <button
              className={s.filterButton}
              onClick={() => setPanel("filters")}
            >
              <SlidersHorizontal size={15} />
              篩選{filterCount > 0 && <b>{filterCount}</b>}
            </button>
          </div>
          {category === "airport" && (
            <label className={s.flightSearch}>
              <Plane size={16} />
              <span>搵航班</span>
              <input
                aria-label="按航班編號篩選"
                value={flight}
                placeholder="例如 CX734（選填）"
                maxLength={10}
                onChange={(e) => setFlight(normalizeFlight(e.target.value))}
              />
              {flight && (
                <button onClick={() => setFlight("")} aria-label="清除航班篩選">
                  <X size={15} />
                </button>
              )}
            </label>
          )}
          {category === "routes" && (
            <div className={s.corridors} role="group" aria-label="熱門同路走廊">
              {corridors.map((route) => (
                <button
                  key={route}
                  aria-pressed={corridor === route}
                  onClick={() => setCorridor(route)}
                >
                  {route}
                </button>
              ))}
            </div>
          )}
          <div
            role="tabpanel"
            id="journey-panel"
            aria-labelledby={`tab-${category}`}
          >
            <div className={s.sectionTitle}>
              <div>
                <h2>
                  {category === "airport"
                    ? direction === "to_airport"
                      ? "準備飛，一齊去機場。"
                      : "落機之後，一齊返屋企。"
                    : "熟悉嘅路，識個新同路人。"}
                </h2>
                <p>
                  {category === "airport"
                    ? "唔使同一班機，時間同路線啱就得。"
                    : "乘客自己搵同路人嘅走廊，唔係固定班次或派車服務。"}
                </p>
              </div>
              <label className={s.sortLabel}>
                <span className={s.srOnly}>排序方式</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="recommended">為你推薦</option>
                  <option value="earliest">最早出發</option>
                  <option value="seats">同行名額較多</option>
                </select>
              </label>
            </div>
            <div className={s.resultsLine}>
              <span aria-live="polite">{posts.length} 個示範旅程</span>
              {(filterCount > 0 || query || corridor !== corridors[0]) && (
                <button onClick={clearFilters}>
                  清除篩選 <X size={11} />
                </button>
              )}
            </div>
            <Masonry>
              {posts.map((post, index) => (
                <article className={s.card} key={post.id} data-journey-id={post.id}>
                  <button
                    className={s.cardOpen}
                    aria-describedby={`journey-author-${post.id}`}
                    onClick={() => openPost(post)}
                  >
                    <div
                      className={`${s.cardCover} ${index % 3 === 1 ? s.tall : ""}`}
                    >
                      <RouteCover scene={post.cover} />
                      <span className={s.coverBadge}>
                        {post.rideKind === "airport" ? (
                          <Plane size={12} />
                        ) : (
                          <CarFront size={12} />
                        )}{" "}
                        {post.direction === "to_airport"
                          ? "出發去機場"
                          : post.rideKind === "airport"
                            ? "落機返屋企"
                            : post.rideKind === "recurring"
                              ? "定期同路"
                              : "日常同路"}
                      </span>
                      <span className={s.coverArrow}>
                        <ArrowUpRight size={17} />
                      </span>
                    </div>
                    <div className={s.cardBody}>
                      <h3 className={s.routeMain}>
                        <span>{post.fromLabel}</span>
                        <ArrowRight size={15} />
                        <span className={s.srOnly}>去</span>
                        <span>{post.toLabel}</span>
                      </h3>
                      <div className={s.cardTime}>
                        <Clock3 size={14} />
                        <span>
                          {dateLabel(post.date, today)} <b>{post.time}</b>
                          <small>
                            {post.rideKind === "airport" ? "夾車出發" : "出發"}
                          </small>
                        </span>
                      </div>
                      {post.rideKind === "airport" && (
                        <FlightBadge flight={post.flight} />
                      )}
                      <JourneyInterest journey={post} interested={interested.includes(post.id)} />
                    </div>
                  </button>
                  <div className={s.cardFooter}>
                      <div className={s.author} id={`journey-author-${post.id}`}>
                        <Image
                          src={`/avatars/animals/${post.avatar}.png`}
                          alt=""
                          width={25}
                          height={25}
                        />
                        <span>{post.mine ? "你 · 發帖人" : post.author}</span>
                      </div>
                  {!post.mine && <button
                    className={s.save}
                    aria-label={`${interested.includes(post.id) ? "撤回興趣" : "我有興趣"}：${post.title}`}
                    aria-pressed={interested.includes(post.id)}
                    onClick={() => toggleInterest(post)}
                  >
                    <Heart
                      size={17}
                      fill={
                        interested.includes(post.id) ? "currentColor" : "none"
                      }
                    />
                  </button>}
                  </div>
                </article>
              ))}
            </Masonry>
            {!posts.length && (
              <div className={s.empty}>
                <Compass size={36} />
                <h3>呢個時間，仲未搵到同路人。</h3>
                <p>試吓放寬時間或地區，又或者分享自己嘅行程。</p>
                <div className={s.formActions}>
                  <button onClick={clearFilters}>清除篩選</button>
                  <button onClick={startCreate}>
                    分享行程 <Plus size={14} />
                  </button>
                </div>
              </div>
            )}
            <div className={s.feedEnd}>
              <span /> 每段路，都可以有個伴。
              <span />
            </div>
          </div>
        </section>
      </main>
      <nav className={s.bottomNav} aria-label="主要導覽">
        <button
          onClick={() => {
            closePost();
            setPanel(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-current={!panel && !selected ? "page" : undefined}
        >
          <House />
          <span>首頁</span>
        </button>
        <button onClick={focusSearch}>
          <Search />
          <span>搜尋</span>
        </button>
        <button onClick={startCreate} className={s.publishNav}>
          <Plus />
          <span>發佈</span>
        </button>
        <button
          aria-label="訊息"
          onClick={() => setPanel("messages")}
          aria-current={panel === "messages" ? "page" : undefined}
        >
          <MessageCircle />
          {interested.length > 0 && (
            <i className={s.navCount}>{interested.length}</i>
          )}
          <span>訊息</span>
        </button>
        <button
          onClick={() => setPanel("profile")}
          aria-current={panel === "profile" ? "page" : undefined}
        >
          <UserRound />
          <span>我的</span>
        </button>
      </nav>

      {selected && (
        <Modal label="旅程詳情" onClose={closePost}>
          <div className={s.detailCover}>
            <span className={s.detailTag}>
              示範旅程 ·{" "}
              {selected.rideKind === "airport" ? "機場同路" : "日常同路"}
            </span>
            <RouteCover scene={selected.cover} fit="contain" />
          </div>
          <div className={s.detailBody}>
            <div className={s.detailAuthor}>
              <Image
                src={`/avatars/animals/${selected.avatar}.png`}
                alt=""
                width={42}
                height={42}
              />
              <div>
                <b>{selected.author}</b>
                <span>{selected.mine ? "你係呢程嘅發帖人" : "FareEnough 同路友 · 示範人物"}</span>
              </div>
              <span className={s.softBadge}>{selected.mine ? "我發佈嘅旅程" : "同路傾吓"}</span>
            </div>
            {selected.rideKind === "airport" && (
              <FlightBadge flight={selected.flight} />
            )}
            <h2>{selected.title}</h2>
            <p className={s.description}>{selected.description}</p>
            <div className={s.detailRoute}>
              <div>
                <small>由呢度出發</small>
                {selected.fromLabel}
              </div>
              <ArrowRight size={22} />
              <div>
                <small>一齊去</small>
                {selected.toLabel}
              </div>
            </div>
            <div className={s.detailGrid}>
              <div>
                <CalendarDays />
                <span>
                  出發日期
                  <b>
                    {dateLabel(selected.date, today)} · {selected.date}
                  </b>
                </span>
              </div>
              <div>
                <Clock3 />
                <span>
                  預計夾車出發
                  <b>{selected.time}</b>
                </span>
              </div>
              <div className={s.detailParticipants}>
                <Users />
                <span>
                  計劃同行人數
                  <b>發帖人 1 人 + 同行名額 {selected.offeredPlaces} 個</b>
                  <JourneyInterest journey={selected} interested={interested.includes(selected.id)} />
                </span>
              </div>
              <div>
                <MapPin />
                <span>
                  集合地點<b>{selected.meeting}</b>
                </span>
              </div>
              {selected.rideKind === "airport" && (
                <>
                  {selected.luggage !== undefined && <div>
                    <Luggage />
                    <span>
                      發帖人嘅行李<b>{selected.luggage} 個喼</b>
                    </span>
                  </div>}
                  {selected.wait !== undefined && <div>
                    <Clock3 />
                    <span>
                      最多可以等<b>{selected.wait} 分鐘</b>
                    </span>
                  </div>}
                </>
              )}
            </div>
            {selected.rideKind === "airport" && (
              <section className={s.airportTimes} aria-label="航班與夾車時間">
                <h3>
                  {selected.direction === "from_airport"
                    ? "落機、出閘、出發，分清楚。"
                    : "夾車出發同起飛，分清楚。"}
                </h3>
                <AirportTiming journey={selected} today={today} />
                <p>
                  {selected.direction === "from_airport"
                    ? "出閘係過關、拎完行李之後；出發係計劃夾車嘅時間。唔同航班都可以同路。"
                    : "夾車出發係由集合地點開車去機場嘅時間。請自行預留到機場、辦理登機同安檢嘅時間。"}
                </p>
                <small>
                  所有時間：香港時間 · 24 小時制。航班資料只供示範，未有即時追蹤。
                </small>
              </section>
            )}
            <div className={s.detailFooter}>
              {selected.mine ? <>
                <p className={s.ownerNotice}>你係發帖人，可以修改呢程嘅示範資料。</p>
                <button className={s.primary} onClick={() => editPost(selected)}>編輯旅程</button>
              </> : <>
              <button
                className={s.primary}
                onClick={() => toggleInterest(selected)}
              >
                {interested.includes(selected.id) ? (
                  <Check size={18} />
                ) : (
                  <Heart size={18} />
                )}
                {interested.includes(selected.id) ? "撤回興趣" : "我有興趣"}
              </button>
              </>}
              <small>興趣人數唔計發帖人，亦唔代表已預訂或確認共乘。呢度未有確認乘客或餘位資料；唔會收費。</small>
            </div>
          </div>
        </Modal>
      )}
      {panel === "create" && (
        <CreatePost
          key={editing?.id ?? "new"}
          today={today}
          initialJourney={editing}
          onClose={() => setPanel(null)}
          onPublish={publish}
        />
      )}
      {panel === "filters" && (
        <Modal label="篩選同路旅程" onClose={() => setPanel(null)}>
          <div className={s.formHeader}>
            <span className={s.kicker}>FIND YOUR PEOPLE</span>
            <h2>搵個啱你嘅同路人。</h2>
            <p>唔使完全一樣，時間夾到就得。</p>
          </div>
          <div className={s.form}>
            <div className={s.formGrid}>
              <label>
                出發日期
                <input
                  type="date"
                  min={today}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                />
              </label>
              <label>
                {category === "airport" ? "想去邊區？" : "出發地或目的地"}
                <input
                  placeholder="例如 屯門"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </label>
              <label>
                想搵幾多個同行名額？
                <select
                  value={party}
                  onChange={(e) => setParty(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      最少 {n} 個
                    </option>
                  ))}
                </select>
              </label>
              {category === "airport" ? (
                <>
                  <label>
                    旅程方向
                    <select
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                    >
                      <option value="all">全部方向</option>
                      <option value="from_airport">落機返屋企</option>
                      <option value="to_airport">出發去機場</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label>
                    出發時段
                    <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                      <option value="all">任何時間</option>
                      <option value="morning">朝早 · 12:00 前</option>
                      <option value="evening">傍晚 · 17:00 後</option>
                    </select>
                  </label>
                  <label className={s.checkLabel}>
                    <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                    只睇定期旅程
                  </label>
                </>
              )}
              <p className={s.fieldHint}>同行名額唔計發帖人，唔係已確認餘位。</p>
              <details className={`${s.optionalFields} ${s.fullField}`}>
                <summary>更多條件{advancedFilterCount ? `（${advancedFilterCount} 項已選）` : "（選填）"}</summary>
                <div className={s.formGrid}>
                  <label>
                    幾點之後夾車出發？
                    <input type="time" value={earliest} onChange={(e) => setEarliest(e.target.value)} />
                  </label>
                  {category === "airport" && <>
                  <label>
                    對方最多帶幾多個喼？
                    <select
                      value={maxBags}
                      onChange={(e) => setMaxBags(Number(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option value={n} key={n}>
                          {n === 4 ? "唔限" : `${n} 個或以下`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    對方最少等到幾耐？
                    <select
                      value={minimumWait}
                      onChange={(e) => setMinimumWait(Number(e.target.value))}
                    >
                      {[0, 15, 20, 30].map((n) => (
                        <option key={n} value={n}>
                          {n === 0 ? "唔限" : `${n} 分鐘`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    航班編號（選填）
                    <input
                      placeholder="唔同航班都可以"
                      maxLength={10}
                      value={flight}
                      onChange={(e) =>
                        setFlight(normalizeFlight(e.target.value))
                      }
                    />
                  </label>
                  <p className={s.fieldHint}>
                    時間篩選以計劃夾車出發時間為準。同行名額只係發帖人嘅計劃，唔係已確認餘位；有啟用行李或等候篩選時，未提供資料嘅旅程唔會顯示。
                  </p>
                  </>}
                </div>
              </details>
            </div>
            <div className={s.formActions}>
              <button className={s.secondary} onClick={clearFilters}>
                重設
              </button>
              <button className={s.primary} onClick={() => setPanel(null)}>
                睇 {posts.length} 個旅程 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}
      {(panel === "messages" || panel === "profile") && (
        <Modal
          label={panel === "messages" ? "示範訊息中心" : "我的示範旅程"}
          onClose={() => setPanel(null)}
        >
          <div className={s.formHeader}>
            <span className={s.kicker}>
              {panel === "messages"
                ? "A CONNECTION STARTS HERE"
                : "YOUR LITTLE JOURNEY BOOK"}
            </span>
            <h2>
              {panel === "messages"
                ? "同路，由打個招呼開始。"
                : "你嘅同路小記。"}
            </h2>
            <p>
              {panel === "messages"
                ? "呢度可以重溫有興趣嘅旅程。真人聊天會喺之後開放。"
                : "唔使登入都可以試。示範資料會喺重新整理後清除。"}
            </p>
          </div>
          <div className={s.form}>
            <div className={s.profileStats}>
              <span>
                <b>{myPosts.length}</b>已發佈旅程
              </span>
              <span>
                <b>{interestPosts.length}</b>有興趣旅程
              </span>
            </div>
            {panel === "profile" && (
              <>
                <h3 className={s.listTitle}>我發佈嘅旅程</h3>
                {myPosts.length ? (
                  myPosts.map((p) => (
                    <MiniPost
                      key={p.id}
                      post={p}
                      today={today}
                      interested={interested.includes(p.id)}
                      open={() => openPost(p)}
                    />
                  ))
                ) : (
                  <p className={s.panelHint}>
                    仲未分享行程。下一程，不如試吓搵個伴？
                  </p>
                )}
                <button
                  className={s.secondary}
                  onClick={startCreate}
                >
                  <Plus size={15} />
                  分享下一程
                </button>
              </>
            )}
            <h3 className={s.listTitle}>我有興趣嘅旅程</h3>
            {interestPosts.length ? (
              interestPosts.map((p) => (
                <MiniPost
                  key={p.id}
                  post={p}
                  today={today}
                  interested={interested.includes(p.id)}
                  open={() => openPost(p)}
                />
              ))
            ) : (
              <div className={s.panelEmpty}>
                <MessageCircle size={28} />
                <p>見到啱嘅旅程，撳「我有興趣」就會喺呢度出現。</p>
                <button className={s.secondary} onClick={() => setPanel(null)}>
                  返去搵同路人
                </button>
              </div>
            )}
            <div className={s.flightInfo}>
              <Backpack size={20} />
              <p>
                呢個版本只試玩發現同路人嘅流程。唔會傳送訊息、配對司機、預訂、派車或處理付款。
              </p>
            </div>
          </div>
        </Modal>
      )}
      <div className={s.toast} role="status" aria-live="polite">
        {toast && (
          <>
            <Check size={17} />
            <span>{toast}</span>
            <button aria-label="關閉提示" onClick={() => setToast("")}>
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MiniPost({
  post,
  today,
  interested,
  open,
}: {
  post: Journey;
  today: string;
  interested: boolean;
  open: () => void;
}) {
  return (
    <button className={s.miniPost} onClick={open}>
      <div>
        <RouteCover scene={post.cover} />
      </div>
      <span>
        <b>
          {post.fromLabel} → {post.toLabel}
        </b>
        <small>
          {dateLabel(post.date, today)} {post.time} 夾車出發 · {post.mine ? "你係發帖人" : post.author}
        </small>
        <JourneyInterest journey={post} interested={interested} />
      </span>
      <ArrowUpRight size={17} />
    </button>
  );
}
