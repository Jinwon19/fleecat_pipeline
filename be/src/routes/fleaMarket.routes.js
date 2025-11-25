/**
 * FleaMarket Routes
 * API 엔드포인트 정의
 */

const express = require('express');
const router = express.Router();
const fleaMarketController = require('../controllers/fleaMarket.controller');

/**
 * @route   GET /api/v1/flea-markets
 * @desc    플리마켓 목록 조회 (날짜 필터링 가능)
 * @query   start_date, end_date
 * @access  Public
 */
router.get('/', fleaMarketController.getFleaMarkets);

/**
 * @route   GET /api/v1/flea-markets/visualization
 * @desc    프론트엔드 지도 시각화용 데이터 (Excel 형식)
 * @query   start_date, end_date
 * @access  Public
 */
router.get('/visualization', fleaMarketController.getFleaMarketsForVisualization);

/**
 * @route   GET /api/v1/flea-markets/with-location
 * @desc    위치 정보가 있는 플리마켓만 조회
 * @access  Public
 */
router.get('/with-location', fleaMarketController.getFleaMarketsWithLocation);

/**
 * @route   GET /api/v1/flea-markets/upcoming
 * @desc    다가오는 플리마켓 조회
 * @query   limit (default: 50)
 * @access  Public
 */
router.get('/upcoming', fleaMarketController.getUpcomingFleaMarkets);

/**
 * @route   GET /api/v1/flea-markets/:id
 * @desc    플리마켓 상세 조회
 * @access  Public
 */
router.get('/:id', fleaMarketController.getFleaMarketById);

module.exports = router;
