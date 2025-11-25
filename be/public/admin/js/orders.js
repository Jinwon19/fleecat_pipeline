/**
 * 주문 관리 페이지
 */

let currentPage = 1;
let totalPages = 1;
let selectedOrderId = null;

document.addEventListener('DOMContentLoaded', function() {
    loadOrders();

    // 이벤트 위임: 주문 테이블 버튼 클릭
    document.getElementById('ordersTableBody').addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('btn-view-detail')) {
            const orderId = target.getAttribute('data-order-id');
            viewOrderDetail(orderId);
        }

        if (target.classList.contains('btn-update-status')) {
            const orderId = target.getAttribute('data-order-id');
            openUpdateStatusModal(orderId);
        }

        if (target.classList.contains('btn-refund')) {
            const orderId = target.getAttribute('data-order-id');
            openRefundModal(orderId);
        }
    });
});

/**
 * 주문 목록 로드
 */
async function loadOrders(page = 1) {
    currentPage = page;

    const filters = {
        page: currentPage,
        limit: 20,
        orderStatus: document.getElementById('filterStatus')?.value || '',
        paymentStatus: document.getElementById('filterPaymentStatus')?.value || ''
    };

    try {
        const response = await apiGet('/admin/orders', filters);

        if (response.success && response.data) {
            renderOrdersTable(response.data.orders);
            totalPages = response.data.totalPages || 1;
            renderPagination('paginationContainer', currentPage, totalPages, 'loadOrders');
        }
    } catch (error) {
        console.error('Failed to load orders:', error);
        document.getElementById('ordersTableBody').innerHTML = `
            <tr><td colspan="7" class="text-center error-message">${error.message}</td></tr>
        `;
    }
}

/**
 * 주문 테이블 렌더링
 */
function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">주문 데이터가 없습니다.</td></tr>';
        return;
    }

    let html = '';
    orders.forEach(order => {
        html += `
            <tr>
                <td>#${order.order_id}</td>
                <td>${order.member?.member_name || order.member?.member_email || '-'}</td>
                <td>${formatCurrency(order.order_total_amount)}</td>
                <td>${getOrderStatusBadge(order.order_status)}</td>
                <td>${order.payment ? getPaymentStatusBadge(order.payment.payment_status) : '-'}</td>
                <td>${formatDateTime(order.order_created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-primary btn-view-detail" data-order-id="${order.order_id}">상세</button>
                    <button class="btn btn-sm btn-warning btn-update-status" data-order-id="${order.order_id}">상태변경</button>
                    <button class="btn btn-sm btn-danger btn-refund" data-order-id="${order.order_id}">환불</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * 주문 상세 조회
 */
async function viewOrderDetail(orderId) {
    try {
        const response = await apiGet(`/admin/orders/${orderId}`);

        if (response.success && response.data) {
            showOrderDetail(response.data);
        }
    } catch (error) {
        alert('주문 상세 정보를 불러오는 데 실패했습니다: ' + error.message);
    }
}

/**
 * 주문 상세 정보 표시
 */
function showOrderDetail(order) {
    const content = document.getElementById('orderDetailContent');

    let html = `
        <h3>주문 정보</h3>
        <p><strong>주문 ID:</strong> #${order.order_id}</p>
        <p><strong>주문 번호:</strong> ${order.order_number || '-'}</p>
        <p><strong>주문자:</strong> ${order.member?.member_name || order.member?.member_email || '-'}</p>
        <p><strong>총 금액:</strong> ${formatCurrency(order.order_total_amount)}</p>
        <p><strong>할인 금액:</strong> ${formatCurrency(order.order_discount_amount)}</p>
        <p><strong>결제 금액:</strong> ${formatCurrency(order.order_subtotal_amount)}</p>
        <p><strong>주문 상태:</strong> ${getOrderStatusBadge(order.order_status)}</p>
        <p><strong>받는 사람:</strong> ${order.order_recipient_name || '-'}</p>
        <p><strong>연락처:</strong> ${order.order_recipient_phone || '-'}</p>
        <p><strong>배송지:</strong> ${order.order_recipient_address || '-'}</p>
        <p><strong>배송 메시지:</strong> ${order.order_message || '-'}</p>
        <p><strong>주문일시:</strong> ${formatDateTime(order.order_created_at)}</p>

        <h3 class="mt-20">결제 정보</h3>
    `;

    if (order.payment) {
        html += `
            <p><strong>결제 상태:</strong> ${getPaymentStatusBadge(order.payment.payment_status)}</p>
            <p><strong>결제 금액:</strong> ${formatCurrency(order.payment.payment_amount)}</p>
            <p><strong>결제 수단:</strong> ${order.payment.payment_method || '-'}</p>
            <p><strong>승인일시:</strong> ${formatDateTime(order.payment.payment_approved_at)}</p>
        `;
    } else {
        html += '<p>결제 정보가 없습니다.</p>';
    }

    html += `<h3 class="mt-20">주문 상품</h3>`;

    if (order.order_items && order.order_items.length > 0) {
        html += '<ul>';
        order.order_items.forEach(item => {
            html += `<li>${item.product?.product_name || '-'} - ${item.order_item_quantity}개 (${formatCurrency(item.order_item_price)})</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p>주문 상품 정보가 없습니다.</p>';
    }

    content.innerHTML = html;
    document.getElementById('orderDetailModal').classList.add('show');
}

/**
 * 주문 상세 모달 닫기
 */
function closeOrderModal() {
    document.getElementById('orderDetailModal').classList.remove('show');
}

/**
 * 주문 상태 변경 모달 열기
 */
function openUpdateStatusModal(orderId) {
    selectedOrderId = orderId;
    document.getElementById('updateStatusModal').classList.add('show');
}

/**
 * 주문 상태 변경 모달 닫기
 */
function closeUpdateStatusModal() {
    selectedOrderId = null;
    document.getElementById('updateStatusModal').classList.remove('show');
}

/**
 * 주문 상태 변경 확인
 */
async function confirmUpdateStatus() {
    if (!selectedOrderId) return;

    const newStatus = document.getElementById('newStatus').value;

    if (!confirmMessage(`주문 상태를 ${newStatus}(으)로 변경하시겠습니까?`)) {
        return;
    }

    try {
        const response = await apiPatch(`/admin/orders/${selectedOrderId}/status`, { status: newStatus });

        if (response.success) {
            alert('주문 상태가 변경되었습니다.');
            closeUpdateStatusModal();
            loadOrders(currentPage);
        }
    } catch (error) {
        alert('주문 상태 변경에 실패했습니다: ' + error.message);
    }
}

/**
 * 환불 모달 열기
 */
function openRefundModal(orderId) {
    selectedOrderId = orderId;
    document.getElementById('refundReason').value = '';
    document.getElementById('refundModal').classList.add('show');
}

/**
 * 환불 모달 닫기
 */
function closeRefundModal() {
    selectedOrderId = null;
    document.getElementById('refundModal').classList.remove('show');
}

/**
 * 환불 처리 확인
 */
async function confirmRefund() {
    if (!selectedOrderId) return;

    const refundReason = document.getElementById('refundReason').value;

    if (!confirmMessage('정말 환불 처리하시겠습니까?')) {
        return;
    }

    try {
        const response = await apiPost(`/admin/orders/${selectedOrderId}/refund`, {
            refund_reason: refundReason
        });

        if (response.success) {
            alert('환불 처리가 완료되었습니다.');
            closeRefundModal();
            loadOrders(currentPage);
        }
    } catch (error) {
        alert('환불 처리에 실패했습니다: ' + error.message);
    }
}
