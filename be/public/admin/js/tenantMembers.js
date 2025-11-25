/**
 * 판매사 구성원(TenantMember) 관리
 */

let currentPage = 1;
const itemsPerPage = 20;
let allTenantMembers = [];
let filteredTenantMembers = [];
let currentFilters = {
    tenant_id: '',
    search: '',
    status: '',
    role: ''
};
let selectedMemberId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 인증 확인
    if (!checkAuth()) return;

    // 데이터 로드
    await loadTenants();
    await loadTenantMembers();

    // 이벤트 리스너 등록
    document.getElementById('searchButton').addEventListener('click', applyFilters);
    document.getElementById('tenantFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('roleFilter').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });

    // 이벤트 위임: 테이블 버튼 클릭
    document.getElementById('tenantMemberTableBody').addEventListener('click', (e) => {
        const target = e.target;

        // 상세 보기 버튼
        if (target.classList.contains('btn-view-detail')) {
            const memberId = target.getAttribute('data-member-id');
            viewDetail(memberId);
        }

        // 승인 버튼
        if (target.classList.contains('btn-approve')) {
            const memberId = target.getAttribute('data-member-id');
            openApprovalModal(memberId);
        }

        // 거절 버튼
        if (target.classList.contains('btn-reject')) {
            const memberId = target.getAttribute('data-member-id');
            openRejectionModal(memberId);
        }
    });

    // 모달 이벤트
    setupModals();
});

/**
 * 판매사 목록 로드 (필터용)
 */
async function loadTenants() {
    try {
        const response = await apiGet('/admin/tenants', { limit: 100, status: 'approved' });

        if (response.success && response.data && response.data.data) {
            const select = document.getElementById('tenantFilter');
            const tenants = response.data.data;
            const options = tenants.map(tenant =>
                `<option value="${tenant.tenant_id}">${tenant.tenant_name}</option>`
            ).join('');
            select.innerHTML = '<option value="">전체 판매사</option>' + options;
        }
    } catch (error) {
        console.error('판매사 목록 로드 실패:', error);
    }
}

/**
 * 판매사 구성원 목록 로드
 */
async function loadTenantMembers() {
    try {
        const response = await apiGet('/admin/tenant-members');

        if (response.success && response.data) {
            allTenantMembers = response.data;
            applyFilters();
        } else {
            showError('데이터를 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error('구성원 목록 로드 실패:', error);
        showError('구성원 목록을 불러올 수 없습니다.');
    }
}

/**
 * 필터 적용
 */
function applyFilters() {
    currentFilters.tenant_id = document.getElementById('tenantFilter').value;
    currentFilters.search = document.getElementById('searchInput').value.toLowerCase().trim();
    currentFilters.status = document.getElementById('statusFilter').value;
    currentFilters.role = document.getElementById('roleFilter').value;

    // 필터링
    filteredTenantMembers = allTenantMembers.filter(member => {
        // 판매사 필터
        if (currentFilters.tenant_id && member.tenant.tenant_id !== parseInt(currentFilters.tenant_id)) {
            return false;
        }

        // 검색 필터 (회원명, 이메일)
        if (currentFilters.search) {
            const memberName = member.member.member_name?.toLowerCase() || '';
            const memberEmail = member.member.member_email?.toLowerCase() || '';
            if (!memberName.includes(currentFilters.search) && !memberEmail.includes(currentFilters.search)) {
                return false;
            }
        }

        // 상태 필터
        if (currentFilters.status && member.tenant_member_approval_status !== currentFilters.status) {
            return false;
        }

        // 역할 필터
        if (currentFilters.role && member.tenant_member_role !== currentFilters.role) {
            return false;
        }

        return true;
    });

    currentPage = 1;
    updateStats();
    renderTable();
    renderPagination('pagination', currentPage, getTotalPages(), (page) => {
        currentPage = page;
        renderTable();
    });
}

/**
 * 통계 업데이트
 */
function updateStats() {
    const total = filteredTenantMembers.length;
    const pending = filteredTenantMembers.filter(m => m.tenant_member_approval_status === 'pending').length;
    const approved = filteredTenantMembers.filter(m => m.tenant_member_approval_status === 'approved').length;
    const rejected = filteredTenantMembers.filter(m => m.tenant_member_approval_status === 'rejected').length;

    document.getElementById('totalMembers').textContent = total;
    document.getElementById('pendingMembers').textContent = pending;
    document.getElementById('approvedMembers').textContent = approved;
    document.getElementById('rejectedMembers').textContent = rejected;
    document.getElementById('memberCount').textContent = total;
}

/**
 * 테이블 렌더링
 */
function renderTable() {
    const tbody = document.getElementById('tenantMemberTableBody');

    if (filteredTenantMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">검색 결과가 없습니다.</td></tr>';
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredTenantMembers.slice(start, end);

    const rows = pageData.map(member => {
        const statusBadge = getStatusBadge(member.tenant_member_approval_status);
        const roleBadge = getRoleBadge(member.tenant_member_role);

        return `
            <tr>
                <td>${member.tenant_member_id}</td>
                <td>${member.tenant.tenant_name}</td>
                <td>${member.member.member_name}</td>
                <td>${member.member.member_email}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${formatDate(member.tenant_member_applied_at)}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-view-detail" data-member-id="${member.tenant_member_id}">상세</button>
                    ${member.tenant_member_approval_status === 'pending' ? `
                        <button class="btn btn-sm btn-success btn-approve" data-member-id="${member.tenant_member_id}">승인</button>
                        <button class="btn btn-sm btn-danger btn-reject" data-member-id="${member.tenant_member_id}">거절</button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}

/**
 * 총 페이지 수 계산
 */
function getTotalPages() {
    return Math.ceil(filteredTenantMembers.length / itemsPerPage);
}

/**
 * 상태 뱃지
 */
function getStatusBadge(status) {
    const statusMap = {
        pending: { label: '승인 대기', className: 'badge-warning' },
        approved: { label: '승인됨', className: 'badge-success' },
        rejected: { label: '거절됨', className: 'badge-danger' }
    };
    const config = statusMap[status] || { label: status, className: 'badge-secondary' };
    return `<span class="badge ${config.className}">${config.label}</span>`;
}

/**
 * 역할 뱃지
 */
function getRoleBadge(role) {
    const roleMap = {
        owner: { label: 'Owner', className: 'badge-primary' },
        member: { label: 'Member', className: 'badge-info' }
    };
    const config = roleMap[role] || { label: role, className: 'badge-secondary' };
    return `<span class="badge ${config.className}">${config.label}</span>`;
}

/**
 * 상세 보기
 */
function viewDetail(memberId) {
    const member = allTenantMembers.find(m => m.tenant_member_id === memberId);
    if (!member) return;

    const content = `
        <div class="detail-grid">
            <div class="detail-item">
                <strong>구성원 ID</strong>
                <span>${member.tenant_member_id}</span>
            </div>
            <div class="detail-item">
                <strong>판매사</strong>
                <span>${member.tenant.tenant_name}</span>
            </div>
            <div class="detail-item">
                <strong>회원명</strong>
                <span>${member.member.member_name}</span>
            </div>
            <div class="detail-item">
                <strong>이메일</strong>
                <span>${member.member.member_email}</span>
            </div>
            <div class="detail-item">
                <strong>닉네임</strong>
                <span>${member.member.member_nickname || '-'}</span>
            </div>
            <div class="detail-item">
                <strong>역할</strong>
                <span>${getRoleBadge(member.tenant_member_role)}</span>
            </div>
            <div class="detail-item">
                <strong>상태</strong>
                <span>${getStatusBadge(member.tenant_member_approval_status)}</span>
            </div>
            <div class="detail-item">
                <strong>신청일</strong>
                <span>${formatDateTime(member.tenant_member_applied_at)}</span>
            </div>
            <div class="detail-item">
                <strong>승인일</strong>
                <span>${member.tenant_member_approved_at ? formatDateTime(member.tenant_member_approved_at) : '-'}</span>
            </div>
            <div class="detail-item">
                <strong>은행명</strong>
                <span>${member.tenant_member_bank_name || '-'}</span>
            </div>
            <div class="detail-item">
                <strong>계좌번호</strong>
                <span>${member.tenant_member_bank_account || '-'}</span>
            </div>
            <div class="detail-item">
                <strong>예금주</strong>
                <span>${member.tenant_member_account_holder || '-'}</span>
            </div>
            <div class="detail-item">
                <strong>수수료율</strong>
                <span>${(member.tenant_member_commission_rate * 100).toFixed(2)}%</span>
            </div>
            <div class="detail-item">
                <strong>총 매출</strong>
                <span>${formatCurrency(member.tenant_member_total_sales_amount)}</span>
            </div>
            <div class="detail-item">
                <strong>총 판매건수</strong>
                <span>${formatNumber(member.tenant_member_total_sales_count)}건</span>
            </div>
        </div>
    `;

    document.getElementById('memberDetailContent').innerHTML = content;
    document.getElementById('memberModal').classList.add('show');
}

/**
 * 승인 모달 열기
 */
function openApprovalModal(memberId) {
    const member = allTenantMembers.find(m => m.tenant_member_id === memberId);
    if (!member) return;

    selectedMemberId = memberId;

    const info = `
        <p><strong>판매사:</strong> ${member.tenant.tenant_name}</p>
        <p><strong>회원명:</strong> ${member.member.member_name} (${member.member.member_email})</p>
        <p><strong>역할:</strong> ${member.tenant_member_role}</p>
    `;

    document.getElementById('approvalMemberInfo').innerHTML = info;
    document.getElementById('approvalModal').classList.add('show');
}

/**
 * 거절 모달 열기
 */
function openRejectionModal(memberId) {
    const member = allTenantMembers.find(m => m.tenant_member_id === memberId);
    if (!member) return;

    selectedMemberId = memberId;

    const info = `
        <p><strong>판매사:</strong> ${member.tenant.tenant_name}</p>
        <p><strong>회원명:</strong> ${member.member.member_name} (${member.member.member_email})</p>
        <p><strong>역할:</strong> ${member.tenant_member_role}</p>
    `;

    document.getElementById('rejectionMemberInfo').innerHTML = info;
    document.getElementById('rejectReason').value = '';
    document.getElementById('rejectionModal').classList.add('show');
}

/**
 * 승인 처리
 */
async function approveMember() {
    if (!selectedMemberId) return;

    const button = document.getElementById('confirmApprove');
    toggleLoading(button, true);

    try {
        const response = await apiPatch(`/admin/tenant-members/${selectedMemberId}/approve`, {});

        if (response.success) {
            alert('구성원이 승인되었습니다.');
            document.getElementById('approvalModal').classList.remove('show');
            await loadTenantMembers();
        } else {
            alert(response.message || '승인 처리 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('승인 처리 실패:', error);
        alert('승인 처리 중 오류가 발생했습니다.');
    } finally {
        toggleLoading(button, false);
    }
}

/**
 * 거절 처리
 */
async function rejectMember() {
    if (!selectedMemberId) return;

    const reason = document.getElementById('rejectReason').value.trim();

    const button = document.getElementById('confirmReject');
    toggleLoading(button, true);

    try {
        const body = reason ? { reason } : {};
        const response = await apiPatch(`/admin/tenant-members/${selectedMemberId}/reject`, body);

        if (response.success) {
            alert('구성원이 거절되었습니다.');
            document.getElementById('rejectionModal').classList.remove('show');
            await loadTenantMembers();
        } else {
            alert(response.message || '거절 처리 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('거절 처리 실패:', error);
        alert('거절 처리 중 오류가 발생했습니다.');
    } finally {
        toggleLoading(button, false);
    }
}

/**
 * 모달 이벤트 설정
 */
function setupModals() {
    // 상세 모달
    const memberModal = document.getElementById('memberModal');
    const closeModal = memberModal.querySelector('.close');
    const closeButton = document.getElementById('closeModal');

    closeModal.onclick = () => memberModal.classList.remove('show');
    closeButton.onclick = () => memberModal.classList.remove('show');

    // 승인 모달
    const approvalModal = document.getElementById('approvalModal');
    const closeApproval = approvalModal.querySelector('.close-approval');
    const confirmApprove = document.getElementById('confirmApprove');
    const cancelApprove = document.getElementById('cancelApprove');

    closeApproval.onclick = () => approvalModal.classList.remove('show');
    cancelApprove.onclick = () => approvalModal.classList.remove('show');
    confirmApprove.onclick = approveMember;

    // 거절 모달
    const rejectionModal = document.getElementById('rejectionModal');
    const closeRejection = rejectionModal.querySelector('.close-rejection');
    const confirmReject = document.getElementById('confirmReject');
    const cancelReject = document.getElementById('cancelReject');

    closeRejection.onclick = () => rejectionModal.classList.remove('show');
    cancelReject.onclick = () => rejectionModal.classList.remove('show');
    confirmReject.onclick = rejectMember;

    // 모달 외부 클릭 시 닫기
    window.onclick = (event) => {
        if (event.target === memberModal) memberModal.classList.remove('show');
        if (event.target === approvalModal) approvalModal.classList.remove('show');
        if (event.target === rejectionModal) rejectionModal.classList.remove('show');
    };
}

/**
 * 에러 메시지 표시
 */
function showError(message) {
    const tbody = document.getElementById('tenantMemberTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: red;">${message}</td></tr>`;
}
