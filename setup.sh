#!/bin/bash

# =============================================================================
# Pump.fun Trending Bot - Автоматическая установка
# =============================================================================
# Этот скрипт поможет создать GitHub репозиторий и подготовить к деплою
# =============================================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции вывода
print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║     🚀 Pump.fun Trending Bot - Автоматическая установка      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

# Проверка зависимостей
check_dependencies() {
    print_step "Проверка зависимостей..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git не установлен. Установи: https://git-scm.com/downloads"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js не установлен. Установи: https://nodejs.org/"
        exit 1
    fi
    
    print_success "Все зависимости установлены"
}

# Проверка GitHub токена
check_github_token() {
    if [ -z "$GITHUB_TOKEN" ]; then
        print_info "Для автоматического создания репозитория нужен GitHub токен"
        print_info "1. Открой: https://github.com/settings/tokens/new"
        print_info "2. Выбери scope: 'repo'"
        print_info "3. Скопируй токен"
        echo ""
        read -p "Введи GitHub токен (или нажми Enter для ручного режима): " GITHUB_TOKEN
        
        if [ -z "$GITHUB_TOKEN" ]; then
            return 1
        fi
    fi
    return 0
}

# Создание репозитория на GitHub
create_github_repo() {
    local repo_name="pump-trending-bot"
    
    print_step "Создание репозитория на GitHub..."
    
    # Проверяем, существует ли уже репо
    if curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$GITHUB_USER/$repo_name" | grep -q "Not Found"; then
        
        # Создаём репо
        curl -s -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -X POST \
            -d "{\"name\":\"$repo_name\",\"private\":false,\"auto_init\":false}" \
            "https://api.github.com/user/repos" > /dev/null
        
        print_success "Репозиторий создан: https://github.com/$GITHUB_USER/$repo_name"
    else
        print_info "Репозиторий уже существует"
    fi
    
    echo "https://github.com/$GITHUB_USER/$repo_name"
}

# Инициализация git и пуш
setup_git() {
    local repo_url=$1
    
    print_step "Инициализация Git репозитория..."
    
    # Удаляем старую папку .git если есть
    rm -rf .git
    
    # Инициализируем
    git init
    git add .
    git commit -m "Initial commit: Pump.fun Trending Bot"
    
    # Добавляем remote
    git branch -M main
    git remote add origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USER/pump-trending-bot.git"
    
    # Пушим
    git push -u origin main --force
    
    print_success "Код загружен на GitHub!"
}

# Ручной режим
manual_mode() {
    print_header
    print_info "РУЧНОЙ РЕЖИМ УСТАНОВКИ"
    echo ""
    print_step "Следуй этим шагам:"
    echo ""
    echo -e "${GREEN}1. Создай репозиторий на GitHub:${NC}"
    echo "   - Открой: https://github.com/new"
    echo "   - Repository name: pump-trending-bot"
    echo "   - Выбери 'Public'"
    echo "   - НЕ добавляй README (уже есть)"
    echo "   - Нажми 'Create repository'"
    echo ""
    echo -e "${GREEN}2. Загрузи код:${NC}"
    echo "   В этой папке выполни:"
    echo ""
    echo -e "${YELLOW}   git init${NC}"
    echo -e "${YELLOW}   git add .${NC}"
    echo -e "${YELLOW}   git commit -m 'Initial commit'${NC}"
    echo -e "${YELLOW}   git branch -M main${NC}"
    echo -e "${YELLOW}   git remote add origin https://github.com/ТВОЙ_ЮЗЕРНЕЙМ/pump-trending-bot.git${NC}"
    echo -e "${YELLOW}   git push -u origin main${NC}"
    echo ""
    echo -e "${GREEN}3. Деплой на Railway:${NC}"
    echo "   - Открой: https://railway.com"
    echo "   - Залогинься через GitHub"
    echo "   - New Project → Deploy from GitHub repo"
    echo "   - Выбери pump-trending-bot"
    echo "   - Перейди в Variables и добавь:"
    echo "     • BOT_TOKEN (от @BotFather)"
    echo "     • CHAT_ID (ID чата/канала)"
    echo "     • POLL_INTERVAL_MS=15000"
    echo ""
    echo -e "${GREEN}4. Готово! Бот запустится автоматически.${NC}"
    echo ""
}

# Главная функция
main() {
    print_header
    
    # Проверяем зависимости
    check_dependencies
    
    # Проверяем GitHub токен
    if ! check_github_token; then
        manual_mode
        exit 0
    fi
    
    # Получаем username
    print_step "Получение информации о GitHub аккаунте..."
    GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/user" | grep -o '"login":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$GITHUB_USER" ]; then
        print_error "Не удалось получить GitHub username. Проверь токен."
        exit 1
    fi
    
    print_success "GitHub пользователь: $GITHUB_USER"
    
    # Создаём репо
    REPO_URL=$(create_github_repo)
    
    # Настраиваем git
    setup_git "$REPO_URL"
    
    # Финальное сообщение
    echo ""
    print_header
    print_success "Репозиторий готов!"
    echo ""
    print_info "Следующие шаги:"
    echo ""
    echo -e "${GREEN}1. Перейди на Railway:${NC} https://railway.com"
    echo -e "${GREEN}2. Залогинься через GitHub${NC}"
    echo -e "${GREEN}3. New Project → Deploy from GitHub repo${NC}"
    echo -e "${GREEN}4. Выбери: pump-trending-bot${NC}"
    echo ""
    echo -e "${YELLOW}Важно: Добавь переменные в Railway Variables:${NC}"
    echo -e "   • BOT_TOKEN = токен от @BotFather"
    echo -e "   • CHAT_ID = ID чата (начинается с -100 для каналов)"
    echo -e "   • POLL_INTERVAL_MS = 15000"
    echo ""
    echo -e "${GREEN}Репозиторий: $REPO_URL${NC}"
    echo ""
    print_success "Удачи! 🚀"
}

# Запуск
main "$@"
