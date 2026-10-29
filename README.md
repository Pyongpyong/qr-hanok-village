# qr-hanok-village

실제 QR 코드가 카메라 회전과 함께 작은 한옥마을로 변하는 React / Three.js 라이브러리입니다. 외부 모델 없이 geometry로 한옥, 정자, 담장, 장독대와 사람·강아지·고양이를 구성합니다. 데모는 `demo/`, 라이브러리는 `src/`에 있습니다.

## 설치

```sh
npm install qr-hanok-village react@^19 react-dom@^19 three @react-three/fiber@^9
```

현재 저장소는 배포 준비 상태이며 npm 레지스트리에 게시하는 작업은 별도입니다. 게시 전에는 `npm pack`으로 만든 tarball을 설치하세요.

## 기본 사용법

```tsx
import { QRHanokVillage } from "qr-hanok-village";

export default function App() {
  return (
    <QRHanokVillage value="https://example.com" width={500} height={500} />
  );
}
```

별도 스타일시트나 Three.js 설정은 필요하지 않습니다. 기본 너비는 부모의 100%, 높이는 500px입니다. `height="100%"`일 때는 부모에 명시적 높이를 지정하세요. Canvas가 내부 ResizeObserver로 컨테이너 크기를 추적합니다.

## Props

| Prop               | 타입                   | 기본값 / 설명                                         |
| ------------------ | ---------------------- | ----------------------------------------------------- |
| value              | string                 | 필수. QR에 인코딩할 문자열                            |
| width              | number \| string       | `100%`                                                |
| height             | number \| string       | `500`                                                 |
| autoPlay           | boolean                | `false`                                               |
| qrDuration         | number                 | `3000`, QR에서 대기하는 밀리초                        |
| villageDuration    | number                 | `9000`, 마을에서 대기하는 밀리초                      |
| transitionDuration | number                 | `1400`, 타일+카메라 전체 전환 밀리초. 0이면 즉시 전환 |
| zoom               | number                 | `1.3`, 마을 뷰 카메라 확대 배율(양수)                 |
| initialView        | 'qr' \| 'village'      | `qr`, 최초 mount 시 적용                              |
| interactive        | boolean                | `true`, 클릭으로 전환, 마을 뷰에서 드래그 회전        |
| showControls       | boolean                | `false`, 두 개의 기본 HTML 버튼                       |
| characterAnimation | boolean                | `true`, 마을 상태에서만 주민 표시 및 이동             |
| residentCount      | number                 | `24`, 사람·강아지·고양이 총수. 0~96, 정수로 적용      |
| dayNightDuration   | number                 | `60000`, 낮→밤→낮 전체 주기(밀리초)                   |
| seed               | string \| number       | 생략 시 value. QR 데이터는 변경하지 않음              |
| className / style  | string / CSSProperties | 외부 컨테이너 스타일                                  |
| onViewChange       | (view) => void         | 전환 완료 시 호출. 최초 mount 시 호출하지 않음        |

자동 QR/마을 전환은 기본적으로 꺼져 있습니다. `autoPlay={true}`로 켤 수 있습니다. 마을 뷰에서는 낮은 카메라 고도(약 28도), 흰색 바닥과 단색 흰색 배경, 낮밤 조명 순환이 적용됩니다. 별도의 산·주변 지형·정원·진입로 배경은 없습니다. 낮밤 순환은 자동 뷰 전환과 독립적이며, 마을이 열린 동안에만 시간이 흐릅니다. 낮에는 흰색 배경과 바닥을 유지하고, 밤에는 배경과 바닥도 같은 짙은 남색으로 어두워집니다. 바닥 윗면과 받침 측면은 매 프레임 배경과 동일한 색을 공유하므로 낮밤 전환 중에도 사각 경계가 드러나지 않습니다. 집마다 창호 불빛의 밝기·위상·주기가 다르며, 2.5~8초 간격의 무작위 밝기 목표 사이를 부드럽게 오갑니다. 같은 집의 창은 함께 변하고, 다른 집은 독립적으로 변합니다. 불빛 변화는 seed로 재현됩니다. QR 복귀 시 배경과 바닥은 흰색으로 복원됩니다. `dayNightDuration`으로 전체 주기를 지정하고 데모 슬라이더에서도 변경할 수 있습니다. QR 뷰에서는 순수한 흑백 QR로 복원합니다.

마을 뷰에서 마우스 또는 한 손가락으로 드래그하면 좌우 회전과 상하 기울기 조절이 가능합니다. 기울기는 바닥 아래로 내려가지 않도록 제한합니다. 드래그 후에는 클릭 전환을 막고, 조작 중에는 자동 복귀를 일시 정지합니다. 조작을 마치면 마을 대기 시간을 다시 시작합니다. QR 복귀 시에는 정확한 탑뷰로 돌아가고 회전값이 초기화됩니다. `interactive={false}`이면 드래그도 비활성화됩니다.

시간 값에는 유한한 0 이상의 수를 사용하세요. 전환 중 입력은 무시합니다. 대기 타이머는 안정 상태에서만 실행하며 클릭이나 prop 변경, unmount 시 정리합니다. value/seed 변경 시 현재 뷰를 유지합니다. 비어 있거나 QR 용량을 초과한 value는 인라인 오류로 표시합니다.

타일 디졸브와 카메라 이동은 동시에 시작합니다. QR 타일은 전체 전환 시간의 25% 이내, 최대 350ms 동안 무작위 순서로 빠르게 사라지고 카메라는 `transitionDuration` 동안 부드럽게 이동합니다. QR 복귀 시에는 카메라가 먼저 이동하고, 마지막 타일 구간(전체 시간의 25% 이내, 최대 350ms)에 타일이 역순으로 나타나며 탑뷰 도착과 동시에 QR 복원이 완료됩니다. 타일 순서는 seed로 재현되며, 복원은 역순입니다. QR 타일은 별도의 공중 평면이 아니라 각 한옥의 곡선 지붕과 용마루 높이를 따라 표면에 밀착됩니다. 별도의 QR 페이드 설정은 없습니다. `zoom`은 마을 뷰에만 적용하고 QR 뷰는 원래의 전체 코드 구도를 유지합니다. 큰 배율에서는 마을 가장자리가 화면 밖으로 나갈 수 있습니다.

```tsx
<QRHanokVillage
  value="https://example.com"
  transitionDuration={1400}
  zoom={1.3}
/>
```

## Ref API

```tsx
import { useRef } from "react";
import { QRHanokVillage, type QRHanokVillageRef } from "qr-hanok-village";

export function Controlled() {
  const ref = useRef<QRHanokVillageRef>(null);
  return (
    <>
      <QRHanokVillage ref={ref} value="https://example.com" autoPlay={false} />
      <button onClick={() => ref.current?.showVillage()}>마을 보기</button>
      <button onClick={() => ref.current?.showQR()}>QR 보기</button>
      <button onClick={() => ref.current?.toggle()}>전환</button>
    </>
  );
}
```

공개 export는 `QRHanokVillage`, `QRHanokVillageProps`, `QRHanokVillageRef`, `QRHanokVillageView`입니다.

## Next.js

App Router에서는 클라이언트 래퍼를 만드세요.

```tsx
"use client";
import { QRHanokVillage } from "qr-hanok-village";
export default function Village() {
  return <QRHanokVillage value="https://example.com" />;
}
```

패키지 import 및 서버 렌더링에서 브라우저 전역을 직접 접근하지 않습니다. Canvas는 mount 이후 생성됩니다. 번들러가 라이브러리의 `use client` 지시어를 제거할 수 있으므로 소비하는 앱의 래퍼에 명시하세요. WebGL을 지원하지 않는 환경에서는 fallback을 표시합니다.

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

GLB 모델로 교체할 위치는 `src/objects/VillageObjects.tsx`입니다. `Lot.kind`별 geometry recipe를 모델 인스턴스로 교체하면 됩니다. QR 마스크보다 낮게 모델을 배치하고 탑뷰 투영은 모듈 범위에 맞추세요. 원격 모델 로딩/캐시/해제 정책은 교체 구현에서 관리하세요.

## 브라우저 지원

ES2022, WebGL2, ResizeObserver를 지원하는 최신 Chrome, Edge, Firefox, Safari를 대상으로 합니다. React 19 / R3F 9 조합을 지원하며 React 18은 지원 범위에 포함하지 않습니다. 모바일에서는 짧은 URL과 적절한 표시 크기를 권장합니다.

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

## 라이선스

MIT — [LICENSE](./LICENSE).

## GitHub / npm 배포 자동화

소스 저장소: [Pyongpyong/qr-hanok-village](https://github.com/Pyongpyong/qr-hanok-village).
Node.js 24를 사용합니다(`.nvmrc`). CI와 배포는 `package-lock.json`을 기준으로 `npm ci`를 실행하며, 기존 pnpm 개발 환경도 유지합니다.

- `.github/workflows/ci.yml`: main push와 PR에서 타입 검사, 라이브러리·데모 빌드, 테스트, npm 패키지 구성 검증.
- `.github/workflows/release.yml`: main의 Conventional Commits를 분석해 버전 커밋·태그, npm 공개 배포, GitHub Release를 생성.
- `scripts/release-bump.mjs`: 마지막 배포 태그 이후 커밋으로 버전을 결정. 최초 배포는 현재 `0.1.0`을 사용.
- `scripts/release-plan.mjs`: 이미 npm에 있는 버전은 재배포하지 않음. 네트워크 오류·서버 오류를 미배포 상태로 오인하지 않음.

| 커밋                                    | 버전      |
| --------------------------------------- | --------- |
| `feat:`                                 | minor     |
| `fix:`, `perf:`, `refactor:`, `revert:` | patch     |
| `feat!:`, `fix!:`, `BREAKING CHANGE:`   | major     |
| `docs:`, `chore:`, `ci:`, `test:`       | 변경 없음 |

릴리스 workflow는 npm 초기 설정 전 실패하거나 의도치 않게 게시하지 않도록 `NPM_PUBLISH_ENABLED` repository variable이 `true`일 때만 실행합니다.

최초 설정:

1. 패키지 검증: `npm ci && npm run check && npm pack --dry-run`.
2. npm에 최초 게시할 준비가 되면 `npm login` 후 `npm publish --access public`. 2FA 인증이 필요할 수 있습니다.
3. npm 패키지 Settings → Trusted Publisher → GitHub Actions에서 다음 값을 등록합니다.

   | 설정              | 값                 |
   | ----------------- | ------------------ |
   | Owner             | `Pyongpyong`       |
   | Repository        | `qr-hanok-village` |
   | Workflow filename | `release.yml`      |
   | Environment       | 비워 둠            |
   | Allowed action    | `npm publish` 허용 |

4. GitHub Settings → Secrets and variables → Actions → Variables에서 `NPM_PUBLISH_ENABLED=true`로 설정합니다.
5. GitHub Actions → Release → Run workflow로 초기 태그/Release를 생성합니다. 이후 main의 변경은 위 커밋 규칙으로 자동 배포됩니다.

npm Trusted Publishing은 GitHub OIDC를 사용하므로 `NPM_TOKEN` secret을 등록하지 않습니다. 새 Trusted Publisher는 등록 후 2일 내 성공적인 배포로 검증해야 합니다. 자세한 요구사항은 [npm 공식 문서](https://docs.npmjs.com/trusted-publishers/)를 확인하세요.

## Vercel 데모 배포

Vercel의 GitHub 연동을 사용합니다. [Vercel New Project](https://vercel.com/new)에서 위 저장소를 Import하면 `vercel.json` 설정이 적용됩니다.

| 설정              | 값                     |
| ----------------- | ---------------------- |
| Framework         | Vite                   |
| Root Directory    | 저장소 루트 (`./`)     |
| Node.js           | 24.x                   |
| Install Command   | `npm ci`               |
| Build Command     | `npm run build:vercel` |
| Output Directory  | `demo-dist`            |
| Production Branch | `main`                 |

`build:vercel`은 라이브러리 타입 검사·빌드와 테스트를 거친 뒤 public component를 사용하는 데모를 빌드합니다. `dist`는 npm용 출력이며 Vercel에 올리는 디렉터리는 `demo-dist`입니다. main push는 Production, PR은 Preview 배포에 사용됩니다. 별도 Vercel 토큰이나 배포용 GitHub Actions workflow는 필요하지 않습니다.

CLI를 사용하는 경우에도 같은 프로젝트 루트에서 진행합니다.

```sh
npx vercel login
npx vercel link
npx vercel --prod
```

`.vercel/`의 로컬 연결 정보, 인증·환경 파일은 Git에 포함하지 않습니다. CLI 로그인이나 GitHub App의 저장소 접근 권한이 없는 경우에는 먼저 해당 계정을 연결해야 합니다. [Vercel GitHub 연동 문서](https://vercel.com/docs/git/vercel-for-github)를 참고하세요.
