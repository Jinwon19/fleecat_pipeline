/**
 * 인증 처리 (로그인, 로그아웃)
 */

// 로그인 페이지인 경우에만 실행
if (window.location.pathname.includes('index.html') || window.location.pathname === '/admin/' || window.location.pathname === '/admin') {
    // 이미 로그인되어 있으면 대시보드로 리다이렉트
    if (isAuthenticated()) {
        window.location.href = '/admin/dashboard.html';
    }

    // 로그인 폼 처리
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const loginButton = document.getElementById('loginButton');

        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                // 에러 메시지 숨기기
                errorMessage.style.display = 'none';

                // 로딩 상태 표시
                toggleLoading(loginButton, true);

                // 폼 데이터 가져오기
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                try {
                    // 로그인 API 호출
                    const response = await fetch('https://fleecat-production.up.railway.app/api/v1/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || '로그인에 실패했습니다.');
                    }

                    // 응답 데이터 확인 (서버는 member를 반환함)
                    if (!result.data || !result.data.token || !result.data.member) {
                        throw new Error('잘못된 응답 형식입니다.');
                    }

                    const { token, member } = result.data;
                    const user = member; // member를 user로 매핑

                    // admin 권한 확인
                    if (user.role !== 'admin') {
                        throw new Error('관리자 권한이 필요합니다.');
                    }

                    // 토큰과 사용자 정보 저장
                    localStorage.setItem('admin_token', token);
                    localStorage.setItem('admin_user', JSON.stringify(user));

                    // 대시보드로 리다이렉트
                    window.location.href = '/admin/dashboard.html';

                } catch (error) {
                    console.error('Login error:', error);
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                    toggleLoading(loginButton, false);
                }
            });
        }
    });
}

// 대시보드 페이지인 경우에만 실행
if (window.location.pathname.includes('dashboard.html') ||
    window.location.pathname.includes('orders.html') ||
    window.location.pathname.includes('products.html')) {

    // 로그인하지 않았으면 로그인 페이지로 리다이렉트
    if (!isAuthenticated()) {
        window.location.href = '/admin/index.html';
    }

    // 페이지 로드 시 사용자 정보 표시
    document.addEventListener('DOMContentLoaded', function() {
        const user = getCurrentUser();
        if (user) {
            // 사용자 이름 표시 (헤더에 표시할 요소가 있다면)
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.name || user.email;
            }

            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = user.email;
            }
        }

        // 로그아웃 버튼 이벤트
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirmMessage('로그아웃하시겠습니까?')) {
                    logout();
                }
            });
        }
    });
}
