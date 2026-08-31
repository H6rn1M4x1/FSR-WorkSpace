const fs = require('fs');

const fetch = require('node-fetch'); // we can use global fetch in Node 18+

async function getSlugs(url) {
  const res = await fetch(url);
  const text = await res.text();
  const slugs = [];
  const regex = /https:\/\/assets\.footylogos\.com\/previews\/([^\/]+)\//g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    slugs.push(match[1]);
  }
  return [...new Set(slugs)];
}

async function run() {
  const premier = await getSlugs('https://www.footylogos.com/es/competition/premier-league');
  const laliga = await getSlugs('https://www.footylogos.com/es/competition/laliga');
  const seriea = await getSlugs('https://www.footylogos.com/es/competition/serie-a');
  const bundesliga = await getSlugs('https://www.footylogos.com/es/competition/bundesliga');
  const ligue1 = await getSlugs('https://www.footylogos.com/es/competition/ligue-1');
  
  const allSlugs = [...premier, ...laliga, ...seriea, ...bundesliga, ...ligue1];
  
  // write to a file to inspect
  fs.writeFileSync('slugs.json', JSON.stringify({premier, laliga, seriea, bundesliga, ligue1}, null, 2));
  console.log("Done");
}

run();
