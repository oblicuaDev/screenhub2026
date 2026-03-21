// Generates unique screen short codes: AB-1234
// Avoids I and O to prevent confusion with 1 and 0
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateShortCode() {
  const l1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const l2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${l1}${l2}-${num}`;
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

async function generateUniqueShortCode(db) {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateShortCode();
    const { rows } = await db.query(
      'SELECT id FROM screens WHERE short_code = $1 AND deleted_at IS NULL',
      [code]
    );
    if (rows.length === 0) return code;
    attempts++;
  }
  throw new Error('Could not generate unique short code after 10 attempts');
}

async function generateUniqueSlug(db, name, excludeId = null) {
  const base = generateSlug(name) || 'screen';
  let slug = base;
  let counter = 1;

  while (true) {
    const query = excludeId
      ? 'SELECT id FROM screens WHERE public_url_slug = $1 AND deleted_at IS NULL AND id != $2'
      : 'SELECT id FROM screens WHERE public_url_slug = $1 AND deleted_at IS NULL';
    const params = excludeId ? [slug, excludeId] : [slug];
    const { rows } = await db.query(query, params);
    if (rows.length === 0) return slug;
    slug = `${base}-${counter}`;
    counter++;
    if (counter > 100) throw new Error('Could not generate unique slug');
  }
}

module.exports = { generateShortCode, generateSlug, generateUniqueShortCode, generateUniqueSlug };
