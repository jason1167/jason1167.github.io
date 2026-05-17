// i18n 多國語系控制器
const I18N = {
    // 支援的語系列表
    supportedLangs: {
        'zh-TW': { name: '繁體中文', flag: '🇹🇼', data: null, file: 'LANG_ZH_TW' },
        'zh-CN': { name: '简体中文', flag: '🇨🇳', data: null, file: 'LANG_ZH_CN' },
        'en':    { name: 'English',  flag: '🇺🇸', data: null, file: 'LANG_EN' },
        'ja':    { name: '日本語',   flag: '🇯🇵', data: null, file: 'LANG_JA' },
        'hi':    { name: 'हिन्दी',    flag: '🇮🇳', data: null, file: 'LANG_HI' },
        'ko':    { name: '한국어',   flag: '🇰🇷', data: null, file: 'LANG_KO' }
    },

    currentLang: 'zh-TW',

    // 初始化：偵測瀏覽器語系或讀取使用者偏好
    init() {
        // 優先讀取 localStorage
        const saved = localStorage.getItem('mbti64_lang');
        if (saved && this.supportedLangs[saved]) {
            this.currentLang = saved;
        } else {
            // 偵測瀏覽器語系
            const browserLang = navigator.language || navigator.userLanguage || 'zh-TW';
            if (this.supportedLangs[browserLang]) {
                this.currentLang = browserLang;
            } else {
                // 模糊匹配（例如 zh -> zh-TW, en-GB -> en）
                const prefix = browserLang.split('-')[0];
                const match = Object.keys(this.supportedLangs).find(k => k.startsWith(prefix));
                if (match) this.currentLang = match;
            }
        }

        // 綁定語系資料
        this.supportedLangs['zh-TW'].data = LANG_ZH_TW;
        this.supportedLangs['zh-CN'].data = LANG_ZH_CN;
        this.supportedLangs['en'].data    = LANG_EN;
        this.supportedLangs['ja'].data    = LANG_JA;
        this.supportedLangs['hi'].data    = LANG_HI;
        this.supportedLangs['ko'].data    = LANG_KO;

        this.renderSwitcher();
        this.applyLang(this.currentLang);
    },

    // 取得翻譯文字
    t(key) {
        const lang = this.supportedLangs[this.currentLang];
        if (lang && lang.data && lang.data[key] !== undefined) {
            return lang.data[key];
        }
        // fallback 到繁體中文
        return LANG_ZH_TW[key] || key;
    },

    // 取得題目列表
    getQuestions() {
        return this.t('questions');
    },

    // 切換語系
    switchLang(langCode) {
        if (!this.supportedLangs[langCode]) return;
        this.currentLang = langCode;
        localStorage.setItem('mbti64_lang', langCode);
        this.applyLang(langCode);
        this.updateSwitcherUI();
    },

    // 套用語系到整個頁面
    applyLang(langCode) {
        const lang = this.supportedLangs[langCode];
        if (!lang || !lang.data) return;
        const d = lang.data;

        // 設定 HTML lang 屬性
        document.documentElement.lang = langCode;

        // 頁面標題
        document.title = d.pageTitle;

        // 開始頁面
        const introTitle = document.querySelector('#intro .intro-header h1');
        const introDesc = document.querySelector('#intro .intro-header p');
        if (introTitle) introTitle.textContent = d.introTitle;
        if (introDesc) introDesc.textContent = d.introDesc;

        // 性別選擇
        const genderLabels = document.querySelectorAll('.gender-selector label');
        if (genderLabels.length >= 2) {
            genderLabels[0].innerHTML = `<input type="radio" name="gender" value="male" checked> ${d.genderMale}`;
            genderLabels[1].innerHTML = `<input type="radio" name="gender" value="female"> ${d.genderFemale}`;
        }

        // 開始按鈕
        const startBtn = document.querySelector('#intro .btn-retry');
        if (startBtn) startBtn.textContent = d.startBtn;

        // 測驗選項按鈕
        const optBtns = document.querySelectorAll('.options-grid .opt-btn');
        if (optBtns.length >= 5) {
            optBtns[0].textContent = d.opt3;
            optBtns[1].textContent = d.opt1;
            optBtns[2].textContent = d.opt0;
            optBtns[3].textContent = d.optN1;
            optBtns[4].textContent = d.optN3;
        }

        // 結果頁面靜態區塊
        const rarityTag = document.getElementById('rarity-tag');
        if (rarityTag) rarityTag.textContent = d.rarityTag;

        const sectionTitles = document.querySelectorAll('.info-card h4');
        if (sectionTitles.length >= 4) {
            sectionTitles[0].textContent = d.sectionAdvTitle;
            sectionTitles[1].textContent = d.sectionWorkTitle;
            sectionTitles[2].textContent = d.sectionStressTitle;
            sectionTitles[3].textContent = d.sectionTipsTitle;
        }

        const btnPrint = document.querySelector('.btn-print');
        const btnRetry = document.querySelector('.action-btns .btn-retry');
        if (btnPrint) btnPrint.textContent = d.btnPrint;
        if (btnRetry) btnRetry.textContent = d.btnRetry;

        // 如果正在顯示題目，更新當前題目
        const qText = document.getElementById('q-text');
        if (qText && qText.textContent && typeof window.curQuestionIndex !== 'undefined') {
            const questions = d.questions;
            if (questions && questions[window.curQuestionIndex]) {
                qText.innerText = `${window.curQuestionIndex + 1}. ${questions[window.curQuestionIndex].t}`;
            }
        }
    },

    // 渲染語系切換器
    renderSwitcher() {
        const switcher = document.getElementById('lang-switcher');
        if (!switcher) return;

        const currentInfo = this.supportedLangs[this.currentLang];
        
        switcher.innerHTML = `
            <button class="lang-toggle" id="lang-toggle-btn" aria-label="Switch language">
                <span class="lang-flag">${currentInfo.flag}</span>
                <span class="lang-name">${currentInfo.name}</span>
                <svg class="lang-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
            <div class="lang-dropdown" id="lang-dropdown">
                ${Object.entries(this.supportedLangs).map(([code, info]) => `
                    <button class="lang-option ${code === this.currentLang ? 'active' : ''}" 
                            data-lang="${code}">
                        <span class="lang-flag">${info.flag}</span>
                        <span>${info.name}</span>
                    </button>
                `).join('')}
            </div>
        `;

        // 綁定事件
        const toggleBtn = document.getElementById('lang-toggle-btn');
        const dropdown = document.getElementById('lang-dropdown');

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
            toggleBtn.classList.toggle('open');
        });

        dropdown.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = btn.dataset.lang;
                this.switchLang(lang);
                dropdown.classList.remove('show');
                toggleBtn.classList.remove('open');
            });
        });

        // 點擊外部關閉
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
            toggleBtn.classList.remove('open');
        });
    },

    // 更新切換器 UI
    updateSwitcherUI() {
        const currentInfo = this.supportedLangs[this.currentLang];
        const toggleBtn = document.getElementById('lang-toggle-btn');
        if (toggleBtn) {
            toggleBtn.querySelector('.lang-flag').textContent = currentInfo.flag;
            toggleBtn.querySelector('.lang-name').textContent = currentInfo.name;
        }

        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
        });
    }
};
