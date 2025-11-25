const prisma = require('../config/database');

/**
 * ProductImg Repository
 * product_img 테이블에 대한 데이터 접근 계층
 * 상품 이미지 관리 (순서 포함)
 */

/**
 * 상품의 모든 이미지 조회 (순서대로)
 * @param {number} productId - 상품 ID
 * @returns {Promise<Array>} 이미지 목록 (sequence 순서)
 */
async function findByProductId(productId) {
  try {
    return await prisma.productImg.findMany({
      where: { product_id: BigInt(productId) },
      orderBy: {
        product_image_sequence: 'asc'
      }
    });
  } catch (error) {
    throw new Error(`Failed to find product images: ${error.message}`);
  }
}

/**
 * ID로 이미지 조회
 * @param {number} productImgId - 이미지 ID
 * @returns {Promise<Object|null>} 이미지 정보 또는 null
 */
async function findById(productImgId) {
  try {
    return await prisma.productImg.findUnique({
      where: { product_img_id: BigInt(productImgId) },
      include: {
        product: {
          select: {
            product_id: true,
            product_name: true,
            tenant_member_id: true
          }
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find product image by ID: ${error.message}`);
  }
}

/**
 * 이미지 추가
 * @param {Object} productImgData - 이미지 데이터
 * @param {number} productImgData.product_id - 상품 ID
 * @param {string} productImgData.product_img_url - 이미지 URL
 * @param {number} [productImgData.product_image_sequence] - 순서 (기본: 마지막 + 1)
 * @returns {Promise<Object>} 생성된 이미지 정보
 */
async function create(productImgData) {
  try {
    const { product_id, product_img_url, product_image_sequence } = productImgData;

    // sequence가 지정되지 않으면 마지막 순서 + 1
    let sequence = product_image_sequence;

    if (sequence === undefined || sequence === null) {
      const lastImage = await prisma.productImg.findFirst({
        where: { product_id: BigInt(product_id) },
        orderBy: { product_image_sequence: 'desc' }
      });

      sequence = lastImage ? lastImage.product_image_sequence + 1 : 1;
    }

    return await prisma.productImg.create({
      data: {
        product_id: BigInt(product_id),
        product_img_url,
        product_image_sequence: sequence
      }
    });
  } catch (error) {
    throw new Error(`Failed to create product image: ${error.message}`);
  }
}

/**
 * 이미지 삭제
 * @param {number} productImgId - 이미지 ID
 * @returns {Promise<Object>} 삭제된 이미지 정보
 */
async function deleteById(productImgId) {
  try {
    return await prisma.productImg.delete({
      where: { product_img_id: BigInt(productImgId) }
    });
  } catch (error) {
    throw new Error(`Failed to delete product image: ${error.message}`);
  }
}

/**
 * 상품의 모든 이미지 삭제
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object>} 삭제 결과 { count: 삭제된 개수 }
 */
async function deleteByProductId(productId) {
  try {
    return await prisma.productImg.deleteMany({
      where: { product_id: BigInt(productId) }
    });
  } catch (error) {
    throw new Error(`Failed to delete all product images: ${error.message}`);
  }
}

/**
 * 이미지 순서 변경
 * @param {number} productImgId - 이미지 ID
 * @param {number} newSequence - 새 순서
 * @returns {Promise<Object>} 수정된 이미지 정보
 */
async function updateSequence(productImgId, newSequence) {
  try {
    return await prisma.productImg.update({
      where: { product_img_id: BigInt(productImgId) },
      data: { product_image_sequence: newSequence }
    });
  } catch (error) {
    throw new Error(`Failed to update product image sequence: ${error.message}`);
  }
}

/**
 * 여러 이미지의 순서 재배치 (트랜잭션)
 * @param {number} productId - 상품 ID
 * @param {Array<Object>} updates - 업데이트 목록 [{ imageId, sequence }, ...]
 * @returns {Promise<number>} 업데이트된 이미지 개수
 */
async function reorderSequences(productId, updates) {
  try {
    // 트랜잭션으로 순서 재배치
    await prisma.$transaction(
      updates.map(({ imageId, sequence }) =>
        prisma.productImg.update({
          where: {
            product_img_id: BigInt(imageId)
          },
          data: { product_image_sequence: sequence }
        })
      )
    );

    return updates.length;
  } catch (error) {
    throw new Error(`Failed to reorder product images: ${error.message}`);
  }
}

/**
 * 상품의 이미지 개수 조회
 * @param {number} productId - 상품 ID
 * @returns {Promise<number>} 이미지 개수
 */
async function countByProductId(productId) {
  try {
    return await prisma.productImg.count({
      where: { product_id: BigInt(productId) }
    });
  } catch (error) {
    throw new Error(`Failed to count product images: ${error.message}`);
  }
}

/**
 * 이미지 URL 업데이트
 * @param {number} productImgId - 이미지 ID
 * @param {string} newUrl - 새 URL
 * @returns {Promise<Object>} 수정된 이미지 정보
 */
async function updateUrl(productImgId, newUrl) {
  try {
    return await prisma.productImg.update({
      where: { product_img_id: BigInt(productImgId) },
      data: { product_img_url: newUrl }
    });
  } catch (error) {
    throw new Error(`Failed to update product image URL: ${error.message}`);
  }
}

/**
 * 특정 순서의 이미지 조회
 * @param {number} productId - 상품 ID
 * @param {number} sequence - 순서
 * @returns {Promise<Object|null>} 이미지 정보 또는 null
 */
async function findBySequence(productId, sequence) {
  try {
    return await prisma.productImg.findUnique({
      where: {
        product_id_product_image_sequence: {
          product_id: BigInt(productId),
          product_image_sequence: sequence
        }
      }
    });
  } catch (error) {
    throw new Error(`Failed to find product image by sequence: ${error.message}`);
  }
}

/**
 * 첫 번째 이미지 조회 (대표 이미지)
 * @param {number} productId - 상품 ID
 * @returns {Promise<Object|null>} 첫 번째 이미지 또는 null
 */
async function findFirstImage(productId) {
  try {
    return await prisma.productImg.findFirst({
      where: { product_id: BigInt(productId) },
      orderBy: { product_image_sequence: 'asc' }
    });
  } catch (error) {
    throw new Error(`Failed to find first product image: ${error.message}`);
  }
}

module.exports = {
  findByProductId,
  findById,
  create,
  deleteById,
  deleteByProductId,
  updateSequence,
  reorderSequences,
  countByProductId,
  updateUrl,
  findBySequence,
  findFirstImage
};
