import fs from "node:fs";

const input = JSON.parse(fs.readFileSync("data/league_stadiums.generated.json", "utf8"));

const overrides = {
  "FC Barcelona": {stadium:"Spotify Camp Nou", lat:41.3809, lng:2.1228},
  "Atlético de Madrid": {stadium:"Riyadh Air Metropolitano", lat:40.4362, lng:-3.5995},
  "Sevilla FC": {stadium:"Ramón Sánchez-Pizjuán Stadium", lat:37.3841, lng:-5.9705},
  "Borussia Dortmund": {stadium:"Signal Iduna Park", lat:51.4924922, lng:7.4518549},
  "SC Freiburg": {stadium:"Europa-Park Stadion", lat:48.0215, lng:7.8300},
  "1. FSV Mainz 05": {stadium:"Mewa Arena", lat:49.9842, lng:8.2242},
  "FC Schalke 04": {stadium:"Veltins-Arena", lat:51.5545938, lng:7.0676001},
  "Columbus Crew": {stadium:"Lower.com Field", lat:39.96846, lng:-83.01709},
  "Nashville SC": {stadium:"GEODIS Park", lat:36.1309612, lng:-86.7676932},
  "San Jose Earthquakes": {stadium:"PayPal Park", lat:37.3513087, lng:-121.924672},
  "Sporting Kansas City": {stadium:"Children's Mercy Park", lat:39.1218, lng:-94.8237},
  "Vancouver Whitecaps FC": {stadium:"BC Place", lat:49.27675, lng:-123.1119},
  "Urawa Reds": {stadium:"Saitama Stadium 2002", lat:35.9030742, lng:139.7176057},
  "Nagoya Grampus": {stadium:"Toyota Stadium", lat:35.0845, lng:137.1711},
  "Kyoto Sanga F.C.": {stadium:"Sanga Stadium by KYOCERA", lat:35.0169, lng:135.5843},
  "Sanfrecce Hiroshima": {stadium:"Edion Peace Wing Hiroshima", lat:34.4015066, lng:132.4545843},
  "Tainan City TSG": {stadium:"臺南市立足球場", lat:22.9796, lng:120.2052},
  "AC Taipei": {stadium:"臺北田徑場", lat:25.0495837, lng:121.5517349},
  "Taichung FUTURO": {stadium:"西屯足球場", lat:24.169167, lng:120.633889},
  "Taichung Rock": {stadium:"西屯足球場", lat:24.169167, lng:120.633889},
  "Ming Chuan University": {stadium:"銘傳大學桃園校區足球場", lat:24.9856141, lng:121.3425769}
};

for (const league of Object.values(input.leagues)) {
  league.teams = league.teams.map(team => {
    const manual = overrides[team.nameEn];
    const record = manual ? {...team, ...manual, coordinateSource:"manual-audit"} : team;
    return {
      nameEn:record.nameEn,
      nameZh:record.nameZh,
      stadium:record.stadium,
      lat:record.lat,
      lng:record.lng,
      coordinateSource:record.coordinateSource || "Wikidata"
    };
  });
}

input.generatedAt = new Date().toISOString();
input.source = {
  name:"Wikidata / OpenStreetMap / official venue pages",
  license:"Wikidata CC0; OpenStreetMap ODbL",
  urls:[
    "https://www.wikidata.org/",
    "https://www.openstreetmap.org/copyright"
  ]
};

const teams = Object.values(input.leagues).flatMap(league => league.teams);
const invalid = teams.filter(team =>
  !team.stadium || !Number.isFinite(team.lat) || !Number.isFinite(team.lng)
);
if (invalid.length) {
  throw new Error(`Missing stadium coordinates: ${invalid.map(team => team.nameEn).join(", ")}`);
}

fs.writeFileSync(
  "data/league_stadiums.js",
  `window.LEAGUE_STADIUMS = ${JSON.stringify(input, null, 2)};\n`
);
console.log(`WROTE ${Object.keys(input.leagues).length} leagues / ${teams.length} teams`);
