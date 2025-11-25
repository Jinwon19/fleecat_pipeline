/**
 * 대시보드 페이지
 */

document.addEventListener('DOMContentLoaded', async function() {
    await loadDashboardData();
});

/**
 * 대시보드 데이터 로드
 */
async function loadDashboardData() {
    try {
        // 전체 현황 조회
        const overview = await apiGet('/admin/dashboard/overview');

        if (overview.success && overview.data) {
            updateStatsCards(overview.data);
        }

        // 최근 활동 조회
        const activities = await apiGet('/admin/dashboard/recent-activities', { limit: 5 });

        if (activities.success && activities.data) {
            updateRecentActivities(activities.data);
        }

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        document.getElementById('recentActivitiesContent').innerHTML = `
            <p class="text-center error-message">${error.message}</p>
        `;
    }
}

/**
 * 통계 카드 업데이트
 */
function updateStatsCards(data) {
    // 회원 통계
    if (data.members) {
        document.getElementById('totalMembers').textContent = formatNumber(data.members.total);
        if (data.members.activeRate) {
            document.getElementById('memberChange').textContent = `활성: ${data.members.activeRate}%`;
        }
    }

    // 주문 통계
    if (data.orders) {
        document.getElementById('totalOrders').textContent = formatNumber(data.orders.total);
    }

    // 상품 통계
    if (data.products) {
        document.getElementById('totalProducts').textContent = formatNumber(data.products.total);
    }

    // 매출 통계
    if (data.revenue) {
        document.getElementById('totalRevenue').textContent = formatCurrency(data.revenue.total);
        if (data.revenue.todayRate) {
            document.getElementById('revenueChange').textContent = `오늘: ${data.revenue.todayRate}%`;
        }
    }
}

/**
 * 최근 활동 업데이트
 */
function updateRecentActivities(data) {
    const container = document.getElementById('recentActivitiesContent');

    let html = '<h4>최근 가입 회원</h4>';

    if (data.recentMembers && data.recentMembers.length > 0) {
        html += '<ul>';
        data.recentMembers.forEach(member => {
            html += `<li>${member.member_name || member.member_email} (${formatDateTime(member.member_created_at)})</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p class="text-muted">최근 가입한 회원이 없습니다.</p>';
    }

    html += '<h4 class="mt-20">최근 주문</h4>';

    if (data.recentOrders && data.recentOrders.length > 0) {
        html += '<ul>';
        data.recentOrders.forEach(order => {
            html += `<li>주문 #${order.order_id} - ${formatCurrency(order.order_total_price)} (${formatDateTime(order.order_created_at)})</li>`;
        });
        html += '</ul>';
    } else {
        html += '<p class="text-muted">최근 주문이 없습니다.</p>';
    }

    container.innerHTML = html;
}
