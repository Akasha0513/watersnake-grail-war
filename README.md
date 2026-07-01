# 성배전쟁 ORPG (watersnake-grail-war)

![Foundry v13.351](https://img.shields.io/badge/Foundry-v13.351-green)

**watersnake**의 성배전쟁 자작룰(제13시대 기반 d20)을 위한 Foundry VTT 시스템입니다.
asacolips의 [13th Age 시스템](https://github.com/asacolips-projects/13th-age)(코드 **MIT 라이선스**) **1.39.1 태그**를 포크해 개조했습니다.

- **원작 룰**: watersnake
- **엔진 베이스**: asacolips 13th Age (코드 MIT) — 코드 라이선스 고지는 `licenses/MIT.txt`에 보존
- **대상 Foundry 버전**: v13 (verified 13.351)

---

## 빌드

**gulp**(매니페스트·언어·CSS·컴펜디움)와 **vite**(Vue 컴포넌트)를 사용합니다. 소스는 `src/`, 결과물은 `dist/`. 로컬 테스트 시 `dist/`를 Foundry 데이터 폴더의 `systems/watersnake-grail-war`로 심링크하세요.

```bash
npm install
npm run build        # 1회 빌드
npm run watch        # 변경 감시 자동 빌드
npm run css          # CSS만
npm run yaml         # 매니페스트·언어 파일만
npm run vite:build   # Vue 컴포넌트만
```

## 라이선스

- **코드**: HTML/CSS/JavaScript/Vue 등 모든 코드는 [MIT 라이선스](licenses/MIT.txt). 원저작권 고지(asacolips 외)는 `licenses/MIT.txt`에 보존합니다.
- **13th Age 게임 콘텐츠 미포함**: 본 포크는 13th Age 트레이드마크·OGL/SRD 컴펜디움(클래스·종족·특기·몬스터·매직아이템 등) 콘텐츠를 **포함하지 않습니다.** 관련 Community Use / OGL 고지는 해당 콘텐츠 제거와 함께 삭제되었습니다.
