const fs = require('fs');

async function main() {
  let fileContent = fs.readFileSync('src/data/initialCotizacionesCripto.ts', 'utf-8');
  
  // Quick fetch to coingecko to get images
  let coins = [];
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
    coins = await res.json();
  } catch (e) {
    console.error("Error fetching coingecko", e);
  }

  // Create map
  const imageMap = {};
  for (const c of coins) {
    imageMap[c.id] = c.image;
  }
  
  // also add some fallbacks
  const fallbacks = {
    "bitcoin": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    "ethereum": "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    "tether": "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    "binancecoin": "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    "solana": "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    "usd-coin": "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    "staked-ether": "https://assets.coingecko.com/coins/images/13442/large/steth_logo.png",
    "ripple": "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    "the-open-network": "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png",
    "dogecoin": "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    "cardano": "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    "shiba-inu": "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
    "avalanche-2": "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    "tron": "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
    "weth": "https://assets.coingecko.com/coins/images/2538/large/weth.png",
    "polkadot": "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    "bitcoin-cash": "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png",
    "chainlink": "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    "near": "https://assets.coingecko.com/coins/images/10365/large/near.png",
    "matic-network": "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png"
  };

  const getImg = (id) => imageMap[id] || fallbacks[id] || `https://assets.coingecko.com/coins/images/1/large/bitcoin.png`; // default fallback

  const rows = fileContent.split('\n');
  let currentId = null;
  const outRows = [];
  
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i];
    const idMatch = line.match(/id:\s*"([^"]+)"/);
    if (idMatch) {
      currentId = idMatch[1];
    }
    
    if (line.includes('sentiment:') && currentId) {
      outRows.push(line);
      outRows.push(`    image: "${getImg(currentId)}",`);
      currentId = null;
    } else if (line.includes('image:')) {
      // skip if already has image to avoid duplicates
    } else {
      outRows.push(line);
    }
  }

  fs.writeFileSync('src/data/initialCotizacionesCripto.ts', outRows.join('\n'));
}

main();
