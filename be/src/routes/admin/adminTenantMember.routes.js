const express = require('express');
const router = express.Router();
const adminTenantMemberController = require('../../controllers/admin/adminTenantMember.controller');

/**
 * Admin TenantMember Routes
 * 관리자용 판매사 구성원 관리 라우트
 */

// 판매사 구성원 목록 조회 (전체)
router.get('/', adminTenantMemberController.getTenantMemberList);

// 판매사 구성원 상세 조회
router.get('/:id', adminTenantMemberController.getTenantMemberById);

// 판매사 구성원 승인
router.patch('/:id/approve', adminTenantMemberController.approveTenantMember);

// 판매사 구성원 거절
router.patch('/:id/reject', adminTenantMemberController.rejectTenantMember);

module.exports = router;
