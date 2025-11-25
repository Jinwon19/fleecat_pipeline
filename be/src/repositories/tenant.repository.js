const prisma = require('../config/database');

/**
 * Tenant Repository
 * tenant 테이블에 대한 데이터 접근 계층
 */

/**
 * ID로 판매사 조회
 * @param {number} tenantId - 판매사 ID
 * @returns {Promise<Object|null>} 판매사 정보 또는 null
 */
async function findById(tenantId) {
  try {
    return await prisma.tenant.findUnique({
      where: { tenant_id: BigInt(tenantId) },
      include: {
        tenant_detail: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant by ID: ${error.message}`);
  }
}

/**
 * 이름으로 판매사 조회
 * @param {string} tenantName - 판매사 이름
 * @returns {Promise<Object|null>} 판매사 정보 또는 null
 */
async function findByName(tenantName) {
  try {
    return await prisma.tenant.findUnique({
      where: { tenant_name: tenantName },
      include: {
        tenant_detail: true
      }
    });
  } catch (error) {
    throw new Error(`Failed to find tenant by name: ${error.message}`);
  }
}

/**
 * 이름 존재 여부 확인
 * @param {string} tenantName - 판매사 이름
 * @returns {Promise<boolean>} 존재 여부
 */
async function existsByName(tenantName) {
  try {
    const count = await prisma.tenant.count({
      where: { tenant_name: tenantName }
    });
    return count > 0;
  } catch (error) {
    throw new Error(`Failed to check tenant name existence: ${error.message}`);
  }
}

/**
 * 판매사 생성
 * @param {Object} tenantData - 판매사 데이터
 * @param {string} tenantData.tenant_name - 판매사 이름
 * @param {string} [tenantData.tenant_status='pending'] - 상태 (pending/approved/rejected)
 * @param {string} [tenantData.tenant_approval_member] - 승인자 메모
 * @returns {Promise<Object>} 생성된 판매사 정보
 */
async function create(tenantData) {
  try {
    return await prisma.tenant.create({
      data: {
        tenant_name: tenantData.tenant_name,
        tenant_status: tenantData.tenant_status || 'pending',
        tenant_approval_member: tenantData.tenant_approval_member || null,
        tenant_applied_at: new Date()
      }
    });
  } catch (error) {
    throw new Error(`Failed to create tenant: ${error.message}`);
  }
}

/**
 * 판매사 정보 수정
 * @param {number} tenantId - 판매사 ID
 * @param {Object} updateData - 수정할 데이터
 * @param {string} [updateData.tenant_name] - 판매사 이름
 * @param {string} [updateData.tenant_approval_member] - 승인자 메모
 * @returns {Promise<Object>} 수정된 판매사 정보
 */
async function update(tenantId, updateData) {
  try {
    return await prisma.tenant.update({
      where: { tenant_id: BigInt(tenantId) },
      data: updateData
    });
  } catch (error) {
    throw new Error(`Failed to update tenant: ${error.message}`);
  }
}

/**
 * 판매사 상태 변경 (승인/거절)
 * @param {number} tenantId - 판매사 ID
 * @param {string} status - 상태 (approved/rejected)
 * @param {string} [approverNote] - 승인자 메모
 * @returns {Promise<Object>} 수정된 판매사 정보
 */
async function updateStatus(tenantId, status, approverNote = null) {
  try {
    const updateData = {
      tenant_status: status
    };

    // 승인 시 tenant_approved_at 설정
    if (status === 'approved') {
      updateData.tenant_approved_at = new Date();
    }

    // 승인자 메모가 있으면 추가
    if (approverNote) {
      updateData.tenant_approval_member = approverNote;
    }

    return await prisma.tenant.update({
      where: { tenant_id: BigInt(tenantId) },
      data: updateData
    });
  } catch (error) {
    throw new Error(`Failed to update tenant status: ${error.message}`);
  }
}

/**
 * 판매사 목록 조회 (페이지네이션 및 필터링 지원)
 * @param {Object} options - 조회 옵션
 * @param {number} [options.page=1] - 페이지 번호
 * @param {number} [options.limit=10] - 페이지당 항목 수
 * @param {string} [options.status] - 상태 필터 (pending/approved/rejected)
 * @returns {Promise<Object>} { tenants, total, page, totalPages }
 */
async function findAll(options = {}) {
  try {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const where = {};
    if (options.status) {
      where.tenant_status = options.status;
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tenant_applied_at: 'desc' },
        include: {
          tenant_detail: true
        }
      }),
      prisma.tenant.count({ where })
    ]);

    return {
      tenants,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    throw new Error(`Failed to find all tenants: ${error.message}`);
  }
}

module.exports = {
  findById,
  findByName,
  existsByName,
  create,
  update,
  updateStatus,
  findAll
};
