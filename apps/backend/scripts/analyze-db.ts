import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const mediaFiles = await prisma.mediaFile.findMany();
  console.log(`Total Media Files: ${mediaFiles.length}`);

  let totalOriginal = 0;
  let totalOptimized = 0;
  let savingsCount = 0;
  let negativeSavings = 0;
  let zeroSavings = 0;
  
  const formats: Record<string, number> = {};

  for (const file of mediaFiles) {
    totalOriginal += Number(file.originalSize);
    totalOptimized += Number(file.optimizedSize);
    
    formats[file.format] = (formats[file.format] || 0) + 1;

    if (file.savings > 0) savingsCount++;
    else if (file.savings < 0) negativeSavings++;
    else zeroSavings++;
  }

  console.log(`Formats:`, formats);
  console.log(`Total Original Size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Optimized Size: ${(totalOptimized / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Savings: ${(((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(2)}%`);
  
  console.log(`\nFiles with positive savings: ${savingsCount}`);
  console.log(`Files with zero savings: ${zeroSavings}`);
  console.log(`Files with negative savings (size increased): ${negativeSavings}`);

  // Fetch some problematic files
  const badFiles = await prisma.mediaFile.findMany({
    where: { savings: { lte: 0 } },
    take: 5
  });

  if (badFiles.length > 0) {
    console.log('\nSample files with <= 0% savings:');
    badFiles.forEach(f => {
      console.log(`- ${f.name} (${f.format}): Original: ${f.originalSize}B, Optimized: ${f.optimizedSize}B, Savings: ${f.savings}%`);
    });
  }

  // Check for any missing URL or sizes
  const invalidFiles = await prisma.mediaFile.findMany({
    where: {
      OR: [
        { cdnUrl: '' },
        { originalSize: 0 },
        { optimizedSize: 0 }
      ]
    }
  });

  if (invalidFiles.length > 0) {
    console.log(`\nFound ${invalidFiles.length} INVALID files (missing URL or size 0).`);
  }

  process.exit(0);
}

run();
