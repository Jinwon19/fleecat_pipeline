const express = require('express');
const router = express.Router();
// const { authenticate, authorize } = require('../middlewares/auth');

// 서브 라우트 임포트
const adminMemberRoutes = require('./admin/adminMember.routes');
const adminTenantRoutes = require('./admin/adminTenant.routes');
const adminTenantMemberRoutes = require('./admin/adminTenantMember.routes');
const adminCategoryRoutes = require('./admin/adminCategory.routes');
const adminProductRoutes = require('./admin/adminProduct.routes');
const adminOrderRoutes = require('./admin/adminOrder.routes');
const adminDashboardRoutes = require('./admin/adminDashboard.routes');

// TODO: 프로덕션 환경에서는 인증 미들웨어 활성화 필요
// router.use(authenticate);
// router.use(authorize('admin'));

// 서브 라우트 연결
router.use('/members', adminMemberRoutes);
router.use('/tenants', adminTenantRoutes);
router.use('/tenant-members', adminTenantMemberRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/products', adminProductRoutes);
router.use('/orders', adminOrderRoutes);
router.use('/dashboard', adminDashboardRoutes);

module.exports = router;
