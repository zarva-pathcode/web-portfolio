import crypto from 'node:crypto';

const password = process.argv.slice(2).join(' ').trim();
if (!password) {
  console.error('Usage: npm run cms:hash -- "your-password"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const sessionSecret = crypto.randomBytes(32).toString('hex');

console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`);
console.log(`CMS_SESSION_SECRET=${sessionSecret}`);
