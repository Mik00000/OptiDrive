import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/utils/jwt';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const CONCURRENCY_LIMIT = 5; 
const TOTAL_IMAGES = 100;

const formatOptions = ['avif', 'webp', 'jpeg', 'png', 'auto'];
const fitOptions = ['cover', 'contain', 'inside'];

function getRandomOption<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function generateRandomOptions() {
  return {
    format: getRandomOption(formatOptions),
    quality: Math.floor(Math.random() * 60 + 40).toString(),
    fit: getRandomOption(fitOptions),
    width: Math.floor(Math.random() * 1000 + 400).toString(),
    stripMetadata: Math.random() > 0.5 ? 'true' : 'false',
  };
}

function getMimeType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  switch(ext) {
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.gif': return 'image/gif';
    case '.avif': return 'image/avif';
    default: return 'application/octet-stream';
  }
}

async function findImagesOnPC(maxFiles: number): Promise<string[]> {
  try {
    // Шукаємо у домашній директорії, оскільки пошук по / (root) видасть лише системні іконки
    // Можемо також додати пошук по всьому /, але тоді краще шукати в /home або конкретних медіа-директоріях.
    const searchDir = os.homedir(); 
    // Використовуємо bash команду find для миттєвого пошуку. 
    // Ігноруємо node_modules та приховані папки для релевантності.
    const command = `find "${searchDir}" -type d \\( -name "node_modules" -o -name ".*" \\) -prune -o -type f -iregex '.*\\.\\(jpg\\|jpeg\\|png\\|webp\\|svg\\|gif\\|avif\\)$' -print 2>/dev/null | head -n ${maxFiles}`;
    
    const { stdout } = await execAsync(command);
    return stdout.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Помилка при пошуку файлів:', error);
    return [];
  }
}

async function processLocalFile(filePath: string, token: string) {
  const filename = path.basename(filePath);
  try {
    const fileBuffer = await fs.readFile(filePath);
    const options = generateRandomOptions();
    
    const formData = new FormData();
    const mimeType = getMimeType(filename);
    formData.append('image', new Blob([fileBuffer], { type: mimeType }), filename);
    
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
    console.error(`⚠️ [Помилка обробки] ${filename}: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log('📡 Скануємо ПК за допомогою швидкого пошуку (find)...');
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

  const localPhotos = await findImagesOnPC(TOTAL_IMAGES);

  if (localPhotos.length === 0) {
    console.log(`❌ Жодного фото не знайдено на твоєму ПК.`);
    process.exit(1);
  }

  console.log(`📸 Знайдено ${localPhotos.length} фото. Починаємо обробку (по ${CONCURRENCY_LIMIT} паралельно)...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < localPhotos.length; i += CONCURRENCY_LIMIT) {
    const batch = localPhotos.slice(i, i + CONCURRENCY_LIMIT);
    const promises = batch.map((filePath) => processLocalFile(filePath, token));

    const results = await Promise.all(promises);
    successCount += results.filter(Boolean).length;
    failCount += results.filter((res) => !res).length;
    
    console.log(`⏳ Прогрес: ${Math.min(i + CONCURRENCY_LIMIT, localPhotos.length)} / ${localPhotos.length}`);
  }

  console.log('\n🎉 Тестування локальних файлів завершено!');
  console.log(`✅ Успішно: ${successCount}`);
  console.log(`❌ Помилок: ${failCount}`);
  process.exit(0);
}

run();
