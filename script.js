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

const $ = (selector) => document.querySelector(selector);

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
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absoluteX * absoluteX);
  return sign * y;
}

function normalCdf(zScore) {
  return 0.5 * (1 + erf(zScore / Math.sqrt(2)));
}

function setResultMessage(element, message, isError = false) {
  element.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.className = isError ? 'error-text' : '';
  wrapper.textContent = message;
  element.appendChild(wrapper);
}

function renderRankResult({ score, average, standardDeviation, totalStudents }) {
  const result = $('#rankResult');
  const zScore = (score - average) / standardDeviation;
  const percentile = clamp(normalCdf(zScore), 0, 1);
  const estimatedRank = clamp(Math.ceil(totalStudents * (1 - percentile)), 1, totalStudents);
  const topRatio = (estimatedRank / totalStudents) * 100;

  result.replaceChildren();

  const main = document.createElement('div');
  main.innerHTML = `전체 ${totalStudents.toLocaleString('ko-KR')}명 중 <strong>${estimatedRank.toLocaleString('ko-KR')}등</strong>으로 추정됩니다.`;

  const detail = document.createElement('span');
  detail.className = 'result-detail';
  detail.textContent = `상위 약 ${formatNumber(topRatio)}% · 백분위 약 ${formatNumber(percentile * 100)}% · z-score ${formatNumber(zScore, 3)}`;

  result.append(main, detail);
}

function getRankFormData() {
  return {
    score: $('#score').value,
    average: $('#average').value,
    standardDeviation: $('#standardDeviation').value,
    totalStudents: $('#totalStudents').value,
  };
}

function saveRankData() {
  localStorage.setItem(STORAGE_KEYS.rank, JSON.stringify(getRankFormData()));
}

function loadRankData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.rank) || 'null');
    if (!saved) return;
    $('#score').value = saved.score ?? '';
    $('#average').value = saved.average ?? '';
    $('#standardDeviation').value = saved.standardDeviation ?? '';
    $('#totalStudents').value = saved.totalStudents ?? '';
  } catch {
    localStorage.removeItem(STORAGE_KEYS.rank);
  }
}

function handleRankSubmit(event) {
  event.preventDefault();
  const result = $('#rankResult');
  const score = toFiniteNumber($('#score').value);
  const average = toFiniteNumber($('#average').value);
  const standardDeviation = toFiniteNumber($('#standardDeviation').value);
  const totalStudents = Number.parseInt($('#totalStudents').value, 10);

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
  $('#rankForm').reset();
  localStorage.removeItem(STORAGE_KEYS.rank);
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

function createScoreRow(rowData = {}) {
  const row = document.createElement('div');
  row.className = 'score-row';

  const category = document.createElement('select');
  category.className = 'category';
  CATEGORY_OPTIONS.forEach(({ value, label }) => {
    category.appendChild(createOption(value, label, rowData.category || rowData.cat || 'major'));
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
    value: rowData.credit || '',
    min: '0',
    max: '30',
    step: '0.5',
  });

  const grade = createInput({
    type: 'number',
    className: 'grade',
    placeholder: '등급',
    value: rowData.grade || '',
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
    if (!$('#scoreRows').children.length) addScoreRow();
    saveScoreRows();
    calculateGpa();
  });

  [category, subject, credit, grade].forEach((field) => {
    field.addEventListener('input', () => {
      saveScoreRows();
      calculateGpa({ silent: true });
    });
  });

  row.append(category, subject, credit, grade, removeButton);
  return row;
}

function getScoreRows() {
  return Array.from(document.querySelectorAll('.score-row')).map((row) => ({
    category: row.querySelector('.category').value,
    subject: row.querySelector('.subject').value.trim(),
    credit: row.querySelector('.credit').value,
    grade: row.querySelector('.grade').value,
  }));
}

function saveScoreRows() {
  localStorage.setItem(STORAGE_KEYS.score, JSON.stringify(getScoreRows()));
}

function parseSavedScoreRows() {
  try {
    const modernRows = JSON.parse(localStorage.getItem(STORAGE_KEYS.score) || 'null');
    if (Array.isArray(modernRows) && modernRows.length > 0) return modernRows;

    const legacyRows = JSON.parse(localStorage.getItem(STORAGE_KEYS.legacyScore) || 'null');
    if (Array.isArray(legacyRows) && legacyRows.length > 0) {
      return legacyRows.map((row) => ({
        category: row.category || row.cat || 'major',
        subject: row.subject || row.sub || '',
        credit: row.credit || '',
        grade: row.grade || '',
      }));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.score);
  }
  return DEFAULT_SCORE_ROWS;
}

function renderScoreRows(rows) {
  const container = $('#scoreRows');
  container.replaceChildren();
  rows.forEach((row) => container.appendChild(createScoreRow(row)));
}

function addScoreRow(rowData = {}) {
  $('#scoreRows').appendChild(createScoreRow(rowData));
  saveScoreRows();
}

function calculateGpa({ silent = false } = {}) {
  const totals = {
    major: { credits: 0, points: 0 },
    double: { credits: 0, points: 0 },
    liberal: { credits: 0, points: 0 },
  };

  let hasInvalidRow = false;

  getScoreRows().forEach(({ category, credit, grade }) => {
    if (credit === '' && grade === '') return;

    const parsedCredit = toFiniteNumber(credit);
    const parsedGrade = toFiniteNumber(grade);

    if (parsedCredit === null || parsedGrade === null || parsedCredit < 0 || parsedGrade < 0 || parsedGrade > 4.5) {
      hasInvalidRow = true;
      return;
    }

    totals[category].credits += parsedCredit;
    totals[category].points += parsedCredit * parsedGrade;
  });

  const gpa = (bucket) => bucket.credits > 0 ? bucket.points / bucket.credits : null;
  const totalCredits = totals.major.credits + totals.double.credits + totals.liberal.credits;
  const totalPoints = totals.major.points + totals.double.points + totals.liberal.points;

  $('#majorGpa').textContent = gpa(totals.major) === null ? '-' : formatNumber(gpa(totals.major));
  $('#doubleMajorGpa').textContent = gpa(totals.double) === null ? '-' : formatNumber(gpa(totals.double));
  $('#liberalGpa').textContent = gpa(totals.liberal) === null ? '-' : formatNumber(gpa(totals.liberal));
  $('#overallGpa').textContent = totalCredits > 0 ? formatNumber(totalPoints / totalCredits) : '-';

  if (hasInvalidRow && !silent) {
    window.alert('학점은 0 이상, 등급은 0.0 이상 4.5 이하로 입력해 주세요.');
  }
}

function clearScoreData() {
  localStorage.removeItem(STORAGE_KEYS.score);
  localStorage.removeItem(STORAGE_KEYS.legacyScore);
  renderScoreRows(DEFAULT_SCORE_ROWS);
  calculateGpa({ silent: true });
  saveScoreRows();
}

function init() {
  loadRankData();
  renderScoreRows(parseSavedScoreRows());
  calculateGpa({ silent: true });
  saveScoreRows();

  $('#rankForm').addEventListener('submit', handleRankSubmit);
  $('#clearRankButton').addEventListener('click', clearRankData);
  $('#addSubjectButton').addEventListener('click', () => addScoreRow());
  $('#calculateScoreButton').addEventListener('click', () => calculateGpa());
  $('#clearScoreButton').addEventListener('click', clearScoreData);

  ['#score', '#average', '#standardDeviation', '#totalStudents'].forEach((selector) => {
    $(selector).addEventListener('input', saveRankData);
  });
}

document.addEventListener('DOMContentLoaded', init);
