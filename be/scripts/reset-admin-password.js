/**
 * 관리자 비밀번호 재설정 스크립트
 * 사용법: node scripts/reset-admin-password.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    console.log('🔑 관리자 비밀번호 재설정 중...\n');

    const adminEmail = 'admin@fleecat';
    const newPassword = 'admin1234';

    // 1. 관리자 계정 찾기
    const admin = await prisma.member.findUnique({
      where: { member_email: adminEmail }
    });

    if (!admin) {
      console.log(`❌ 이메일 ${adminEmail}로 계정을 찾을 수 없습니다.\n`);
      console.log('다음 명령으로 데이터베이스 확인:');
      console.log('  npx prisma studio\n');
      return;
    }

    console.log('✓ 계정을 찾았습니다:');
    console.log(`  이메일: ${admin.member_email}`);
    console.log(`  이름: ${admin.member_name}`);
    console.log(`  역할: ${admin.member_account_role}`);
    console.log(`  상태: ${admin.member_status}\n`);

    // 2. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. 비밀번호 업데이트
    await prisma.member.update({
      where: { member_id: admin.member_id },
      data: {
        member_password: hashedPassword
      }
    });

    console.log('✅ 비밀번호가 재설정되었습니다!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 이메일:', adminEmail);
    console.log('🔑 새 비밀번호:', newPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 로그인 URL: http://localhost:3000/admin/index.html\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
