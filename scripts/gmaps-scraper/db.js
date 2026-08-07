const path = require('path')
const mysql = require('mysql2/promise')

// Lokal ishlatishda ../../.env (Laravel loyihasi) dan o'qiydi. Railway orqali
// ishga tushirilganda (`railway run node scrape.js`) DB_* environment
// o'zgaruvchilari Railway tomonidan allaqachon process.env'ga in'ektsiya qilingan
// bo'ladi — dotenv mavjud qiymatlarni bosib yozmaydi, shuning uchun xavfsiz.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

// Laravel `DB_URL` (yagona connection string) bilan ham ishlashi mumkin —
// Railway'da ba'zan shu formatda beriladi.
function resolveConnectionConfig() {
    if (process.env.DB_URL) {
        const parsed = new URL(process.env.DB_URL)
        return {
            host: parsed.hostname,
            port: Number(parsed.port || 3306),
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace(/^\//, ''),
        }
    }

    return {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE,
    }
}

const pool = mysql.createPool({
    ...resolveConnectionConfig(),
    waitForConnections: true,
    connectionLimit: 5,
})

async function findExistingRestaurant({ name, city }) {
    const [rows] = await pool.query(
        'SELECT id FROM restaurants WHERE name = ? AND city = ? LIMIT 1',
        [name, city]
    )
    return rows[0] || null
}

async function upsertRestaurant(data) {
    const existing = await findExistingRestaurant({ name: data.name, city: data.city })

    let restaurantId
    if (existing) {
        await pool.query(
            `UPDATE restaurants SET description = ?, phone = ?, cuisine_type = ?, country = ?,
             website = ?, rating = ?, google_place_id = COALESCE(google_place_id, ?), updated_at = NOW()
             WHERE id = ?`,
            [data.description, data.phone, data.cuisine_type, data.country, data.website, data.rating, data.google_place_id, existing.id]
        )
        restaurantId = existing.id
    } else {
        const [result] = await pool.query(
            `INSERT INTO restaurants
             (user_id, name, description, phone, cuisine_type, country, city, website, rating,
              google_place_id, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [data.user_id, data.name, data.description, data.phone, data.cuisine_type,
             data.country, data.city, data.website, data.rating, data.google_place_id]
        )
        restaurantId = result.insertId
    }

    if (data.latitude != null && data.longitude != null) {
        const [locRows] = await pool.query(
            'SELECT id FROM locations WHERE restaurant_id = ? LIMIT 1',
            [restaurantId]
        )
        if (locRows[0]) {
            await pool.query(
                'UPDATE locations SET latitude = ?, longitude = ?, address = ?, updated_at = NOW() WHERE id = ?',
                [data.latitude, data.longitude, data.address, locRows[0].id]
            )
        } else {
            await pool.query(
                `INSERT INTO locations (restaurant_id, latitude, longitude, address, created_at, updated_at)
                 VALUES (?, ?, ?, ?, NOW(), NOW())`,
                [restaurantId, data.latitude, data.longitude, data.address]
            )
        }
    }

    if (data.photoUrl) {
        const [imgRows] = await pool.query(
            'SELECT id FROM restaurant_images WHERE restaurant_id = ? AND url = ? LIMIT 1',
            [restaurantId, data.photoUrl]
        )
        if (!imgRows[0]) {
            await pool.query(
                'INSERT INTO restaurant_images (restaurant_id, url, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
                [restaurantId, data.photoUrl]
            )
        }
    }

    return { id: restaurantId, wasNew: !existing }
}

async function close() {
    await pool.end()
}

module.exports = { upsertRestaurant, close }
