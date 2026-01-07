/** @jsxImportSource @emotion/react */
import { useEffect } from "react";
import * as s from "./style";

export default function Modal({ open, title, children, onClose, actions }) {
  useEffect(() => {
    const onEsc = (e)=> e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div css={s.backdrop} onClick={onClose}>
      <div css={s.sheet} onClick={(e)=>e.stopPropagation()}>
        <header css={s.head}>
          <strong>{title}</strong>
          <button onClick={onClose} css={s.xBtn} aria-label="close">×</button>
        </header>
        <div css={s.body}>{children}</div>
        {actions && <footer css={s.foot}>{actions}</footer>}
      </div>
    </div>
  );
}
