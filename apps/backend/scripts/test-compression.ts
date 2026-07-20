import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/utils/jwt';

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TOTAL_IMAGES = 100; // Кількість файлів для тесту (сотня)
const CONCURRENCY_LIMIT = 5; // Скільки файлів обробляти одночасно

// Можливі варіанти налаштувань для рандомізації
const formatOptions = ['avif', 'webp', 'jpeg', 'png', 'auto'];
const fitOptions = ['cover', 'contain', 'inside'];

function getRandomOption<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function generateRandomOptions() {
  return {
    format: getRandomOption(formatOptions),
    quality: Math.floor(Math.random() * 60 + 40).toString(), // від 40 до 100
    fit: getRandomOption(fitOptions),
    width: Math.floor(Math.random() * 1000 + 400).toString(), // від 400 до 1400
    stripMetadata: Math.random() > 0.5 ? 'true' : 'false',
  };
}

async function processFile(url: string, filename: string, token: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const buffer = await response.arrayBuffer();
    const options = generateRandomOptions();
    
    const formData = new FormData();
    formData.append('image', new Blob([buffer], { type: response.headers.get('content-type') || 'application/octet-stream' }), filename);
    
    for (const [key, value] of Object.entries(options)) {
      formData.append(key, value);
    }

    const uploadRes = await fetch(`${BACKEND_URL}/api/internal/media/compress`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData as any,
    });

    const result: any = await uploadRes.json();
    
    if (uploadRes.ok) {
      console.log(`✅ [Успіх] ${filename} | Опції: ${options.format} | Зекономлено: ${result.data.savingsPercent}%`);
      return true;
    } else {
      console.error(`❌ [Помилка] ${filename} | API відповів:`, result.error || result);
      return false;
    }
  } catch (error: any) {
    console.error(`⚠️ [Помилка завантаження] ${filename}: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log(`🚀 Запуск масштабного тесту стиснення (${TOTAL_IMAGES} фото)...`);

  const user = await prisma.user.findFirst({
    include: {
      workspaces: true
    }
  });
  if (!user) {
    console.error('Користувачів не знайдено. Спочатку зареєструй хоча б одного.');
    process.exit(1);
  }

  const workspaceId = user.activeWorkspaceId || user.workspaces[0]?.workspaceId || '';
  const token = generateToken(user.id, workspaceId);
  console.log(`👤 Використовуємо користувача ${user.email}`);

  console.log('📡 Отримуємо список фото з Picsum API...');
  let photos: any[] = [];
  try {
    const listRes = await fetch(`https://picsum.photos/v2/list?limit=${TOTAL_IMAGES}`);
    photos = (await listRes.json()) as any[];
  } catch (err: any) {
    console.error('Не вдалося отримати список фото з інтернету. Перевір підключення.', err.message);
    process.exit(1);
  }

  console.log(`📸 Отримано ${photos.length} фото. Починаємо обробку (по ${CONCURRENCY_LIMIT} паралельно)...`);

  let successCount = 0;
  let failCount = 0;

  // Обробка батчами (паралельно)
  for (let i = 0; i < photos.length; i += CONCURRENCY_LIMIT) {
    const batch = photos.slice(i, i + CONCURRENCY_LIMIT);
    const promises = batch.map((photo: any, index: number) => {
      // url: photo.download_url
      // Використовуємо інший розмір, щоб Picsum не кешував
      const width = Math.floor(Math.random() * 800 + 400);
      const url = `https://picsum.photos/id/${photo.id}/${width}/${width}`;
      const filename = `test-image-${photo.id}-${i + index}.jpg`;
      return processFile(url, filename, token);
    });

    const results = await Promise.all(promises);
    successCount += results.filter(Boolean).length;
    failCount += results.filter((res) => !res).length;
    
    console.log(`⏳ Прогрес: ${Math.min(i + CONCURRENCY_LIMIT, photos.length)} / ${photos.length}`);
  }

  console.log('\n🎉 Тестування завершено!');
  console.log(`✅ Успішно: ${successCount}`);
  console.log(`❌ Помилок: ${failCount}`);
  process.exit(0);
}

run();
