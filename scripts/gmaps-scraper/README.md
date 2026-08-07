# Google Maps scraper (restoranlar uchun)

Google Places API (pullik, hozircha o'chirilgan) o'rniga Google Maps'ning veb-sahifasidan
restoran ma'lumotlarini (nom, telefon, sayt, reyting, manzil, koordinata, rasm) o'qib,
to'g'ridan-to'g'ri `restaurants` / `locations` / `restaurant_images` jadvallariga yozadi.

**Muhim eslatma**: bu rasmiy API emas — Google'ning veb-sahifasini "o'qiydi". Bu ularning
Terms of Service'ini buzadi, DOM tuzilishi o'zgarsa selektorlar ishlamay qolishi mumkin, va
IP vaqtincha bloklanishi mumkin. Skript CAPTCHA yechish yoki proxy/IP aylantirish qilmaydi —
bloklanish aniqlansa, shunchaki to'xtaydi.

## O'rnatish

```bash
cd scripts/gmaps-scraper
npm install
```

## Lokal (dev bazasiga) ishlatish

Loyihaning `.env` faylidagi `DB_*` qiymatlarini avtomatik o'qiydi:

```bash
node scrape.js --country="Turkey" --city="Istanbul" --max=10   # bitta shahar (sinov uchun)
node scrape.js --max=15                                        # barcha 8 davlat, har shahardan 15 tadan
node scrape.js --headless=false                                # brauzerni ko'rsatib debug qilish
```

## Production (Railway) bazasiga ishlatish

Puppeteer'ni Railway konteyneriga o'rnatish (Chromium, kerakli tizim kutubxonalari)
qo'shimcha sozlash talab qiladi, shuning uchun eng sodda va ishonchli yo'l — skriptni
**shu kompyuterda** ishga tushirish, lekin **Railway orqali production DB o'zgaruvchilarini**
in'ektsiya qildirish:

```bash
# 1. Railway CLI o'rnatish (agar hali yo'q bo'lsa)
npm install -g @railway/cli

# 2. Railway akkauntingizga kirish (brauzer ochiladi)
railway login

# 3. Ushbu loyihani Railway'dagi tegishli project/service bilan bog'lash
cd restoran-sayt
railway link

# 4. Scraper papkasiga o'tib, production DB_* o'zgaruvchilari bilan ishga tushirish
cd scripts/gmaps-scraper
railway run node scrape.js --country="Turkey" --city="Istanbul" --max=10
```

`railway run` buyrug'i faqat environment o'zgaruvchilarini (DB_HOST, DB_DATABASE va h.k.)
joriy terminalga in'ektsiya qiladi — kod baribir shu kompyuterda, siz ko'rgan brauzerda
ishlaydi. Bazaga yozish esa to'g'ridan-to'g'ri production MySQL'ga boradi, shuning uchun
avval kichik `--max` bilan (masalan 5-10) bitta shaharda sinab ko'ring.

## Parametrlar

| Flag | Ma'no | Default |
|---|---|---|
| `--country` | Bitta davlat nomi (masalan `"Turkey"`) | yo'q — bo'sh bo'lsa 8 ta davlat ham ishlaydi |
| `--city` | Bitta shahar (`--country` bilan birga) | yo'q — bo'sh bo'lsa davlatning barcha shaharlari |
| `--max` | Har bir shahardan nechta restoran | `15` |
| `--headless` | `false` bo'lsa brauzer ko'rinadi (debug uchun) | `true` |
| `--user-id` | Restoranlar qaysi user_id'ga bog'lansin | `1` |

## Qanday ishlaydi

1. Har bir shahar uchun Google Maps qidiruv sahifasini ochadi (`restaurants in {city}, {country}`)
2. Natijalar ro'yxatini pastga aylantirib (`--max` gacha) yig'adi — nom, koordinata va
   Google'ning ichki CID'si to'g'ridan-to'g'ri natija havolasidan olinadi
3. Har bir restoran uchun uning sahifasiga kirib telefon, sayt, kategoriya, rasm va reytingni
   o'qiydi (har biri orasida 1.5-3 soniya tasodifiy kutish bilan)
4. Nomi + shahri bo'yicha mavjud yozuvni qidiradi — topilsa yangilaydi, topilmasa yangi
   restoran, location va rasm yozuvi yaratadi (dublikat yaratmaydi)

## Cheklovlar / bilib qo'yish kerak bo'lgan narsalar

- Google'ning DOM class nomlari (`a.hfpxzc`, `div.F7nice` va h.k.) vaqt o'tishi bilan
  o'zgarishi mumkin — shunda extraction funksiyalarini yangilash kerak bo'ladi
- Telefon/sayt/rasm har doim ham topilavermaydi — bunday hollarda shunchaki `null` qoladi,
  skript to'xtamaydi
- Bir xil restoranni qayta scraping qilsangiz, rasm URL'lari har safar farq qilishi mumkin
  (Google'ning dinamik linklari) — shu sabab qayta ishga tushirilganda ba'zi restoranlarga
  bir nechta rasm to'planishi mumkin, bu zararli emas
