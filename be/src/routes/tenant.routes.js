const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateCreateTenant, validateUpdateTenant } = require('../middlewares/validation');

/**
 * Tenant Routes
 * 판매사(Tenant) 관련 API 엔드포인트
 */

/**
 * @route   GET /api/v1/tenants
 * @desc    판매사 목록 조회 (관리자 전용, 페이징/필터링)
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize('admin'), tenantController.getAllTenants);

/**
 * @route   GET /api/v1/tenants/me
 * @desc    내 판매사 목록 조회
 * @access  Private
 */
router.get('/me', authenticate, tenantController.getMyTenants);

/**
 * @route   GET /api/v1/tenants/:id
 * @desc    판매사 상세 조회
 * @access  Public
 */
router.get('/:id', tenantController.getTenantById);

/**
 * @route   POST /api/v1/tenants
 * @desc    판매사 등록 신청
 * @access  Private
 */
router.post('/', authenticate, validateCreateTenant, tenantController.register);

/**
 * @route   PUT /api/v1/tenants/:id
 * @desc    판매사 정보 수정 (Owner만 가능)
 * @access  Private
 */
router.put('/:id', authenticate, validateUpdateTenant, tenantController.updateTenant);

/**
 * @route   PUT /api/v1/tenants/:id/approve
 * @desc    판매사 승인 (관리자 전용)
 * @access  Private (Admin)
 */
router.put('/:id/approve', authenticate, authorize('admin'), tenantController.approveTenant);

/**
 * @route   PUT /api/v1/tenants/:id/reject
 * @desc    판매사 거절 (관리자 전용)
 * @access  Private (Admin)
 */
router.put('/:id/reject', authenticate, authorize('admin'), tenantController.rejectTenant);

module.exports = router;
