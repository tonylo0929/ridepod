"use client";
import s from "./preview.module.css";

export default function PreviewError({ reset }: { reset: () => void }) {
  return (
    <div className={s.app} lang="zh-HK">
      <main className={s.empty}>
        <h1>呢程暫時卡住咗。</h1>
        <p>旅程預覽未能載入，試多次就得。示範互動未有儲存。</p>
        <button onClick={reset}>重新載入</button>
        <a href="/v2-preview">返回發現同路</a>
      </main>
    </div>
  );
}
