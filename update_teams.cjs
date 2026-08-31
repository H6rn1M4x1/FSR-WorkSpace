const fs = require('fs');

const slugsData = JSON.parse(fs.readFileSync('slugs.json', 'utf8'));
const allSlugs = [
  ...slugsData.premier,
  ...slugsData.laliga,
  ...slugsData.seriea,
  ...slugsData.bundesliga,
  ...slugsData.ligue1
];

let teamsCode = fs.readFileSync('src/data/teams.ts', 'utf8');

// Function to find the best match for a team name in the slugs array
function findSlug(teamName, country) {
  const normalizedName = teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
  let bestMatch = null;
  
  for (const slug of allSlugs) {
    const normalizedSlug = slug.replace(/-/g, '');
    if (normalizedSlug.includes(normalizedName) || normalizedName.includes(normalizedSlug)) {
       bestMatch = slug;
       break; // Found a good enough match
    }
  }

  // Handle special cases
  if (teamName === "Arsenal") bestMatch = "arsenal";
  if (teamName === "Aston Villa") bestMatch = "aston-villa";
  if (teamName === "Bournemouth") bestMatch = "afc-bournemouth";
  if (teamName === "Brentford") bestMatch = "brentford";
  if (teamName === "Brighton") bestMatch = "brighton-and-hove-albion";
  if (teamName === "Chelsea") bestMatch = "chelsea";
  if (teamName === "Crystal Palace") bestMatch = "crystal-palace";
  if (teamName === "Everton") bestMatch = "everton";
  if (teamName === "Fulham") bestMatch = "fulham";
  if (teamName === "Liverpool") bestMatch = "liverpool-fc";
  if (teamName === "Manchester City") bestMatch = "manchester-city";
  if (teamName === "Manchester United") bestMatch = "manchester-united";
  if (teamName === "Newcastle") bestMatch = "newcastle-united";
  if (teamName === "Nottingham Forest") bestMatch = "nottingham-forest";
  if (teamName === "Tottenham") bestMatch = "tottenham-hotspur";
  if (teamName === "West Ham") bestMatch = "west-ham-united"; // Wait, West Ham not in the list? Let's assume west-ham-united
  if (teamName === "Wolves") bestMatch = "wolverhampton-wanderers";

  if (teamName === "Athletic Club") bestMatch = "athletic-club-bilbao";
  if (teamName === "Atlético Madrid") bestMatch = "atletico-madrid";
  if (teamName === "Osasuna") bestMatch = "osasuna";
  if (teamName === "Cádiz") bestMatch = "cadiz-cf";
  if (teamName === "Alavés") bestMatch = "deportivo-alaves";
  if (teamName === "Barcelona") bestMatch = "fc-barcelona";
  if (teamName === "Getafe") bestMatch = "getafe-cf";
  if (teamName === "Girona") bestMatch = "girona-fc";
  if (teamName === "Rayo Vallecano") bestMatch = "rayo-vallecano";
  if (teamName === "Celta Vigo") bestMatch = "celta-vigo";
  if (teamName === "Mallorca") bestMatch = "rcd-mallorca";
  if (teamName === "Real Betis") bestMatch = "real-betis-balompie";
  if (teamName === "Real Madrid") bestMatch = "real-madrid";
  if (teamName === "Real Sociedad") bestMatch = "real-sociedad";
  if (teamName === "Sevilla") bestMatch = "sevilla-fc";
  if (teamName === "Almería") bestMatch = "ud-almeria";
  if (teamName === "Las Palmas") bestMatch = "ud-las-palmas";
  if (teamName === "Valencia") bestMatch = "valencia-cf";
  if (teamName === "Villarreal") bestMatch = "villarreal-cf";
  
  if (teamName === "Atalanta") bestMatch = "atalanta";
  if (teamName === "Bologna") bestMatch = "bologna";
  if (teamName === "Cagliari") bestMatch = "cagliari";
  if (teamName === "Empoli") bestMatch = "empoli-fc";
  if (teamName === "Fiorentina") bestMatch = "fiorentina";
  if (teamName === "Frosinone") bestMatch = "frosinone-calcio";
  if (teamName === "Genoa") bestMatch = "genoa";
  if (teamName === "Inter") bestMatch = "inter-milan";
  if (teamName === "Juventus") bestMatch = "juventus";
  if (teamName === "Lazio") bestMatch = "lazio";
  if (teamName === "Lecce") bestMatch = "lecce";
  if (teamName === "AC Milan") bestMatch = "ac-milan";
  if (teamName === "Monza") bestMatch = "ac-monza";
  if (teamName === "Napoli") bestMatch = "napoli";
  if (teamName === "Roma") bestMatch = "roma";
  if (teamName === "Salernitana") bestMatch = "us-salernitana-1919";
  if (teamName === "Sassuolo") bestMatch = "sassuolo";
  if (teamName === "Torino") bestMatch = "torino";
  if (teamName === "Udinese") bestMatch = "udinese";
  if (teamName === "Hellas Verona") bestMatch = "hellas-verona";

  if (teamName === "Bayern Munich") bestMatch = "bayern-munich";
  if (teamName === "Borussia Dortmund") bestMatch = "borussia-dortmund";
  if (teamName === "Bayer Leverkusen") bestMatch = "bayer-leverkusen";
  if (teamName === "RB Leipzig") bestMatch = "rb-leipzig";
  if (teamName === "VfB Stuttgart") bestMatch = "vfb-stuttgart";
  if (teamName === "Eintracht Frankfurt") bestMatch = "eintracht-frankfurt";
  if (teamName === "SC Freiburg") bestMatch = "sc-freiburg";
  if (teamName === "Hoffenheim") bestMatch = "tsg-hoffenheim";
  if (teamName === "Werder Bremen") bestMatch = "werder-bremen";
  if (teamName === "Borussia Mönchengladbach") bestMatch = "borussia-monchengladbach";

  if (teamName === "Paris Saint-Germain") bestMatch = "paris-saint-germain-psg";
  if (teamName === "Monaco") bestMatch = "as-monaco";
  if (teamName === "Lille") bestMatch = "losc-lille";
  if (teamName === "Marseille") bestMatch = "olympique-de-marseille-om";
  if (teamName === "Lyon") bestMatch = "olympique-lyonnais";
  if (teamName === "Lens") bestMatch = "rc-lens";
  if (teamName === "Rennes") bestMatch = "stade-rennais";

  return bestMatch;
}

const regex = /{ id: "[^"]+", name: "([^"]+)", league: "[^"]+", country: "([^"]+)", logo: "(https:\/\/upload\.wikimedia\.org[^"]+)" }/g;

teamsCode = teamsCode.replace(regex, (match, name, country, logo) => {
  const slug = findSlug(name, country);
  if (slug) {
    const newLogo = `https://assets.footylogos.com/logos/${slug}/${slug}-logo-footylogos.svg`;
    return match.replace(logo, newLogo);
  }
  return match;
});

fs.writeFileSync('src/data/teams.ts', teamsCode);
console.log("Updated teams.ts");

