/**
 * Tenants Management Page
 * 판매사 관리 페이지 로직
 */

// 상태 변수
let currentPage = 1;
let currentFilters = {
  status: '',
  search: ''
};
let selectedTenantId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();

  await loadTenantStatistics();
  await loadTenants();

  // 이벤트 리스너 등록
  document.getElementById('searchButton').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // 이벤트 위임: 판매사 테이블 버튼 클릭
  document.getElementById('tenantTableBody').addEventListener('click', (e) => {
    const target = e.target;

    if (target.classList.contains('btn-view-detail')) {
      const tenantId = target.getAttribute('data-tenant-id');
      viewTenantDetail(tenantId);
    }

    if (target.classList.contains('btn-approve')) {
      const tenantId = target.getAttribute('data-tenant-id');
      showApprovalModal(tenantId);
    }

    if (target.classList.contains('btn-reject')) {
      const tenantId = target.getAttribute('data-tenant-id');
      showRejectionModal(tenantId);
    }

    if (target.classList.contains('btn-suspend')) {
      const tenantId = target.getAttribute('data-tenant-id');
      updateTenantStatus(tenantId, 'suspended');
    }

    if (target.classList.contains('btn-unsuspend')) {
      const tenantId = target.getAttribute('data-tenant-id');
      updateTenantStatus(tenantId, 'approved');
    }
  });

  // 이벤트 위임: 페이지네이션 버튼 클릭
  document.getElementById('pagination').addEventListener('click', (e) => {
    const target = e.target;

    if (target.classList.contains('btn-page-change')) {
      const page = parseInt(target.getAttribute('data-page'));
      changePage(page);
    }
  });

  // 모달 닫기
  setupModals();
});

/**
 * 모달 설정
 */
function setupModals() {
  // Detail Modal
  const detailModal = document.getElementById('tenantModal');
  const closeDetail = detailModal.querySelector('.close');
  const closeModalBtn = document.getElementById('closeModal');

  closeDetail.onclick = () => detailModal.classList.remove('show');
  closeModalBtn.onclick = () => detailModal.classList.remove('show');

  // Approval Modal
  const approvalModal = document.getElementById('approvalModal');
  const closeApproval = approvalModal.querySelector('.close-approval');
  const cancelApprove = document.getElementById('cancelApprove');
  const confirmApprove = document.getElementById('confirmApprove');

  closeApproval.onclick = () => approvalModal.classList.remove('show');
  cancelApprove.onclick = () => approvalModal.classList.remove('show');
  confirmApprove.onclick = handleApprove;

  // Rejection Modal
  const rejectionModal = document.getElementById('rejectionModal');
  const closeRejection = rejectionModal.querySelector('.close-rejection');
  const cancelReject = document.getElementById('cancelReject');
  const confirmReject = document.getElementById('confirmReject');

  closeRejection.onclick = () => rejectionModal.classList.remove('show');
  cancelReject.onclick = () => rejectionModal.classList.remove('show');
  confirmReject.onclick = handleReject;

  // 모달 외부 클릭 시 닫기
  window.onclick = (e) => {
    if (e.target === detailModal) detailModal.classList.remove('show');
    if (e.target === approvalModal) approvalModal.classList.remove('show');
    if (e.target === rejectionModal) rejectionModal.classList.remove('show');
  };
}

/**
 * 판매사 통계 로드
 */
async function loadTenantStatistics() {
  try {
    const response = await apiCall('GET', '/api/v1/admin/tenants/statistics');

    if (response.success) {
      const stats = response.data;
      document.getElementById('totalTenants').textContent = stats.totalTenants || 0;
      document.getElementById('pendingTenants').textContent = stats.pendingTenants || 0;
      document.getElementById('approvedTenants').textContent = stats.approvedTenants || 0;
      document.getElementById('rejectedTenants').textContent = stats.rejectedTenants || 0;
    }
  } catch (error) {
    console.error('통계 로드 실패:', error);
  }
}

/**
 * 판매사 목록 로드
 */
async function loadTenants() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20,
      ...currentFilters
    });

    // 빈 값 제거
    for (let [key, value] of [...params.entries()]) {
      if (!value) params.delete(key);
    }

    const response = await apiCall('GET', `/api/v1/admin/tenants?${params}`);

    if (response.success) {
      renderTenantTable(response.data.data);
      renderPagination(response.data.pagination);
      document.getElementById('tenantCount').textContent = response.data.pagination.totalItems;
    }
  } catch (error) {
    console.error('판매사 목록 로드 실패:', error);
    document.getElementById('tenantTableBody').innerHTML =
      '<tr><td colspan="6" class="text-center text-danger">목록을 불러올 수 없습니다.</td></tr>';
  }
}

/**
 * 판매사 테이블 렌더링
 */
function renderTenantTable(tenants) {
  const tbody = document.getElementById('tenantTableBody');

  if (tenants.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">판매사가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = tenants.map(tenant => `
    <tr>
      <td>${tenant.tenant_id}</td>
      <td>${tenant.tenant_name}</td>
      <td><span class="badge badge-${getStatusBadgeClass(tenant.tenant_status)}">${getStatusText(tenant.tenant_status)}</span></td>
      <td>${formatDate(tenant.tenant_applied_at)}</td>
      <td>${formatDate(tenant.tenant_approved_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary btn-view-detail" data-tenant-id="${tenant.tenant_id}">상세</button>
        ${tenant.tenant_status === 'pending' ? `
          <button class="btn btn-sm btn-success btn-approve" data-tenant-id="${tenant.tenant_id}">승인</button>
          <button class="btn btn-sm btn-danger btn-reject" data-tenant-id="${tenant.tenant_id}">거절</button>
        ` : ''}
        ${tenant.tenant_status === 'approved' ? `
          <button class="btn btn-sm btn-warning btn-suspend" data-tenant-id="${tenant.tenant_id}">정지</button>
        ` : ''}
        ${tenant.tenant_status === 'suspended' ? `
          <button class="btn btn-sm btn-success btn-unsuspend" data-tenant-id="${tenant.tenant_id}">해제</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

/**
 * 페이지네이션 렌더링
 */
function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  const { currentPage: page, totalPages, hasNextPage, hasPreviousPage } = pagination;

  let html = '';

  if (hasPreviousPage) {
    html += `<button class="btn btn-sm btn-secondary btn-page-change" data-page="${page - 1}">이전</button>`;
  }

  html += `<span class="pagination-info">페이지 ${page} / ${totalPages}</span>`;

  if (hasNextPage) {
    html += `<button class="btn btn-sm btn-secondary btn-page-change" data-page="${page + 1}">다음</button>`;
  }

  container.innerHTML = html;
}

/**
 * 페이지 변경
 */
function changePage(page) {
  currentPage = page;
  loadTenants();
}

/**
 * 검색 처리
 */
function handleSearch() {
  currentFilters = {
    status: document.getElementById('statusFilter').value,
    search: document.getElementById('searchInput').value
  };
  currentPage = 1;
  loadTenants();
}

/**
 * 판매사 상세 보기
 */
async function viewTenantDetail(tenantId) {
  try {
    const response = await apiCall('GET', `/api/v1/admin/tenants/${tenantId}`);

    if (response.success) {
      const tenant = response.data;
      const modal = document.getElementById('tenantModal');
      const content = document.getElementById('tenantDetailContent');

      content.innerHTML = `
        <div class="detail-section">
          <h3>기본 정보</h3>
          <p><strong>ID:</strong> ${tenant.tenant_id}</p>
          <p><strong>판매사명:</strong> ${tenant.tenant_name}</p>
          <p><strong>상태:</strong> <span class="badge badge-${getStatusBadgeClass(tenant.tenant_status)}">${getStatusText(tenant.tenant_status)}</span></p>
          <p><strong>신청일:</strong> ${formatDate(tenant.tenant_applied_at)}</p>
          <p><strong>승인일:</strong> ${formatDate(tenant.tenant_approved_at)}</p>
        </div>
        ${tenant.tenant_detail ? `
        <div class="detail-section">
          <h3>상세 정보</h3>
          <p><strong>설명:</strong> ${tenant.tenant_detail.tenant_description || '-'}</p>
        </div>
        ` : ''}
      `;

      modal.classList.add('show');
    }
  } catch (error) {
    console.error('판매사 상세 조회 실패:', error);
    alert('판매사 정보를 불러올 수 없습니다.');
  }
}

/**
 * 승인 모달 표시
 */
function showApprovalModal(tenantId) {
  selectedTenantId = tenantId;
  document.getElementById('adminMemo').value = '';
  document.getElementById('approvalModal').classList.add('show');
}

/**
 * 거절 모달 표시
 */
function showRejectionModal(tenantId) {
  selectedTenantId = tenantId;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectionModal').classList.add('show');
}

/**
 * 승인 처리
 */
async function handleApprove() {
  if (!selectedTenantId) return;

  const adminMemo = document.getElementById('adminMemo').value;

  try {
    const response = await apiCall('POST', `/api/v1/admin/tenants/${selectedTenantId}/approve`, {
      admin_memo: adminMemo
    });

    if (response.success) {
      alert('판매사가 승인되었습니다.');
      document.getElementById('approvalModal').classList.remove('show');
      await loadTenants();
      await loadTenantStatistics();
    }
  } catch (error) {
    console.error('승인 실패:', error);
    alert(error.message || '승인할 수 없습니다.');
  }
}

/**
 * 거절 처리
 */
async function handleReject() {
  if (!selectedTenantId) return;

  const rejectReason = document.getElementById('rejectReason').value;

  if (!rejectReason.trim()) {
    alert('거절 사유를 입력해주세요.');
    return;
  }

  try {
    const response = await apiCall('POST', `/api/v1/admin/tenants/${selectedTenantId}/reject`, {
      reject_reason: rejectReason
    });

    if (response.success) {
      alert('판매사가 거절되었습니다.');
      document.getElementById('rejectionModal').classList.remove('show');
      await loadTenants();
      await loadTenantStatistics();
    }
  } catch (error) {
    console.error('거절 실패:', error);
    alert(error.message || '거절할 수 없습니다.');
  }
}

/**
 * 판매사 상태 변경
 */
async function updateTenantStatus(tenantId, status) {
  const confirmMsg = status === 'suspended' ? '정말 정지하시겠습니까?' : '정말 해제하시겠습니까?';

  if (!confirm(confirmMsg)) return;

  try {
    const response = await apiCall('PATCH', `/api/v1/admin/tenants/${tenantId}/status`, { status });

    if (response.success) {
      alert('상태가 변경되었습니다.');
      await loadTenants();
      await loadTenantStatistics();
    }
  } catch (error) {
    console.error('상태 변경 실패:', error);
    alert(error.message || '상태를 변경할 수 없습니다.');
  }
}

/**
 * 상태 뱃지 클래스
 */
function getStatusBadgeClass(status) {
  const classes = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'suspended': 'secondary'
  };
  return classes[status] || 'secondary';
}

/**
 * 상태 텍스트
 */
function getStatusText(status) {
  const texts = {
    'pending': '승인 대기',
    'approved': '승인됨',
    'rejected': '거절됨',
    'suspended': '정지됨'
  };
  return texts[status] || status;
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
}
