
/* ============================================================
   Lawyer Assistant v4 — умный поиск по законам РФ
   Чистый JS, без зависимостей. Работает офлайн.
   ============================================================ */
(function () {
  'use strict';

  var LIB = window.LAW_LIBRARY || { documents: [], scenarios: [] };

  /* ---------- нормализация и словарь синонимов ---------- */
  var STOP = ('а и в на с по для из к от до о у за над под при не что как это который '
    + 'если ли бы мне мой моя мое мои меня я ты он она мы вы они есть был была быть '
    + 'или же да нет там тут все уже еще очень можно нужно надо какой какая какие '
    + 'чем же бы то же вот так его ее их них ему ей им').split(' ');

  function norm(s) {
    return (s || '').toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var SYN = {
    'развестись': ['расторжение', 'брак'], 'развод': ['расторжение', 'брак'],
    'разводе': ['расторжение', 'брак'], 'разведемся': ['расторжение', 'брак'],
    'жениться': ['брак', 'заключение'], 'свадьба': ['брак', 'заключение'],
    'выселить': ['выселение'], 'выселении': ['выселение'], 'выгнать': ['выселение'],
    'выпнуть': ['выселение'], 'выселение': ['выселение'],
    'девушка': ['сожитель'], 'парень': ['сожитель'], 'бывшая': ['супруг', 'расторгнутый'],
    'бывший': ['супруг', 'расторгнутый'], 'сожитель': ['сожитель'], 'сожительница': ['сожитель'],
    'квартира': ['жилое', 'помещение'], 'квартиры': ['жилое', 'помещение'],
    'дом': ['жилое', 'помещение'], 'комната': ['жилое', 'помещение'],
    'сво': ['св', 'военнослужащий'], 'свао': ['св', 'военнослужащий'],
    'спецоперация': ['св', 'военнослужащий'], 'война': ['св', 'военнослужащий'],
    'армия': ['военнослужащий'], 'призван': ['военнослужащий', 'св'],
    'мобилизован': ['военнослужащий', 'св'], 'контрактник': ['военнослужащий'],
    'алименты': ['содержание', 'ребенок'], 'алиментов': ['содержание', 'ребенок'],
    'зп': ['заработная', 'плата'], 'зарплата': ['заработная', 'плата'],
    'зарплату': ['заработная', 'плата'], 'уволить': ['расторжение', 'договор'],
    'увольнение': ['расторжение', 'договор', 'трудовой'], 'уволили': ['расторжение', 'договор'],
    'сократить': ['расторжение', 'договор'], 'сокращение': ['расторжение', 'договор'],
    'отпуск': ['ежегодный', 'оплачиваемый'], 'отпуска': ['ежегодный', 'оплачиваемый'],
    'больничный': ['временная', 'нетрудоспособность'],
    'товар': ['товар'], 'вещь': ['товар'], 'телефон': ['товар', 'технически', 'сложный'],
    'вернуть': ['возврат'], 'возврат': ['возврат', 'отказ'],
    'неустойка': ['неустойка', 'пени'], 'пеня': ['неустойка', 'пени'],
    'долг': ['заем', 'займ'], 'расписка': ['заем', 'займ'], 'занял': ['заем', 'займ'],
    'одолжил': ['заем', 'займ'], 'вернуться': ['возврат'],
    'наследство': ['наследование'], 'умер': ['наследование', 'умерший'],
    'умерла': ['наследование', 'умерший'], 'помер': ['наследование', 'умерший'],
    'дарить': ['дарение', 'дар'], 'подарить': ['дарение', 'дар'],
    'подарил': ['дарение', 'дар'], 'подарила': ['дарение', 'дар'],
    'купить': ['купля', 'продажа'], 'продал': ['купля', 'продажа'],
    'продажа': ['купля', 'продажа'], 'сделка': ['договор'],
    'прописка': ['регистрация', 'место', 'жительства'],
    'прописан': ['регистрация', 'место', 'жительства'],
    'выписка': ['регистрация', 'снятие'], 'выписать': ['регистрация', 'снятие'],
    'регистрация': ['регистрация'],
    'нежилое': ['помещение'], 'аренда': ['аренда', 'наем'],
    'съемная': ['наем', 'жилое'], 'снял': ['наем', 'жилое'],
    'собственник': ['собственность', 'право'], 'собственность': ['собственность', 'право'],
    'мошенники': ['мошенничество', 'преступление'], 'мошенник': ['мошенничество', 'преступление'],
    'обманули': ['злоупотребление', 'обман'], 'обман': ['обман'],
    'моральный': ['моральный', 'вред'], 'компенсация': ['компенсация', 'вред'],
    'штраф': ['штраф'], 'гибдд': ['административная', 'ответственность'],
    'штрафы': ['штраф'], 'дтп': ['возмещение', 'вред'],
    'ребенок': ['ребенок', 'несовершеннолетний'], 'дети': ['ребенок', 'несовершеннолетний'],
    'сын': ['ребенок'], 'дочь': ['ребенок'],
    'опека': ['опека', 'попечительство'], 'усыновление': ['усыновление'],
    'роды': ['беременность', 'роды'], 'беременна': ['беременность'],
    'насилие': ['насилие', 'побои'], 'побои': ['насилие', 'побои'],
    'обидел': ['насилие', 'побои'],
    'кадастр': ['кадастр', 'недвижимость'], 'собственности': ['собственность'],
    'оспорить': ['оспаривание', 'сделка'], 'оспаривание': ['оспаривание', 'сделка'],
    'сделку': ['сделка', 'договор'], 'договор': ['договор']
  };

  function expandTokens(tokens) {
    var out = [];
    tokens.forEach(function (t) {
      out.push(t);
      if (SYN[t]) SYN[t].forEach(function (s) { out.push(norm(s)); });
    });
    return out;
  }

  /* ---------- расстояние Левенштейна (с ограничением) ---------- */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i], rowMin = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        cur[j] = v; if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  function fuzzyMatch(q, dict) {
    // dict: объект {token: true} из токенов статьи
    var best = 0;
    for (var t in dict) {
      if (!dict.hasOwnProperty(t)) continue;
      var d;
      if (q === t) return 3;
      if (t.length >= 4 && t.indexOf(q) === 0) { best = Math.max(best, 2); continue; }
      if (q.length < 4) continue;
      var maxd = q.length >= 7 ? 2 : 1;
      d = lev(q, t, maxd);
      if (d === 0) return 3;
      if (d === 1) best = Math.max(best, 1.5);
      else if (d === 2) best = Math.max(best, 0.8);
    }
    return best;
  }

  /* ---------- индекс статей ---------- */
  var INDEX = [];
  LIB.documents.forEach(function (doc) {
    (doc.articles || []).forEach(function (a) {
      var blob = norm([doc.name, a.name || '', a.title || '', a.gist || '', a.text || ''].join(' '));
      var tokens = {};
      blob.split(' ').forEach(function (t) { if (t && STOP.indexOf(t) < 0) tokens[t] = true; });
      INDEX.push({ doc: doc, art: a, tokens: tokens, blob: blob });
    });
  });

  /* ---------- поиск статей ---------- */
  function searchArticles(query, limit) {
    var qTokens = expandTokens(norm(query).split(' ').filter(function (t) {
      return t && STOP.indexOf(t) < 0;
    }));
    var results = [];
    var qNorm = norm(query);
    INDEX.forEach(function (item) {
      var score = 0, matched = 0;
      if (qNorm.length > 8 && item.blob.indexOf(qNorm) !== -1) score += 6;
      qTokens.forEach(function (qt) {
        var s = fuzzyMatch(qt, item.tokens);
        if (s > 0) { score += s; matched++; }
      });
      if (score > 2 && matched >= Math.min(2, qTokens.length)) {
        results.push({ item: item, score: score });
      }
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, limit || 10);
  }

  /* ---------- сценарии ("лёгкий ИИ") ---------- */
  function matchScenarios(query) {
    var q = ' ' + norm(query) + ' ';
    var scored = [];
    LIB.scenarios.forEach(function (sc) {
      var score = 0;
      sc.keys.forEach(function (k) {
        var kk = norm(k);
        if (kk.indexOf(' ') >= 0) {
          if (q.indexOf(' ' + kk + ' ') >= 0 || q.indexOf(kk) >= 0) score += kk.split(' ').length * 3;
        } else if (q.indexOf(kk) >= 0) {
          score += 3;
        } else if (kk.length >= 5 && lev(kk, closestToken(kk, q), 2) <= 2) {
          score += 1;
        }
      });
      if (score > 0) scored.push({ sc: sc, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored;
  }

  function closestToken(word, q) {
    var toks = q.split(' '), best = '', bd = 99;
    toks.forEach(function (t) {
      if (!t || t.length < 3) return;
      var d = lev(word, t, 3);
      if (d < bd) { bd = d; best = t; }
    });
    return best || word;
  }

  /* ---------- рендеринг ---------- */
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderScenario(sc) {
    return '<div class="scenario card">' +
      '<div class="sc-badge">Готовый разбор ситуации</div>' +
      '<h2>' + esc(sc.title) + '</h2>' +
      '<div class="sc-body">' + sc.answer + '</div>' +
      (sc.links && sc.links.length ?
        '<div class="sc-norms">Нормы: ' + sc.links.map(function (l) {
          return '<a href="' + l.url + '" target="_blank" rel="noopener">' + esc(l.label) + '</a>';
        }).join(' · ') + '</div>' : '') +
      '<div class="sc-disc">Информация носит справочный характер и не заменяет консультацию юриста.</div>' +
      '</div>';
  }

  function renderArticle(r) {
    var a = r.item.art, doc = r.item.doc;
    return '<div class="card art">' +
      '<div class="art-head"><span class="art-doc">' + esc(doc.short || doc.name) + '</span>' +
      '<span class="art-num">ст. ' + esc(String(a.n)) + '</span>' +
      (a.name ? '<span class="art-name">' + esc(a.name) + '</span>' : '') + '</div>' +
      (a.gist ? '<div class="art-gist">' + esc(a.gist) + '</div>' : '') +
      (a.text ? '<details><summary>Полный текст нормы</summary><div class="art-text">' + esc(a.text) + '</div></details>' : '') +
      (doc.source ? '<div class="art-src"><a href="' + doc.source + '" target="_blank" rel="noopener">Актуальный текст на pravo.gov.ru ↗</a></div>' : '') +
      '</div>';
  }

  function renderDocList() {
    var el = $('docs');
    el.innerHTML = LIB.documents.map(function (d) {
      return '<div class="doc-item card">' +
        '<div class="doc-name">' + esc(d.name) + '</div>' +
        '<div class="doc-meta">' + (d.articles || []).length + ' статей в базе · ' +
        '<a href="' + d.source + '" target="_blank" rel="noopener">официальный текст ↗</a></div>' +
        '</div>';
    }).join('');
  }

  function ask(query) {
    query = (query || '').trim();
    if (!query) return;
    $('q').value = query;
    var out = $('results');
    out.innerHTML = '<div class="hint">Ищу по базе…</div>';
    var html = '';
    var sc = matchScenarios(query);
    if (sc.length && sc[0].score >= 6) html += renderScenario(sc[0].sc);
    var arts = searchArticles(query, 12);
    if (arts.length) {
      html += '<div class="res-title">Найденные нормы</div>' + arts.map(renderArticle).join('');
    } else if (!sc.length || sc[0].score < 6) {
      html += '<div class="card empty">Ничего не нашёл. Попробуйте перефразировать: ' +
        'например, «расторжение брака», «выселение из квартиры», «возврат товара», «алименты».</div>';
    }
    out.innerHTML = html;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- голосовой ввод ---------- */
  var rec = null, listening = false;
  function setupVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var btn = $('mic');
    if (!SR) { btn.style.display = 'none'; return; }
    rec = new SR();
    rec.lang = 'ru-RU'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var t = e.results[0][0].transcript;
      ask(t);
    };
    rec.onend = function () { listening = false; btn.classList.remove('on'); };
    rec.onerror = function () { listening = false; btn.classList.remove('on'); };
    btn.onclick = function () {
      if (listening) { rec.stop(); return; }
      try { rec.start(); listening = true; btn.classList.add('on'); } catch (e) {}
    };
  }

  /* ---------- подсказки ---------- */
  var HINTS = [
    'как развестись если я на СВО?',
    'как выселить девушку из своей квартиры?',
    'возврат телефона ненадлежащего качества',
    'не выплачивают зарплату при увольнении',
    'как взыскать алименты?',
    'купил машину а её угнали по договору — оспорить сделку'
  ];

  function init() {
    $('meta').textContent = 'База обновлена: ' + (LIB.updated || '—') + ' · документов: ' + LIB.documents.length;
    renderDocList();
    var hs = $('hints');
    hs.innerHTML = HINTS.map(function (h) {
      return '<button class="hint-btn" type="button">' + esc(h) + '</button>';
    }).join('');
    hs.addEventListener('click', function (e) {
      if (e.target.classList.contains('hint-btn')) ask(e.target.textContent);
    });
    $('ask').addEventListener('submit', function (e) {
      e.preventDefault(); ask($('q').value);
    });
    setupVoice();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
