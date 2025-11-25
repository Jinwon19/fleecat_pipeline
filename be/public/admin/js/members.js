/**
 * Members Management Page
 * 회원 관리 페이지 로직
 */

// 상태 변수
let currentPage = 1;
let currentFilters = {
  status: '',
  role: '',
  search: ''
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();

  await loadMemberStatistics();
  await loadMembers();

  // 이벤트 리스너 등록
  document.getElementById('searchButton').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // 모달 닫기
  const modal = document.getElementById('memberModal');
  const closeBtn = modal.querySelector('.close');
  const closeModalBtn = document.getElementById('closeModal');

  closeBtn.onclick = () => modal.classList.remove('show');
  closeModalBtn.onclick = () => modal.classList.remove('show');
  window.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('show');
  };

  // 이벤트 위임: 회원 테이블 버튼 클릭
  document.getElementById('memberTableBody').addEventListener('click', (e) => {
    const target = e.target;

    // 상세 보기 버튼
    if (target.classList.contains('btn-view-detail')) {
      const memberId = target.getAttribute('data-member-id');
      viewMemberDetail(memberId);
    }

    // 상태 변경 버튼
    if (target.classList.contains('btn-update-status')) {
      const memberId = target.getAttribute('data-member-id');
      const status = target.getAttribute('data-status');
      updateMemberStatus(memberId, status);
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
});

/**
 * 회원 통계 로드
 */
async function loadMemberStatistics() {
  try {
    const response = await apiCall('GET', '/api/v1/admin/members/statistics');

    if (response.success) {
      const stats = response.data;
      document.getElementById('totalMembers').textContent = stats.totalMembers || 0;
      document.getElementById('activeMembers').textContent = stats.activeMembers || 0;
      document.getElementById('suspendedMembers').textContent = stats.suspendedMembers || 0;
    }
  } catch (error) {
    console.error('통계 로드 실패:', error);
  }
}

/**
 * 회원 목록 로드
 */
async function loadMembers() {
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

    const response = await apiCall('GET', `/api/v1/admin/members?${params}`);

    if (response.success) {
      renderMemberTable(response.data.data);
      renderPagination(response.data.pagination);
      document.getElementById('memberCount').textContent = response.data.pagination.totalItems;
    }
  } catch (error) {
    console.error('회원 목록 로드 실패:', error);
    document.getElementById('memberTableBody').innerHTML =
      '<tr><td colspan="7" class="text-center text-danger">목록을 불러올 수 없습니다.</td></tr>';
  }
}

/**
 * 회원 테이블 렌더링
 */
function renderMemberTable(members) {
  const tbody = document.getElementById('memberTableBody');

  if (members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">회원이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = members.map(member => `
    <tr>
      <td>${member.member_id}</td>
      <td>${member.member_email}</td>
      <td>${member.member_nickname}</td>
      <td><span class="badge badge-${getRoleBadgeClass(member.member_account_role)}">${getRoleText(member.member_account_role)}</span></td>
      <td><span class="badge badge-${getStatusBadgeClass(member.member_status)}">${getStatusText(member.member_status)}</span></td>
      <td>${formatDate(member.member_created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary btn-view-detail" data-member-id="${member.member_id}">상세</button>
        ${member.member_status === 'active' ?
          `<button class="btn btn-sm btn-warning btn-update-status" data-member-id="${member.member_id}" data-status="suspended">정지</button>` :
          member.member_status === 'suspended' ?
          `<button class="btn btn-sm btn-success btn-update-status" data-member-id="${member.member_id}" data-status="active">해제</button>` :
          ''
        }
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
  loadMembers();
}

/**
 * 검색 처리
 */
function handleSearch() {
  currentFilters = {
    status: document.getElementById('statusFilter').value,
    role: document.getElementById('roleFilter').value,
    search: document.getElementById('searchInput').value
  };
  currentPage = 1;
  loadMembers();
}

/**
 * 회원 상세 보기
 */
async function viewMemberDetail(memberId) {
  try {
    const response = await apiCall('GET', `/api/v1/admin/members/${memberId}`);

    if (response.success) {
      const member = response.data;
      const modal = document.getElementById('memberModal');
      const content = document.getElementById('memberDetailContent');

      content.innerHTML = `
        <div class="detail-section">
          <h3>기본 정보</h3>
          <p><strong>ID:</strong> ${member.member_id}</p>
          <p><strong>이메일:</strong> ${member.member_email}</p>
          <p><strong>닉네임:</strong> ${member.member_nickname}</p>
          <p><strong>역할:</strong> <span class="badge badge-${getRoleBadgeClass(member.member_account_role)}">${getRoleText(member.member_account_role)}</span></p>
          <p><strong>상태:</strong> <span class="badge badge-${getStatusBadgeClass(member.member_status)}">${getStatusText(member.member_status)}</span></p>
          <p><strong>가입일:</strong> ${formatDate(member.member_created_at)}</p>
        </div>
        ${member.company ? `
        <div class="detail-section">
          <h3>회사 정보</h3>
          <p><strong>회사명:</strong> ${member.company.company_name}</p>
        </div>
        ` : ''}
      `;

      modal.classList.add('show');
    }
  } catch (error) {
    console.error('회원 상세 조회 실패:', error);
    alert('회원 정보를 불러올 수 없습니다.');
  }
}

/**
 * 회원 상태 변경
 */
async function updateMemberStatus(memberId, status) {
  const confirmMsg = status === 'suspended' ? '정말 정지하시겠습니까?' : '정말 해제하시겠습니까?';

  if (!confirm(confirmMsg)) return;

  try {
    const response = await apiCall('PATCH', `/api/v1/admin/members/${memberId}/status`, { status });

    if (response.success) {
      alert('상태가 변경되었습니다.');
      await loadMembers();
      await loadMemberStatistics();
    }
  } catch (error) {
    console.error('상태 변경 실패:', error);
    alert(error.message || '상태를 변경할 수 없습니다.');
  }
}

/**
 * 역할 뱃지 클래스
 */
function getRoleBadgeClass(role) {
  const classes = {
    'buyer': 'info',
    'seller': 'warning',
    'admin': 'danger'
  };
  return classes[role] || 'secondary';
}

/**
 * 역할 텍스트
 */
function getRoleText(role) {
  const texts = {
    'buyer': '구매자',
    'seller': '판매자',
    'admin': '관리자'
  };
  return texts[role] || role;
}

/**
 * 상태 뱃지 클래스
 */
function getStatusBadgeClass(status) {
  const classes = {
    'active': 'success',
    'suspended': 'warning',
    'inactive': 'secondary'
  };
  return classes[status] || 'secondary';
}

/**
 * 상태 텍스트
 */
function getStatusText(status) {
  const texts = {
    'active': '활성',
    'suspended': '정지',
    'inactive': '비활성'
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
