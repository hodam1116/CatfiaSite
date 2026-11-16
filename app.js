(() => {
  'use strict';
  const { people, factions, expressions } = window.CATFIA_DATA;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const image = (person, expression = 'default') => `./assets/characters/${person.id}-${expression}.webp`;

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
    panel.innerHTML = `<div class="faction-overview"><article class="faction-brief"><img src="./assets/backgrounds/${faction.background}.webp" alt="" width="1024" height="1024"><span class="faction-index" aria-hidden="true">${String(factions.indexOf(faction) + 1).padStart(2, '0')}</span><div class="eyebrow">${escape(faction.english)}</div><h3>${escape(faction.description)}</h3><p>${escape(faction.body)}</p><div class="faction-meta"><span>${escape(faction.tag)}</span><span>${escape(faction.business)}</span></div><small>${escape(faction.note)}</small></article><div class="person-grid">${members.map(person => `<button class="person-card" data-person="${person.id}" aria-label="${escape(person.name)} 상세 기록 보기"><div class="person-picture"><img src="./assets/thumbs/${person.id}.webp" alt="${escape(person.name)}" width="480" height="480" loading="lazy"><span class="person-kind">${person.npc ? 'CITIZEN FILE' : 'PERSONNEL FILE'}</span></div><h4>${escape(person.name)}</h4><p class="person-role">${escape(person.role)}</p><p class="person-traits">${escape(person.npc ? '도시의 주민과 조직원' : person.personality)}</p></button>`).join('')}</div></div>`;
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
  function setExpression(key) {
    if (!currentPerson) return;
    const expression = expressions.find(item => item[0] === key);
    const characterImage = $('#character-image');
    characterImage.src = image(currentPerson, key);
    characterImage.alt = `${currentPerson.name} · ${expression[1]}`;
    const tab = $(`[data-expression="${key}"]`, expressionTabs);
    if (tab) {
      selectTab(expressionTabs, tab);
      $('#expression-panel').setAttribute('aria-labelledby', tab.id);
    }
  }
  function openPerson(id, trigger) {
    const person = people.find(item => item.id === id);
    if (!person) return;
    currentPerson = person;
    returnFocus = trigger;
    const faction = factions.find(item => item.id === person.group);
    $('#character-title').textContent = person.title;
    $('#character-group').textContent = `${faction.name} / ${person.npc ? 'CITY RESIDENT' : 'PERSONNEL RECORD'}`;
    $('#character-role').textContent = person.role;
    const facts = person.npc ? [['기록', person.bio], ['행동', '식욕, 공포, 생존과 이익에 따라 스스로 판단한다.']] : [['품종', person.breed], ['외형', person.appearance], ['성향', person.alignment], ['성격', person.personality], ['행동', person.behavior], ['말투', person.speech]];
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
    park: { name: '공원', english: 'THE HUNTING GROUNDS', text: '쥐와 새 같은 사냥감이 많아 착실하게 사냥하기 좋은 곳. 그러나 사냥감의 수는 계절을 따른다. 겨울이 오면 한 끼를 구하는 일부터 어려워진다.', business: '주요 기회 / 사냥 · 계절에 따른 식량 확보' },
    police: { name: '경찰서', english: 'POLICE HEADQUARTERS', background: 'police', text: '경찰견들의 본진. 체포된 범죄자 고양이는 우리에 갇힌다. 원칙을 지키는 경관, 증거를 좇는 형사, 거래를 택하는 서장의 이해관계가 이곳에서 교차한다.', business: '핵심 기능 / 법 집행 · 수사 · 구금' }
  };
  function showDistrict(id) {
    const district = districts[id];
    const panel = $('#district-detail');
    selectTab($('.district-selector'), $(`[data-district="${id}"]`));
    panel.setAttribute('aria-labelledby', `district-${id}`);
    panel.innerHTML = `${district.background ? `<img src="./assets/backgrounds/${district.background}.webp" alt="${escape(district.name)}의 분위기를 보여주는 배경" width="1024" height="1024" loading="lazy">` : '<div class="park-graphic" aria-hidden="true"><span>♧</span></div>'}<div class="district-content"><span class="eyebrow">${district.english}</span><h3>${district.name}</h3><p>${district.text}</p><span class="district-business">${district.business}</span></div>`;
  }
  $('.district-selector').addEventListener('click', event => {
    const tab = event.target.closest('[data-district]');
    if (tab) showDistrict(tab.dataset.district);
  });
  keyboardTabs($('.district-selector'));
  showDistrict('residential');

  const seasons = {
    spring: { title: '먹거리가 돌아오는 계절', text: '사냥감이 풍부한 시기에는 도박장을 찾는 손님도 많아진다. 겨울에 빌린 사료는 날이 풀리면 높은 이자와 함께 돌아와야 한다.', food: '사냥감 풍부', trade: '도박 수요 · 대여금 회수' },
    summer: { title: '풍요에도 몫은 나뉜다', text: '사냥감이 풍부하고 도박을 찾는 손님도 많은 계절. 조직들은 사용자의 행동과 관계없이 자신들의 사업과 세력 확장을 이어간다.', food: '사냥감 풍부', trade: '도박 수요 증가' },
    autumn: { title: '풍요 다음에는 겨울이 온다', text: '가을까지 사냥감은 풍부하고 도박장에도 손님이 많다. 쉽게 썩는 사냥감과 달리, 보관하기 좋은 사료와 액상간식은 높은 가치를 지닌다.', food: '사냥감 풍부', trade: '도박 수요 · 보관 식량의 가치' },
    winter: { title: '굶주림이 거래를 바꾼다', text: '사냥감이 줄어들면 사료를 빌리는 수요가 생긴다. 보호비와 약탈을 견뎌야 하는 길고양이들의 저항은 더 강해진다.', food: '사냥감 부족', trade: '사료 대여 · 보호비 저항' }
  };
  function showSeason(id) {
    const season = seasons[id];
    selectTab($('.season-tabs'), $(`[data-season="${id}"]`));
    const panel = $('#season-detail');
    panel.setAttribute('aria-labelledby', `season-${id}`);
    panel.innerHTML = `<h4>${season.title}</h4><p>${season.text}</p><div class="season-facts"><div><span>식량 사정</span><b>${season.food}</b></div><div><span>사업의 변화</span><b>${season.trade}</b></div></div>`;
  }
  $('.season-tabs').addEventListener('click', event => {
    const tab = event.target.closest('[data-season]');
    if (tab) showSeason(tab.dataset.season);
  });
  keyboardTabs($('.season-tabs'));
  showSeason('spring');

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
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) $$('a', $('.site-header nav')).forEach(link => {
        const active = link.hash === `#${entry.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-20% 0px -55% 0px', threshold: 0 });
    ['world', 'factions', 'districts', 'business', 'rules'].forEach(id => observer.observe($(`#${id}`)));
  }
})();
