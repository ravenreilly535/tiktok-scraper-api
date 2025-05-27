import puppeteer from "puppeteer";

export default async function handler(req, res) {
  // 👇 Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Username required" });

  const url = `https://www.tiktok.com/@${username}`;

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.waitForSelector('h1[data-e2e="user-title"]', { timeout: 10000 });

    const data = await page.evaluate(() => {
      const name = document.querySelector('h1[data-e2e="user-title"]')?.innerText || "";
      const dp = document.querySelector('img.avatar')?.src || "";
      const stats = Array.from(document.querySelectorAll('strong[data-e2e]')).map(el => el.innerText);
      return {
        name,
        dp,
        followers: stats[1],
        following: stats[0],
        likes: stats[2],
      };
    });

    await browser.close();
    return res.status(200).json({ success: true, ...data });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Scraping failed", detail: err.message });
  }
}
