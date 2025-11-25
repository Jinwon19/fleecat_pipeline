/**
 * 관리자 계정 생성 스크립트
 * 사용법: node scripts/create-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔐 관리자 계정 생성 중...\n');

    // 관리자 정보
    const adminData = {
      email: 'admin@fleecat.com',
      password: 'admin1234',
      nickname: '관리자',
      name: '플리캣 관리자',
      role: 'admin'
    };

    // 기존 계정 확인
    const existingUser = await prisma.member.findUnique({
      where: { member_email: adminData.email }
    });

    if (existingUser) {
      console.log('⚠️  이미 관리자 계정이 존재합니다.');
      console.log(`   이메일: ${existingUser.member_email}`);
      console.log(`   역할: ${existingUser.member_account_role}`);
      console.log('\n기존 계정을 사용하거나 삭제 후 다시 실행하세요.\n');
      return;
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // 관리자 계정 생성
    const admin = await prisma.member.create({
      data: {
        member_email: adminData.email,
        member_password: hashedPassword,
        member_nickname: adminData.nickname,
        member_name: adminData.name,
        member_account_role: adminData.role,
        member_status: 'active',
        member_phone: '010-0000-0000',
        member_birth_date: new Date('1990-01-01'),
        member_gender: 'other',
        member_join_type: 'email'
      }
    });

    // 권한 설정
    await prisma.memberPermission.create({
      data: {
        member_id: admin.member_id,
        member_permission_can_purchase: true,
        member_permission_can_sell: true,
        member_permission_can_review: true,
        member_permission_can_comment: true
      }
    });

    console.log('✅ 관리자 계정이 생성되었습니다!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 이메일:', adminData.email);
    console.log('🔑 비밀번호:', adminData.password);
    console.log('👤 이름:', adminData.name);
    console.log('🏷️  역할:', adminData.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 로그인 URL: http://localhost:3000/admin/index.html\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
