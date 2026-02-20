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

🌐 **Escolher idioma**: [English](README.md) | [한국어](README-ko.md) | [简体中文](README-zh.md) | [日本語](README-ja.md) | [Deutsch](README-de.md) | **Português**

```text
                           (((((((             (((((((                          
                        (((((((((((           (((((((((((                      
                        (((((((((((((       (((((((((((((                       
                        (((((((((((((((((((((((((((((((((                       
                        (((((((((((((((((((((((((((((((((                       
         (((((      (((((((((((((((((((((((((((((((((((((((((      (((((        
       (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((      
     ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((    
    ((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((    
      (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((     
        (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((       
         (((((((((((@@@@@@@(((((((((((((((((((((((((((@@@@@@@(((((((((((        
         (((((((((@@@@,,,,,@@@(((((((((((((((((((((@@@,,,,,@@@@(((((((((        
         ((((((((@@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((        
         ((((((((@@@,,,,,,,,,@@(((((((@@@@@(((((((@@,,,,,,,,,@@@((((((((        
         (((((((((@@@,,,,,,,@@((((((((@@@@@((((((((@@,,,,,,,@@@(((((((((        
         ((((((((((((@@@@@@(((((((((((@@@@@(((((((((((@@@@@@((((((((((((        
         (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((        
         (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((((        
         @@@@@@@@@@@@@((((((((((((@@@@@@@@@@@@@((((((((((((@@@@@@@@@@@@@        
         ((((((((( @@@(((((((((((@@(((((((((((@@(((((((((((@@@ (((((((((        
         (((((((((( @@((((((((((@@@(((((((((((@@@((((((((((@@ ((((((((((        
          (((((((((((@@@@@@@@@@@@@@(((((((((((@@@@@@@@@@@@@@(((((((((((         
           (((((((((((((((((((((((((((((((((((((((((((((((((((((((((((          
              (((((((((((((((((((((((((((((((((((((((((((((((((((((             
                 (((((((((((((((((((((((((((((((((((((((((((((((                
                        (((((((((((((((((((((((((((((((((                       
                                                                                


        /$$$$$$             /$$$$$$$                      /$$      
       /$$__  $$           | $$__  $$                    | $$      
      | $$  \__/  /$$$$$$ | $$  \ $$ /$$$$$$   /$$$$$$$ | $$  /$$/
      | $$ /$$$$//$$__  $$| $$$$$$$//$$__  $$ |____  $$ | $$ /$$/ 
      | $$|_  $$| $$  \ $$| $$____/| $$$$$$$$  /$$$$$$$ | $$$$$/  
      | $$  \ $$| $$  | $$| $$     | $$_____/ /$$__  $$ | $$  $$  
      |  $$$$$$/|  $$$$$$/| $$     |  $$$$$$ |  $$$$$$$ | $$\  $$ 
       \______/  \______/ |__/      \______/  \_______/ |__/ \__/ 
```

**O servidor Model Context Protocol (MCP) mais completo para o Godot Engine — permitindo que assistentes de IA construam, modifiquem e depurem jogos Godot com profundidade e precisão sem precedentes.**

> **Agora com Auto Reload!** Cenas e scripts são automaticamente atualizados no editor Godot quando modificados externamente via MCP.

---

## Por que GoPeak?

### 🚀 Transforme seu Fluxo de Desenvolvimento de Jogos

GoPeak não é apenas mais uma ferramenta — é uma **mudança de paradigma** na forma como assistentes de IA interagem com engines de jogos:

#### 1. **IA que Realmente Entende o Godot**

Assistentes de IA tradicionais podem escrever GDScript, mas estão essencialmente trabalhando às cegas. Eles geram código com base em dados de treinamento, esperando que funcione. **GoPeak muda tudo:**

- **Loop de Feedback em Tempo Real**: Quando você pede "execute meu projeto e me mostre os erros", a IA realmente executa seu projeto, captura a saída e vê exatamente o que deu errado
- **Assistência Ciente do Contexto**: A IA pode inspecionar sua árvore de cenas real, entender sua hierarquia de nós e fornecer sugestões baseadas na estrutura real do seu projeto
- **Validação Antes de Sugerir**: Antes de sugerir o uso de um recurso, a IA pode verificar se ele existe no seu projeto

#### 2. **95+ Ferramentas com Introspecção Dinâmica de ClassDB**

Em vez de codificar ferramentas fixas para cada classe do Godot, GoPeak fornece **ferramentas genéricas** (`add_node`, `create_resource`) que funcionam com QUALQUER classe ClassDB, além de **ferramentas de introspecção ClassDB** que permitem à IA descobrir classes, propriedades e métodos dinamicamente.

| Categoria | O que você pode fazer | Ferramentas |
|-----------|----------------------|-------------|
| **Gerenciamento de Cenas** | Construir árvores de cenas programaticamente | `create_scene`, `add_node`, `delete_node`, `duplicate_node`, `reparent_node`, `list_scene_nodes`, `get_node_properties`, `set_node_properties` |
| **Introspecção ClassDB** | Descobrir dinamicamente classes, propriedades, métodos e sinais do Godot | `query_classes`, `query_class_info`, `inspect_inheritance` |
| **Operações GDScript** | Escrever e modificar scripts com precisão cirúrgica | `create_script`, `modify_script`, `get_script_info` |
| **Gerenciamento de Recursos** | Criar qualquer tipo de recurso, modificar recursos existentes | `create_resource`, `modify_resource`, `create_material`, `create_shader` |
| **Sistema de Animação** | Construir animações e máquinas de estado | `create_animation`, `add_animation_track`, `create_animation_tree`, `add_animation_state`, `connect_animation_states` |
| **Sistema de Tiles 2D** | Criar tilesets e preencher tilemaps | `create_tileset`, `set_tilemap_cells` |
| **Gerenciamento de Sinais** | Conectar o sistema de eventos do seu jogo | `connect_signal`, `disconnect_signal`, `list_connections` |
| **Configuração do Projeto** | Gerenciar configurações, autoloads e entradas | `get_project_setting`, `set_project_setting`, `add_autoload`, `add_input_action` |
| **Experiência do Desenvolvedor** | Analisar, depurar e manter seu projeto | `get_dependencies`, `find_resource_usages`, `parse_error_log`, `get_project_health`, `search_project` |
| **Depuração em Runtime** | Inspecionar e modificar jogos em execução | `inspect_runtime_tree`, `set_runtime_property`, `call_runtime_method`, `get_runtime_metrics` |
| **Captura de Screenshots** | Capturar screenshots do viewport de jogos em execução | `capture_screenshot`, `capture_viewport` |
| **Injeção de Entrada** | Simular entradas de teclado, mouse e ações | `inject_action`, `inject_key`, `inject_mouse_click`, `inject_mouse_motion` |
| **GDScript LSP** | Diagnósticos, completações, hover e símbolos via Language Server integrado do Godot | `lsp_get_diagnostics`, `lsp_get_completions`, `lsp_get_hover`, `lsp_get_symbols` |
| **Adaptador de Depuração (DAP)** | Breakpoints, stepping, stack traces e captura de saída de depuração | `dap_get_output`, `dap_set_breakpoint`, `dap_continue`, `dap_step_over`, `dap_get_stack_trace` |
| **Recursos MCP** | Acessar arquivos do projeto via URIs `godot://` | `godot://project/info`, `godot://scene/{path}`, `godot://script/{path}` |
| **Sistema de Áudio** | Criar barramentos de áudio, configurar efeitos | `create_audio_bus`, `get_audio_buses`, `set_audio_bus_effect`, `set_audio_bus_volume` |
| **Navegação** | Configurar pathfinding de IA | `create_navigation_region`, `create_navigation_agent` |
| **UI/Temas** | Criar e aplicar temas personalizados com shaders | `set_theme_color`, `set_theme_font_size`, `apply_theme_shader` |
| **Biblioteca de Assets** | Buscar e baixar assets CC0 de múltiplas fontes | `search_assets`, `fetch_asset`, `list_asset_providers` |
| **Auto Reload** | Atualização instantânea do editor em mudanças externas | Plugin de Editor Integrado |

> **Filosofia de Design**: Em vez de fornecer 90+ ferramentas especializadas (como `create_camera`, `create_light`, `create_physics_material`), GoPeak usa ferramentas genéricas `add_node` e `create_resource` que funcionam com QUALQUER classe Godot. A IA usa `query_classes` para descobrir tipos disponíveis e `query_class_info` para aprender suas propriedades — assim como um desenvolvedor usando a documentação do Godot.

#### 3. **Integração Perfeita com o Editor via Auto Reload**

O **plugin Auto Reload** incluído elimina o atrito da edição externa:

- **Sem Atualização Manual**: Quando o MCP modifica uma cena ou script, o editor Godot recarrega automaticamente
- **Detecção em 1 Segundo**: Polling leve com impacto negligível no desempenho (~0,01ms/seg)
- **Monitoramento Inteligente**: Monitora cenas abertas E seus scripts anexados
- **Zero Configuração**: Basta ativar o plugin e esquecer

```
MCP modifica arquivo → Auto Reload detecta mudança → Editor recarrega → Você vê o resultado instantaneamente
```

#### 4. **Elimine o Ciclo Copiar-Colar-Depurar**

**Antes do GoPeak:**
1. Pedir código à IA
2. Copiar código para o projeto
3. Executar projeto, encontrar erro
4. Copiar erro de volta para a IA
5. Receber correção, colar
6. Repetir 10+ vezes

**Com GoPeak:**
1. "Crie um personagem jogador com saúde, movimento e pulo"
2. A IA cria a cena, escreve o script, adiciona os nós, conecta sinais e testa
3. Pronto.

A IA não apenas escreve código — ela **implementa funcionalidades de ponta a ponta**.

#### 5. **Operações Seguras de Tipo e Resistentes a Erros**

Toda operação no GoPeak inclui:

- **Validação de Caminho**: Previne operações de arquivo inválidas
- **Serialização de Tipo**: Trata corretamente Vector2, Vector3, Color, Transform e todos os tipos Godot
- **Recuperação de Erros**: Mensagens de erro significativas com correções sugeridas
- **Operações Atômicas**: Mudanças são aplicadas consistentemente ou nada

#### 6. **Inteligência de Saúde do Projeto**

A ferramenta `get_project_health` fornece uma análise abrangente do seu projeto:

```json
{
  "score": 85,
  "grade": "B",
  "checks": {
    "structure": { "passed": true },
    "resources": { "issues": ["3 texturas precisam ser reimportadas"] },
    "scripts": { "issues": ["5 comentários TODO encontrados"] },
    "config": { "passed": true }
  },
  "recommendations": [
    "Configure predefinições de exportação para suas plataformas alvo",
    "Revise e resolva itens TODO antes do lançamento"
  ]
}
```

#### 7. **Análise de Dependências e Detecção de Referências Circulares**

A ferramenta `get_dependencies`:

- Mapeia cada dependência de recurso no seu projeto
- Detecta referências circulares antes que causem erros em runtime
- Mostra a cadeia de dependências completa para qualquer recurso

```
PlayerScene.tscn
├── PlayerScript.gd
│   └── WeaponBase.gd
│       └── ⚠️ CIRCULAR: PlayerScript.gd
└── PlayerSprite.png
```

#### 8. **Depuração em Runtime ao Vivo (Addon Opcional)**

Instale o addon `godot_mcp_runtime` incluído e desbloqueie:

- **Inspeção da Árvore de Cenas ao Vivo**: Veja a árvore de nós real do seu jogo enquanto ele executa
- **Modificação Quente de Propriedades**: Mude valores em tempo real sem reiniciar
- **Chamada Remota de Métodos**: Acione funções no seu jogo em execução
- **Monitoramento de Desempenho**: Rastreie FPS, memória, draw calls e mais

### 💡 Casos de Uso Reais

#### **Prototipagem Rápida**
```
"Crie um platformer básico com um jogador que pode se mover, pular e coletar moedas"
```
A IA cria cenas, scripts, nós, sinais e ações de entrada — um protótipo jogável em minutos.

#### **Refatoração em Escala**
```
"Encontre todos os usos do recurso antigo PlayerData e atualize para o novo PlayerStats"
```
Busque em todo o projeto, identifique cada referência e faça mudanças consistentes.

#### **Depurando Problemas Complexos**
```
"Meu jogador continua caindo pelo chão. Verifique minha configuração de colisão e me diga o que está errado"
```
Inspecione propriedades de nós, analise estrutura de cenas e identifique problemas de configuração.

#### **Aprendendo Godot**
```
"Mostre-me como sinais funcionam criando um botão que muda o texto de um label quando clicado"
```
Em vez de apenas explicar, a IA constrói um exemplo funcional no seu projeto real.

#### **Mantendo Projetos Grandes**
```
"Execute uma verificação de saúde no meu projeto e me diga o que precisa de atenção"
```
Obtenha insights acionáveis sobre estrutura do projeto, recursos não utilizados e problemas potenciais.

---

## Funcionalidades

### Funcionalidades Principais
- **Iniciar Editor Godot**: Abrir o editor Godot para um projeto específico
- **Executar Projetos Godot**: Executar projetos Godot no modo de depuração
- **Capturar Saída de Depuração**: Recuperar saída do console e mensagens de erro
- **Controlar Execução**: Iniciar e parar projetos Godot programaticamente
- **Obter Versão do Godot**: Recuperar a versão instalada do Godot
- **Listar Projetos Godot**: Encontrar projetos Godot em um diretório especificado
- **Análise de Projeto**: Obter informações detalhadas sobre a estrutura do projeto

### Gerenciamento de Cenas
- Criar novas cenas com tipos de nó raiz especificados
- Adicionar, deletar, duplicar e re-parental nós
- Definir propriedades de nós com serialização type-safe
- Listar estrutura da árvore de cenas com hierarquia completa
- Carregar sprites e texturas em nós Sprite2D
- Exportar cenas 3D como recursos MeshLibrary para GridMap

### Operações GDScript
- **Criar Scripts**: Gerar novos arquivos GDScript com templates (singleton, state_machine, component, resource)
- **Modificar Scripts**: Adicionar funções, variáveis e sinais a scripts existentes
- **Analisar Scripts**: Obter informações detalhadas sobre estrutura, dependências e exportações de scripts

### Gerenciamento de Sinais e Conexões
- Conectar sinais entre nós em cenas
- Desconectar conexões de sinais
- Listar todas as conexões de sinais em uma cena

### Introspecção ClassDB (Novo!)
- **Consultar Classes**: Descobrir classes Godot disponíveis com filtragem por nome, categoria (node, node2d, node3d, control, resource, etc.) e instanciabilidade
- **Consultar Info de Classe**: Obter métodos, propriedades, sinais e enums detalhados para qualquer classe
- **Inspecionar Herança**: Explorar hierarquia de classes — ancestrais, filhos e todos os descendentes

### Gerenciamento de Recursos
- **Criar Recursos**: Gerar QUALQUER tipo de recurso como arquivos .tres (substitui ferramentas create_* especializadas)
- **Modificar Recursos**: Atualizar propriedades de arquivos .tres/.res existentes
- **Criar Materiais**: StandardMaterial3D, ShaderMaterial, CanvasItemMaterial, ParticleProcessMaterial
- **Criar Shaders**: Shaders canvas_item, spatial, particles, sky, fog com templates

### Sistema de Animação
- Criar novas animações em nós AnimationPlayer
- Adicionar trilhas de propriedade e método a animações
- Inserir keyframes com serialização correta de valores

### Sistema de Tiles 2D
- Criar recursos TileSet com fontes de textura atlas
- Definir células TileMap programaticamente

### Pipeline de Import/Export
- Obter status de importação e opções para recursos
- Modificar configurações de importação e acionar reimportação
- Listar predefinições de exportação e validar projeto para exportação
- Exportar projetos usando Godot CLI

### Configuração do Projeto
- Obter e definir configurações do projeto
- Gerenciar singletons autoload (adicionar, remover, listar)
- Definir cena principal
- Adicionar ações de entrada com eventos de tecla, mouse e joypad

### Gerenciamento de Plugins
- Listar plugins instalados com status
- Ativar e desativar plugins

### Experiência do Desenvolvedor
- **Análise de Dependências**: Obter grafos de dependências de recursos com detecção de referências circulares
- **Buscador de Uso de Recursos**: Encontrar todos os usos de um recurso em todo o projeto
- **Parser de Log de Erros**: Analisar logs de erros do Godot com sugestões
- **Verificação de Saúde do Projeto**: Análise abrangente do projeto com pontuação
- **Busca no Projeto**: Buscar texto/padrões em todos os arquivos do projeto

---

## Requisitos

- [Godot Engine 4.x](https://godotengine.org/download) instalado no seu sistema
- Node.js 18+ e npm
- Um assistente de IA que suporte MCP (Claude Desktop, Cline, Cursor, OpenCode, etc.)

---

## Instalação e Configuração

### 🚀 Instalação com Um Clique (Recomendado)

**Linux / macOS**
```bash
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install.sh | bash
```

Este script irá:
- ✅ Verificar pré-requisitos (Git, Node.js 18+, npm)
- ✅ Clonar o repositório em `~/.local/share/godot-mcp`
- ✅ Instalar dependências e fazer build automaticamente
- ✅ Detectar automaticamente a instalação do Godot
- ✅ Mostrar instruções de configuração para seu assistente de IA

---

### Instalar via npm (Mais Rápido)

```bash
npx gopeak
```

Ou instalar globalmente:
```bash
npm install -g gopeak
gopeak
```

---

### Instalação Manual

#### Passo 1: Instalar e Fazer Build

```bash
git clone https://github.com/HaD0Yun/godot-mcp.git
cd godot-mcp
npm install
npm run build
```

#### Passo 2: Configurar com seu Assistente de IA

**Cline (VS Code):**
```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/caminho/absoluto/para/godot-mcp/build/index.js"],
      "env": {
        "GODOT_PATH": "/caminho/para/godot",
        "DEBUG": "true"
      },
      "disabled": false
    }
  }
}
```

**Claude Desktop:**
```json
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["/caminho/absoluto/para/godot-mcp/build/index.js"],
      "env": {
        "GODOT_PATH": "/caminho/para/godot"
      }
    }
  }
}
```

**OpenCode:**
```json
{
  "mcp": {
    "godot": {
      "type": "local",
      "command": ["node", "/caminho/absoluto/para/godot-mcp/build/index.js"],
      "enabled": true,
      "environment": {
        "GODOT_PATH": "/caminho/para/godot"
      }
    }
  }
}
```

### Passo 3: Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `GODOT_PATH` | Caminho para o executável do Godot (detectado automaticamente se não definido) |
| `DEBUG` | Definir como "true" para log detalhado |

---

## Prompts de Exemplo

Após configurado, você pode usar linguagem natural para controlar o Godot:

### Construção de Cenas
```
"Crie uma nova cena com um nó raiz CharacterBody2D chamado Player"
"Adicione um Sprite2D e CollisionShape2D à minha cena Player"
"Duplique o nó Enemy e nomeie-o Enemy2"
```

### Operações de Script
```
"Crie um GDScript para meu player com movimento e pulo"
"Adicione uma função take_damage ao meu script de player que emite um sinal health_changed"
"Mostre-me a estrutura do meu script PlayerController"
```

### Gerenciamento de Recursos
```
"Crie um StandardMaterial3D vermelho para meu inimigo"
"Crie um shader canvas_item com efeito de dissolução"
"Gere um TileSet a partir do meu tilemap_atlas.png com tiles 16x16"
```

### Análise do Projeto
```
"Verifique a saúde do meu projeto e mostre-me os problemas"
"Encontre todos os arquivos que usam o recurso PlayerData"
"Mostre-me o grafo de dependências para minha cena principal"
```

### Depuração
```
"Execute meu projeto e mostre-me os erros"
"Analise meu log de erros do Godot e sugira correções"
"Inspecione a árvore de cenas do meu jogo em execução"
```

---

## Addons Incluídos

### Plugin Auto Reload (Recomendado)

**Essencial para o fluxo de trabalho MCP** - recarrega automaticamente cenas e scripts quando modificados externamente.

**Linux / macOS:**
```bash
# Execute na pasta do seu projeto Godot
curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install-addon.sh | bash
```

**Instalação Manual:**
1. Copie `build/addon/auto_reload` para a pasta `addons/` do seu projeto
2. Abra seu projeto no Godot
3. Vá em **Projeto > Configurações do Projeto > Plugins**
4. Ative "Godot MCP Auto Reload"

**⚠️ Aviso**: Se você modificar uma cena no editor E externamente ao mesmo tempo, as mudanças do editor serão perdidas.

---

## Arquitetura

GoPeak usa uma arquitetura híbrida:

1. **Comandos CLI Diretos**: Operações simples usam a CLI integrada do Godot
2. **GDScript Empacotado**: Operações complexas usam um script `godot_operations.gd` abrangente com introspecção ClassDB
3. **Addon de Runtime**: Servidor TCP (porta 7777) para depuração ao vivo, captura de screenshots e injeção de entrada
4. **Integração Godot LSP**: Conecta ao Language Server do editor Godot (porta 6005) para diagnósticos GDScript
5. **Integração Godot DAP**: Conecta ao Debug Adapter do Godot (porta 6006) para breakpoints e stepping
6. **Recursos MCP**: Protocolo URI `godot://` para acesso direto a arquivos do projeto

---

## Solução de Problemas

| Problema | Solução |
|---------|---------|
| Godot não encontrado | Definir variável de ambiente `GODOT_PATH` |
| Problemas de conexão | Reiniciar seu assistente de IA |
| Caminho de projeto inválido | Garantir que o caminho contenha `project.godot` |
| Erros de build | Executar `npm install` para instalar dependências |
| Ferramentas de runtime não funcionando | Instalar e ativar o addon no seu projeto |

---

## Contribuindo

Contribuições são bem-vindas! Por favor, leia o guia [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licença

Licença MIT - veja [LICENSE](LICENSE) para detalhes.

---

## Estatísticas

- **95+ Ferramentas** — ferramentas abrangentes cobrindo gerenciamento de cenas, scripting, recursos, animação, configuração, depuração, screenshots, injeção de entrada, LSP, DAP e gerenciamento de assets
- **Recursos MCP** — protocolo URI `godot://` para acesso direto a arquivos do projeto
- **GDScript LSP** — diagnósticos em tempo real, completações, hover e símbolos via Language Server do Godot
- **Adaptador de Depuração (DAP)** — breakpoints, stepping, stack traces e captura de saída do console
- **Captura de Screenshots** — captura de viewport de jogos em execução via addon de runtime
- **Injeção de Entrada** — simulação de teclado, mouse e ações para testes automatizados
- **Introspecção ClassDB** — a IA descobre dinamicamente classes, propriedades e métodos do Godot em vez de depender de definições de ferramentas codificadas
- **20.000+ linhas** de TypeScript e GDScript
- **~85% de cobertura** das capacidades do Godot Engine
- **Godot 4.x** suporte completo (incluindo recursos UID do 4.4+)
- Plugin **Auto Reload** para integração MCP perfeita
- **Biblioteca de Assets Multi-Fonte** com assets CC0 de Poly Haven, AmbientCG e Kenney
- **Pacote npm** — instale com `npx gopeak` ou `npm install -g gopeak`

---

## Créditos

- Servidor MCP original por [Coding-Solo](https://github.com/Coding-Solo/godot-mcp)
- Plugin Auto Reload e pacote unificado por [HaD0Yun](https://github.com/HaD0Yun)
