"use client";

import { useEffect, useMemo, useState } from "react";

type Savings = {
  area: string; company: string; product: string; productType: string;
  sells: string; guarantees: string; reserve: number; earnRate3: number;
  earnRate5: number; earnRate10: number; avgTotalEarRate: number; avgFeeRate: number;
};
type Retirement = {
  area: string; company: string; reserve: number; earnRate: number;
  earnRate3: number; earnRate5: number; earnRate10: number; costRate: number;
};
type Payload = { savings: Savings[]; retirement: Retirement[]; updatedAt: string; sourcePeriods: { savings: string; retirement: string; cost: string }; notes: string[] };

const fmt = new Intl.NumberFormat("ko-KR");
const pct = (v: number | null | undefined) => Number.isFinite(v) ? `${Number(v).toFixed(2)}%` : "—";
const money = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}조` : `${fmt.format(Math.round(v))}억`;

export default function PensionDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"savings" | "retirement">("savings");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("전체");
  const [period, setPeriod] = useState<"3" | "5" | "10">("3");
  const [sort, setSort] = useState<"return" | "fee" | "reserve">("return");
  const [onlySelling, setOnlySelling] = useState(false);

  const load = () => {
    setLoading(true); setError("");
    fetch("/api/pensions", { cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).message || "데이터를 불러오지 못했습니다."); return r.json(); })
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const source = tab === "savings" ? data.savings : data.retirement;
    return source.filter((r) => {
      const text = `${r.company} ${"product" in r ? r.product : ""}`.toLowerCase();
      return text.includes(query.toLowerCase()) && (area === "전체" || r.area === area) && (!onlySelling || !("sells" in r) || r.sells === "Y");
    }).sort((a, b) => {
      const ar = period === "3" ? a.earnRate3 : period === "5" ? a.earnRate5 : a.earnRate10;
      const br = period === "3" ? b.earnRate3 : period === "5" ? b.earnRate5 : b.earnRate10;
      if (sort === "return") return br - ar;
      if (sort === "reserve") return b.reserve - a.reserve;
      const af = "avgFeeRate" in a ? a.avgFeeRate : a.costRate;
      const bf = "avgFeeRate" in b ? b.avgFeeRate : b.costRate;
      return af - bf;
    });
  }, [data, tab, query, area, period, sort, onlySelling]);

  const areas = useMemo(() => ["전체", ...new Set((data ? (tab === "savings" ? data.savings : data.retirement) : []).map(r => r.area))], [data, tab]);
  const best = rows[0];
  const avg = rows.length ? rows.reduce((s, r) => s + (period === "3" ? r.earnRate3 : period === "5" ? r.earnRate5 : r.earnRate10), 0) / rows.length : 0;

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="연금한눈 홈"><span className="brand-mark">연</span><span>연금한눈</span></a>
      <div className="source-chip"><span className="pulse" /> 금융감독원 공시 API 연결</div>
      <button className="refresh" onClick={load} disabled={loading} aria-label="데이터 새로고침">↻ <span>새로고침</span></button>
    </header>

    <section className="hero" id="top">
      <div>
        <p className="eyebrow">PENSION DISCLOSURE EXPLORER</p>
        <h1>내 연금의 미래,<br/><em>숫자로 먼저</em> 비교하세요.</h1>
        <p className="hero-copy">금융감독원이 공시한 연금저축 상품과 퇴직연금 사업자의 수익률·비용을 한 화면에서 살펴보세요.</p>
      </div>
      <div className="hero-card">
        <p>공시 데이터 기준</p>
        <strong>{data?.sourcePeriods.savings ?? "불러오는 중"}</strong>
        <span>연금저축 · {data?.sourcePeriods.retirement ?? "—"} 퇴직연금</span>
        <small>공시는 실시간 시세가 아닌 정기 공시 기준입니다.</small>
      </div>
    </section>

    <section className="workspace">
      <div className="tabs" role="tablist">
        <button className={tab === "savings" ? "active" : ""} onClick={() => {setTab("savings"); setArea("전체");}}><span>01</span> 연금저축 비교공시</button>
        <button className={tab === "retirement" ? "active" : ""} onClick={() => {setTab("retirement"); setArea("전체");}}><span>02</span> 퇴직연금 비교공시</button>
      </div>

      <div className="filter-panel">
        <label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="회사명 또는 상품명 검색" aria-label="검색" /></label>
        <label><span>금융권역</span><select value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a}>{a}</option>)}</select></label>
        <label><span>비교 기간</span><select value={period} onChange={e => setPeriod(e.target.value as "3"|"5"|"10")}><option value="3">최근 3년</option><option value="5">최근 5년</option><option value="10">최근 10년</option></select></label>
        <label><span>정렬 기준</span><select value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="return">수익률 높은 순</option><option value="fee">비용 낮은 순</option><option value="reserve">적립금 큰 순</option></select></label>
        {tab === "savings" && <label className="toggle"><input type="checkbox" checked={onlySelling} onChange={e => setOnlySelling(e.target.checked)} /><span/> 판매중 상품만</label>}
      </div>

      {error ? <div className="state error"><strong>데이터 연결을 확인해 주세요.</strong><p>{error}</p><button onClick={load}>다시 시도</button></div> : loading ? <div className="state"><div className="loader"/><p>금융감독원 공시 데이터를 불러오고 있습니다.</p></div> : <>
        <div className="summary-grid">
          <article><span>조회 결과</span><strong>{fmt.format(rows.length)}<small>개</small></strong><p>{area === "전체" ? "전체 금융권역" : area}</p></article>
          <article className="accent"><span>{period}년 수익률 1위</span><strong>{best ? pct(period === "3" ? best.earnRate3 : period === "5" ? best.earnRate5 : best.earnRate10) : "—"}</strong><p>{best?.company ?? "조회 결과 없음"}</p></article>
          <article><span>평균 {period}년 수익률</span><strong>{pct(avg)}</strong><p>현재 필터 기준 단순 평균</p></article>
          <article><span>최근 동기화</span><strong className="time">{data ? new Date(data.updatedAt).toLocaleTimeString("ko-KR", {hour:"2-digit",minute:"2-digit"}) : "—"}</strong><p>공식 API 직접 조회</p></article>
        </div>

        <div className="table-card">
          <div className="table-heading"><div><p>{tab === "savings" ? "상품 단위 비교" : "사업자 단위 비교"}</p><h2>{tab === "savings" ? "연금저축 상품 성과" : "퇴직연금 사업자 성과"}</h2></div><span>단위: 수익률·비용 %, 적립금 억원</span></div>
          <div className="table-scroll"><table><thead><tr><th>순위</th><th>회사 · 상품</th><th>권역</th><th>{period}년 수익률</th><th>{tab === "savings" ? "평균 수수료율" : "총비용부담률"}</th><th>적립금</th><th>상태</th></tr></thead>
          <tbody>{rows.slice(0, 100).map((r, i) => <tr key={`${r.company}-${"product" in r ? r.product : i}`}><td><span className={i < 3 ? "rank top" : "rank"}>{i + 1}</span></td><td><strong>{r.company}</strong><small>{"product" in r ? r.product : "퇴직연금 사업자 합계"}</small></td><td><span className="area">{r.area}</span></td><td className="number positive">{pct(period === "3" ? r.earnRate3 : period === "5" ? r.earnRate5 : r.earnRate10)}</td><td className="number">{pct("avgFeeRate" in r ? r.avgFeeRate : r.costRate)}</td><td className="number">{money(r.reserve)}</td><td>{"sells" in r ? <span className={r.sells === "Y" ? "status live" : "status"}>{r.sells === "Y" ? "판매중" : "판매종료"}</span> : <span className="status live">공시중</span>}</td></tr>)}</tbody></table></div>
          {!rows.length && <div className="empty">조건에 맞는 결과가 없습니다.</div>}
          {rows.length > 100 && <p className="limit-note">상위 100개를 표시합니다. 검색과 필터로 결과를 좁혀보세요.</p>}
        </div>
      </>}
    </section>

    <section className="guide">
      <div><p className="eyebrow">READ THE NUMBERS</p><h2>비교할 때<br/>이것만은 기억하세요.</h2></div>
      <div className="guide-list"><article><span>01</span><div><h3>같은 기간끼리 비교</h3><p>단기 성과 하나보다 3·5·10년 장기 수익률의 흐름을 함께 보세요.</p></div></article><article><span>02</span><div><h3>수익률과 비용을 함께</h3><p>수익률이 높더라도 수수료와 총비용이 크면 실제 성과는 달라질 수 있습니다.</p></div></article><article><span>03</span><div><h3>공시는 선택의 출발점</h3><p>보장 여부, 중도해지 조건, 위험등급과 개인의 투자성향도 반드시 확인하세요.</p></div></article></div>
    </section>

    <footer><div><strong>연금한눈</strong><p>금융감독원 통합연금포털 Open API 기반 비교 도구</p></div><p>본 서비스는 정보 제공 목적이며 투자 권유가 아닙니다. 최종 가입 전 해당 금융회사의 최신 상품설명서와 약관을 확인하세요.</p><a href="https://www.fss.or.kr/fss/lifeplan/lifeplanIndex/index.do?menuNo=201101" target="_blank" rel="noreferrer">공식 통합연금포털 ↗</a></footer>
  </main>;
}
