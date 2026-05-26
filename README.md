# My Rank Calculator

`My Rank Calculator`를 메인으로 유지하면서 `My Score` 학점 계산기를 통합한 GitHub Pages용 단일 정적 웹페이지입니다.

## Included tools

- My Rank Calculator — Created Dec 31, 2024
- My Score — Created Mar 21, 2025

## Structure

```text
.
├── index.html
├── shared.css
├── styles.css
└── script.js
```

## Deploy on GitHub Pages

1. 이 폴더의 파일을 하나의 GitHub repository 루트에 업로드합니다.
2. GitHub repository에서 `Settings` → `Pages`로 이동합니다.
3. `Deploy from a branch`를 선택합니다.
4. Branch는 `main`, folder는 `/root`를 선택합니다.
5. 저장 후 배포 URL에서 `index.html`이 자동으로 열립니다.

## Notes

- `shared.css`는 기존 `my-game-portal`의 soft theme 스타일을 가져와 사용합니다.
- 입력값은 브라우저 `localStorage`에 저장됩니다.
- 기존 `my-score`의 `gpaData` 저장값이 있으면 새 저장 구조로 자동 반영됩니다.
