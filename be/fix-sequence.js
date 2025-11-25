const prisma = require('./src/config/database');

async function fixSequence() {
  try {
    // Category 시퀀스 재설정
    await prisma.$executeRawUnsafe(`
      SELECT setval(pg_get_serial_sequence('category', 'category_id'),
      COALESCE((SELECT MAX(category_id) FROM category), 1), true);
    `);

    console.log('✅ Category 시퀀스가 재설정되었습니다.');
  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequence();
