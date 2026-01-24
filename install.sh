#!/bin/bash
#
# Godot MCP Installer for Linux/macOS
# One-click installation script
#
# Usage:
#   curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install.sh | bash
#
# Options:
#   -d, --dir PATH      Installation directory (default: ~/.local/share/godot-mcp)
#   -g, --godot PATH    Path to Godot executable
#   -c, --configure     Show configuration for AI assistants
#   -h, --help          Show help message
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Default values
INSTALL_DIR="${HOME}/.local/share/godot-mcp"
GODOT_PATH=""
SHOW_CONFIGURE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            INSTALL_DIR="$2"
            shift 2
            ;;
        -g|--godot)
            GODOT_PATH="$2"
            shift 2
            ;;
        -c|--configure)
            SHOW_CONFIGURE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Godot MCP Installer"
            echo ""
            echo "Usage: install.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -d, --dir PATH        Installation directory (default: ~/.local/share/godot-mcp)"
            echo "  -g, --godot PATH      Path to Godot executable"
            echo "  -c, --configure NAME  Show config for: claude, cursor, cline, opencode"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Banner
echo -e "${CYAN}"
echo "====================================="
echo "     Godot MCP Installer"
echo "     Linux / macOS"
echo "====================================="
echo -e "${NC}"

# Function to print status
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install git first."
        echo "  Ubuntu/Debian: sudo apt install git"
        echo "  Fedora: sudo dnf install git"
        echo "  macOS: xcode-select --install"
        exit 1
    fi
    print_success "Git found: $(git --version)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "  Visit: https://nodejs.org/en/download/"
        echo "  Or use nvm: https://github.com/nvm-sh/nvm"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js found: $(node -v)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    print_success "npm found: $(npm -v)"
}

# Detect Godot installation
detect_godot() {
    print_status "Detecting Godot installation..."
    
    if [ -n "$GODOT_PATH" ]; then
        if [ -f "$GODOT_PATH" ]; then
            print_success "Using specified Godot: $GODOT_PATH"
            return
        else
            print_warning "Specified Godot path not found: $GODOT_PATH"
        fi
    fi
    
    # Common Godot executable names
    GODOT_NAMES=("godot4" "godot" "godot-4" "Godot" "Godot_v4" "godot4.3" "godot4.2" "godot4.1")
    
    for name in "${GODOT_NAMES[@]}"; do
        if command -v "$name" &> /dev/null; then
            GODOT_PATH=$(command -v "$name")
            print_success "Found Godot: $GODOT_PATH"
            return
        fi
    done
    
    # Check common installation paths
    GODOT_PATHS=(
        "/usr/bin/godot4"
        "/usr/bin/godot"
        "/usr/local/bin/godot4"
        "/usr/local/bin/godot"
        "$HOME/.local/bin/godot4"
        "$HOME/.local/bin/godot"
        "/opt/godot/godot"
        "/snap/bin/godot"
        "/Applications/Godot.app/Contents/MacOS/Godot"
        "$HOME/Applications/Godot.app/Contents/MacOS/Godot"
    )
    
    for path in "${GODOT_PATHS[@]}"; do
        if [ -f "$path" ]; then
            GODOT_PATH="$path"
            print_success "Found Godot: $GODOT_PATH"
            return
        fi
    done
    
    # Check for Godot in Downloads (common for Linux)
    if [ -d "$HOME/Downloads" ]; then
        FOUND=$(find "$HOME/Downloads" -maxdepth 2 -name "Godot*" -type f -executable 2>/dev/null | head -n1)
        if [ -n "$FOUND" ]; then
            GODOT_PATH="$FOUND"
            print_success "Found Godot in Downloads: $GODOT_PATH"
            return
        fi
    fi
    
    print_warning "Godot not found automatically. You'll need to set GODOT_PATH manually."
    GODOT_PATH=""
}

# Clone or update repository
install_repository() {
    print_status "Installing Godot MCP to: $INSTALL_DIR"
    
    if [ -d "$INSTALL_DIR" ]; then
        print_status "Directory exists. Updating..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_status "Cloning repository..."
        mkdir -p "$(dirname "$INSTALL_DIR")"
        git clone https://github.com/HaD0Yun/godot-mcp.git "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    print_success "Repository ready"
}

# Install dependencies and build
build_project() {
    print_status "Installing dependencies..."
    cd "$INSTALL_DIR"
    npm install
    
    print_status "Building project..."
    npm run build
    
    print_success "Build complete"
}

# Show configuration for AI assistants
show_configuration() {
    local build_path="$INSTALL_DIR/build/index.js"
    local godot_env=""
    
    if [ -n "$GODOT_PATH" ]; then
        godot_env="\"GODOT_PATH\": \"$GODOT_PATH\""
    else
        godot_env="\"GODOT_PATH\": \"/path/to/godot\""
    fi
    
    echo ""
    echo -e "${CYAN}====================================="
    echo "  Configuration for AI Assistants"
    echo -e "=====================================${NC}"
    echo ""
    
    if [ "$SHOW_CONFIGURE" = "claude" ] || [ -z "$SHOW_CONFIGURE" ]; then
        echo -e "${BOLD}Claude Desktop${NC} (claude_desktop_config.json):"
        echo -e "${GREEN}"
        cat << EOF
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["$build_path"],
      "env": {
        $godot_env
      }
    }
  }
}
EOF
        echo -e "${NC}"
    fi
    
    if [ "$SHOW_CONFIGURE" = "cline" ] || [ -z "$SHOW_CONFIGURE" ]; then
        echo -e "${BOLD}Cline (VS Code)${NC}:"
        echo -e "${GREEN}"
        cat << EOF
{
  "mcpServers": {
    "godot": {
      "command": "node",
      "args": ["$build_path"],
      "env": {
        $godot_env,
        "DEBUG": "true"
      },
      "disabled": false
    }
  }
}
EOF
        echo -e "${NC}"
    fi
    
    if [ "$SHOW_CONFIGURE" = "cursor" ] || [ -z "$SHOW_CONFIGURE" ]; then
        echo -e "${BOLD}Cursor${NC}:"
        echo "  1. Go to Cursor Settings > Features > MCP"
        echo "  2. Click + Add New MCP Server"
        echo "  3. Name: godot, Type: command"
        echo -e "  4. Command: ${GREEN}node $build_path${NC}"
        echo ""
    fi
    
    if [ "$SHOW_CONFIGURE" = "opencode" ] || [ -z "$SHOW_CONFIGURE" ]; then
        echo -e "${BOLD}OpenCode${NC} (opencode.json):"
        echo -e "${GREEN}"
        cat << EOF
{
  "mcp": {
    "godot": {
      "type": "local",
      "command": ["node", "$build_path"],
      "enabled": true,
      "environment": {
        $godot_env
      }
    }
  }
}
EOF
        echo -e "${NC}"
    fi
}

# Main installation flow
main() {
    check_prerequisites
    detect_godot
    install_repository
    build_project
    
    echo ""
    echo -e "${GREEN}====================================="
    echo "  Installation Complete!"
    echo -e "=====================================${NC}"
    echo ""
    echo -e "Installation directory: ${BOLD}$INSTALL_DIR${NC}"
    echo -e "Build output: ${BOLD}$INSTALL_DIR/build/index.js${NC}"
    
    if [ -n "$GODOT_PATH" ]; then
        echo -e "Godot executable: ${BOLD}$GODOT_PATH${NC}"
    else
        echo -e "${YELLOW}Godot not found. Set GODOT_PATH in your AI assistant config.${NC}"
    fi
    
    show_configuration
    
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Copy the configuration above to your AI assistant"
    echo "  2. Restart your AI assistant"
    echo "  3. Start using Godot MCP!"
    echo ""
    echo "  For addon installation in your Godot project:"
    echo -e "  ${GREEN}curl -sL https://raw.githubusercontent.com/HaD0Yun/godot-mcp/main/install-addon.sh | bash${NC}"
    echo ""
    echo "For more info: https://github.com/HaD0Yun/godot-mcp"
}

main
