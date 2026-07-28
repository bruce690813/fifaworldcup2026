import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("index.html", "utf8");

function extractObject(variableName) {
  const marker = `const ${variableName} =`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${variableName}`);
  const objectStart = source.indexOf("{", start + marker.length);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(`(${source.slice(objectStart, index + 1)})`);
      }
    }
  }
  throw new Error(`Unclosed ${variableName}`);
}

const guide = extractObject("footballCompetitionGuide");
const leagues = [
  ...guide.leagues,
  extractObject("mlsLeague"),
  extractObject("j1League"),
  extractObject("taiwanEnterpriseLeague")
];

const outputPath = "data/league_stadiums.generated.json";
const userAgent = "fifaworldcup2026-stadium-audit/2.129 (GitHub Pages data preparation)";
const allTeams = leagues.flatMap(league => (league.teams || []).map(team => ({league, team})));
const previousOutput = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : null;
const previousRecord = (leagueId, nameEn) =>
  (previousOutput?.leagues?.[leagueId]?.teams || []).find(team => team.nameEn === nameEn);

async function fetchJson(url) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(url, {headers:{Accept:"application/json", "User-Agent":userAgent}});
    if (response.ok) return response.json();
    if (response.status !== 429 && response.status < 500) throw new Error(`${response.status} ${url}`);
    await new Promise(resolve => setTimeout(resolve, 5000 + 2500 * attempt));
  }
  throw new Error(`Request retries exhausted: ${url}`);
}

async function mapLimit(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({length:concurrency}, run));
  return results;
}

function selectClubSearchResult(results, teamName) {
  const normalized = teamName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return [...results].sort((a,b) => {
    const score = item => {
      const label = String(item.label || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const description = String(item.description || "").toLowerCase();
      let value = 0;
      if (/association football club|soccer club|football team/.test(description)) value += 100;
      if (/women|reserve|season of|former|development|single released|university/i.test(description)) value -= 500;
      if (label === normalized) value += 60;
      if (label.includes(normalized) || normalized.includes(label)) value += 25;
      return value;
    };
    return score(b) - score(a);
  })[0] || null;
}

console.log(`SEARCH ${leagues.length} leagues / ${allTeams.length} teams`);
const searches = await mapLimit(allTeams, 1, async ({league, team}, index) => {
  const cached = previousRecord(league.id, team.nameEn);
  if (cached?.clubWikidataId && !/women|reserve|season of|former|development|single released|university/i.test(cached.searchDescription || "")) {
    console.log(`${index + 1}/${allTeams.length} ${league.id}: ${team.nameEn} -> ${cached.clubWikidataId} (cached)`);
    return {league, team, clubId:cached.clubWikidataId, searchDescription:cached.searchDescription || ""};
  }
  const searchAliases = {
    "Yokohama F･Marinos":"Yokohama F. Marinos",
    "Tainan City TSG":"Tainan City FC Taiwan",
    "Taichung Rock":"Leopard Cat FC Taiwan",
    "Ming Chuan University":"Ming Chuan University football club"
  };
  const query = encodeURIComponent(searchAliases[team.nameEn] || team.nameEn);
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${query}&language=en&format=json&limit=8&origin=*`;
  const payload = await fetchJson(url);
  await new Promise(resolve => setTimeout(resolve, 2100));
  const selected = selectClubSearchResult(payload.search || [], team.nameEn);
  console.log(`${index + 1}/${allTeams.length} ${league.id}: ${team.nameEn} -> ${selected?.id || "NOT_FOUND"}`);
  return {league, team, clubId:selected?.id || "", searchDescription:selected?.description || ""};
});

async function fetchEntities(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const entities = {};
  for (let index = 0; index < unique.length; index += 50) {
    const batch = unique.slice(index, index + 50);
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${batch.join("|")}&props=labels|claims&languages=en|zh|zh-tw&format=json&origin=*`;
    const payload = await fetchJson(url);
    Object.assign(entities, payload.entities || {});
  }
  return entities;
}

const clubEntities = await fetchEntities(searches.map(item => item.clubId));
function currentStadiumId(entity) {
  const claims = entity?.claims?.P115 || [];
  const preferred = claims.find(claim => claim.rank === "preferred");
  const current = claims.find(claim => !claim.qualifiers?.P582);
  return (preferred || current || claims[0])?.mainsnak?.datavalue?.value?.id || "";
}
searches.forEach(item => {
  item.stadiumId = currentStadiumId(clubEntities[item.clubId]);
});

const stadiumEntities = await fetchEntities(searches.map(item => item.stadiumId));
function label(entity) {
  return entity?.labels?.["zh-tw"]?.value || entity?.labels?.zh?.value || entity?.labels?.en?.value || "";
}
function coordinate(entity) {
  const value = entity?.claims?.P625?.find(claim => claim.rank !== "deprecated")?.mainsnak?.datavalue?.value;
  return value ? {lat:Number(value.latitude), lng:Number(value.longitude)} : {lat:null, lng:null};
}

const output = {
  version:"v2.129",
  generatedAt:new Date().toISOString(),
  source:{
    name:"Wikidata",
    license:"CC0",
    url:"https://www.wikidata.org/"
  },
  leagues:{}
};
for (const league of leagues) {
  output.leagues[league.id] = {
    nameZh:league.nameZh,
    nameEn:league.nameEn,
    country:league.country,
    teams:searches.filter(item => item.league.id === league.id).map(item => {
      const stadiumEntity = stadiumEntities[item.stadiumId];
      return {
        nameEn:item.team.nameEn,
        nameZh:item.team.nameZh,
        stadium:label(stadiumEntity),
        ...coordinate(stadiumEntity),
        clubWikidataId:item.clubId,
        stadiumWikidataId:item.stadiumId,
        searchDescription:item.searchDescription,
        verified:false
      };
    })
  };
}
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
const resolved = Object.values(output.leagues).flatMap(league => league.teams)
  .filter(team => team.stadium && Number.isFinite(team.lat) && Number.isFinite(team.lng)).length;
console.log(`COMPLETE ${leagues.length} leagues / ${allTeams.length} teams / ${resolved} coordinates`);
