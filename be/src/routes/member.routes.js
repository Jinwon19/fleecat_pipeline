const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const { validateUpdateMember } = require('../middlewares/validation');
const { authenticate } = require('../middlewares/auth');

/**
 * Member Routes
 * 회원 정보 관리 관련 API 엔드포인트
 */

/**
 * @route   GET /api/v1/members/me
 * @desc    내 정보 조회
 * @access  Private
 */
router.get('/me', authenticate, memberController.getMe);

/**
 * @route   PUT /api/v1/members/me
 * @desc    내 정보 수정
 * @access  Private
 */
router.put('/me', authenticate, validateUpdateMember, memberController.updateMe);

module.exports = router;
