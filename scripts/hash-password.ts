/**
 * npm run hash-password -- '<password>'
 * Prints the scrypt hash to put in ADMIN_PASSWORD_HASH (Vercel → Settings → Environment Variables).
 */
import { hashPassword } from '../lib/adminAuth';

const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error('Usage: npm run hash-password -- "<password of at least 10 characters>"');
  process.exit(1);
}
console.log(hashPassword(pw));
