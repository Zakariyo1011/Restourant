# Rasm yuklash test jarayoni

## Qo'llaniladigan endpointlar:

### 1. Yangi restoran yaratish (rasm bilan):
```bash
POST /api/restaurants
Content-Type: multipart/form-data

name: "Restoran nomi"
description: "Tavsifi"
phone: "+998..."
latitude: 41.2995
longitude: 69.2401
address: "Manzil"
image: [rasm fayli]
```

### 2. Restoranni yangilash (rasm bilan):
```bash
POST /api/my-restaurant
Content-Type: multipart/form-data

name: "Yangi nom"
image: [yangi rasm fayli]
```

### 3. Logs tekshirish:
```bash
tail -f storage/logs/laravel.log | grep "ImageKit\|Store:\|Update:"
```

## Asosiy o'zgarishlar:

✅ `uploadToImageKit()` metodi to'g'rilandi
✅ Batafsil logging qo'shildi
✅ Response strukturasi tekshirish yaxshilandi
✅ Error handling yaxshilandi

## Debug qilish uchun:

1. **Rasm yuklash jarayonini kuzatish:**
   - Log faylida "ImageKit Response:" qidiramiz
   - Response struktura tekshiramiz

2. **URL saqlash tekshiramiz:**
   - Log faylida "Store:" yoki "Update:" qidiramiz
   - Database-da restaurants.image_path ustuni qiymatini tekshiramiz

3. **Frontend tarafida:**
   - API response-dan image_path olamiz
   - Rasmni ko'rsatish uchun bu URLni ishlatamiz

## Mumkin bo'lgan muammolar:

1. **ImageKit credentials xato** → .env tekshiramiz
2. **Rasm file xato format** → image validation qo'shilgan
3. **Database saqlash xato** → image_path NULL bo'lgan → Log tekshiramiz
