# 개발 및 내부 구현

이 문서는 저장소를 개발하거나 내부 모델을 교체하는 기여자를 위한 안내입니다. 설치와 public API는 [README](../README.md)를 참고하세요.

Node.js 24를 사용합니다(`.nvmrc`). GitHub Actions와 Vercel은 `package-lock.json`을 기준으로 `npm ci`를 실행합니다. 기존 pnpm 개발 환경과 esbuild 승인 설정도 유지합니다.

## 개발 및 빌드

```sh
npm install
npm run dev
npm test
npm run build
npm run build:demo
npm pack
```

`npm run build`는 타입 검사, Vite library ESM 빌드와 `.d.ts` 생성을 수행합니다. `dist/index.js`와 `dist/index.d.ts`를 package exports로 연결합니다. 데모는 `npm run build:demo`로 `demo-dist/`에 별도 출력합니다.

React, React DOM, Three.js, R3F는 peerDependencies 및 Rollup external로 선언해 중복 번들링하지 않습니다. `qrcode`는 runtime dependency이며 external입니다. 패키지는 CSS 및 모델 파일에 의존하지 않습니다. npm 게시 시 README, LICENSE, dist만 포함됩니다.

빈 React 19 프로젝트에서는 다음처럼 tarball로 검증할 수 있습니다.

```sh
npm install /absolute/path/qr-hanok-village-0.1.0.tgz
```

전체 검증은 `npm run check`로 실행합니다. 릴리스 스크립트 테스트도 `npm test`에 포함됩니다. 배포 설정은 [RELEASING.md](./RELEASING.md), 데모 호스팅은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 구현

- `qrcode`의 오류 정정 M matrix를 그대로 사용합니다. QR의 열은 X, 행은 Z에 대응합니다.
- FNV 방식 문자열 해시와 정수 PRNG로 모델 종류/높이를 결정합니다. `Math.random()`은 사용하지 않습니다.
- QR 전체를 1×1 크기의 흑백 모듈 타일로 instancing합니다. 사방 4모듈 quiet zone도 흰 타일로 구성해 탑뷰에서 건물을 가립니다. ShaderMaterial이 타일마다 seeded 순번에 따른 개별 투명도를 계산하므로, 흰 배경판이 지붕 노출을 방해하지 않습니다. 색에는 조명과 tone mapping을 적용하지 않습니다.
- 카메라 각도를 smoothstep으로 보간하는 R3F 프레임 루프를 사용합니다. QR → 전환 → 마을 → 복귀 전환의 네 상태를 명시하며 전환 도중 중복 호출을 막습니다. GSAP/drei 의존성은 필요하지 않습니다.
- 마을 진입 시 타일 디졸브와 카메라 이동은 동시에 시작하고 타일은 최대 350ms에 완료됩니다. QR 복귀 시 타일은 카메라 이동의 마지막 최대 350ms 구간에 나타납니다. 두 동작이 모두 끝나면 안정 상태가 되고 `onViewChange`가 호출됩니다.
- 마을 부품은 geometry/material별 InstancedMesh로 묶습니다. 인접한 검은 모듈을 최대 3×2 크기의 한옥 필지로 묶고, 곡선 팔작지붕·기와 골·용마루·창호·툇마루·돌기단을 생성합니다. 담장·정자·장독대를 섞으며 주변 나무는 배치하지 않습니다. 한옥과 담장의 지붕은 여백 없이 검은 QR 모듈의 전체 면적과 정확히 일치하며, QR 타일과 같은 지붕 크기 정보를 공유합니다. 기본 주민은 사람 8명·강아지 8마리·고양이 8마리이며, 각자 연결된 흰 모듈 경로에서 다른 속도와 시작 위치로 움직입니다. 신체 부위별 instancing을 사용해 인원이 늘어도 draw call 수를 일정하게 유지합니다. `residentCount={0}` 또는 `characterAnimation={false}`로 숨길 수 있습니다.
- 탑뷰의 QR 인식을 우선합니다. 작은 화면, 긴 입력, 화면 밝기, 카메라 등에 따라 실제 스캔 품질은 달라집니다. 스캔할 때는 `autoPlay={false}`로 충분한 시간을 확보하세요. 실제 스마트폰 스캔 검증은 별도로 필요합니다.
- 사용자 동작에 맞춰 모션을 줄이려면 `autoPlay={false}` 및 `transitionDuration={0}`를 지정하세요.

## 구조 / 모델 교체

```text
src/
  index.ts                       # public exports
  components/QRHanokVillage.tsx   # props, ref, 상태, 타이머
  scene/QRVillageScene.tsx        # 동시 카메라·타일 전환, 주민
  scene/QRMask.tsx                # 모듈별 랜덤 타일 디졸브
  scene/VillageLighting.tsx       # 낮밤 조명과 배경 변화
  scene/Residents.tsx             # instancing 주민·동물 군중
  utils/houseLight.ts             # 집별 독립적인 불빛 변화
  objects/VillageObjects.tsx      # 한옥/정자/담장/장독대 geometry recipes
  utils/villageGenerator.ts       # QR, seed, layout, 골목 경로
  types/index.ts
 demo/                           # public component를 사용하는 Vite 앱
 tests/                          # matrix 대응, 재현성, 경로 검증
```

GLB 모델로 교체할 위치는 `src/objects/VillageObjects.tsx`입니다. `Lot.kind`별 geometry recipe를 모델 인스턴스로 교체하면 됩니다. 탑뷰 투영은 검은 QR 모듈의 전체 범위에 맞추세요. 지붕 높이나 형태를 변경하면 `src/utils/housePlots.ts`의 지붕 정보와 `src/scene/QRMask.tsx`의 표면 높이 계산도 함께 맞춰 QR 타일이 모델에 밀착되도록 해야 합니다. 원격 모델 로딩/캐시/해제 정책은 교체 구현에서 관리하세요.
