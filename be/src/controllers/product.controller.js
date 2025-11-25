const productService = require('../services/product.service');
const { successResponse } = require('../utils/response');

/**
 * Product Controller
 * 상품 관련 HTTP 요청 처리
 */

/**
 * 상품 등록 (인증된 TenantMember만 가능)
 * POST /api/products
 */
async function createProduct(req, res, next) {
  try {
    const memberId = req.user.member_id;
    const data = req.body;

    const product = await productService.createProduct(memberId, data);

    return successResponse(
      res,
      product,
      'Product created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 상세 조회 (Public)
 * GET /api/products/:productId
 */
async function getProductById(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const product = await productService.getProductById(productId);

    return successResponse(
      res,
      product,
      'Product retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 내 상품 목록 조회 (판매자용)
 * GET /api/products/me/:tenantMemberId
 * Query: page, limit, status
 */
async function getMyProducts(req, res, next) {
  try {
    const memberId = req.user.member_id;
    const tenantMemberId = parseInt(req.params.tenantMemberId, 10);

    if (isNaN(tenantMemberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant member ID'
      });
    }

    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      status: req.query.status // 'active', 'sold_out', 'inactive', or undefined (all)
    };

    const result = await productService.getMyProducts(memberId, tenantMemberId, options);

    return successResponse(
      res,
      result,
      'My products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 전체 상품 목록 조회 (Public, 필터링/정렬/페이징)
 * GET /api/products
 * Query: page, limit, status, categoryId, tenantId, minPrice, maxPrice, search, sortBy, sortOrder
 */
async function getAllProducts(req, res, next) {
  try {
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      status: req.query.status || 'active',
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined,
      tenantId: req.query.tenantId ? parseInt(req.query.tenantId, 10) : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      search: req.query.search,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await productService.getAllProducts(options);

    return successResponse(
      res,
      result,
      'Products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 카테고리별 상품 목록 조회 (Public)
 * GET /api/products/category/:categoryId
 * Query: page, limit
 */
async function getProductsByCategory(req, res, next) {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    };

    const result = await productService.getProductsByCategory(categoryId, options);

    return successResponse(
      res,
      result,
      'Products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 수정 (본인만 가능)
 * PATCH /api/products/:productId
 */
async function updateProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const memberId = req.user.member_id;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const updateData = req.body;

    const updated = await productService.updateProduct(productId, memberId, updateData);

    return successResponse(
      res,
      updated,
      'Product updated successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 상태 변경 (본인만 가능)
 * PATCH /api/products/:productId/status
 * Body: { status: 'active' | 'sold_out' | 'inactive' }
 */
async function updateProductStatus(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const memberId = req.user.member_id;
    const { status } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updated = await productService.updateProductStatus(productId, memberId, status);

    return successResponse(
      res,
      updated,
      'Product status updated successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 삭제 (본인만 가능)
 * DELETE /api/products/:productId
 */
async function deleteProduct(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const memberId = req.user.member_id;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const result = await productService.deleteProduct(productId, memberId);

    return successResponse(
      res,
      result,
      'Product deleted successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 이미지 업로드 (본인만 가능)
 * POST /api/products/:productId/images
 * Body: { images: [{ url: string, sequence?: number }, ...] }
 */
async function uploadProductImages(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const memberId = req.user.member_id;
    const { images } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({
        success: false,
        message: 'Images array is required'
      });
    }

    const result = await productService.uploadProductImages(productId, memberId, images);

    return successResponse(
      res,
      result,
      'Product images uploaded successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 이미지 삭제 (본인만 가능)
 * DELETE /api/products/images/:productImgId
 */
async function deleteProductImage(req, res, next) {
  try {
    const productImgId = parseInt(req.params.productImgId, 10);
    const memberId = req.user.member_id;

    if (isNaN(productImgId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product image ID'
      });
    }

    const result = await productService.deleteProductImage(productImgId, memberId);

    return successResponse(
      res,
      result,
      'Product image deleted successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 이미지 순서 재배치 (본인만 가능)
 * PUT /api/products/:productId/images/reorder
 * Body: { updates: [{ imageId: number, sequence: number }, ...] }
 */
async function reorderProductImages(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);
    const memberId = req.user.member_id;
    const { updates } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const result = await productService.reorderProductImages(productId, memberId, updates);

    return successResponse(
      res,
      result,
      'Product images reordered successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * 상품 통계 조회
 * GET /api/products/:productId/stats
 */
async function getProductStats(req, res, next) {
  try {
    const productId = parseInt(req.params.productId, 10);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const stats = await productService.getProductStats(productId);

    return successResponse(
      res,
      stats,
      'Product stats retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createProduct,
  getProductById,
  getMyProducts,
  getAllProducts,
  getProductsByCategory,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  reorderProductImages,
  getProductStats
};
