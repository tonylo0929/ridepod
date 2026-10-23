"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import s from "./preview.module.css";

export function Modal({
  label,
  onClose,
  children,
  wide = false,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      // React can remove the dialog before native close() restores the opener.
      queueMicrotask(() => {
        if (!document.querySelector("dialog[open]")) {
          const target = opener?.isConnected && !opener.closest("dialog")
            ? opener
            : document.querySelector<HTMLElement>('nav[aria-label="主要導覽"] button');
          target?.focus({ preventScroll: true });
        }
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${s.dialog} ${wide ? s.wideDialog : ""}`}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, summary, [tabindex]',
        )).filter((el) => el.tabIndex >= 0 && !el.matches(':disabled, [inert] *') && el.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <button className={s.close} onClick={onClose} aria-label="關閉">
        <X size={20} />
      </button>
      {children}
    </dialog>
  );
}
