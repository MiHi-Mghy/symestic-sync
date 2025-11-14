const fs = require("fs");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ========== CONFIG ==========
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoaWxiZXJ0Lm1AbWVsZWdoeWF1dG9tb3RpdmUuZGUiLCJqdGkiOiI2YWEwODMwOC1kMGFhLTQ3MWUtYmYwMC0xMGE3NDAwYTY0MmMiLCJuYW1laWQiOiI3ODcyIiwiRW50ZXJwcmlzZUlkIjoiNzYiLCJJc01hc3RlckFkbWluIjoiRmFsc2UiLCJJc0tpb3NrVXNlciI6IkZhbHNlIiwiQXBpVG9rZW5JZCI6IjE1NiIsIlByb2R1Y3Rpb25MaW5lcyI6IjEyMCIsIm5iZiI6MTc2MzEwMjg0NywiZXhwIjoxNzk0NjM4ODQ3LCJpYXQiOjE3NjMxMDI4NDcsImlzcyI6Imh0dHBzOi8vYXBpLnN5bWVzdGljLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXBwLnN5bWVzdGljLmNvbSJ9.UQlO6OM7JvliJ7f6WNdfDmpLhUx4la_SngX_CKQGrM4";
const READ_URL = "https://api.symestic.com/api/processData/120/latestValues";
const WRITE_URL = "https://api.symestic.com/api/processData/120/processSegment/178/update";
const SEGMENT_ID = "178";
const READ_PARAMETER = "11114";
const WRITE_PARAMETER = "11216";

// ========== STATE ==========
let state = { lastSentValue: null };
if (fs.existsSync("state.json")) {
  state = JSON.parse(fs.readFileSync("state.json"));
}

// ========== HELPER ==========
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readValue() {
  const payload = { processSegments:[{ processSegmentId:SEGMENT_ID, processParameterIds:[READ_PARAMETER] }] };
  const res = await fetch(READ_URL, { method:"POST", headers:{"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"}, body:JSON.stringify(payload) });
  if(!res.ok) throw new Error(res.status + " " + res.statusText);
  const json = await res.json();
  return json[0].valueNum;
}

function convertValue(v){ return v % 32768; }

async function sendValue(value){
  const payload = { processData:[{ processParameterId:WRITE_PARAMETER, value:String(value), originalDateTime:new Date().toISOString(), timestamp:new Date().toISOString() }] };
  const res = await fetch(WRITE_URL, { method:"PUT", headers:{"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"}, body:JSON.stringify(payload) });
  if(!res.ok) throw new Error(res.status + " " + res.statusText);
  console.log("✔ Wert gesendet:", value);
  state.lastSentValue = value;
  fs.writeFileSync("state.json", JSON.stringify(state,null,2));
}

// ========== MAIN LOOP ==========
(async function main(){
  console.log("⚡ Starte 5-Sekunden-Loop...");
  while(true){
    try{
      const raw = await readValue();
      const conv = convertValue(raw);
      console.log("Abfrage:", raw, "→ Konvertiert:", conv);

      if(conv !== state.lastSentValue) await sendValue(conv);
      else console.log("→ Wert unverändert, nichts gesendet.");
    }catch(err){
      console.error("Fehler:", err.message);
    }
    await sleep(5000);
  }
})();
