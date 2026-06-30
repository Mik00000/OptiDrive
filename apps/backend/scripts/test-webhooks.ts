import { prisma } from '../src/config/prisma';
import { triggerWebhooks } from '../src/services/webhook.service';

async function main() {
  console.log('--- Starting Webhook Integration Test ---');
  
  // 1. Отримуємо перший доступний воркспейс
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.error('No workspace found in DB to run tests.');
    return;
  }
  const workspaceId = workspace.id;
  console.log(`Using workspace: ${workspace.name} (${workspaceId})`);

  // 2. Створюємо тимчасовий тестовий вебхук у базі даних
  const events = ['file.optimized', 'file.deleted', 'file.restored', 'folder.created', 'folder.deleted'];
  const testWebhook = await prisma.webhook.create({
    data: {
      name: 'Test Webhook Integration',
      url: 'http://localhost:9999/webhook-mock-receiver',
      secret: 'whsec_testsecret12345',
      events,
      workspaceId,
      isActive: true
    }
  });
  console.log(`Created test webhook: ${testWebhook.id}`);

  // 3. Симулюємо виклик кожної з подій
  console.log('Triggering file.optimized...');
  await triggerWebhooks(workspaceId, 'file.optimized', { id: 'test-file-123', name: 'optimized-image.jpg' });

  console.log('Triggering file.deleted...');
  await triggerWebhooks(workspaceId, 'file.deleted', { id: 'test-file-123', name: 'optimized-image.jpg' });

  console.log('Triggering file.restored...');
  await triggerWebhooks(workspaceId, 'file.restored', { id: 'test-file-123', name: 'optimized-image.jpg' });

  console.log('Triggering folder.created...');
  await triggerWebhooks(workspaceId, 'folder.created', { id: 'test-folder-456', name: 'Assets' });

  console.log('Triggering folder.deleted...');
  await triggerWebhooks(workspaceId, 'folder.deleted', { id: 'test-folder-456', name: 'Assets' });

  // Чекаємо 2 секунди, щоб фонові проміси (setImmediate) встигли виконатися
  console.log('Waiting for background delivery processing...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 4. Отримуємо лог доставлених запитів
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId: testWebhook.id },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\nFound ${deliveries.length} delivery attempts in database:`);
  deliveries.forEach((d) => {
    console.log(`- Event: ${d.event}`);
    console.log(`  Success: ${d.success} (expected false due to offline mock receiver)`);
    console.log(`  Status: ${d.status}`);
    console.log(`  Payload: ${d.payload}`);
    console.log(`  Response: ${d.response}`);
    console.log('--------------------------------------');
  });

  // 5. Очищуємо базу від тестових даних
  await prisma.webhookDelivery.deleteMany({
    where: { webhookId: testWebhook.id }
  });
  await prisma.webhook.delete({
    where: { id: testWebhook.id }
  });
  console.log('Cleaned up test webhook and delivery logs.');
  console.log('--- Test Completed Successfully ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
