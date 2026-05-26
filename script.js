const STORAGE_KEYS = {
  rank: 'myRankCalculatorData',
  score: 'myScoreCalculatorRows',
  legacyScore: 'gpaData',
};

const CATEGORY_OPTIONS = [
  { value: 'major', label: '주전공' },
  { value: 'double', label: '복수전공' },
  { value: 'liberal', label: '교양' },
];

const DEFAULT_SCORE_ROWS = [
  { category: 'major', subject: '', credit: '', grade: '' },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(digits);
}

function erf(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absoluteX = Math.abs(x);
  const t = 1 / (1 + p * absoluteX);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absoluteX * absoluteX));

  return sign * y;
}

function normalCdf(zScore) {
  return 0.5 * (1 + erf(zScore / Math.sqrt(2)));
}

function setResultMessage(element, message, isError = false) {
  if (!element) return;
  element.replaceChildren();

  const wrapper = document.createElement('div');
  wrapper.className = isError ? 'error-text' : '';
  wrapper.textContent = message;
  element.appendChild(wrapper);
}

function setScoreMessage(message = '', isError = false) {
  const messageBox = $('#scoreMessage');
  if (!messageBox) return;

  messageBox.className = isError ? 'score-message error-text' : 'score-message';
  messageBox.textContent = message;
}

function renderRankResult({ score, average, standardDeviation, totalStudents }) {
  const result = $('#rankResult');
  if (!result) return;

  const zScore = (score - average) / standardDeviation;
  const percentile = clamp(normalCdf(zScore), 0, 1);
  const estimatedRank = clamp(Math.ceil(totalStudents * (1 - percentile)), 1, totalStudents);
  const topRatio = (estimatedRank / totalStudents) * 100;

  result.replaceChildren();

  const main = document.createElement('div');
  main.append('전체 ', totalStudents.toLocaleString('ko-KR'), '명 중 ');

  const rank = document.createElement('strong');
  rank.textContent = `${estimatedRank.toLocaleString('ko-KR')}등`;
  main.append(rank, '으로 추정됩니다.');

  const detail = document.createElement('span');
  detail.className = 'result-detail';
  detail.textContent = `상위 약 ${formatNumber(topRatio)}% · 백분위 약 ${formatNumber(percentile * 100)}% · z-score ${formatNumber(zScore, 3)}`;

  result.append(main, detail);
}

function getRankFormData() {
  return {
    score: $('#score')?.value ?? '',
    average: $('#average')?.value ?? '',
    standardDeviation: $('#standardDeviation')?.value ?? '',
    totalStudents: $('#totalStudents')?.value ?? '',
  };
}

function saveRankData() {
  try {
    localStorage.setItem(STORAGE_KEYS.rank, JSON.stringify(getRankFormData()));
  } catch {
    // localStorage가 막힌 환경에서는 저장만 생략합니다.
  }
}

function loadRankData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.rank) || 'null');
    if (!saved) return;

    const score = $('#score');
    const average = $('#average');
    const standardDeviation = $('#standardDeviation');
    const totalStudents = $('#totalStudents');

    if (score) score.value = saved.score ?? '';
    if (average) average.value = saved.average ?? '';
    if (standardDeviation) standardDeviation.value = saved.standardDeviation ?? '';
    if (totalStudents) totalStudents.value = saved.totalStudents ?? '';
  } catch {
    localStorage.removeItem(STORAGE_KEYS.rank);
  }
}

function handleRankSubmit(event) {
  event.preventDefault();

  const result = $('#rankResult');
  const score = toFiniteNumber($('#score')?.value);
  const average = toFiniteNumber($('#average')?.value);
  const standardDeviation = toFiniteNumber($('#standardDeviation')?.value);
  const totalStudents = Number.parseInt($('#totalStudents')?.value, 10);

  if (score === null || average === null || standardDeviation === null || !Number.isInteger(totalStudents)) {
    setResultMessage(result, '모든 값을 숫자로 입력해 주세요.', true);
    return;
  }

  if (standardDeviation <= 0) {
    setResultMessage(result, '표준편차는 0보다 큰 값이어야 합니다.', true);
    return;
  }

  if (totalStudents <= 0) {
    setResultMessage(result, '전체 학생 수는 1명 이상이어야 합니다.', true);
    return;
  }

  renderRankResult({ score, average, standardDeviation, totalStudents });
  saveRankData();
}

function clearRankData() {
  $('#rankForm')?.reset();

  try {
    localStorage.removeItem(STORAGE_KEYS.rank);
  } catch {
    // ignore
  }

  setResultMessage($('#rankResult'), '값을 입력하면 예상 석차가 여기에 표시됩니다.');
}

function createOption(value, label, selectedValue) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  option.selected = value === selectedValue;
  return option;
}

function createInput({ type, className, placeholder, value, min, max, step }) {
  const input = document.createElement('input');
  input.type = type;
  input.className = className;
  input.placeholder = placeholder;
  input.value = value ?? '';

  if (min !== undefined) input.min = min;
  if (max !== undefined) input.max = max;
  if (step !== undefined) input.step = step;

  return input;
}

function normalizeCategory(value) {
  if (value === 'doubleMajor') return 'double';
  if (value === 'general') return 'liberal';
  return ['major', 'double', 'liberal'].includes(value) ? value : 'major';
}

function createScoreRow(rowData = {}) {
  const row = document.createElement('div');
  row.className = 'score-row';

  const selectedCategory = normalizeCategory(rowData.category || rowData.cat || 'major');

  const category = document.createElement('select');
  category.className = 'category';
  CATEGORY_OPTIONS.forEach(({ value, label }) => {
    category.appendChild(createOption(value, label, selectedCategory));
  });

  const subject = createInput({
    type: 'text',
    className: 'subject',
    placeholder: '과목명',
    value: rowData.subject || rowData.sub || '',
  });

  const credit = createInput({
    type: 'number',
    className: 'credit',
    placeholder: '학점',
    value: rowData.credit ?? '',
    min: '0',
    max: '30',
    step: '0.5',
  });

  const grade = createInput({
    type: 'number',
    className: 'grade',
    placeholder: '등급',
    value: rowData.grade ?? '',
    min: '0',
    max: '4.5',
    step: '0.01',
  });

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'icon-button';
  removeButton.setAttribute('aria-label', '과목 삭제');
  removeButton.textContent = '×';
  removeButton.addEventListener('click', () => {
    row.remove();

    if (!$('#scoreRows')?.children.length) {
      addScoreRow({ skipSave: true });
    }

    saveScoreRows();
    calculateGpa({ silent: true });
  });

  [category, subject, credit, grade].forEach((field) => {
    ['input', 'change'].forEach((eventName) => {
      field.addEventListener(eventName, () => {
        saveScoreRows();
        calculateGpa({ silent: true });
      });
    });
  });

  row.append(category, subject, credit, grade, removeButton);
  return row;
}

function getScoreRows() {
  return $$('.score-row').map((row) => ({
    category: $('.category', row)?.value ?? 'major',
    subject: $('.subject', row)?.value.trim() ?? '',
    credit: $('.credit', row)?.value ?? '',
    grade: $('.grade', row)?.value ?? '',
  }));
}

function saveScoreRows() {
  if (!$('#scoreRows')) return;

  try {
    localStorage.setItem(STORAGE_KEYS.score, JSON.stringify(getScoreRows()));
  } catch {
    // localStorage가 막힌 환경에서는 저장만 생략합니다.
  }
}

function parseSavedScoreRows() {
  try {
    const modernRows = JSON.parse(localStorage.getItem(STORAGE_KEYS.score) || 'null');
    if (Array.isArray(modernRows) && modernRows.length > 0) return modernRows;

    const legacyRows = JSON.parse(localStorage.getItem(STORAGE_KEYS.legacyScore) || 'null');
    if (Array.isArray(legacyRows) && legacyRows.length > 0) {
      return legacyRows.map((row) => ({
        category: normalizeCategory(row.category || row.cat || 'major'),
        subject: row.subject || row.sub || '',
        credit: row.credit ?? '',
        grade: row.grade ?? '',
      }));
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEYS.score);
    } catch {
      // ignore
    }
  }

  return DEFAULT_SCORE_ROWS;
}

function renderScoreRows(rows) {
  const container = $('#scoreRows');
  if (!container) return;

  container.replaceChildren();

  const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : DEFAULT_SCORE_ROWS;
  safeRows.forEach((row) => container.appendChild(createScoreRow(row)));
}

function addScoreRow(options = {}) {
  const container = $('#scoreRows');
  if (!container) return;

  const rowData = options && !('skipSave' in options) ? options : {};
  container.appendChild(createScoreRow(rowData));

  if (!options.skipSave) {
    saveScoreRows();
    calculateGpa({ silent: true });
  }
}

function setGpaText(selector, value) {
  const target = $(selector);
  if (target) target.textContent = value;
}

function calculateGpa({ silent = false } = {}) {
  if (!$('#scoreRows')) return;

  const totals = {
    major: { credits: 0, points: 0 },
    double: { credits: 0, points: 0 },
    liberal: { credits: 0, points: 0 },
  };

  let hasInvalidRow = false;
  let validRowCount = 0;

  getScoreRows().forEach(({ category, credit, grade }) => {
    const hasAnyNumericInput = credit !== '' || grade !== '';
    if (!hasAnyNumericInput) return;

    const parsedCredit = toFiniteNumber(credit);
    const parsedGrade = toFiniteNumber(grade);
    const normalizedCategory = normalizeCategory(category);

    if (
      parsedCredit === null ||
      parsedGrade === null ||
      parsedCredit < 0 ||
      parsedGrade < 0 ||
      parsedGrade > 4.5
    ) {
      hasInvalidRow = true;
      return;
    }

    totals[normalizedCategory].credits += parsedCredit;
    totals[normalizedCategory].points += parsedCredit * parsedGrade;
    validRowCount += 1;
  });

  const gpa = (bucket) => (bucket.credits > 0 ? bucket.points / bucket.credits : null);
  const totalCredits = totals.major.credits + totals.double.credits + totals.liberal.credits;
  const totalPoints = totals.major.points + totals.double.points + totals.liberal.points;

  setGpaText('#majorGpa', gpa(totals.major) === null ? '-' : formatNumber(gpa(totals.major)));
  setGpaText('#doubleMajorGpa', gpa(totals.double) === null ? '-' : formatNumber(gpa(totals.double)));
  setGpaText('#liberalGpa', gpa(totals.liberal) === null ? '-' : formatNumber(gpa(totals.liberal)));
  setGpaText('#overallGpa', totalCredits > 0 ? formatNumber(totalPoints / totalCredits) : '-');

  if (hasInvalidRow) {
    setScoreMessage('학점은 0 이상, 등급은 0.0 이상 4.5 이하로 입력해 주세요.', true);
    return;
  }

  if (!silent) {
    setScoreMessage(validRowCount > 0 ? '평균 학점 계산이 완료되었습니다.' : '계산할 과목 정보를 입력해 주세요.');
  } else {
    setScoreMessage('');
  }
}

function clearScoreData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.score);
    localStorage.removeItem(STORAGE_KEYS.legacyScore);
  } catch {
    // ignore
  }

  renderScoreRows(DEFAULT_SCORE_ROWS);
  calculateGpa({ silent: true });
  saveScoreRows();
  setScoreMessage('입력값을 초기화했습니다.');
}

function bindRankEvents() {
  const rankForm = $('#rankForm');
  if (!rankForm) return;

  rankForm.addEventListener('submit', handleRankSubmit);
  $('#clearRankButton')?.addEventListener('click', clearRankData);

  ['#score', '#average', '#standardDeviation', '#totalStudents'].forEach((selector) => {
    $(selector)?.addEventListener('input', saveRankData);
  });
}

function bindScoreEvents() {
  if (!$('#scoreRows')) return;

  $('#addSubjectButton')?.addEventListener('click', () => addScoreRow());
  $('#calculateScoreButton')?.addEventListener('click', () => calculateGpa());
  $('#clearScoreButton')?.addEventListener('click', clearScoreData);
}

function init() {
  loadRankData();

  if ($('#scoreRows')) {
    renderScoreRows(parseSavedScoreRows());
    calculateGpa({ silent: true });
    saveScoreRows();
  }

  bindRankEvents();
  bindScoreEvents();
}

document.addEventListener('DOMContentLoaded', init);
