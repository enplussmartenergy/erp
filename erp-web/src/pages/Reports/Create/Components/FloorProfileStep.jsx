/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

/**
 * props
 * - floors: 기존 형식 [{ level:1, zones:"", use:"", area:"" }, ...] 또는
 *           새 형식 [{ isBasement:true|false, no:1, label:"B1"|"1", zones, use, area, group }]
 * - setFloors(nextFloors)
 *
 * ✅ PDF(나. 건물 용도 프로필)에서 "구분" 칼럼까지 쓰려고 floors item에 group(예: "주1") 필드를 추가함.
 *    - 기존 데이터에는 group이 없을 수 있으니 normalize에서 기본값 "주1" 부여
 */

const COLORS = {
  primary: "#2563EB",
  ring: "rgba(37,99,235,.16)",
  line: "#E7ECF2",
  card: "#FCFEFF",
  text: "#0F172A",
  muted: "#64748B",
};

const section = css`
  background: #fff;
  border: 1px solid ${COLORS.line};
  border-radius: 14px;
  padding: 18px;
  overflow: hidden;
`;
const header = css`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: ${COLORS.text};
  }
  small {
    color: ${COLORS.muted};
  }
`;
const countersRow = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 8px 0 6px;
  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;
const counter = css`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid ${COLORS.line};
  border-radius: 10px;
  background: #fff;
  > span {
    font-weight: 800;
    color: ${COLORS.text};
    min-width: 5.5rem;
  }
  input {
    width: 70px;
    height: 36px;
    text-align: center;
    border: 1px solid ${COLORS.line};
    border-radius: 8px;
    font-size: 1.05rem;
  }
  button {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid ${COLORS.line};
    background: #fff;
    font-weight: 900;
  }
  input:focus,
  button:focus {
    outline: none;
    box-shadow: 0 0 0 0.28rem ${COLORS.ring};
    border-color: ${COLORS.primary};
  }
`;

const note = css`
  color: ${COLORS.muted};
  font-size: 0.95rem;
`;

const floorCard = css`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.line};
  border-radius: 12px;
  padding: 14px;
  min-width: 0;
  & + & {
    margin-top: 10px;
  }
`;
const row = css`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
`;
const badge = css`
  min-width: 54px;
  height: 54px;
  border-radius: 12px;
  background: #fff;
  border: 2px solid ${COLORS.primary};
  color: ${COLORS.primary};
  display: grid;
  place-items: center;
  font-weight: 900;
`;
const grid = css`
  display: grid;
  gap: 10px 12px;
  grid-template-columns: 0.55fr 1.4fr 1fr 0.7fr; /* ✅ 구분(group) 칼럼 추가 */
  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;
const field = css`
  display: grid;
  gap: 6px;
  min-width: 0;
  label {
    font-weight: 700;
    color: ${COLORS.text};
    font-size: 1.05rem;
  }
  small {
    color: ${COLORS.muted};
  }
`;
const input = css`
  height: 42px;
  padding: 0 12px;
  border: 1px solid ${COLORS.line};
  border-radius: 10px;
  background: #fff;
  font-size: 1.1rem;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  &::placeholder {
    color: #98a2b3;
  }
  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 0.32rem ${COLORS.ring};
  }
`;
const chips = css`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  button {
    height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid ${COLORS.line};
    font-weight: 800;
  }
  button[aria-pressed="true"] {
    color: ${COLORS.primary};
    border-color: ${COLORS.primary};
    background: rgba(37, 99, 235, 0.08);
    box-shadow: 0 0 0 0.24rem ${COLORS.ring};
  }
`;

const USES = ["업무", "상업", "공용", "주거", "기타"];
const clamp = (n, a, b) => Math.max(a, Math.min(b, (n | 0) || 0));

/* -------- helpers: normalize & builders -------- */
const DEFAULT_GROUP = "주1";
const toLabel = (isBasement, no) => (isBasement ? `B${no}` : `${no}`);

function normalizeFloors(input) {
  if (!Array.isArray(input) || !input.length) return [];
  return input.map((f) => {
    // 구버전 호환: level이 음수거나 'B1' 형태면 지하로 판단
    let isB = false,
      no = 1;

    if (typeof f.level === "string" && /^B\d+$/i.test(f.level)) {
      isB = true;
      no = parseInt(f.level.slice(1), 10) || 1;
    } else if (typeof f.level === "number" && f.level < 0) {
      isB = true;
      no = Math.abs(f.level);
    } else if (typeof f.level === "number") {
      isB = false;
      no = f.level;
    } else if (typeof f.isBasement === "boolean" && typeof f.no === "number") {
      isB = f.isBasement;
      no = f.no;
    }

    const isBasement = "isBasement" in f ? f.isBasement : isB;
    const num = "no" in f ? f.no : no;

    return {
      // ✅ 표 컬럼용
      group: f.group || DEFAULT_GROUP,

      // ✅ 층 식별
      isBasement,
      no: num,
      label: f.label || toLabel(isBasement, num),

      // ✅ 입력 필드
      zones: f.zones || "",
      use: f.use || "",
      area: f.area || "",
    };
  });
}

function buildList(bCount, aCount) {
  const b = Array.from({ length: bCount }, (_, i) => ({
    group: DEFAULT_GROUP,
    isBasement: true,
    no: bCount - i, // B{n}..B1
    label: toLabel(true, bCount - i),
    zones: "",
    use: "",
    area: "",
  }));

  const a = Array.from({ length: aCount }, (_, i) => ({
    group: DEFAULT_GROUP,
    isBasement: false,
    no: i + 1,
    label: toLabel(false, i + 1),
    zones: "",
    use: "",
    area: "",
  }));

  return [...b, ...a];
}

export default function FloorProfileStep({ floors, setFloors }) {
  const normalized = normalizeFloors(floors);
  const hasAny = normalized.length > 0;

  // 지하/지상 카운트 계산
  const bInit = hasAny ? normalized.filter((f) => f.isBasement).length : 0;
  const aInit = hasAny ? normalized.filter((f) => !f.isBasement).length : 1;

  const setCount = (bCount, aCount) => {
    const nb = clamp(bCount, 0, 10); // 지하 최대 10
    const na = clamp(aCount, 1, 60); // 지상 1~60
    const next = buildList(nb, na);

    // 기존에 입력해둔 값 보존(동일 label 매칭)
    const dict = Object.fromEntries(normalized.map((f) => [f.label, f]));
    next.forEach((n) => {
      const old = dict[n.label];
      if (old) {
        n.group = old.group || DEFAULT_GROUP;
        n.zones = old.zones;
        n.use = old.use;
        n.area = old.area;
      }
    });

    setFloors(next);
  };

  const setField = (label, k, v) => {
    const base = normalized.length ? normalized : buildList(bInit, aInit);
    const next = base.map((f) => (f.label === label ? { ...f, [k]: v } : f));
    setFloors(next);
  };

  // 현재 카운트(표시용)
  const bCount = bInit;
  const aCount = aInit;

  const list = hasAny ? normalized : buildList(bCount, aCount);

  return (
    <section css={section}>
      <div css={header}>
        <h3>층수/프로필</h3>
        <small>지상·지하 층수를 지정하고, 층별 용도/면적을 입력하세요.</small>
      </div>

      <div css={countersRow}>
        <div css={counter}>
          <span>지하 층수</span>
          <button type="button" onClick={() => setCount(bCount - 1, aCount)}>
            -
          </button>
          <input
            type="number"
            min={0}
            max={10}
            value={bCount}
            onChange={(e) => setCount(e.target.value, aCount)}
          />
          <button type="button" onClick={() => setCount(bCount + 1, aCount)}>
            +
          </button>
        </div>

        <div css={counter}>
          <span>지상 층수</span>
          <button type="button" onClick={() => setCount(bCount, aCount - 1)}>
            -
          </button>
          <input
            type="number"
            min={1}
            max={60}
            value={aCount}
            onChange={(e) => setCount(bCount, e.target.value)}
          />
          <button type="button" onClick={() => setCount(bCount, aCount + 1)}>
            +
          </button>
        </div>
      </div>

      <div css={note}>※ 지하는 최대 10층, 지상은 1~60층까지 입력할 수 있어요.</div>

      <div style={{ marginTop: 12 }}>
        {list.map((f) => (
          <div key={f.label} css={floorCard}>
            <div css={row}>
              <div css={badge}>{f.label}</div>

              <div css={grid}>
                {/* ✅ PDF "구분" 칼럼용 */}
                <div css={field}>
                  <label>구분</label>
                  <input
                    css={input}
                    placeholder="예) 주1"
                    value={f.group || DEFAULT_GROUP}
                    onChange={(e) => setField(f.label, "group", e.target.value)}
                  />
                </div>

                <div css={field}>
                  <label>구획/주요실</label>
                  <input
                    css={input}
                    placeholder="예) 사무실/창고/기계실/기숙사 등"
                    value={f.zones || ""}
                    onChange={(e) => setField(f.label, "zones", e.target.value)}
                  />
                </div>

                <div css={field}>
                  <label>주 용도</label>
                  <div css={chips}>
                    {USES.map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={f.use === u}
                        onClick={() => setField(f.label, "use", u)}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div css={field}>
                  <label>면적 (㎡)</label>
                  <input
                    css={input}
                    placeholder="예) 450"
                    inputMode="numeric"
                    value={f.area || ""}
                    onChange={(e) => setField(f.label, "area", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
