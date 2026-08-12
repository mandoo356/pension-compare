import { mkdir, writeFile } from "node:fs/promises";

const key=process.env.FSS_API_KEY;
if(!key)throw new Error("FSS_API_KEY is required");
const base="https://www.fss.or.kr/openapi/api";
const output=new URL("../github-pages/data/pensions.json",import.meta.url);
async function get(path,params){const url=new URL(`${base}/${path}.json`);Object.entries({key,...params}).forEach(([k,v])=>url.searchParams.set(k,String(v)));const res=await fetch(url);if(!res.ok)throw new Error(`${path}: HTTP ${res.status}`);const data=await res.json();if(data.code!=="000"&&data.code!=="001")throw new Error(`${path}: ${data.message}`);return data.list||[]}
const areas=[1,3,4,5];
const [savingsParts,retirementRaw,costRaw]=await Promise.all([
  Promise.all(areas.map(areaCode=>get("psProdList2",{year:2025,quarter:4,areaCode}))),
  get("rpCorpResultList",{year:2025,quarter:4,sysType:3}),
  get("rpCorpBurdenRatioList",{year:2024})
]);
const clean=s=>String(s||"").toLowerCase().replace(/주식회사|㈜|보험|증권|은행|생명|손해|화재|금융투자| /g,"");
function findCost(company){const exact=costRaw.find(x=>x.company===company);if(exact)return exact;const n=clean(company);return costRaw.find(x=>clean(x.company)===n||clean(x.company).includes(n)||n.includes(clean(x.company)))||{}}
const savings=savingsParts.flat().map(r=>({area:String(r.area||"기타"),company:String(r.company||""),product:String(r.product||""),type:String(r.productType||""),selling:String(r.sells||"N")==="Y",guaranteed:String(r.guarantees||"N")==="Y",reserve:Number(r.reserve||0),return3:Number(r.earnRate3||0),return5:Number(r.earnRate5||0),return10:Number(r.earnRate10||0),fee:Number(r.avgFeeRate||0)}));
const retirement=retirementRaw.map(r=>{const t=(r.list||[]).find(x=>x.division==="합계")||r.list?.[0]||{},c=findCost(r.company);return{area:String(r.area||"기타"),company:String(r.company||""),db:{reserve:Number(t.dbReserve||0),return3:Number(t.dbEarnRate3||0),return5:Number(t.dbEarnRate5||0),return10:Number(t.dbEarnRate10||0),fee:Number(c.dbTotalCostRate||0)},dc:{reserve:Number(t.dcReserve||0),return3:Number(t.dcEarnRate3||0),return5:Number(t.dcEarnRate5||0),return10:Number(t.dcEarnRate10||0),fee:Number(c.dcTotalCostRate||0)},irp:{reserve:Number(t.irpReserve||0),return3:Number(t.irpEarnRate3||0),return5:Number(t.irpEarnRate5||0),return10:Number(t.irpEarnRate10||0),fee:Number(c.irpTotalCostRate||0)}}});
const payload={updatedAt:new Date().toISOString(),periods:{savings:"2025년 4분기",retirement:"2025년 4분기",cost:"2024년"},savings,retirement};
await mkdir(new URL("../github-pages/data/",import.meta.url),{recursive:true});
await writeFile(output,JSON.stringify(payload));
console.log(`Wrote ${savings.length} savings products and ${retirement.length} retirement providers.`);
