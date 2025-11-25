/**
 * Categories Management Page
 * 카테고리 관리 페이지 로직
 */

// 상태 변수
let categories = [];
let isEditMode = false;
let editingCategoryId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();

  await loadCategories();

  // 이벤트 리스너 등록
  document.getElementById('createCategoryButton').addEventListener('click', openCreateModal);
  document.getElementById('includeInactive').addEventListener('change', loadCategories);

  // 모달 관련
  setupModal();

  // 이벤트 위임: 카테고리 트리 버튼 클릭
  document.getElementById('categoryTree').addEventListener('click', (e) => {
    const target = e.target;

    // 수정 버튼
    if (target.classList.contains('btn-edit-category')) {
      const categoryId = target.getAttribute('data-category-id');
      openEditModal(categoryId);
    }

    // 삭제 버튼
    if (target.classList.contains('btn-delete-category')) {
      const categoryId = target.getAttribute('data-category-id');
      deleteCategory(categoryId);
    }
  });
});

/**
 * 모달 설정
 */
function setupModal() {
  const modal = document.getElementById('categoryModal');
  const closeBtn = modal.querySelector('.close');
  const cancelBtn = document.getElementById('cancelButton');
  const saveBtn = document.getElementById('saveCategoryButton');

  closeBtn.onclick = () => closeModal();
  cancelBtn.onclick = () => closeModal();
  saveBtn.onclick = handleSaveCategory;

  window.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

/**
 * 카테고리 목록 로드
 */
async function loadCategories() {
  try {
    const includeInactive = document.getElementById('includeInactive').checked;
    const params = new URLSearchParams({ includeInactive });

    const response = await apiCall('GET', `/api/v1/admin/categories?${params}`);

    if (response.success) {
      categories = response.data;
      renderCategoryTree();
    }
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
    document.getElementById('categoryTree').innerHTML =
      '<p class="text-center text-danger">카테고리를 불러올 수 없습니다.</p>';
  }
}

/**
 * 카테고리 트리 렌더링
 */
function renderCategoryTree() {
  const container = document.getElementById('categoryTree');

  if (categories.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">카테고리가 없습니다.</p>';
    return;
  }

  // depth별로 그룹화
  const depth1 = categories.filter(c => c.category_depth === 1);
  const depth2 = categories.filter(c => c.category_depth === 2);
  const depth3 = categories.filter(c => c.category_depth === 3);

  let html = '<ul class="tree-list">';

  depth1.forEach(cat1 => {
    html += renderCategoryItem(cat1);

    const children2 = depth2.filter(c => c.parent_category_id === cat1.category_id);
    if (children2.length > 0) {
      html += '<ul class="tree-list tree-list-nested">';
      children2.forEach(cat2 => {
        html += renderCategoryItem(cat2);

        const children3 = depth3.filter(c => c.parent_category_id === cat2.category_id);
        if (children3.length > 0) {
          html += '<ul class="tree-list tree-list-nested">';
          children3.forEach(cat3 => {
            html += renderCategoryItem(cat3);
          });
          html += '</ul>';
        }
      });
      html += '</ul>';
    }
  });

  html += '</ul>';
  container.innerHTML = html;
}

/**
 * 카테고리 아이템 렌더링
 */
function renderCategoryItem(category) {
  const activeClass = category.category_is_active ? '' : 'inactive';

  return `
    <li class="tree-item ${activeClass}">
      <div class="tree-item-content">
        <span class="tree-item-name">${category.category_name}</span>
        <span class="badge badge-${category.category_is_active ? 'success' : 'secondary'}">
          ${category.category_is_active ? '활성' : '비활성'}
        </span>
        <span class="tree-item-actions">
          <button class="btn btn-sm btn-primary btn-edit-category" data-category-id="${category.category_id}">수정</button>
          <button class="btn btn-sm btn-danger btn-delete-category" data-category-id="${category.category_id}">삭제</button>
        </span>
      </div>
    </li>
  `;
}

/**
 * 생성 모달 열기
 */
function openCreateModal() {
  isEditMode = false;
  editingCategoryId = null;

  document.getElementById('modalTitle').textContent = '카테고리 추가';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryIsActive').checked = true;

  // 부모 카테고리 옵션 로드
  loadParentCategoryOptions();

  document.getElementById('categoryModal').classList.add('show');
}

/**
 * 수정 모달 열기
 */
async function openEditModal(categoryId) {
  try {
    const response = await apiCall('GET', `/api/v1/admin/categories/${categoryId}`);

    if (response.success) {
      const category = response.data;

      isEditMode = true;
      editingCategoryId = categoryId;

      document.getElementById('modalTitle').textContent = '카테고리 수정';
      document.getElementById('categoryName').value = category.category_name;
      document.getElementById('categoryDescription').value = category.category_description || '';
      document.getElementById('categoryOrder').value = category.category_order || 0;
      document.getElementById('categoryIsActive').checked = category.category_is_active;

      // 부모 카테고리 옵션 로드 (자기 자신과 하위 카테고리는 제외)
      loadParentCategoryOptions(categoryId, category.parent_category_id);

      document.getElementById('categoryModal').classList.add('show');
    }
  } catch (error) {
    console.error('카테고리 조회 실패:', error);
    alert('카테고리 정보를 불러올 수 없습니다.');
  }
}

/**
 * 부모 카테고리 옵션 로드
 */
function loadParentCategoryOptions(excludeId = null, selectedId = null) {
  const select = document.getElementById('parentCategory');
  select.innerHTML = '<option value="">최상위 카테고리</option>';

  // depth 1, 2만 부모로 선택 가능 (depth 3은 최하위)
  const availableCategories = categories.filter(c =>
    c.category_depth < 3 &&
    c.category_is_active &&
    c.category_id !== excludeId
  );

  availableCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.category_id;
    option.textContent = `${'  '.repeat(category.category_depth - 1)}${category.category_name}`;

    if (selectedId && category.category_id === selectedId) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

/**
 * 카테고리 저장
 */
async function handleSaveCategory(e) {
  e.preventDefault();

  const data = {
    category_name: document.getElementById('categoryName').value.trim(),
    category_description: document.getElementById('categoryDescription').value.trim(),
    category_order: parseInt(document.getElementById('categoryOrder').value) || 0,
    category_is_active: document.getElementById('categoryIsActive').checked
  };

  const parentId = document.getElementById('parentCategory').value;
  if (parentId) {
    data.parent_category_id = parseInt(parentId);
  }

  if (!data.category_name) {
    alert('카테고리명을 입력해주세요.');
    return;
  }

  try {
    let response;

    if (isEditMode) {
      response = await apiCall('PATCH', `/api/v1/admin/categories/${editingCategoryId}`, data);
    } else {
      response = await apiCall('POST', '/api/v1/admin/categories', data);
    }

    if (response.success) {
      alert(isEditMode ? '카테고리가 수정되었습니다.' : '카테고리가 추가되었습니다.');
      closeModal();
      await loadCategories();
    }
  } catch (error) {
    console.error('카테고리 저장 실패:', error);
    alert(error.message || '카테고리를 저장할 수 없습니다.');
  }
}

/**
 * 카테고리 삭제
 */
async function deleteCategory(categoryId) {
  if (!confirm('정말 삭제하시겠습니까?\n하위 카테고리나 상품이 있으면 삭제할 수 없습니다.')) {
    return;
  }

  try {
    const response = await apiCall('DELETE', `/api/v1/admin/categories/${categoryId}`);

    if (response.success) {
      alert('카테고리가 삭제되었습니다.');
      await loadCategories();
    }
  } catch (error) {
    console.error('카테고리 삭제 실패:', error);
    alert(error.message || '카테고리를 삭제할 수 없습니다.');
  }
}

/**
 * 모달 닫기
 */
function closeModal() {
  document.getElementById('categoryModal').classList.remove('show');
  document.getElementById('categoryForm').reset();
  isEditMode = false;
  editingCategoryId = null;
}
