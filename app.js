(() => {
  'use strict';
  const { people, factions, expressions } = window.CATFIA_DATA;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const image = (person, expression = 'default') => `./assets/characters/${person.id}-${expression}.webp`;

  // Preload only assets referenced by the current public roster.
  const imageRequests = new Map();
  function preloadImage(src) {
    if (imageRequests.has(src)) return imageRequests.get(src);
    const request = new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      let settled = false;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = img.onerror = null;
        if (!ok) imageRequests.delete(src);
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), 30000);
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = src;
    });
    imageRequests.set(src, request);
    return request;
  }
  const loader = $('#site-loader');
  const siteRegions = $$('.site-header, #mobile-nav, main, .skip-link');
  let loaderDismissed = false;
  function dismissLoader() {
    if (loaderDismissed) return;
    loaderDismissed = true;
    loader.hidden = true;
    siteRegions.forEach(region => region.inert = false);
    document.body.dataset.imagesReady = 'interactive';
    if (loader.contains(document.activeElement)) $('.brand').focus({ preventScroll: true });
  }
  async function preloadSite() {
    loader.hidden = false;
    siteRegions.forEach(region => region.inert = true);
    $('#loader-skip').focus({ preventScroll: true });
    $('#loader-skip').addEventListener('click', dismissLoader);
    const backgrounds = new Set([...factions.map(f => f.background), ...Object.values(districts).map(d => d.background), 'harbor', 'fblock']);
    const urls = [...new Set([
      './assets/portraits/calogero.webp', './assets/portraits/alfio.webp',
      ...[...backgrounds].filter(Boolean).map(name => `./assets/backgrounds/${name}.webp`),
      ...people.map(person => `./assets/thumbs/${person.id}.webp`),
      ...people.flatMap(person => (person.npc ? ['default'] : expressions.map(e => e[0])).map(key => image(person, key)))
    ])];
    let next = 0, completed = 0, failed = 0;
    const progress = $('#loader-progress');
    progress.max = urls.length;
    document.body.dataset.imageTotal = urls.length;
    const slowNotice = setTimeout(() => {
      $('#loader-message').textContent = '연결이 느리면 먼저 들어가셔도 됩니다. 이미지는 계속 준비됩니다.';
    }, 8000);
    async function worker() {
      while (next < urls.length) {
        const ok = await preloadImage(urls[next++]);
        completed++;
        if (!ok) failed++;
        progress.value = completed;
        $('#loader-count').textContent = `${Math.floor(completed / urls.length * 100)}% · ${completed} / ${urls.length}`;
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    clearTimeout(slowNotice);
    document.body.dataset.imageFailures = failed;
    document.body.dataset.preloadComplete = 'true';
    dismissLoader();
  }

  function keyboardTabs(container) {
    container.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const tabs = $$('[role="tab"]', container);
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      let index = current;
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else index = (current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      tabs[index].click();
      tabs[index].focus({ preventScroll: true });
      tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }
  function selectTab(container, selected) {
    $$('[role="tab"]', container).forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }

  const factionTabs = $('#faction-tabs');
  factionTabs.innerHTML = factions.map((faction, index) => `<button role="tab" id="faction-${faction.id}" aria-controls="faction-panel" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-faction="${faction.id}">${escape(faction.name)}</button>`).join('');
  function showFaction(id) {
    const faction = factions.find(item => item.id === id);
    if (!faction) return;
    const panel = $('#faction-panel');
    const members = people.filter(person => person.group === id);
    selectTab(factionTabs, $(`[data-faction="${id}"]`));
    panel.setAttribute('aria-labelledby', `faction-${id}`);
    panel.style.setProperty('--accent', faction.color);
    panel.innerHTML = `<div class="faction-overview"><article class="faction-brief"><img src="./assets/backgrounds/${faction.background}.webp" alt="" width="1024" height="1024"><span class="faction-index" aria-hidden="true">${String(factions.indexOf(faction) + 1).padStart(2, '0')}</span><div class="eyebrow">${escape(faction.english)}</div><h3>${escape(faction.description)}</h3><p>${escape(faction.body)}</p><div class="faction-meta"><span>${escape(faction.tag)}</span><span>${escape(faction.business)}</span></div><small>${escape(faction.note)}</small></article><div class="person-grid">${members.map(person => `<button class="person-card" data-person="${person.id}" aria-label="${escape(person.name)} 상세 기록 보기"><div class="person-picture"><img src="./assets/thumbs/${person.id}.webp" alt="${escape(person.name)}" width="480" height="480" loading="eager"><span class="person-kind">${person.npc ? 'CITIZEN FILE' : 'PERSONNEL FILE'}</span></div><h4>${escape(person.name)}</h4><p class="person-role">${escape(person.role)}</p><p class="person-traits">${escape(person.npc ? '도시의 주민과 조직원' : person.bio)}</p></button>`).join('')}</div></div>`;
  }
  factionTabs.addEventListener('click', event => {
    const tab = event.target.closest('[data-faction]');
    if (tab) showFaction(tab.dataset.faction);
  });
  keyboardTabs(factionTabs);
  showFaction('family');

  const dialog = $('#character-dialog');
  const expressionTabs = $('#expression-tabs');
  let currentPerson = null;
  let returnFocus = null;
  let expressionRequest = 0;
  let requestedExpression = 'default';
  async function setExpression(key) {
    if (!currentPerson) return;
    const request = ++expressionRequest;
    requestedExpression = key;
    const person = currentPerson;
    const expression = expressions.find(item => item[0] === key);
    const characterImage = $('#character-image');
    const panel = $('#expression-panel');
    const status = $('#image-status');
    panel.setAttribute('aria-busy', 'true');
    status.textContent = '이미지를 준비하고 있습니다.';
    status.hidden = false;
    $('#image-retry').hidden = true;
    const src = image(person, key);
    let ok = await preloadImage(src);
    if (ok) {
      const ready = new Image();
      ready.src = src;
      try { await ready.decode(); } catch { ok = false; imageRequests.delete(src); }
    }
    if (request !== expressionRequest) return;
    panel.setAttribute('aria-busy', 'false');
    if (!ok) {
      status.textContent = '이미지를 불러오지 못했습니다. 다시 시도해 주세요.';
      $('#image-retry').hidden = false;
      return;
    }
    characterImage.src = src;
    characterImage.alt = `${person.name} · ${expression[1]}`;
    characterImage.style.visibility = '';
    status.hidden = true;
    const tab = $(`[data-expression="${key}"]`, expressionTabs);
    if (tab) {
      selectTab(expressionTabs, tab);
      $('#expression-panel').setAttribute('aria-labelledby', tab.id);
    }
  }
  function openPerson(id, trigger) {
    const person = people.find(item => item.id === id);
    if (!person) return;
    $('#character-image').style.visibility = 'hidden';
    currentPerson = person;
    returnFocus = trigger;
    const faction = factions.find(item => item.id === person.group);
    $('#character-title').textContent = person.title;
    $('#character-group').textContent = `${faction.name} / ${person.npc ? 'CITY RESIDENT' : 'PERSONNEL RECORD'}`;
    $('#character-role').textContent = person.role;
    const facts = person.npc ? [['소개', person.bio]] : [['품종', person.breed], ['외형', person.appearance], ['소개', person.bio]];
    $('#character-facts').innerHTML = facts.map(([label, text]) => `<div><dt>${label}</dt><dd>${escape(text)}</dd></div>`).join('');
    if (person.npc) {
      expressionTabs.innerHTML = '<p class="npc-expression-note">기본 이미지 · 도시 주민 기록</p>';
      expressionTabs.removeAttribute('role');
      $('#expression-panel').removeAttribute('aria-labelledby');
      $('#expression-panel').setAttribute('aria-label', `${person.name} 기본 이미지`);
      $('#expression-panel').setAttribute('role', 'group');
    } else {
      expressionTabs.setAttribute('role', 'tablist');
      $('#expression-panel').removeAttribute('aria-label');
      $('#expression-panel').setAttribute('role', 'tabpanel');
      expressionTabs.innerHTML = expressions.map(([key, label]) => `<button id="expression-${key}" role="tab" aria-controls="expression-panel" aria-selected="${key === 'default'}" tabindex="${key === 'default' ? 0 : -1}" data-expression="${key}">${label}</button>`).join('');
    }
    setExpression('default');
    dialog.showModal();
    dialog.scrollTop = 0;
    $('.dialog-close').focus({ preventScroll: true });
  }
  $('#faction-panel').addEventListener('click', event => {
    const card = event.target.closest('[data-person]');
    if (card) openPerson(card.dataset.person, card);
  });
  expressionTabs.addEventListener('click', event => {
    const tab = event.target.closest('[data-expression]');
    if (tab) setExpression(tab.dataset.expression);
  });
  keyboardTabs(expressionTabs);
  $('#image-retry').addEventListener('click', () => setExpression(requestedExpression));
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); });

  const districts = {
    residential: { name: '주택가', english: 'RESIDENTIAL BLOCK', background: 'house', text: '거주 인구가 많아 귀여움 팔기에 좋은 구역. 인간의 식탁과 급식은 고양이 사회의 경제에도 영향을 미친다. 집 안의 풍요와 집 밖의 생존은 서로 다르다.', business: '주요 기회 / 귀여움 팔기' },
    harbor: { name: '항구', english: 'THE HARBOR', background: 'harbor', text: '인간의 컨테이너선에 숨어 사는 바다 고양이와 접선하는 곳. 타 도시의 액상간식과 물건이 이곳을 거쳐 바스턴으로 흘러든다.', business: '주요 기회 / 액상간식 밀수 · 바다 고양이와의 거래' },
    commercial: { name: '상업가', english: 'COMMERCIAL BLOCK', background: 'server', text: '소음과 사람들로 복잡한 구역. 인간의 가게와 물건 이동은 동물들에게도 기회를 만든다. 혼잡함을 이용하는 절도와 강도 사업이 벌어진다.', business: '주요 기회 / 절도 · 강도' },
    park: { background: 'park', name: '공원', english: 'THE HUNTING GROUNDS', text: '쥐와 새 같은 사냥감이 많아 착실하게 사냥하기 좋은 곳. 그러나 사냥감의 수는 계절을 따른다. 겨울이 오면 한 끼를 구하는 일부터 어려워진다.', business: '주요 기회 / 사냥 · 계절에 따른 식량 확보' },
    police: { name: '경찰서', english: 'POLICE HEADQUARTERS', background: 'police', text: '경찰견들의 본진. 체포된 범죄자 고양이는 우리에 갇힌다. 원칙을 지키는 경관, 증거를 좇는 형사, 거래를 택하는 서장의 이해관계가 이곳에서 교차한다.', business: '핵심 기능 / 법 집행 · 수사 · 구금' }
  };
  function showDistrict(id) {
    const district = districts[id];
    const panel = $('#district-detail');
    selectTab($('.district-selector'), $(`[data-district="${id}"]`));
    panel.setAttribute('aria-labelledby', `district-${id}`);
    panel.innerHTML = `${district.background ? `<img src="./assets/backgrounds/${district.background}.webp" alt="${escape(district.name)}의 분위기를 보여주는 배경" width="1024" height="1024" loading="eager">` : '<div class="park-graphic" aria-hidden="true"><span>♧</span></div>'}<div class="district-content"><span class="eyebrow">${district.english}</span><h3>${district.name}</h3><p>${district.text}</p><span class="district-business">${district.business}</span></div>`;
  }
  $('.district-selector').addEventListener('click', event => {
    const tab = event.target.closest('[data-district]');
    if (tab) showDistrict(tab.dataset.district);
  });
  keyboardTabs($('.district-selector'));
  showDistrict('residential');

  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', '메뉴 열기'); }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    mobileNav.hidden = !open;
  });
  $$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
  window.matchMedia('(min-width: 601px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  const sectionIds = ['home', 'world', 'factions', 'districts', 'business'];
  function openSection(id, focus = false) {
    if (!sectionIds.includes(id)) id = 'home';
    sectionIds.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      section.hidden = sectionId !== id;
      if (sectionId === id) {
        section.scrollTop = 0;
        section.tabIndex = -1;
        if (focus) section.focus({ preventScroll: true });
      }
    });
    $$('.site-header nav a, #mobile-nav a').forEach(link => {
      const active = link.hash === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    closeMenu();
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !sectionIds.includes(link.hash.slice(1))) return;
    event.preventDefault();
    const id = link.hash.slice(1);
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    openSection(id, true);
  });
  window.addEventListener('popstate', () => openSection(location.hash.slice(1), true));
  window.addEventListener('hashchange', () => openSection(location.hash.slice(1)));
  openSection(location.hash.slice(1));
  preloadSite().catch(dismissLoader);
})();
