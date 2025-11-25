/**
 * API 유틸리티
 * Admin API 호출을 위한 공통 함수
 */

const API_BASE_URL = 'https://fleecat-production.up.railway.app/api/v1';

/**
 * API 호출 공통 함수
 * @param {string} method - HTTP 메서드 (GET, POST, PATCH, DELETE)
 * @param {string} url - API 엔드포인트 URL
 * @param {Object|null} data - 요청 본문 데이터
 * @returns {Promise<Object>} API 응답
 */
async function apiCall(method, url, data = null) {
    const token = localStorage.getItem('admin_token');

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // 토큰이 있으면 Authorization 헤더 추가
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    // 요청 본문 데이터가 있으면 추가 (GET 요청 제외)
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        // 401 Unauthorized - 토큰 만료 또는 인증 실패
        if (response.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            window.location.href = '/admin/index.html';
            throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }

        // 403 Forbidden - 권한 없음
        if (response.status === 403) {
            throw new Error('접근 권한이 없습니다.');
        }

        // 기타 에러
        if (!response.ok) {
            throw new Error(result.message || '요청 처리 중 오류가 발생했습니다.');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * GET 요청
 */
async function apiGet(endpoint, queryParams = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // 쿼리 파라미터 추가
    Object.keys(queryParams).forEach(key => {
        if (queryParams[key] !== null && queryParams[key] !== undefined && queryParams[key] !== '') {
            url.searchParams.append(key, queryParams[key]);
        }
    });

    return await apiCall('GET', url.toString());
}

/**
 * POST 요청
 */
async function apiPost(endpoint, data) {
    const url = `${API_BASE_URL}${endpoint}`;
    return await apiCall('POST', url, data);
}

/**
 * PATCH 요청
 */
async function apiPatch(endpoint, data) {
    const url = `${API_BASE_URL}${endpoint}`;
    return await apiCall('PATCH', url, data);
}

/**
 * DELETE 요청
 */
async function apiDelete(endpoint) {
    const url = `${API_BASE_URL}${endpoint}`;
    return await apiCall('DELETE', url);
}

/**
 * 로그인 상태 확인
 */
function isAuthenticated() {
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');
    return !!(token && user);
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 */
function getCurrentUser() {
    const userJson = localStorage.getItem('admin_user');
    if (!userJson) return null;

    try {
        return JSON.parse(userJson);
    } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
    }
}

/**
 * 인증 상태 확인 및 리다이렉트
 * 로그인되어 있지 않으면 로그인 페이지로 이동
 */
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/admin/index.html';
        return false;
    }
    return true;
}

/**
 * 로그아웃
 */
function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.href = '/admin/index.html';
}

/**
 * 에러 메시지 표시
 */
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

/**
 * 에러 메시지 숨기기
 */
function hideError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD HH:mm:ss)
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

/**
 * 금액 포맷팅 (1,000,000원)
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return `${Number(amount).toLocaleString('ko-KR')}원`;
}

/**
 * 숫자 포맷팅 (1,000)
 */
function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return Number(num).toLocaleString('ko-KR');
}

/**
 * 상태 뱃지 생성
 */
function createStatusBadge(status, statusMap) {
    const config = statusMap[status] || { label: status, className: 'badge-secondary' };
    return `<span class="badge ${config.className}">${config.label}</span>`;
}

/**
 * 주문 상태 뱃지
 */
function getOrderStatusBadge(status) {
    const statusMap = {
        pending: { label: '대기중', className: 'badge-warning' },
        preparing: { label: '준비중', className: 'badge-primary' },
        shipped: { label: '배송중', className: 'badge-primary' },
        delivered: { label: '배송완료', className: 'badge-success' },
        cancelled: { label: '취소', className: 'badge-secondary' },
        refunded: { label: '환불', className: 'badge-danger' }
    };
    return createStatusBadge(status, statusMap);
}

/**
 * 결제 상태 뱃지
 */
function getPaymentStatusBadge(status) {
    const statusMap = {
        pending: { label: '대기중', className: 'badge-warning' },
        completed: { label: '완료', className: 'badge-success' },
        failed: { label: '실패', className: 'badge-danger' },
        cancelled: { label: '취소', className: 'badge-secondary' },
        refunded: { label: '환불', className: 'badge-danger' }
    };
    return createStatusBadge(status, statusMap);
}

/**
 * 상품 상태 뱃지
 */
function getProductStatusBadge(status) {
    const statusMap = {
        active: { label: '판매중', className: 'badge-success' },
        sold_out: { label: '품절', className: 'badge-warning' },
        inactive: { label: '판매중지', className: 'badge-secondary' }
    };
    return createStatusBadge(status, statusMap);
}

/**
 * 로딩 스피너 표시/숨기기
 */
function toggleLoading(buttonElement, isLoading) {
    if (isLoading) {
        buttonElement.disabled = true;
        buttonElement.dataset.originalText = buttonElement.textContent;
        buttonElement.innerHTML = '<span class="spinner"></span> 처리중...';
    } else {
        buttonElement.disabled = false;
        buttonElement.textContent = buttonElement.dataset.originalText || '확인';
    }
}

/**
 * 확인 다이얼로그
 */
function confirmMessage(message) {
    return window.confirm(message);
}

/**
 * 페이지네이션 렌더링 (이벤트 위임 방식)
 */
function renderPagination(containerId, currentPage, totalPages, onPageChangeFn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div class="pagination">';

    // 이전 버튼
    html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>이전</button>`;

    // 페이지 번호 (최대 5개 표시)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    // 다음 버튼
    html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>다음</button>`;

    // 페이지 정보
    html += `<span class="pagination-info">${currentPage} / ${totalPages} 페이지</span>`;

    html += '</div>';

    container.innerHTML = html;

    // 이벤트 리스너 등록 (기존 리스너 제거 후 새로 등록)
    const newContainer = container.querySelector('.pagination');
    if (newContainer && typeof onPageChangeFn === 'function') {
        newContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn') && !e.target.disabled) {
                const page = parseInt(e.target.getAttribute('data-page'));
                if (!isNaN(page) && page > 0 && page <= totalPages) {
                    onPageChangeFn(page);
                }
            }
        });
    }
}
