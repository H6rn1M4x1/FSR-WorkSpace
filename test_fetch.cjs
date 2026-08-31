async function main() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
    console.log(res.status, res.statusText);
    if (!res.ok) {
      console.log(await res.text());
    } else {
      const data = await res.json();
      console.log("Success, got", data.length, "coins");
      console.log(data[0].id, data[0].image);
    }
  } catch (e) {
    console.error(e);
  }
}
main();
