const prisma = require('../config/database');

/**
 * TenantDetail Repository
 * tenant_detail 테이블에 대한 데이터 접근 계층
 */

/**
 * Tenant ID로 판매사 상세 정보 조회
 * @param {number} tenantId - 판매사 ID
 * @returns {Promise<Object|null>} 판매사 상세 정보 또는 null
 */
async function findByTenantId(tenantId) {
  try {
    return await prisma.tenantDetail.findUnique({
      where: { tenant_id: BigInt(tenantId) }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant detail by tenant ID: ${error.message}`);
  }
}

/**
 * 판매사 상세 정보 생성
 * @param {Object} tenantDetailData - 판매사 상세 데이터
 * @param {number} tenantDetailData.tenant_id - 판매사 ID (필수)
 * @param {string} [tenantDetailData.tenant_detail_description] - 설명
 * @param {string} [tenantDetailData.tenant_detail_phone] - 전화번호
 * @param {string} [tenantDetailData.tenant_detail_email] - 이메일
 * @param {string} [tenantDetailData.tenant_detail_zipcode] - 우편번호
 * @param {string} [tenantDetailData.tenant_detail_address] - 주소
 * @param {string} [tenantDetailData.tenant_detail_address_detail] - 상세 주소
 * @param {string} [tenantDetailData.tenant_detail_business_hours] - 영업 시간
 * @param {number} [tenantDetailData.tenant_detail_commission_rate] - 수수료율
 * @returns {Promise<Object>} 생성된 판매사 상세 정보
 */
async function create(tenantDetailData) {
  try {
    return await prisma.tenantDetail.create({
      data: {
        tenant_id: BigInt(tenantDetailData.tenant_id),
        tenant_detail_description: tenantDetailData.tenant_detail_description || null,
        tenant_detail_phone: tenantDetailData.tenant_detail_phone || null,
        tenant_detail_email: tenantDetailData.tenant_detail_email || null,
        tenant_detail_zipcode: tenantDetailData.tenant_detail_zipcode || null,
        tenant_detail_address: tenantDetailData.tenant_detail_address || null,
        tenant_detail_address_detail: tenantDetailData.tenant_detail_address_detail || null,
        tenant_detail_business_hours: tenantDetailData.tenant_detail_business_hours || null,
        tenant_detail_commission_rate: tenantDetailData.tenant_detail_commission_rate || null
      }
    });
  } catch (error) {
    throw new Error(`Failed to create tenant detail: ${error.message}`);
  }
}

/**
 * 판매사 상세 정보 수정
 * @param {number} tenantId - 판매사 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.tenant_detail_description] - 설명
 * @param {string} [updateData.tenant_detail_phone] - 전화번호
 * @param {string} [updateData.tenant_detail_email] - 이메일
 * @param {string} [updateData.tenant_detail_zipcode] - 우편번호
 * @param {string} [updateData.tenant_detail_address] - 주소
 * @param {string} [updateData.tenant_detail_address_detail] - 상세 주소
 * @param {string} [updateData.tenant_detail_business_hours] - 영업 시간
 * @param {number} [updateData.tenant_detail_commission_rate] - 수수료율
 * @returns {Promise<Object>} 수정된 판매사 상세 정보
 */
async function update(tenantId, updateData) {
  try {
    return await prisma.tenantDetail.update({
      where: { tenant_id: BigInt(tenantId) },
      data: updateData
    });
  } catch (error) {
    throw new Error(`Failed to update tenant detail: ${error.message}`);
  }
}

module.exports = {
  findByTenantId,
  create,
  update
};
