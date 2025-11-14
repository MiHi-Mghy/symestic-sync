// ===============================
// CONFIG
// ===============================
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJoaWxiZXJ0Lm1AbWVsZWdoeWF1dG9tb3RpdmUuZGUiLCJqdGkiOiI2YWEwODMwOC1kMGFhLTQ3MWUtYmYwMC0xMGE3NDAwYTY0MmMiLCJuYW1laWQiOiI3ODcyIiwiRW50ZXJwcmlzZUlkIjoiNzYiLCJJc01hc3RlckFkbWluIjoiRmFsc2UiLCJJc0tpb3NrVXNlciI6IkZhbHNlIiwiQXBpVG9rZW5JZCI6IjE1NiIsIlByb2R1Y3Rpb25MaW5lcyI6IjEyMCIsIm5iZiI6MTc2MzEwMjg0NywiZXhwIjoxNzk0NjM4ODQ3LCJpYXQiOjE3NjMxMDI4NDcsImlzcyI6Imh0dHBzOi8vYXBpLnN5bWVzdGljLmNvbSIsImF1ZCI6Imh0dHBzOi8vYXBwLnN5bWVzdGljLmNvbSJ9.UQlO6OM7JvliJ7f6WNdfDmpLhUx4la_SngX_CKQGrM4";
const READ_URL = "https://api.symestic.com/api/processData/120/latestValues";
const WRITE_URL = "https://api.symestic.com/api/processData/120/processSegment/178/update";

const SEGMENT_ID = "178";
const READ_PARAMETER = "11114";
const WRITE_PARAMETER = "11216";

const fs = require("fs");

// ===============================
// STATE LADEN
// ===============================
let state = { lastSentValue: null };

if (fs.existsSync("state.json")) {
    state = JSON.parse(fs.readFileSync("state.json"));
}

// ===============================
// API ABFRAGE
// ===============================
async function readValue() {
    const payload = {
        processSegments: [
            {
                processSegmentId: SEGMENT_ID,
                processParameterIds: [READ_PARAMETER]
            }
        ]
    };

    const res = await fetch(READ_URL, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Fehler bei API-Abfrage: " + res.status);

    const json = await res.json();
    return json[0].valueNum;
}

// ===============================
// VALUE UMWANDELN (0-32767, rotierend)
// ===============================
function convertValue(v) {
    return v % 32768;
}

// ===============================
// SENDEN AN PROZESSWERT
// ===============================
async function sendValue(value) {
    const payload = {
        processData: [
            {
                processParameterId: WRITE_PARAMETER,
                value: String(value),
                originalDateTime: new Date().toISOString(),
                timestamp: new Date().toISOString()
            }
        ]
    };

    const res = await fetch(WRITE_URL, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + TOKEN,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Fehler beim Senden: " + res.status);

    console.log("✔ Wert gesendet:", value);

    state.lastSentValue = value;
    fs.writeFileSync("state.json", JSON.stringify(state, null, 2));
}

// ===============================
// MAIN FUNCTION
// ===============================
(async () => {
    try {
        const raw = await readValue();
        console.log("Abgefragter Wert:", raw);

        const converted = convertValue(raw);
        console.log("Konvertierter Wert:", converted);

        if (converted !== state.lastSentValue) {
            await sendValue(converted);
        } else {
            console.log("→ Wert unverändert, nichts gesendet.");
        }

    } catch (err) {
        console.error("Fehler:", err.message);
    }
})();
