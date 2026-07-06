import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Шукаємо перший воркспейс з тарифом PRO або ENTERPRISE
  const workspace = await prisma.workspace.findFirst({
    where: {
      plan: { in: ['PRO', 'ENTERPRISE'] }
    }
  });

  if (!workspace) {
    console.log('❌ No PRO or ENTERPRISE workspace found in the database. Please subscribe a workspace first.');
    return;
  }

  console.log(`Found workspace: ${workspace.name} (${workspace.id}) on plan ${workspace.plan}`);

  // Моделюємо початок грейс-періоду (підписка past_due, початок - зараз)
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      subscriptionStatus: 'past_due',
      gracePeriodStartedAt: new Date(),
    }
  });
  console.log(workspace);

  console.log('\n✅ SIMULATION STARTED:');
  console.log('1. Open the billing page in your browser.');
  console.log('2. You should see a yellow warning banner indicating the grace period is active.');
  console.log('3. Your premium limits remain active.');
  console.log('\nTo simulate EXPIRED grace period (revert to FREE limits):');
  console.log('Run this database command or wait 3 days. Let\'s mock it by setting the grace start date to 4 days ago...');

  // Для швидкого тестування пропонуємо змінити дату на 4 дні тому
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  console.log(`\nTo mock expiration, run the script with 'expire' parameter:`);
  console.log(`npx tsx scripts/simulate-past-due.ts expire`);
}

async function expire() {
  const workspace = await prisma.workspace.findFirst({
    where: {
      plan: { in: ['PRO', 'ENTERPRISE'] }
    }
  });

  if (!workspace) {
    console.log('❌ Workspace not found.');
    return;
  }

  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      subscriptionStatus: 'past_due',
      gracePeriodStartedAt: fourDaysAgo,
    }
  });
  console.log(workspace);

  console.log('\n✅ SIMULATION EXPIRED:');
  console.log('1. Reload the billing page.');
  console.log('2. You should see the red banner showing "Grace period expired".');
  console.log('3. Your limits are now restricted to FREE plan limits (1 GB storage), and you will be blocked if you exceed it.');
}

const args = process.argv.slice(2);
if (args.includes('expire')) {
  expire().catch(console.error).finally(() => prisma.$disconnect());
} else {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
