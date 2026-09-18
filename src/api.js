// Every function here calls a free, keyless public API.
// Each is wrapped in try/catch so one flaky API never crashes the bot.

export async function getWeather(city) {
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  ).then((r) => r.json());

  const place = geo?.results?.[0];
  if (!place) return `Couldn't find a place called "${city}".`;

  const w = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`
  ).then((r) => r.json());

  const c = w.current;
  return (
    `Weather in ${place.name}${place.country ? ", " + place.country : ""}:\n` +
    `Temp: ${c.temperature_2m}°C\n` +
    `Humidity: ${c.relative_humidity_2m}%\n` +
    `Wind: ${c.wind_speed_10m} km/h`
  );
}

export async function getQuote() {
  try {
    const data = await fetch("https://api.quotable.io/random").then((r) => r.json());
    return `"${data.content}"\n— ${data.author}`;
  } catch {
    return "Couldn't fetch a quote right now.";
  }
}

export async function getJoke() {
  try {
    const data = await fetch("https://official-joke-api.appspot.com/random_joke").then((r) =>
      r.json()
    );
    return `${data.setup}\n${data.punchline}`;
  } catch {
    return "Couldn't fetch a joke right now.";
  }
}

export async function getTrivia() {
  try {
    const data = await fetch(
      "https://opentdb.com/api.php?amount=1&type=multiple"
    ).then((r) => r.json());
    const q = data.results?.[0];
    if (!q) return "No trivia available right now.";
    const options = [...q.incorrect_answers, q.correct_answer]
      .sort(() => Math.random() - 0.5)
      .map((a, i) => `${i + 1}. ${decodeHtml(a)}`)
      .join("\n");
    return `${decodeHtml(q.question)}\n\n${options}\n\n(Answer: ${decodeHtml(q.correct_answer)})`;
  } catch {
    return "Couldn't fetch trivia right now.";
  }
}

export async function getCryptoPrice(coin) {
  try {
    const id = coin.toLowerCase();
    const data = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    ).then((r) => r.json());
    const price = data?.[id]?.usd;
    if (price === undefined) return `Couldn't find a coin called "${coin}".`;
    return `${coin.toUpperCase()}: $${price.toLocaleString()}`;
  } catch {
    return "Couldn't fetch crypto price right now.";
  }
}

function decodeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&eacute;/g, "é");
}
