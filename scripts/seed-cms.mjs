import { createServer } from 'vite';

// Load optional .env into process.env when run directly via Node
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional for local SQLite default
  }
}

const overwrite = process.argv.includes('--overwrite');
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true },
});

try {
  const { seedCmsDatabase } = await vite.ssrLoadModule('/src/lib/cms/seed.ts');
  const counts = await seedCmsDatabase({ overwrite });
  console.log('CMS database seeded cleanly:', JSON.stringify(counts));
} finally {
  await vite.close();
}
