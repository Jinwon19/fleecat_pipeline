const express = require('express');
const router = express.Router();
const adminTenantController = require('../../controllers/admin/adminTenant.controller');

/**
 * Admin Tenant Routes
 * 관리자용 판매사 관리 라우트
 */

// 판매사 목록 조회 (페이징, 필터링, 검색)
router.get('/', adminTenantController.getTenantList);

// 판매사 통계 조회
router.get('/statistics', adminTenantController.getTenantStatistics);

// 판매사 상세 조회
router.get('/:id', adminTenantController.getTenantById);

// 판매사 승인
router.post('/:id/approve', adminTenantController.approveTenant);

// 판매사 거절
router.post('/:id/reject', adminTenantController.rejectTenant);

// 판매사 상태 변경
router.patch('/:id/status', adminTenantController.updateTenantStatus);

module.exports = router;
