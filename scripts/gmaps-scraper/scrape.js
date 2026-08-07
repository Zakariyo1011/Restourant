// Google Maps'dan restoranlarni "scraping" orqali yig'ib, to'g'ridan-to'g'ri
// restoran_db bazasiga yozadigan skript. Rasmiy Places API o'rniga ishlatiladi.
//
// DIQQAT:
//  - Bu Google Maps'ning veb-sahifasini o'qiydi, rasmiy API emas — Google ToS'ini buzadi,
//    DOM tuzilishi o'zgarsa selektorlar ishlamay qolishi mumkin, IP vaqtincha bloklanishi mumkin.
//  - Bu skript hech qanday CAPTCHA yechish yoki proxy/IP aylantirish qilmaydi. Bloklanish
//    aniqlansa, darhol to'xtaydi — shunchaki qayta urinib ko'ring yoki --max qiymatini kamaytiring.
//  - Har bir shahar orasida va har bir joy sahifasiga o'tishda tasodifiy kutish bor —
//    buni olib tashlamang, aks holda bloklanish tezlashadi.
//
// Ishlatish:
//   node scrape.js                                → barcha 8 davlat, har shahardan 15 tadan
//   node scrape.js --country="Turkey" --city="Istanbul" --max=10   → bitta shahar (sinov uchun)
//   node scrape.js --max=25 --headless=false        → brauzerni ko'rsatib ishga tushirish (debug)

const puppeteer = require('puppeteer')
const COUNTRY_CITY_PRESETS = require('./cities')
const { upsertRestaurant, close } = require('./db')

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const DEFAULT_USER_ID = 1

function parseArgs() {
    const args = {}
    for (const raw of process.argv.slice(2)) {
        const match = raw.match(/^--([^=]+)=(.*)$/)
        if (match) args[match[1]] = match[2]
    }
    return {
        country: args.country || null,
        city: args.city || null,
        max: Number(args.max || 15),
        userId: Number(args['user-id'] || DEFAULT_USER_ID),
        headless: args.headless === 'false' ? false : true,
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const randomDelay = (minMs, maxMs) => sleep(minMs + Math.random() * (maxMs - minMs))

async function acceptConsentIfPresent(page) {
    try {
        const consentButton = await page.$('form[action*="consent"] button, button[aria-label*="Accept" i], button[aria-label*="I agree" i]')
        if (consentButton) {
            await consentButton.click()
            await sleep(1000)
        }
    } catch { /* consent dialog yo'q — davom etamiz */ }
}

async function isBlocked(page) {
    const title = await page.title().catch(() => '')
    if (/unusual traffic|sorry/i.test(title)) return true
    const hasCaptcha = await page.$('iframe[src*="recaptcha"], #captcha-form').catch(() => null)
    return Boolean(hasCaptcha)
}

async function collectSearchResults(page, query, max) {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
    await acceptConsentIfPresent(page)

    if (await isBlocked(page)) {
        throw new Error('BLOCKED')
    }

    const feedSelector = 'div[role="feed"]'
    try {
        await page.waitForSelector(feedSelector, { timeout: 15000 })
    } catch {
        console.warn(`  ! natijalar paneli topilmadi ("${query}") — o'tkazib yuborildi`)
        return []
    }

    let previousCount = 0
    let stagnantRounds = 0

    while (stagnantRounds < 3) {
        const cardCount = await page.$$eval('a.hfpxzc', (els) => els.length).catch(() => 0)
        if (cardCount >= max) break

        await page.$eval(feedSelector, (el) => el.scrollBy(0, 1200)).catch(() => {})
        await randomDelay(1200, 2200)

        const newCount = await page.$$eval('a.hfpxzc', (els) => els.length).catch(() => 0)
        stagnantRounds = newCount <= previousCount ? stagnantRounds + 1 : 0
        previousCount = newCount
    }

    const results = await page.$$eval('a.hfpxzc', (els) =>
        els.map((el) => ({ name: el.getAttribute('aria-label'), url: el.href }))
    )

    return results
        .filter((r) => r.name && r.url)
        .map((r) => {
            // Koordinatalar natija havolasining o'zida bo'ladi: ...!3d<lat>!4d<lng>...
            // Bu sahifaga o'tib page.url()'ni o'qishdan ancha ishonchli.
            const coordMatch = r.url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
            const cidMatch = r.url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)
            return {
                ...r,
                latitude: coordMatch ? parseFloat(coordMatch[1]) : null,
                longitude: coordMatch ? parseFloat(coordMatch[2]) : null,
                googlePlaceId: cidMatch ? `scraped:${cidMatch[1]}` : null,
            }
        })
        .slice(0, max)
}

async function extractPlaceDetails(page, placeUrl) {
    await page.goto(placeUrl, { waitUntil: 'networkidle2', timeout: 45000 })

    if (await isBlocked(page)) {
        throw new Error('BLOCKED')
    }

    return page.evaluate(() => {
        const text = (sel) => document.querySelector(sel)?.textContent?.trim() || null

        const rating = (() => {
            const raw = text('div.F7nice span[aria-hidden="true"]')
            const num = parseFloat(raw)
            return Number.isFinite(num) ? num : null
        })()

        const address = text('button[data-item-id="address"]')
        const phone = (() => {
            const btn = document.querySelector('button[data-item-id^="phone:tel:"]')
            return btn?.textContent?.trim() || null
        })()
        const website = document.querySelector('a[data-item-id="authority"]')?.href || null
        const category = text('button[jsaction*="category"]')
        const photoUrl = document.querySelector('button[aria-label^="Photo of"] img, div.RZ66Rb img')?.src || null

        return { rating, address, phone, website, category, photoUrl }
    })
}

async function scrapeCity(browser, country, city, max) {
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)
    await page.setViewport({ width: 1366, height: 900 })

    let created = 0
    let updated = 0
    let failed = 0

    try {
        const query = `restaurants in ${city}, ${country}`
        console.log(`\n=== ${city}, ${country} ===`)
        const results = await collectSearchResults(page, query, max)
        console.log(`  ${results.length} ta natija topildi`)

        for (const [idx, result] of results.entries()) {
            try {
                if (!result.latitude || !result.longitude) {
                    console.warn(`  [${idx + 1}/${results.length}] koordinata topilmadi, o'tkazib yuborildi: ${result.name}`)
                    failed++
                    continue
                }

                await randomDelay(1500, 3000)
                const details = await extractPlaceDetails(page, result.url)

                const descParts = []
                if (details.rating) descParts.push(`Rating: ${details.rating}`)
                if (details.category) descParts.push(`Category: ${details.category}`)
                descParts.push('Source: Google Maps (scraped)')

                const { wasNew } = await upsertRestaurant({
                    user_id: DEFAULT_USER_ID,
                    name: result.name,
                    description: descParts.join(' / '),
                    phone: details.phone,
                    cuisine_type: details.category,
                    country,
                    city,
                    website: details.website,
                    rating: details.rating,
                    google_place_id: result.googlePlaceId,
                    latitude: result.latitude,
                    longitude: result.longitude,
                    address: details.address,
                    photoUrl: details.photoUrl,
                })

                if (wasNew) created++
                else updated++
                console.log(`  [${idx + 1}/${results.length}] ${wasNew ? 'yaratildi' : 'yangilandi'}: ${result.name}`)
            } catch (error) {
                if (error.message === 'BLOCKED') throw error
                failed++
                console.warn(`  [${idx + 1}/${results.length}] xatolik (${result.name}): ${error.message}`)
            }
        }
    } finally {
        await page.close()
    }

    return { created, updated, failed }
}

async function main() {
    const { country, city, max, userId, headless } = parseArgs()

    const targets = []
    if (country && city) {
        targets.push([country, city])
    } else if (country) {
        for (const c of COUNTRY_CITY_PRESETS[country] || []) targets.push([country, c])
    } else {
        for (const [c, cities] of Object.entries(COUNTRY_CITY_PRESETS)) {
            for (const city of cities) targets.push([c, city])
        }
    }

    if (!targets.length) {
        console.error('Hech qanday nishon topilmadi. --country / --city ni tekshiring.')
        process.exit(1)
    }

    console.log(`Jami ${targets.length} ta shahar bo'yicha ishlaymiz (har biridan ~${max} ta restoran).`)

    const browser = await puppeteer.launch({ headless })
    const totals = { created: 0, updated: 0, failed: 0 }

    try {
        for (const [country, city] of targets) {
            try {
                const result = await scrapeCity(browser, country, city, max)
                totals.created += result.created
                totals.updated += result.updated
                totals.failed += result.failed
            } catch (error) {
                if (error.message === 'BLOCKED') {
                    console.error('\n!!! Google tomonidan bloklandi (CAPTCHA/unusual traffic). To\'xtatildi.')
                    console.error('!!! Biroz kutib, keyinroq qayta urinib ko\'ring yoki --max qiymatini kamaytiring.')
                    break
                }
                console.error(`\n${city}, ${country} uchun kutilmagan xatolik: ${error.message}`)
            }
            await randomDelay(3000, 6000)
        }
    } finally {
        await browser.close()
        await close()
    }

    console.log(`\n=== Yakun: yaratildi ${totals.created}, yangilandi ${totals.updated}, xato/o'tkazib yuborildi ${totals.failed} ===`)
}

main().catch((error) => {
    console.error('Skript ishdan chiqdi:', error)
    process.exit(1)
})
