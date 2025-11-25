/**
 * 상품 관리 페이지
 */

let currentPage = 1;
let totalPages = 1;
let selectedProductId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();

    // 이벤트 위임: 상품 테이블 버튼 클릭
    document.getElementById('productsTableBody').addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('btn-view-detail')) {
            const productId = target.getAttribute('data-product-id');
            viewProductDetail(productId);
        }

        if (target.classList.contains('btn-update-status')) {
            const productId = target.getAttribute('data-product-id');
            openUpdateStatusModal(productId);
        }

        if (target.classList.contains('btn-delete-product')) {
            const productId = target.getAttribute('data-product-id');
            deleteProduct(productId);
        }
    });
});

/**
 * 상품 목록 로드
 */
async function loadProducts(page = 1) {
    currentPage = page;

    const filters = {
        page: currentPage,
        limit: 20,
        status: document.getElementById('filterStatus')?.value || '',
        search: document.getElementById('filterSearch')?.value || ''
    };

    try {
        const response = await apiGet('/admin/products', filters);

        if (response.success && response.data) {
            renderProductsTable(response.data.products);
            totalPages = response.data.totalPages || 1;
            renderPagination('paginationContainer', currentPage, totalPages, 'loadProducts');
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        document.getElementById('productsTableBody').innerHTML = `
            <tr><td colspan="7" class="text-center error-message">${error.message}</td></tr>
        `;
    }
}

/**
 * 상품 테이블 렌더링
 */
function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">상품 데이터가 없습니다.</td></tr>';
        return;
    }

    let html = '';
    products.forEach(product => {
        html += `
            <tr>
                <td>#${product.product_id}</td>
                <td>${product.product_name}</td>
                <td>${formatCurrency(product.product_price)}</td>
                <td>${formatNumber(product.product_quantity)}</td>
                <td>${getProductStatusBadge(product.product_status)}</td>
                <td>${formatDateTime(product.product_created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-view-detail" data-product-id="${product.product_id}">상세</button>
                    <button class="btn btn-sm btn-warning btn-update-status" data-product-id="${product.product_id}">상태변경</button>
                    <button class="btn btn-sm btn-danger btn-delete-product" data-product-id="${product.product_id}">삭제</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * 상품 상세 조회
 */
async function viewProductDetail(productId) {
    try {
        const response = await apiGet(`/admin/products/${productId}`);

        if (response.success && response.data) {
            showProductDetail(response.data);
        }
    } catch (error) {
        alert('상품 상세 정보를 불러오는 데 실패했습니다: ' + error.message);
    }
}

/**
 * 상품 상세 정보 표시
 */
function showProductDetail(product) {
    const content = document.getElementById('productDetailContent');

    let html = `
        <h3>상품 정보</h3>
        <p><strong>상품 ID:</strong> #${product.product_id}</p>
        <p><strong>상품명:</strong> ${product.product_name}</p>
        <p><strong>가격:</strong> ${formatCurrency(product.product_price)}</p>
        <p><strong>재고:</strong> ${formatNumber(product.product_quantity)}</p>
        <p><strong>상태:</strong> ${getProductStatusBadge(product.product_status)}</p>
        <p><strong>설명:</strong> ${product.product_description || '-'}</p>
        <p><strong>등록일:</strong> ${formatDateTime(product.product_created_at)}</p>
    `;

    if (product.tenant_member && product.tenant_member.tenant) {
        html += `
            <h3 class="mt-20">판매사 정보</h3>
            <p><strong>판매사명:</strong> ${product.tenant_member.tenant.tenant_name}</p>
        `;
    }

    if (product.product_images && product.product_images.length > 0) {
        html += `<h3 class="mt-20">상품 이미지</h3>`;
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">';
        product.product_images.forEach(img => {
            if (img.product_img_url) {
                html += `<img src="${img.product_img_url}" alt="${product.product_name}" style="width: 100%; border-radius: 4px;">`;
            }
        });
        html += '</div>';
    }

    content.innerHTML = html;
    document.getElementById('productDetailModal').classList.add('show');
}

/**
 * 상품 상세 모달 닫기
 */
function closeProductModal() {
    document.getElementById('productDetailModal').classList.remove('show');
}

/**
 * 상품 상태 변경 모달 열기
 */
function openUpdateStatusModal(productId) {
    selectedProductId = productId;
    document.getElementById('updateStatusModal').classList.add('show');
}

/**
 * 상품 상태 변경 모달 닫기
 */
function closeUpdateStatusModal() {
    selectedProductId = null;
    document.getElementById('updateStatusModal').classList.remove('show');
}

/**
 * 상품 상태 변경 확인
 */
async function confirmUpdateStatus() {
    if (!selectedProductId) return;

    const newStatus = document.getElementById('newStatus').value;

    if (!confirmMessage(`상품 상태를 ${newStatus}(으)로 변경하시겠습니까?`)) {
        return;
    }

    try {
        const response = await apiPatch(`/admin/products/${selectedProductId}/status`, { status: newStatus });

        if (response.success) {
            alert('상품 상태가 변경되었습니다.');
            closeUpdateStatusModal();
            loadProducts(currentPage);
        }
    } catch (error) {
        alert('상품 상태 변경에 실패했습니다: ' + error.message);
    }
}

/**
 * 상품 삭제
 */
async function deleteProduct(productId) {
    if (!confirmMessage('정말 이 상품을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await apiDelete(`/admin/products/${productId}`);

        if (response.success) {
            alert('상품이 삭제되었습니다.');
            loadProducts(currentPage);
        }
    } catch (error) {
        alert('상품 삭제에 실패했습니다: ' + error.message);
    }
}
