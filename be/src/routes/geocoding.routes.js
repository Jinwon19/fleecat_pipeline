/**
 * Geocoding Routes
 * 주소 → 좌표 변환 API 엔드포인트
 */

const express = require('express');
const router = express.Router();
const geocodingController = require('../controllers/geocoding.controller');

/**
 * @route   POST /api/v1/geocoding
 * @desc    단일 주소 → 좌표 변환
 * @body    { location: "주소 또는 장소명", marketName: "플리마켓 이름" (선택사항) }
 * @access  Public
 */
router.post('/', geocodingController.geocodeLocation);

/**
 * @route   POST /api/v1/geocoding/batch
 * @desc    여러 주소 → 좌표 변환 (배치 처리)
 * @body    { locations: ["주소1", "주소2", ...] }
 * @access  Public
 */
router.post('/batch', geocodingController.geocodeBatch);

/**
 * @route   DELETE /api/v1/geocoding/cache
 * @desc    Geocoding 캐시 초기화
 * @access  Public (필요시 인증 추가)
 */
router.delete('/cache', geocodingController.clearCache);

module.exports = router;
