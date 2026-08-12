import { NextResponse } from "next/server";

const API = "https://www.fss.or.kr/openapi/api";
const AREAS = [1, 3, 4, 5];

type ApiResponse<T> = { code: string; message: string; list?: T[] };
type RawSavings = Record<string, string | number>;
type RawRetirement = { company: string; area: string; list?: Array<Record<string, number | string>> };
type RawCost = Record<string, string | number>;

async function get<T>(path: string, params: Record<string, string | number>, key: string): Promise<ApiResponse<T>> {
  const url = new URL(`${API}/${path}.json`);
  Object.entries({ key, ...params }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`금융감독원 API 응답 오류 (${response.status})`);
  return response.json();
}

export async function GET() {
  const key = process.env.FSS_API_KEY;
  if (!key) return NextResponse.json({ message: "서버에 FSS_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  try {
    const [savingsParts, retirementResult, costResult] = await Promise.all([
      Promise.all(AREAS.map(areaCode => get<RawSavings>("psProdList2", { year: 2025, quarter: 4, areaCode }, key))),
      get<RawRetirement>("rpCorpResultList", { year: 2025, quarter: 4, sysType: 3 }, key),
      get<RawCost>("rpCorpBurdenRatioList", { year: 2024 }, key),
    ]);
    const savings = savingsParts.flatMap(r => r.list ?? []).map(r => ({
      area: String(r.area ?? "기타"), company: String(r.company ?? ""), product: String(r.product ?? ""),
      productType: String(r.productType ?? ""), sells: String(r.sells ?? "N"), guarantees: String(r.guarantees ?? "N"),
      reserve: Number(r.reserve ?? 0), earnRate3: Number(r.earnRate3 ?? 0), earnRate5: Number(r.earnRate5 ?? 0),
      earnRate10: Number(r.earnRate10 ?? 0), avgTotalEarRate: Number(r.avgTotalEarRate ?? 0), avgFeeRate: Number(r.avgFeeRate ?? 0),
    }));
    const costs = new Map((costResult.list ?? []).map(r => [String(r.company), r]));
    const retirement = (retirementResult.list ?? []).map(company => {
      const totals = company.list?.find(r => r.division === "합계") ?? company.list?.[0] ?? {};
      const cost = costs.get(company.company);
      return {
        area: company.area, company: company.company,
        reserve: Number(totals.irpReserve ?? 0), earnRate: Number(totals.irpEarnRate ?? 0),
        earnRate3: Number(totals.irpEarnRate3 ?? 0), earnRate5: Number(totals.irpEarnRate5 ?? 0), earnRate10: Number(totals.irpEarnRate10 ?? 0),
        costRate: Number(cost?.irpTotalCostRate ?? 0),
      };
    });
    return NextResponse.json({ savings, retirement, updatedAt: new Date().toISOString(), sourcePeriods: { savings: "2025년 4분기", retirement: "2025년 4분기", cost: "2024년" }, notes: ["퇴직연금 화면은 개인형 IRP 기준 수익률·비용을 사용합니다.", "비용 공시는 연간 자료로 수익률 공시와 기준시점이 다를 수 있습니다."] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "데이터 조회 중 오류가 발생했습니다." }, { status: 502 });
  }
}
