import s from "./preview.module.css";

export default function Loading() {
  return (
    <div className={s.app} lang="zh-HK" aria-busy="true">
      <main className={s.main}>
        <div className={s.compactIntro}>
          <h1>搵緊同路人…</h1>
        </div>
        <p className={s.demoNote} role="status">
          示範旅程載入中
        </p>
        <div className={s.feed}>
          {Array.from({ length: 8 }, (_, i) => (
            <div className={s.skeleton} key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
