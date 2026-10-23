/**
 * main.js
 * 2026 부산대학교 직무연수 포털 - 메인 페이지 컨트롤러
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const coursesGrid = document.getElementById('courses-grid');
  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const categoryChipsWrap = document.getElementById('category-chips');
  const targetSelect = document.getElementById('target-select');
  const reqSelect = document.getElementById('req-select');
  const methodSelect = document.getElementById('method-select');
  const sortSelect = document.getElementById('sort-select');
  const btnReset = document.getElementById('btn-reset-filters');
  const resultCountVal = document.getElementById('result-count-val');
  const btnRefresh = document.getElementById('btn-refresh');
  const syncStatusText = document.getElementById('sync-status-text');

  // Hero Stats 요소
  const statTotal = document.getElementById('stat-total');
  const statMandatory = document.getElementById('stat-mandatory');
  const statOnline = document.getElementById('stat-online');
  const statCategory = document.getElementById('stat-category');

  // 내부 상태 관리
  let allCourses = [];
  let currentFilters = {
    search: '',
    category: 'ALL',
    target: 'ALL',
    requirement: 'ALL',
    method: 'ALL',
    sort: 'DEFAULT'
  };

  /**
   * 스켈레톤 로딩 카드 렌더링
   */
  function renderSkeletons(count = 6) {
    coursesGrid.innerHTML = Array(count).fill(0).map(() => `
      <div class="skeleton-card">
        <div style="display:flex; justify-content:space-between;">
          <div class="skeleton-shimmer" style="width:120px; height:22px;"></div>
          <div class="skeleton-shimmer" style="width:70px; height:18px;"></div>
        </div>
        <div class="skeleton-shimmer" style="width:85%; height:26px;"></div>
        <div class="skeleton-shimmer" style="width:100%; height:42px;"></div>
        <div class="skeleton-shimmer" style="width:100%; height:70px; border-radius:10px;"></div>
        <div class="skeleton-shimmer" style="width:100%; height:44px; border-radius:8px;"></div>
      </div>
    `).join('');
  }

  /**
   * 데이터 초기 로드 및 바인딩
   */
  async function loadData(forceRefresh = false) {
    renderSkeletons();
    if (btnRefresh) btnRefresh.classList.add('spinning');

    try {
      allCourses = await window.PNU_API.fetchCourses(forceRefresh);

      // Hero 지표 업데이트
      updateHeroStats(allCourses);

      // 카테고리 칩 목록 동적 생성
      renderCategoryChips(allCourses);

      // 드롭다운 옵션 동적 구성
      populateSelectOptions(allCourses);

      // 목록 필터링 및 렌더링
      applyFiltersAndRender();

      // 동기화 상태 텍스트 갱신
      if (syncStatusText) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        syncStatusText.textContent = `실시간 연동 완료 (${timeStr})`;
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      coursesGrid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="empty-title">구글 시트 데이터를 불러오지 못했습니다.</div>
          <div class="empty-desc">${err.message || '인터넷 연결 상태 및 시트 접근 권한을 확인해주세요.'}</div>
          <button class="card-action-btn" style="max-width:200px; margin:0 auto; background:#0B2265; color:#fff;" onclick="location.reload()">
            다시 시도
          </button>
        </div>
      `;
    } finally {
      if (btnRefresh) btnRefresh.classList.remove('spinning');
    }
  }

  /**
   * Hero 지표 업데이트
   */
  function updateHeroStats(courses) {
    const stats = window.PNU_API.computeStats(courses);
    if (statTotal) statTotal.textContent = stats.total;
    if (statMandatory) statMandatory.textContent = stats.mandatory;
    if (statOnline) statOnline.textContent = stats.online;
    if (statCategory) statCategory.textContent = stats.categoryCount;
  }

  /**
   * 카테고리 칩 렌더링
   */
  function renderCategoryChips(courses) {
    const categoryCounts = courses.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});

    const sortedCats = Object.keys(categoryCounts).sort();

    let html = `
      <button class="cat-chip ${currentFilters.category === 'ALL' ? 'active' : ''}" data-cat="ALL">
        전체 분야 <span class="chip-count">${courses.length}</span>
      </button>
    `;

    sortedCats.forEach(cat => {
      const activeClass = currentFilters.category === cat ? 'active' : '';
      html += `
        <button class="cat-chip ${activeClass}" data-cat="${cat}">
          ${cat} <span class="chip-count">${categoryCounts[cat]}</span>
        </button>
      `;
    });

    categoryChipsWrap.innerHTML = html;

    // 칩 클릭 이벤트 바인딩
    categoryChipsWrap.querySelectorAll('.cat-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const cat = chip.getAttribute('data-cat');
        currentFilters.category = cat;
        categoryChipsWrap.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFiltersAndRender();
      });
    });
  }

  /**
   * 드롭다운 옵션 동적 채우기
   */
  function populateSelectOptions(courses) {
    const targets = [...new Set(courses.map(c => c.target).filter(Boolean))];
    const reqs = [...new Set(courses.map(c => c.requirement).filter(Boolean))];
    const methods = [...new Set(courses.map(c => c.method).filter(Boolean))];

    // 대상
    if (targetSelect && targetSelect.options.length <= 1) {
      targets.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = `대상: ${t}`;
        targetSelect.appendChild(opt);
      });
    }

    // 이수구분
    if (reqSelect && reqSelect.options.length <= 1) {
      reqs.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = `이수: ${r}`;
        reqSelect.appendChild(opt);
      });
    }

    // 교육방식
    if (methodSelect && methodSelect.options.length <= 1) {
      methods.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `방식: ${m}`;
        methodSelect.appendChild(opt);
      });
    }
  }

  /**
   * 필터 및 검색 적용 후 목록 렌더링
   */
  function applyFiltersAndRender() {
    let filtered = allCourses.slice();

    // 1. 카테고리 필터
    if (currentFilters.category !== 'ALL') {
      filtered = filtered.filter(c => c.category === currentFilters.category);
    }

    // 2. 대상 필터
    if (currentFilters.target !== 'ALL') {
      filtered = filtered.filter(c => c.target === currentFilters.target);
    }

    // 3. 이수구분 필터
    if (currentFilters.requirement !== 'ALL') {
      filtered = filtered.filter(c => c.requirement === currentFilters.requirement);
    }

    // 4. 교육방식 필터
    if (currentFilters.method !== 'ALL') {
      filtered = filtered.filter(c => c.method === currentFilters.method);
    }

    // 5. 검색어 필터 (대소문자 무시, 공백 무시)
    if (currentFilters.search.trim() !== '') {
      const q = currentFilters.search.trim().toLowerCase();
      filtered = filtered.filter(c => {
        const searchable = [
          c.title,
          c.code,
          c.category,
          c.department,
          c.summary,
          c.description,
          c.target,
          c.rawObjectives,
          c.rawContents
        ].join(' ').toLowerCase();

        return searchable.includes(q);
      });
    }

    // 6. 정렬
    if (currentFilters.sort === 'TITLE_ASC') {
      filtered.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    } else if (currentFilters.sort === 'HOURS_DESC') {
      const parseHours = (h) => {
        const m = (h || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      };
      filtered.sort((a, b) => parseHours(b.hours) - parseHours(a.hours));
    } else if (currentFilters.sort === 'HOURS_ASC') {
      const parseHours = (h) => {
        const m = (h || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      };
      filtered.sort((a, b) => parseHours(a.hours) - parseHours(b.hours));
    } else {
      // 기본: 코드 오름차순
      filtered.sort((a, b) => a.code.localeCompare(b.code));
    }

    // 결과 카운트 반영
    if (resultCountVal) {
      resultCountVal.textContent = filtered.length;
    }

    // 카드 목록 렌더링
    renderCards(filtered);
  }

  /**
   * 카드 그리드 HTML 생성
   */
  function renderCards(courses) {
    if (courses.length === 0) {
      coursesGrid.innerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <div class="empty-title">조건에 맞는 연수과정이 없습니다.</div>
          <div class="empty-desc">검색어 철자를 확인하시거나 적용된 필터를 초기화해 보세요.</div>
          <button id="btn-empty-reset" class="card-action-btn" style="max-width:180px; margin:0 auto; background:#0B2265; color:#fff;">
            필터 전체 초기화
          </button>
        </div>
      `;

      const emptyResetBtn = document.getElementById('btn-empty-reset');
      if (emptyResetBtn) {
        emptyResetBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    coursesGrid.innerHTML = courses.map(course => {
      // 이수구분 뱃지 스타일
      let reqBadgeClass = 'badge-req-optional';
      if (course.requirement.includes('필수')) {
        reqBadgeClass = 'badge-req-mandatory';
      } else if (course.requirement.includes('권장')) {
        reqBadgeClass = 'badge-req-recommended';
      }

      // 교육방식 뱃지 스타일
      let methodBadgeClass = 'badge-method-online';
      if (course.method.includes('집합')) {
        methodBadgeClass = 'badge-method-offline';
      } else if (course.method.includes('혼합')) {
        methodBadgeClass = 'badge-method-hybrid';
      }

      const detailUrl = `detail.html?code=${encodeURIComponent(course.code)}`;

      return `
        <article class="course-card" onclick="location.href='${detailUrl}'">
          <div class="card-top">
            <div class="card-header-meta">
              <div class="card-badges">
                <span class="badge badge-cat">${escapeHtml(course.category)}</span>
                <span class="badge ${reqBadgeClass}">${escapeHtml(course.requirement)}</span>
                <span class="badge ${methodBadgeClass}">${escapeHtml(course.method)}</span>
              </div>
              <span class="course-code">${escapeHtml(course.code)}</span>
            </div>
            <h3 class="course-title" title="${escapeHtml(course.title)}">${escapeHtml(course.title)}</h3>
            <p class="course-summary">${escapeHtml(course.summary || '상세 페이지에서 교육 목표 및 커리큘럼을 확인하세요.')}</p>
          </div>
          <div>
            <div class="course-meta-box">
              <div class="meta-col">
                <span class="meta-label">교육시간 · 정원</span>
                <span class="meta-val">${escapeHtml(course.hours)} (${escapeHtml(course.capacity)})</span>
              </div>
              <div class="meta-col">
                <span class="meta-label">담당부서</span>
                <span class="meta-val">${escapeHtml(course.department)}</span>
              </div>
              <div class="meta-col">
                <span class="meta-label">교육기간</span>
                <span class="meta-val" title="${escapeHtml(course.period)}">${escapeHtml(course.period)}</span>
              </div>
              <div class="meta-col">
                <span class="meta-label">대상</span>
                <span class="meta-val">${escapeHtml(course.target)}</span>
              </div>
            </div>
            <a href="${detailUrl}" class="card-action-btn" onclick="event.stopPropagation();">
              <span>상세보기 및 신청 안내</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  /**
   * 필터 초기화
   */
  function resetAllFilters() {
    currentFilters = {
      search: '',
      category: 'ALL',
      target: 'ALL',
      requirement: 'ALL',
      method: 'ALL',
      sort: 'DEFAULT'
    };

    if (searchInput) {
      searchInput.value = '';
      if (btnClearSearch) btnClearSearch.classList.remove('visible');
    }
    if (targetSelect) targetSelect.value = 'ALL';
    if (reqSelect) reqSelect.value = 'ALL';
    if (methodSelect) methodSelect.value = 'ALL';
    if (sortSelect) sortSelect.value = 'DEFAULT';

    if (categoryChipsWrap) {
      categoryChipsWrap.querySelectorAll('.cat-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-cat') === 'ALL');
      });
    }

    applyFiltersAndRender();
  }

  // 검색 인풋 디바운스 이벤트
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (btnClearSearch) {
        btnClearSearch.classList.toggle('visible', val.length > 0);
      }
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentFilters.search = val;
        applyFiltersAndRender();
      }, 200);
    });
  }

  // 검색어 지우기 버튼
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.classList.remove('visible');
      currentFilters.search = '';
      applyFiltersAndRender();
      searchInput.focus();
    });
  }

  // 드롭다운 변경 이벤트
  if (targetSelect) {
    targetSelect.addEventListener('change', (e) => {
      currentFilters.target = e.target.value;
      applyFiltersAndRender();
    });
  }

  if (reqSelect) {
    reqSelect.addEventListener('change', (e) => {
      currentFilters.requirement = e.target.value;
      applyFiltersAndRender();
    });
  }

  if (methodSelect) {
    methodSelect.addEventListener('change', (e) => {
      currentFilters.method = e.target.value;
      applyFiltersAndRender();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilters.sort = e.target.value;
      applyFiltersAndRender();
    });
  }

  // 필터 초기화 버튼
  if (btnReset) {
    btnReset.addEventListener('click', resetAllFilters);
  }

  // 실시간 새로고침 버튼
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadData(true);
    });
  }

  // HTML 이스케이프 유틸리티
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 최초 로딩 실행
  loadData();
});
