/* jk.Create: фильтры, поиск, избранное, вкладки, окно заявки. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	/* ---------- Избранное (хранится в браузере) ---------- */
	var FAV_KEY = 'jkFavorites';
	function readFavs() {
		try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; }
	}
	function writeFavs(list) {
		try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) { /* приватный режим */ }
	}
	var favs = readFavs().map(String);

	function toast(text) {
		var el = $('[data-jk-toast]');
		if (!el) return;
		el.textContent = text;
		el.hidden = false;
		clearTimeout(toast.t);
		toast.t = setTimeout(function () { el.hidden = true; }, 1800);
	}

	function paintFavs() {
		$$('[data-fav]').forEach(function (btn) {
			var on = favs.indexOf(btn.getAttribute('data-fav')) !== -1;
			btn.setAttribute('aria-pressed', on ? 'true' : 'false');
			var label = $('[data-fav-label]', btn);
			if (label) label.textContent = on ? 'В избранном' : 'Сохранить';
		});
		$$('[data-fav-count]').forEach(function (el) {
			el.textContent = favs.length;
			el.hidden = favs.length === 0;
		});
		$$('[data-fav-count-inline]').forEach(function (el) { el.textContent = favs.length; });
		var favGrid = $('[data-favorites-only]');
		if (favGrid) applyFilters();
	}

	document.addEventListener('click', function (e) {
		var btn = e.target.closest('[data-fav]');
		if (!btn) return;
		e.preventDefault();
		var id = btn.getAttribute('data-fav');
		var i = favs.indexOf(id);
		if (i === -1) { favs.push(id); toast('Добавлено в избранное'); }
		else { favs.splice(i, 1); toast('Убрано из избранного'); }
		writeFavs(favs);
		paintFavs();
	});

	/* ---------- Фильтры, поиск и сортировка ---------- */
	var grid = $('[data-jk-grid]');
	var state = { cat: '', level: '', q: '', sort: 'order' };
	var activeChip = $('.jk-chip.is-active');
	if (activeChip) state.cat = activeChip.getAttribute('data-cat') || '';

	function matchLevel(level) {
		if (!state.level) return true;
		if (state.level === '1-2') return level >= 1 && level <= 2;
		return String(level) === state.level;
	}

	function applyFilters() {
		if (!grid) return;
		var cards = $$('.jk-card', grid);
		var favOnly = grid.hasAttribute('data-favorites-only');
		var q = state.q.trim().toLowerCase();
		var shown = 0;
		cards.forEach(function (card) {
			var ok = true;
			if (favOnly && favs.indexOf(card.getAttribute('data-id')) === -1) ok = false;
			if (ok && state.cat && (' ' + card.getAttribute('data-cats') + ' ').indexOf(' ' + state.cat + ' ') === -1) ok = false;
			if (ok && !matchLevel(Number(card.getAttribute('data-level')))) ok = false;
			if (ok && q && card.getAttribute('data-search').indexOf(q) === -1) ok = false;
			card.hidden = !ok;
			if (ok) shown++;
		});
		var empty = $('[data-jk-empty]');
		if (empty) empty.hidden = shown !== 0;
	}

	function applySort() {
		if (!grid) return;
		var num = function (card, key) { return Number(card.getAttribute('data-' + key)) || 0; };
		var cmp = {
			order: function (a, b) { return num(a, 'order') - num(b, 'order'); },
			'new': function (a, b) { return num(b, 'date') - num(a, 'date'); },
			cheap: function (a, b) { return num(a, 'price') - num(b, 'price'); },
			expensive: function (a, b) { return num(b, 'price') - num(a, 'price'); }
		}[state.sort];
		$$('.jk-card', grid).sort(cmp).forEach(function (card) { grid.appendChild(card); });
	}

	$$('.jk-chip').forEach(function (chip) {
		chip.addEventListener('click', function () {
			$$('.jk-chip').forEach(function (c) { c.classList.remove('is-active'); });
			chip.classList.add('is-active');
			state.cat = chip.getAttribute('data-cat') || '';
			applyFilters();
		});
	});
	var levelSel = $('[data-level-filter]');
	if (levelSel) levelSel.addEventListener('change', function () { state.level = levelSel.value; applyFilters(); });
	var sortSel = $('[data-sort]');
	if (sortSel) sortSel.addEventListener('change', function () { state.sort = sortSel.value; applySort(); });

	// Поиск: на странице с сеткой фильтрует сразу, Enter ведёт на поиск WordPress.
	$$('[data-jk-search]').forEach(function (input) {
		input.addEventListener('input', function () {
			if (!grid) return;
			state.q = input.value;
			$$('[data-jk-search]').forEach(function (other) { if (other !== input) other.value = input.value; });
			showPane('sets');
			applyFilters();
		});
	});
	document.addEventListener('keydown', function (e) {
		if (e.key !== '/' || /input|textarea|select/i.test(document.activeElement.tagName)) return;
		var field = $('[data-jk-search]');
		if (field) { e.preventDefault(); field.focus(); }
	});

	/* ---------- Вкладки «Наборы / Коллекции» ---------- */
	function showPane(name) {
		var panes = $$('[data-pane]');
		if (!panes.length) return;
		panes.forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
		$$('[data-tab]').forEach(function (t) {
			var on = t.getAttribute('data-tab') === name;
			t.classList.toggle('is-active', on);
			t.setAttribute('aria-selected', on ? 'true' : 'false');
		});
	}
	$$('[data-tab]').forEach(function (tab) {
		tab.addEventListener('click', function () { showPane(tab.getAttribute('data-tab')); });
	});
	if (location.hash === '#collections') showPane('collections');
	window.addEventListener('hashchange', function () { if (location.hash === '#collections') showPane('collections'); });

	// Вкладки на странице набора подсвечивают раздел при прокрутке.
	var anchorTabs = $$('.jk-tabs--left .jk-tab');
	if (anchorTabs.length && 'IntersectionObserver' in window) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (!en.isIntersecting) return;
				anchorTabs.forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('href') === '#' + en.target.id); });
			});
		}, { rootMargin: '-40% 0px -55% 0px' });
		anchorTabs.forEach(function (t) {
			var target = $(t.getAttribute('href'));
			if (target) io.observe(target);
		});
	}

	/* ---------- Просмотр фото ---------- */
	var lightbox = $('[data-jk-lightbox]');
	if (lightbox) {
		$$('.jk-shot[data-full]').forEach(function (shot) {
			shot.addEventListener('click', function () {
				$('img', lightbox).src = shot.getAttribute('data-full');
				lightbox.hidden = false;
			});
		});
		lightbox.addEventListener('click', function (e) {
			if (e.target === lightbox || e.target.closest('[data-lightbox-close]')) lightbox.hidden = true;
		});
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lightbox.hidden = true; });
	}

	/* ---------- Окно заявки ---------- */
	var modal = $('[data-jk-modal]');
	var setSel = $('[data-order-set]');
	var schemeSel = $('[data-order-scheme]');
	var schemeField = $('[data-scheme-field]');

	function fillSchemes(preferred) {
		if (!setSel || !schemeSel) return;
		var opt = setSel.options[setSel.selectedIndex];
		var list = [];
		try { list = JSON.parse(opt.getAttribute('data-schemes') || '[]'); } catch (e) { list = []; }
		schemeSel.innerHTML = '';
		list.forEach(function (name) {
			var o = document.createElement('option');
			o.value = o.textContent = name;
			if (name === preferred) o.selected = true;
			schemeSel.appendChild(o);
		});
		var other = document.createElement('option');
		other.value = other.textContent = 'Свои цвета, напишу в комментарии';
		schemeSel.appendChild(other);
		if (schemeField) schemeField.hidden = setSel.value === '0';
	}
	if (setSel) setSel.addEventListener('change', function () { fillSchemes(); });

	function openModal(trigger) {
		if (!modal) return;
		if (setSel && trigger) {
			if (trigger.hasAttribute('data-order-idea')) setSel.value = '0';
			var setId = trigger.getAttribute('data-order-set-id');
			if (setId) setSel.value = setId;
		}
		fillSchemes(trigger ? trigger.getAttribute('data-order-scheme-name') : '');
		if (typeof modal.showModal === 'function') modal.showModal();
		else modal.setAttribute('open', '');
		var first = $('input[name="name"]', modal);
		if (first) first.focus();
	}
	function closeModal() {
		if (!modal) return;
		if (typeof modal.close === 'function') modal.close();
		else modal.removeAttribute('open');
		if (/[?&]ordered=/.test(location.search)) {
			history.replaceState(null, '', location.pathname + location.search.replace(/([?&])ordered=[^&]*&?/, '$1').replace(/[?&]$/, ''));
		}
	}
	document.addEventListener('click', function (e) {
		var opener = e.target.closest('[data-order-open]');
		if (opener) { e.preventDefault(); openModal(opener); return; }
		if (e.target.closest('[data-modal-close]')) closeModal();
	});
	if (modal) {
		modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
		if (modal.hasAttribute('data-open-on-load')) openModal(null);
	}
	if (location.hash === '#order' && modal && !modal.open) openModal(null);
	// Статическая копия сайта (без PHP): заявка копируется и уходит в Telegram.
	var staticForm = $('.jk-form[data-jk-static]');
	if (staticForm) {
		staticForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var f = staticForm.elements;
			var setText = f.set_id.options[f.set_id.selectedIndex].textContent.trim();
			var text = [
				'Заявка с сайта jk.Create',
				'Имя: ' + f.name.value,
				'Контакт: ' + f.contact.value,
				'Набор: ' + setText,
				'Цвета: ' + (f.set_id.value === '0' ? '—' : f.scheme.value),
				'Город: ' + (f.city.value || '—'),
				'Комментарий: ' + (f.comment.value || '—')
			].join('\n');
			var tg = staticForm.getAttribute('data-tg');
			var box = staticForm.parentNode;
			var done = function (copied) {
				box.innerHTML = '';
				var wrap = document.createElement('div');
				wrap.className = 'jk-modal__done';
				wrap.innerHTML = '<div class="jk-modal__icon" aria-hidden="true">✓</div><h2>Заявка готова</h2><p></p><pre class="jk-pre"></pre><a class="jk-btn jk-btn--dark" target="_blank" rel="noopener"></a>';
				wrap.querySelector('p').textContent = copied ? 'Текст скопирован. Откройте Telegram и вставьте его в чат с нами, мы ответим в течение дня.' : 'Скопируйте текст и отправьте его нам в Telegram, мы ответим в течение дня.';
				wrap.querySelector('pre').textContent = text;
				var a = wrap.querySelector('a');
				a.href = 'https://t.me/' + tg;
				a.textContent = 'Открыть Telegram';
				box.appendChild(wrap);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
			} else {
				done(false);
			}
		});
	}


	// В статической копии поиск WordPress недоступен: фильтруем каталог на главной.
	if (staticForm) {
		$$('form[role="search"]').forEach(function (form) {
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				var q = $('[data-jk-search]', form).value;
				if (!grid || grid.hasAttribute('data-favorites-only')) location.href = jkStaticHome() + '?q=' + encodeURIComponent(q);
			});
		});
		var initial = new URLSearchParams(location.search).get('q');
		if (initial && grid) {
			state.q = initial;
			$$('[data-jk-search]').forEach(function (input) { input.value = initial; });
		}
	}
	function jkStaticHome() {
		var logo = $('.jk-header .jk-logo');
		return logo ? logo.getAttribute('href') : '/';
	}

	paintFavs();
	applyFilters();
})();
