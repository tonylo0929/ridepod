"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react";
import {
  automaticCover,
  covers,
  generatePost,
  type CoverId,
  type Journey,
} from "./data";
import { Modal } from "./modal";
import { RouteCover } from "./route-cover";
import s from "./preview.module.css";

export function CreatePost({
  today,
  onClose,
  onPublish,
}: {
  today: string;
  onClose: () => void;
  onPublish: (post: Journey) => void;
}) {
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Journey["rideKind"]>("airport");
  const [direction, setDirection] =
    useState<Journey["direction"]>("from_airport");
  const [origin, setOrigin] = useState("香港機場");
  const [destination, setDestination] = useState("屯門");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("21:30");
  const [seats, setSeats] = useState(3);
  const [luggage, setLuggage] = useState(1);
  const [wait, setWait] = useState(20);
  const [flight, setFlight] = useState("");
  const [flightTime, setFlightTime] = useState("");
  const [meeting, setMeeting] = useState("");
  const [message, setMessage] = useState("");
  const [cover, setCover] = useState<CoverId | "auto">("auto");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const chosenCover = cover === "auto" ? automaticCover(kind, time) : cover;
  const draftInput = {
    rideKind: kind,
    direction: kind === "airport" ? direction : null,
    fromLabel: origin.trim(),
    toLabel: destination.trim(),
    date,
    time,
    luggage,
    wait,
  };

  function generate() {
    const result = generatePost(draftInput, today);
    setTitle(result.title);
    setDescription(
      `${result.description}${message.trim() ? `\n\n${message.trim()}` : ""}`,
    );
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !origin.trim() ||
      !destination.trim() ||
      origin.trim() === destination.trim()
    ) {
      setError("請填寫唔同嘅出發地同目的地。");
      return;
    }
    if (
      kind === "airport" &&
      flightTime &&
      direction === "from_airport" &&
      flightTime > time
    ) {
      setError("預計出到機場嘅時間，應該喺航班抵達之後。");
      return;
    }
    setError("");
    generate();
    setStep(2);
  }

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("標題同內文都要填寫。咁先知你想去邊！");
      return;
    }
    onPublish({
      ...draftInput,
      id: `local-${crypto.randomUUID()}`,
      title: title.trim(),
      description: description.trim(),
      author: "你",
      avatar: "duck",
      cover: chosenCover,
      seatsUsed: 1,
      seatsTotal: seats + 1,
      flight: kind === "airport" ? flight.trim().toUpperCase() : "",
      flightTime: kind === "airport" ? flightTime : "",
      luggage: kind === "airport" ? luggage : 0,
      wait: kind === "airport" ? wait : 0,
      meeting: meeting.trim() || "集合位置再傾",
      mine: true,
    });
  }

  return (
    <Modal label="發佈示範旅程" onClose={onClose} wide>
      <div className={s.formHeader}>
        <span className={s.kicker}>SHARE YOUR NEXT JOURNEY</span>
        <h2>分享你嘅下一程。</h2>
        <p>填好行程，我哋幫你寫。唔使上載相。</p>
        <div className={s.steps}>
          <span data-current={step === 1}>01 行程資料</span>
          <ArrowRight size={14} />
          <span data-current={step === 2}>02 預覽發佈</span>
        </div>
      </div>
      {step === 1 ? (
        <form onSubmit={next} className={s.form}>
          <div className={s.formGrid}>
            <label>
              旅程類型
              <select
                value={kind}
                onChange={(e) => {
                  const value = e.target.value as Journey["rideKind"];
                  setKind(value);
                  setOrigin(value === "airport" ? "香港機場" : "屯門市廣場");
                  setDestination(value === "airport" ? "屯門" : "中環");
                  setDirection("from_airport");
                }}
              >
                <option value="airport">機場同路</option>
                <option value="one_off">日常同路</option>
                <option value="recurring">定期同路</option>
              </select>
            </label>
            {kind === "airport" && (
              <label>
                旅程方向
                <select
                  value={direction ?? "from_airport"}
                  onChange={(e) => {
                    const value = e.target.value as Journey["direction"];
                    setDirection(value);
                    setOrigin(value === "from_airport" ? "香港機場" : "屯門");
                    setDestination(
                      value === "from_airport" ? "屯門" : "香港機場",
                    );
                  }}
                >
                  <option value="from_airport">落機返屋企</option>
                  <option value="to_airport">出發去機場</option>
                </select>
              </label>
            )}
            <label>
              出發地
              <input
                required
                maxLength={50}
                value={origin}
                readOnly={kind === "airport" && direction === "from_airport"}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </label>
            <label>
              目的地
              <input
                required
                maxLength={50}
                value={destination}
                readOnly={kind === "airport" && direction === "to_airport"}
                onChange={(e) => setDestination(e.target.value)}
              />
            </label>
            <label>
              出發日期
              <input
                required
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              {kind === "airport" && direction === "from_airport"
                ? "預計出到機場時間"
                : "出發時間"}
              <input
                required
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label>
              可供同行嘅人數（唔計自己）
              <select
                value={seats}
                onChange={(e) => setSeats(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} 個位
                  </option>
                ))}
              </select>
            </label>
            {kind === "airport" && (
              <>
                <label>
                  行李數量
                  <select
                    value={luggage}
                    onChange={(e) => setLuggage(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} 個喼
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  航班編號（選填）
                  <input
                    placeholder="例如 CX734"
                    maxLength={10}
                    pattern="[A-Za-z0-9 -]{2,10}"
                    value={flight}
                    onChange={(e) => setFlight(e.target.value)}
                  />
                </label>
                <label>
                  {direction === "from_airport"
                    ? "航班抵達時間（選填）"
                    : "航班起飛時間（選填）"}
                  <input
                    type="time"
                    value={flightTime}
                    onChange={(e) => setFlightTime(e.target.value)}
                  />
                </label>
                <label>
                  最多可以等
                  <select
                    value={wait}
                    onChange={(e) => setWait(Number(e.target.value))}
                  >
                    {[0, 10, 15, 20, 30, 45, 60].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "準時出發" : `${n} 分鐘`}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={s.fieldHint}>
                  {direction === "from_airport"
                    ? "出到機場時間係指過關、拎完行李之後。唔使同一班機都可以同路。"
                    : "出發時間係你出發去機場嘅時間，請預留足夠時間辦理登機。"}
                </p>
              </>
            )}
            <label className={s.fullField}>
              集合地點（選填）
              <input
                maxLength={100}
                placeholder="例如 抵港接機大堂 B"
                value={meeting}
                onChange={(e) => setMeeting(e.target.value)}
              />
            </label>
            <label className={s.fullField}>
              想同大家講啲咩？（選填）
              <textarea
                rows={2}
                maxLength={400}
                placeholder="例如 時間彈性，唔介意等吓大家 😆"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className={s.formError}>
              {error}
            </p>
          )}
          <button className={s.primary} type="submit">
            <Sparkles size={17} />
            幫我寫個帖文
            <ArrowRight size={16} />
          </button>
        </form>
      ) : (
        <form onSubmit={publish} className={s.form}>
          <div className={s.editorPreview}>
            <RouteCover scene={chosenCover} />
            <span>已自動配搭路線封面</span>
          </div>
          <fieldset className={s.coverOptions}>
            <legend>揀個沿途風景</legend>
            <button
              type="button"
              aria-pressed={cover === "auto"}
              onClick={() => setCover("auto")}
            >
              自動配搭
            </button>
            {covers.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={cover === c.id}
                onClick={() => setCover(c.id)}
              >
                <RouteCover scene={c.id} />
                <span>{c.label}</span>
              </button>
            ))}
          </fieldset>
          <label>
            帖文標題
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            帖文內文
            <textarea
              required
              rows={4}
              maxLength={1200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button type="button" className={s.textButton} onClick={generate}>
            <RefreshCw size={13} />
            重新產生文字（會取代目前內容）
          </button>
          <p className={s.fieldHint}>
            可以隨意修改文字。呢個係示範帖文，只會喺目前頁面出現；重新整理後會清除。
          </p>
          {error && (
            <p role="alert" className={s.formError}>
              {error}
            </p>
          )}
          <div className={s.formActions}>
            <button
              type="button"
              className={s.secondary}
              onClick={() => setStep(1)}
            >
              返回修改
            </button>
            <button className={s.primary} type="submit">
              <Check size={17} />
              發佈示範帖文
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
