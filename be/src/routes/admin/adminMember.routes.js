const express = require('express');
const router = express.Router();
const adminMemberController = require('../../controllers/admin/adminMember.controller');

/**
 * Admin Member Routes
 * 관리자용 회원 관리 라우트
 */

// 회원 목록 조회 (페이징, 필터링, 검색)
router.get('/', adminMemberController.getMemberList);

// 회원 검색
router.get('/search', adminMemberController.searchMembers);

// 회원 통계 조회
router.get('/statistics', adminMemberController.getMemberStatistics);

// 회원 상세 조회
router.get('/:id', adminMemberController.getMemberById);

// 회원 상태 변경
router.patch('/:id/status', adminMemberController.updateMemberStatus);

// 회원 역할 변경
router.patch('/:id/role', adminMemberController.updateMemberRole);

module.exports = router;
