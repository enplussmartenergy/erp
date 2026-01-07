/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { card } from "../styles/primitives";

const head = css` font-weight:800; margin-bottom:8px; `;

export default function Card({ title, children, className }) {
  return (
    <section css={card} className={className}>
      {title && <div css={head}>{title}</div>}
      {children}
    </section>
  );
}
