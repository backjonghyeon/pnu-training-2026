/**
 * detail.js
 * 2026 부산대학교 직무연수 포털 - 상세 페이지 컨트롤러
 */

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const courseCode = params.get('code');

  const mainWrapper = document.getElementById('detail-page-content');
  const notFoundWrapper = document.getElementById('detail-not-found');

  if (!courseCode) {
    showNotFound('과정 코드가 지정되지 않았습니다.');
    return;
  }

  try {
    const course = await window.PNU_API.getCourseByCode(courseCode);

    if (!course) {
      showNotFound(`과정 코드 [${courseCode}]에 해당하는 연수 정보를 찾을 수 없습니다.`);
      return;
    }

    renderCourseDetails(course);
  } catch (err) {
    console.error('상세 정보 로드 실패:', err);
    showNotFound(`데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
  }

  function showNotFound(msg) {
    if (mainWrapper) mainWrapper.style.display = 'none';
    if (notFoundWrapper) {
      notFoundWrapper.style.display = 'block';
      const descEl = document.getElementById('not-found-desc');
      if (descEl) descEl.textContent = msg;
    }
  }

  function renderCourseDetails(c) {
    // 페이지 타이틀 갱신
    document.title = `${c.title} - 2026 부산대학교 직무연수 포털`;

    // 헤더 및 히어로 바인딩
    setText('detail-code-badge', c.code);
    setText('detail-title', c.title);
    setText('detail-summary', c.summary || '본 과정에 대한 상세 소개 및 학습목표를 확인하세요.');

    // 뱃지 바인딩
    const tagCat = document.getElementById('detail-tag-cat');
    if (tagCat) tagCat.textContent = c.category;

    const tagReq = document.getElementById('detail-tag-req');
    if (tagReq) {
      tagReq.textContent = c.requirement;
      if (c.requirement.includes('필수')) {
        tagReq.className = 'badge badge-req-mandatory';
      } else if (c.requirement.includes('권장')) {
        tagReq.className = 'badge badge-req-recommended';
      } else {
        tagReq.className = 'badge badge-req-optional';
      }
    }

    const tagMethod = document.getElementById('detail-tag-method');
    if (tagMethod) {
      tagMethod.textContent = c.method;
      if (c.method.includes('온라인')) {
        tagMethod.className = 'badge badge-method-online';
      } else if (c.method.includes('집합')) {
        tagMethod.className = 'badge badge-method-offline';
      } else {
        tagMethod.className = 'badge badge-method-hybrid';
      }
    }

    // 본문 섹션: 상세 소개
    setText('detail-desc', c.description || '등록된 상세 소개가 없습니다.');

    // 본문 섹션: 학습 목표
    const objList = document.getElementById('detail-objectives-list');
    if (objList) {
      if (c.objectives && c.objectives.length > 0) {
        objList.innerHTML = c.objectives.map(item => `
          <li class="objective-item">
            <svg class="obj-check-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>${escapeHtml(item)}</span>
          </li>
        `).join('');
      } else {
        objList.innerHTML = `<li class="objective-item">학습목표 정보가 준비 중입니다.</li>`;
      }
    }

    // 본문 섹션: 주요 교육 내용 (커리큘럼)
    const currList = document.getElementById('detail-curriculum-list');
    if (currList) {
      if (c.contents && c.contents.length > 0) {
        currList.innerHTML = c.contents.map((item, idx) => `
          <div class="curriculum-step">
            <div class="step-num-badge">${idx + 1}</div>
            <div class="step-content">${escapeHtml(item)}</div>
          </div>
        `).join('');
      } else {
        currList.innerHTML = `<div class="curriculum-step"><div class="step-content">주요 교육 내용이 준비 중입니다.</div></div>`;
      }
    }

    // 본문 섹션: 수강 대상 및 이수 구분
    setText('detail-target-full', c.target || '전 직원');
    setText('detail-req-full', c.requirement || '선택');

    // 사이드바: 핵심 요약 (Quick Facts)
    setText('fact-method', c.method);
    setText('fact-hours', c.hours);
    setText('fact-capacity', c.capacity);
    setText('fact-period', c.period);
    setText('fact-apply-period', c.applyPeriod || '상시');
    setText('fact-department', c.department);

    // 문의처 (전화번호 링크 변환)
    const contactEl = document.getElementById('fact-contact');
    if (contactEl) {
      if (c.contact) {
        const phoneMatch = c.contact.match(/051[\d\-\s]+/);
        if (phoneMatch) {
          const cleanPhone = phoneMatch[0].replace(/\s+/g, '');
          contactEl.innerHTML = `${escapeHtml(c.contact)} <a href="tel:${cleanPhone}" class="fact-contact-link" title="전화 걸기">(통화 연결)</a>`;
        } else {
          contactEl.textContent = c.contact;
        }
      } else {
        contactEl.textContent = '인재개발원 (051-510-1231)';
      }
    }

    // CTA 신청 링크 버튼
    const applyBtn = document.getElementById('btn-apply-cta');
    if (applyBtn) {
      if (c.applyLink && c.applyLink !== '#') {
        applyBtn.href = c.applyLink;
        applyBtn.target = '_blank';
        applyBtn.rel = 'noopener noreferrer';
      } else {
        applyBtn.href = '#';
        applyBtn.onclick = (e) => {
          e.preventDefault();
          alert('현재 본 과정의 온라인 수강 신청 링크가 준비 중입니다. 주관부서로 문의 바랍니다.');
        };
      }
    }

    // 링크 복사 버튼
    const copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span style="color:#059669; font-weight:700;">링크가 복사되었습니다!</span>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = originalText;
          }, 2000);
        }).catch(err => {
          prompt('아래 URL을 복사하세요:', window.location.href);
        });
      });
    }

    // 인쇄하기 버튼
    const printBtn = document.getElementById('btn-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
