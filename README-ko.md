# GoPeak

[![](https://badge.mcpx.dev?type=server 'MCP Server')](https://modelcontextprotocol.io/introduction)
[![Made with Godot](https://img.shields.io/badge/Made%20with-Godot-478CBF?style=flat&logo=godot%20engine&logoColor=white)](https://godotengine.org)
[![](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white 'Node.js')](https://nodejs.org/en/download/)
[![](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white 'TypeScript')](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/npm/v/gopeak?style=flat&logo=npm&logoColor=white 'npm')](https://www.npmjs.com/package/gopeak)
[![](https://img.shields.io/github/last-commit/HaD0Yun/godot-mcp 'Last Commit')](https://github.com/HaD0Yun/godot-mcp/commits/main)
[![](https://img.shields.io/github/stars/HaD0Yun/godot-mcp 'Stars')](https://github.com/HaD0Yun/godot-mcp/stargazers)
[![](https://img.shields.io/github/forks/HaD0Yun/godot-mcp 'Forks')](https://github.com/HaD0Yun/godot-mcp/network/members)
[![](https://img.shields.io/badge/License-MIT-red.svg 'MIT License')](https://opensource.org/licenses/MIT)

🌐 **언어**: [English](README.md) | **한국어** | [简体中文](README-zh.md) | [日本語](README-ja.md) | [Deutsch](README-de.md) | [Português](README-pt_BR.md)

![GoPeak Hero](assets/gopeak-hero-v2.png)

**GoPeak은 Godot용 MCP 서버로, AI 어시스턴트가 실제 프로젝트를 실행·검사·수정·디버깅까지 end-to-end로 수행할 수 있게 해줍니다.**

> Auto Reload 포함: MCP가 씬/스크립트를 수정하면 Godot 에디터가 자동 새로고침됩니다.

---

## 왜 GoPeak인가 (핵심)

- **실프로젝트 피드백 루프**: 실행 → 로그 확인 → 수정까지 한 흐름으로 처리
- **95+ 도구 지원**: 씬/스크립트/리소스/런타임/LSP/DAP/입력/에셋 전반 커버
- **깊은 Godot 연동**: ClassDB 인트로스펙션, 런타임 검사, 디버거 연계
- **개발 속도 향상**: 복붙 반복을 줄이고 구현-검증 사이클 단축

### 이런 경우에 특히 좋음

- AI로 빠르게 프로토타입을 만들고 싶은 1인/소규모 팀
- 단순 코드 생성이 아니라 실제 프로젝트 상태 기반 작업이 필요한 경우
- 런타임 디버깅/중단점/입력 시뮬레이션이 중요한 워크플로우

---

## GoPeak vs Upstream (Coding-Solo/godot-mcp)

| 기능 | Upstream | GoPeak |
|---|---|---|
| GDScript LSP 도구 | README 기준 없음 | ✅ `lsp_get_diagnostics`, `lsp_get_completions`, `lsp_get_hover`, `lsp_get_symbols` |
| DAP 디버깅 도구 | README 기준 없음 | ✅ 브레이크포인트, step/continue/pause, stack trace, debug output |
| 입력 주입 도구 | README 기준 없음 | ✅ `inject_action`, `inject_key`, `inject_mouse_click`, `inject_mouse_motion` |
| 스크린샷 캡처 도구 | README 기준 없음 | ✅ `capture_screenshot`, `capture_viewport` |
| Auto Reload 에디터 플러그인 | 없음 | ✅ `auto_reload` 애드온 포함 |
| 도구 커버리지 | 상대적으로 제한적 | ✅ 95+ MCP 도구 |

---

## 요구사항

- Godot 4.x
- Node.js 18+
- MCP 클라이언트(Claude Desktop, Cursor, Cline, OpenCode 등)

---

## 설치

### 1) 가장 빠른 방법 (권장)

```bash
npx gopeak
```

또는

```bash
npm install -g gopeak
gopeak
```

### 2) 소스에서 설치

```bash
git clone https://github.com/HaD0Yun/godot-mcp.git
cd godot-mcp
npm install
npm run build
```

Godot 자동 감지가 안 되면 `GODOT_PATH`를 지정하세요.

### MCP 클라이언트 설정 예시 (실사용)

클라이언트 형태에 맞는 설정을 사용하세요.

**A) 글로벌 설치(`npm install -g gopeak`) 사용 시**

```json
{
  "mcpServers": {
    "godot": {
      "command": "gopeak",
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

**B) 글로벌 설치 없이 npx 사용 시**

```json
{
  "mcpServers": {
    "godot": {
      "command": "npx",
      "args": ["-y", "gopeak"],
      "env": {
        "GODOT_PATH": "/path/to/godot"
      }
    }
  }
}
```

> 팁: 클라이언트가 `args` 배열 방식만 지원하면 `"command": "npx"` + `"args": ["-y", "gopeak"]` 형태를 사용하세요.

---

## 핵심 기능

- **프로젝트 제어**: 에디터 실행, 프로젝트 실행/중지, 디버그 출력 수집
- **씬 편집**: 씬 생성, 노드 추가/삭제/재부모화, 속성 변경
- **스크립트 워크플로우**: 스크립트 생성/수정, 구조 분석
- **리소스 작업**: 리소스/머티리얼/셰이더/타일셋 생성 및 수정
- **시그널/애니메이션**: 시그널 연결, 트랙/상태머신 구성
- **런타임 도구**: 라이브 트리 검사, 속성 변경, 메서드 호출, 메트릭 수집
- **LSP + DAP**: 진단/완성/호버 + 브레이크포인트/스텝/스택트레이스
- **입력 + 스크린샷**: 키보드/마우스/액션 주입 및 뷰포트 캡처
- **에셋 라이브러리**: CC0 에셋 검색/다운로드 (Poly Haven, AmbientCG, Kenney)

### 도구 커버리지 한눈에 보기

| 영역 | 예시 |
|---|---|
| Scene/Node | `create_scene`, `add_node`, `set_node_properties` |
| Script | `create_script`, `modify_script`, `get_script_info` |
| Runtime | `inspect_runtime_tree`, `call_runtime_method` |
| LSP/DAP | `lsp_get_diagnostics`, `dap_set_breakpoint` |
| Input/Visual | `inject_key`, `inject_mouse_click`, `capture_screenshot` |

---

## 빠른 프롬프트 예시

### Build
- "CharacterBody2D 기반 Player 씬 만들고 Sprite2D, CollisionShape2D, 기본 이동 스크립트까지 추가해줘."
- "Enemy Spawner 씬 만들고 GameManager에 spawn 시그널 연결해줘."

### Debug
- "프로젝트 실행해서 에러 수집하고 상위 3개 문제를 자동으로 고쳐줘."
- "`scripts/player.gd:42`에 브레이크포인트 걸고 hit되면 스택트레이스 보여줘."

### Runtime Testing
- "`ui_accept` 입력 주입하고 마우스를 (400, 300)으로 이동 후 클릭한 뒤 스크린샷 찍어줘."
- "라이브 씬 트리 검사해서 스크립트 누락 노드나 invalid reference 찾아줘."

### Refactor / Maintenance
- "TODO/FIXME를 전부 수집해서 파일별 우선순위로 정리해줘."
- "프로젝트 헬스 체크 실행하고 배포 전에 빠르게 개선할 항목만 뽑아줘."

---

## Auto Reload 애드온 (권장)

Godot 프로젝트 루트에서 설치:

```bash
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install-addon.sh | bash
```

설치 후 **Project Settings → Plugins**에서 활성화하세요.

---

## 문제 해결

- **Godot를 찾지 못함** → `GODOT_PATH` 설정
- **MCP 도구가 안 보임** → MCP 클라이언트 재시작
- **프로젝트 경로 오류** → `project.godot` 존재 확인
- **런타임 도구 미동작** → runtime addon 설치/활성화 확인

---

## 문서 및 링크

- [CHANGELOG](CHANGELOG.md)
- [ROADMAP](ROADMAP.md)
- [CONTRIBUTING](CONTRIBUTING.md)

---

## License

MIT — [LICENSE](LICENSE) 참고.

## Credits

- Original MCP server by [Coding-Solo](https://github.com/Coding-Solo/godot-mcp)
- GoPeak enhancements by [HaD0Yun](https://github.com/HaD0Yun)
