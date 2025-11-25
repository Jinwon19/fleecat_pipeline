const express = require('express');
const router = express.Router();
const tenantMemberController = require('../controllers/tenantMember.controller');
const { authenticate } = require('../middlewares/auth');
const { validateCreateTenantMember, validateUpdateTenantMember } = require('../middlewares/validation');

/**
 * TenantMember Routes
 * 판매사 구성원(TenantMember) 관련 API 엔드포인트
 *
 * 라우트 구조:
 * - /api/v1/tenants/:id/members - 판매사 가입 신청, 구성원 목록 조회
 * - /api/v1/members/me/tenants - 내 소속 판매사 목록 조회
 * - /api/v1/tenant-members/:id - 구성원 상세, 승인, 거절, 수정
 */

/**
 * @route   GET /api/v1/tenants/:id/members
 * @desc    판매사 구성원 목록 조회
 * @access  Public
 */
router.get('/tenants/:id/members', tenantMemberController.getTenantMembers);

/**
 * @route   POST /api/v1/tenants/:id/members
 * @desc    판매사 가입 신청
 * @access  Private
 */
router.post('/tenants/:id/members', authenticate, validateCreateTenantMember, tenantMemberController.applyToTenant);

/**
 * @route   GET /api/v1/members/me/tenants
 * @desc    내 소속 판매사 목록 조회
 * @access  Private
 */
router.get('/members/me/tenants', authenticate, tenantMemberController.getMyTenantMemberships);

/**
 * @route   GET /api/v1/tenant-members/:id
 * @desc    구성원 상세 조회 (본인 또는 같은 판매사 구성원만)
 * @access  Private
 */
router.get('/tenant-members/:id', authenticate, tenantMemberController.getTenantMemberById);

/**
 * @route   PUT /api/v1/tenant-members/:id/approve
 * @desc    구성원 승인 (Owner 전용)
 * @access  Private
 */
router.put('/tenant-members/:id/approve', authenticate, tenantMemberController.approveMember);

/**
 * @route   PUT /api/v1/tenant-members/:id/reject
 * @desc    구성원 거절 (Owner 전용)
 * @access  Private
 */
router.put('/tenant-members/:id/reject', authenticate, tenantMemberController.rejectMember);

/**
 * @route   PUT /api/v1/tenant-members/:id
 * @desc    구성원 정보 수정 (Owner 전용)
 * @access  Private
 */
router.put('/tenant-members/:id', authenticate, validateUpdateTenantMember, tenantMemberController.updateMember);

module.exports = router;
