import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  // ✅ CORS headers for frontend access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  const url = `https://www.tiktok.com/@${username}`;

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for profile name selector
    await page.waitForSelector('h1[data-e2e="user-title"]', { timeout: 10000 });

    const data = await page.evaluate(() => {
      const name = document.querySelector('h1[data-e2e="user-title"]')?.innerText || null;
      const dp = document.querySelector('img.avatar')?.src || null;
      const stats = Array.from(document.querySelectorAll('strong[data-e2e]')).map(el => el.innerText);

      return {
        name,
        dp,
        following: stats[0] || null,
        followers: stats[1] || null,
        likes: stats[2] || null,
      };
    });

    await browser.close();

    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error('Scraping error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch TikTok data', detail: err.message });
  }
}
