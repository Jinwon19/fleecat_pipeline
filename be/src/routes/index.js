const express = require('express');
const router = express.Router();

// 라우터 임포트
const authRoutes = require('./auth.routes');
const memberRoutes = require('./member.routes');
const adminRoutes = require('./admin.routes');
const tenantRoutes = require('./tenant.routes');
const tenantMemberRoutes = require('./tenantMember.routes');
const categoryRoutes = require('./category.routes');
const productRoutes = require('./product.routes');
const fleaMarketRoutes = require('./fleaMarket.routes');
const geocodingRoutes = require('./geocoding.routes');

// 라우터 연결
router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/admin', adminRoutes);
router.use('/tenants', tenantRoutes);
router.use('/', tenantMemberRoutes); // /tenants/:id/members, /members/me/tenants, /tenant-members/:id
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/flea-markets', fleaMarketRoutes);
router.use('/geocoding', geocodingRoutes);

// 기본 라우트 (API 상태 확인용)
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Fleecat API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      members: '/api/v1/members',
      admin: '/api/v1/admin',
      tenants: '/api/v1/tenants',
      tenantMembers: '/api/v1/tenant-members',
      categories: '/api/v1/categories',
      products: '/api/v1/products',
      fleaMarkets: '/api/v1/flea-markets',
      geocoding: '/api/v1/geocoding'
    }
  });
});

module.exports = router;
