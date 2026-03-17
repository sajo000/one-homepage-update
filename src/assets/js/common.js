// =========================================================
// 🧩 SECTION 1: 컴포넌트 비동기 로드 관리 (Header & Footer)
// =========================================================

/**
 * 현재 페이지의 위치에 따라 적절한 상대 경로 기준점을 반환합니다.
 * 'index.html'이 루트에 있고, 서브페이지는 'pages/' 안에 있다고 가정합니다.
 * @returns {string} - 경로 기준점 ('./' 또는 '../')
 */
function getPathBase() {
  const pathname = window.location.pathname;

  // URL 경로에 '/pages/'가 포함되어 있으면 서브페이지로 간주
  if (pathname.includes('/pages/')) {
    return '../'; // 서브페이지는 한 단계 위로 올라가야 'pages/' 폴더에 접근 가능
  } else {
    return './'; // 루트 레벨 파일(index.html 등)은 현재 위치에서 'pages/'에 접근 가능
  }
}

/**
 * 특정 HTML 조각(컴포넌트)을 비동기적으로 가져와 DOM에 삽입하는 함수입니다.
 * 이는 페이지 로딩 속도를 개선하고 HTML 파일 관리를 분리하는 데 유용합니다.
 * * @param {string} id - HTML 조각을 삽입할 대상 요소의 ID (예: 'header-placeholder')
 * @param {string} url - 가져올 HTML 파일의 경로 (예: './pages/header.html')
 * @returns {Promise<boolean>} - 로드 성공 여부를 Promise로 반환합니다.
 */
async function common(id, url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const placeholder = document.getElementById(id);

    if (placeholder) {
      placeholder.innerHTML = html;
      return true;
    } else {
      console.error(`Placeholder element with ID '${id}' not found.`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to load component ${url}:`, error);
    return false;
  }
}

/**
 * 헤더와 푸터 컴포넌트 로드를 동시에 시작하고, 모든 로드가 완료될 때까지 기다립니다.
 * 메인 기능 초기화는 이 Promise가 해결된(resolved) 후에만 실행됩니다.
 * * @returns {Promise<any[]>} - 모든 컴포넌트 로드 결과를 담은 Promise입니다.
 */
function loadAllComponents() {
  const basePath = getPathBase(); // ⭐️ 경로 기준점 가져오기

  const headerPromise = common('header-placeholder',
      basePath + 'pages/header.html'); // ⭐️ basePath 적용
  const footerPromise = common('footer-placeholder',
      basePath + 'pages/footer.html'); // ⭐️ basePath 적용
  return Promise.all([headerPromise, footerPromise]);
}

// =========================================================
// 📐 SECTION 1: 헤더 스크롤 (GSAP ScrollTrigger 버전)
// =========================================================

/**
 * GSAP ScrollTrigger를 사용하여 ScrollSmoother와 호환되는 헤더 제어
 * - CSS Transition 대신 GSAP 애니메이션 사용
 * - 스크롤 방향 감지 로직을 ScrollTrigger에 위임
 */
function initializeHeaderScroll() {
  const header = document.getElementById('header');
  const headerContainer = header ? header.querySelector('.header-container') : null;

  if (!header || !headerContainer) return;

  // 모바일 GNB 요소 캐싱: GNB가 열려 있는지 확인하기 위해 필요함.
  const mobileGnb = document.querySelector('.mobile-gnb');

  // 1. 초기 설정: GSAP로 위치 제어권을 가져옴
  gsap.set(headerContainer, { yPercent: 0 });

  // 2. 애니메이션 정의
  const showAnim = gsap.from(headerContainer, {
    yPercent: -100,
    paused: true,
    duration: 0.4,
    ease: "power3.out"
  }).progress(1); // 처음엔 보이는 상태로 시작

  // 3. ScrollTrigger 생성
  ScrollTrigger.create({
    start: "top top",
    end: 99999, // 페이지 전체
    onUpdate: (self) => {

      // 모바일 GNB가 열려 있으면 (is-active 클래스 확인)
      // 스크롤 방향 감지 로직을 무시하고 헤더를 강제로 보이게 함.
      if (mobileGnb && mobileGnb.classList.contains('is-active')) {
        header.classList.remove('hide'); // 숨김 클래스 제거
        header.classList.add('up');      // 보임 상태 클래스 추가
        if(showAnim.progress() < 1) showAnim.play(); // 헤더 보이기 애니메이션 강제 실행
        return; // 나머지 스크롤 방향 감지 로직 실행 중단
      }

      // 스크롤 방향 감지 (-1: UP, 1: DOWN)
      const isScrollingDown = self.direction === 1;
      const scrollTop = self.scroll();

      // A. 최상단 (Top)
      if (scrollTop < 10) {
        header.classList.add('top');
        header.classList.remove('hide', 'up');
        if(showAnim.progress() < 1) showAnim.play(); // 강제로 내리기
      }
      // B. 스크롤 중
      else {
        header.classList.remove('top');

        if (isScrollingDown) {
          // 내릴 때: 숨김
          if(showAnim.progress() === 1) showAnim.reverse();
          header.classList.add('hide');
          header.classList.remove('up');
        } else {
          // 올릴 때: 보임
          if(showAnim.progress() === 0) showAnim.play();
          header.classList.add('up');
          header.classList.remove('hide');
        }
      }
    }
  });
}

// =========================================================
// 🖱️ SECTION 2: 웹 헤더 서비스 메뉴 호버 애니메이션 (GSAP)
// =========================================================

function initializeServiceMenuHover() {
  // 1. 대상 요소 선택
  const serviceBtn = document.querySelector('.web-gnb__item.service');
  const submenuWrapper = document.querySelector('.gnb__nav--deps1-position');

  // 요소가 없으면 실행 중단 (모바일 등)
  if (!serviceBtn || !submenuWrapper) return;

  // 2. 초기 상태 설정 (GSAP Set)
  // autoAlpha: 0 -> opacity: 0 이고 visibility: hidden 상태로 만듦
  // y: -10 -> 약간 위에 가 있는 상태 (내려오면서 등장 효과)
  gsap.set(submenuWrapper, { autoAlpha: 0, y: -10 });

  // 3. 마우스 엔터 이벤트 (보이기)
  serviceBtn.addEventListener('mouseenter', () => {
    gsap.to(submenuWrapper, {
      autoAlpha: 1,       // 보이게 함
      y: 0,               // 원래 위치로 이동
      duration: 0.3,      // 0.3초 동안
      ease: "power2.out", // 부드러운 감속
      overwrite: "auto"   // 마우스를 빠르게 왔다갔다 할 때 기존 애니메이션 덮어쓰기
    });
  });

  // 4. 마우스 리브 이벤트 (숨기기)
  serviceBtn.addEventListener('mouseleave', () => {
    gsap.to(submenuWrapper, {
      autoAlpha: 0,       // 안 보이게 함 (클릭 불가)
      y: -10,             // 살짝 위로 올라가며 사라짐
      duration: 0.2,      // 사라질 때는 좀 더 빠르게
      ease: "power2.in",  // 가속
      overwrite: "auto"
    });
  });

  console.log("GSAP Service Menu Hover initialized.");
}


// =========================================================
// 📱 SECTION 3: 모바일 GNB (Global Navigation Bar) 로직 정의
// =========================================================

/**
 * 모바일 환경에서 메뉴 버튼 클릭 시 GNB를 열고 닫는 기능을 GSAP를 사용하여 구현합니다.
 */
function initializeMobileGNB() {
  const menuButton = document.querySelector('.mobile-nav__menu');
  const closeButton = document.querySelector('.mobile-gnb__close');
  const mobileGnb = document.querySelector('.mobile-gnb');
  const body = document.body;

  if (!menuButton || !closeButton || !mobileGnb) {
    console.warn("Mobile GNB elements not found. Initialization skipped.");
    return;
  }

  // 1. GSAP 타임라인 정의 (초기 상태: 멈춤)
  // GNB 슬라이드 아웃(-100%): 화면 오른쪽에서 왼쪽으로 숨기기
  const tl = gsap.timeline({ paused: true, reversed: true });

  // GNB를 열 때 (reversed: true 상태에서 play() 실행 시)
  tl.fromTo(mobileGnb,
      { x: '100vw' }, // CSS에서 x가 110vw로 설정되어 있지만, GSAP에서 100vw로 시작하여 통일성 확보
      { x: 0, duration: 0.5, ease: "power2.inOut" } // 화면 안으로 이동
  )
  // GNB 내부의 주요 네비게이션 링크를 순차적으로 등장 (links 클래스에 포함된 a 태그 타겟)
  .from(".mobile-gnb__nav a", {
    y: 10,
    opacity: 0,
    stagger: 0.05,
    duration: 0.3,
    ease: "power1.out"
  }, "-=0.2"); // GNB가 0.2초 이동한 후부터 링크 등장 시작

  /** GNB를 열고 스크롤 잠금 */
  function openMobileGNB(e) {
    e.preventDefault();
    mobileGnb.classList.add('is-active'); // CSS 가시성/z-index 확보용 클래스
    body.classList.add('no-scroll');       // 본문 스크롤 잠금
    tl.play();                             // 애니메이션 실행 (열림)
  }

  /** GNB를 닫고 스크롤 잠금 해제 */
  function closeMobileGNB(e) {
    // if (e) e.preventDefault();

    // GNB 닫기 애니메이션 완료 후 클래스를 제거하여 완전히 숨김
    tl.reverse().then(() => {
      mobileGnb.classList.remove('is-active');
      body.classList.remove('no-scroll');
    });
  }

  // 2. 이벤트 리스너 등록
  menuButton.addEventListener('click', openMobileGNB);
  closeButton.addEventListener('click', closeMobileGNB);

  // (선택 사항) GNB 내부의 링크 클릭 시 GNB 닫기
  mobileGnb.querySelectorAll('a').forEach(link => {
    // 언어 토글 링크 (.kor 또는 .eng 클래스를 가진 링크)는 닫기 이벤트에서 제외
    if (link.classList.contains('kor') || link.classList.contains('eng')) {
      return;
    }

    // 서브메뉴를 가진 최상위 링크 (서비스) 제외
    // 서비스 메뉴의 <a> 태그를 누르면 서브메뉴가 토글되어야 하므로, GNB 닫기 로직에서 제외
    const parentItem = link.closest('.mobile-nav__item');
    if (parentItem && parentItem.classList.contains('service')) {
      // 서브메뉴를 가진 부모 항목의 <a> 태그를 클릭하는 경우:
      // * 서브메뉴의 활성화/토글 기능은 CSS나 다른 JS 로직이 담당할 것입니다.
      // * GNB 닫기 이벤트에서는 제외해야 합니다.
      return; // 서비스 링크는 GNB 닫기 이벤트 등록에서 제외
    }

    // 나머지 링크 (일반 뎁스1 항목 및 서브 메뉴 내부의 링크)에 닫기 이벤트 등록
    link.addEventListener('click', closeMobileGNB);
  });
}

// =========================================================
// 🧭 SECTION 4: 현재 페이지 기반 GNB Active 상태 관리
// =========================================================

/**
 * 현재 페이지의 URL 경로와 일치하는 GNB 링크에 'active' 클래스를 적용합니다.
 * (Header 컴포넌트 로드 완료 후 실행되어야 합니다.)
 */
function initializeNavActiveState() {
  // 현재 페이지의 경로
  const currentPathname = window.location.pathname.replace(/\/+$/, '');

  // 네비게이션 링크 선택 (메인 + 서브메뉴 모두 포함)
  // .gnb__nav--deps1 a, .mobile-gnb__nav--deps1 a를 추가하여 서브메뉴 링크도 선택
  const navLinks = document.querySelectorAll('.nav-item, .gnb__nav--deps1 a, .mobile-gnb__nav--deps1 a');

  if (navLinks.length === 0) {
    console.warn("Navigation links not found. Active state skipped.");
    return;
  }

  // 1. 모든 active 클래스 초기화
  document.querySelectorAll('.web-gnb__item.active, .nav-item.active, .mobile-nav__item.active, .gnb__nav--deps1.active, .mobile-gnb__nav--deps1.active').forEach(el => {
    el.classList.remove('active');
  });

  // 2. 링크 순회 및 경로 비교
  navLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (!linkHref) return;

    // A. 링크 경로 정리
    let linkPath = linkHref.replace(/\/+$/, '');
    if (linkPath === '/' && (currentPathname === '/' || currentPathname === '')) {
      linkPath = currentPathname;
    }

    // 현재 URL 경로가 링크 경로를 포함하는지 확인
    // 현재 경로를 파일명으로만 비교하기 위해 경로에서 파일명 부분만 추출하여 비교합니다.
    const currentFileName = currentPathname.substring(currentPathname.lastIndexOf('/') + 1);
    const linkFileName = linkPath.substring(linkPath.lastIndexOf('/') + 1);


    // B. 경로 일치 확인 (파일명 기준으로 비교)
    if (currentFileName === linkFileName && linkFileName !== '') {

      // 1) <a> 태그에 active 추가
      link.classList.add('active');

      // 2) 웹 GNB 부모 로직
      const webParentItem = link.closest('.web-gnb__item');
      if (webParentItem) {
        webParentItem.classList.add('active');

        // 웹 서브메뉴 그룹 활성화 로직 추가
        const webSubMenu = link.closest('.gnb__nav--deps1');
        if (webSubMenu) {
          webSubMenu.classList.add('active'); // gnb__nav--deps1 에 active 추가
        }
      }

      // 3) 모바일 GNB 부모 로직
      const mobileParentItem = link.closest('.mobile-nav__item');
      if (mobileParentItem) {
        mobileParentItem.classList.add('active');

        // 모바일 서브메뉴 그룹 활성화 로직 추가 및 기존 로직 통합
        const mobileSubMenu = link.closest('.mobile-gnb__nav--deps1');
        if (mobileSubMenu) {
          mobileSubMenu.classList.add('active'); // mobile-gnb__nav--deps1 에 active 추가

          // 모바일 메인 부모에게도 active 추가
          const mainParent = mobileSubMenu.closest('.mobile-nav__item');
          if (mainParent) {
            mainParent.classList.add('active');
          }
        }
      }
    }
  });

  console.log("Navigation active state initialized.");
}

// =========================================================
// 🍀 SECTION 5: 메인 실행 진입점 (DOM Ready & 순서 보장)
// =========================================================

/**
 * DOM 콘텐츠가 완전히 로드된 후 (DOMContentLoaded) 스크립트를 실행합니다.
 * 모든 기능은 컴포넌트 로드와 초기 언어 로드가 완료된 후 순차적으로 실행되어야
 * 해당 요소(헤더, 푸터, 다국어 요소 등)를 안전하게 찾고 이벤트를 등록할 수 있습니다.
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM content fully loaded. Starting component load...");

  // 1. 모든 컴포넌트 로드 시작
  loadAllComponents()
  .then(() => {
    console.log("Header/Footer 로드 완료.");

  })
  .then(() => {
    console.log("언어 로드 완료. 모든 기능 초기화 시작.");

    // 2. 비디오 로드 대기 로직 추가
    const mainVideo = document.querySelector('.main-hero__video-wrapper video');

    // 메인 페이지(video 요소가 존재)인 경우
    if (mainVideo && typeof initializeWeb === 'function') {
      console.log("메인 페이지 비디오 로드 대기 중...");

      // 비디오가 이미 로드된 상태이거나, load 이벤트 대기
      if (mainVideo.readyState >= 3) {
        // readyState >= 3 (HAVE_FUTURE_DATA)이면 즉시 실행
        console.log("비디오가 이미 준비됨. initializeWeb 실행.");
        initializeWeb();
      } else {
        // 비디오 로드 완료 이벤트 리스너 등록
        mainVideo.addEventListener('loadeddata', () => {
          console.log("비디오 로드 완료 (loadeddata). initializeWeb 실행.");
          initializeWeb();
        }, { once: true }); // 한 번만 실행
      }
    } else {
      // 서브 페이지 또는 initializeWeb 함수가 정의되지 않은 경우
      console.log("일반 페이지 초기화 실행.");
      if (typeof initializeWeb === 'function') {
        initializeWeb(); // 비디오가 없으면 즉시 실행
      }
    }

    // 3. 모든 공통 기능 초기화 (비디오 로드와 별개로 실행 가능)
    initializeHeaderScroll();
    initializeServiceMenuHover();
    initializeMobileGNB();
    initializeNavActiveState(); // GNB 활성 상태도 Header 로드 후 바로 가능

  })
  .catch(error => {
    console.error("초기화 프로세스 중 치명적인 오류 발생. 일부 기능 비활성화.", error);
  });
});