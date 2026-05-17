const { createApp } = Vue;

createApp({
    data() {
        return {
            quizStarted: false,
            showResult: false,
            currentQuestion: 0,
            answers: [],
            questions: [
                // 問題 1：最佳工作時段
                {
                    category: '⏰ 工作節奏',
                    question: '什麼時候是你的黃金工作時段？',
                    options: [
                        { emoji: '🌅', text: '早晨清醒時段（7-10點）', value: 'morning_early' },
                        { emoji: '☀️', text: '上午專注時段（10-12點）', value: 'morning_late' },
                        { emoji: '🌤️', text: '下午活力時段（14-17點）', value: 'afternoon' },
                        { emoji: '🌙', text: '夜貓子時段（19點後）', value: 'night' }
                    ]
                },
                // 問題 2：專注時間長度
                {
                    category: '⏰ 工作節奏',
                    question: '你偏好的專注工作時長是？',
                    options: [
                        { emoji: '⚡', text: '短衝刺（25-30分鐘）', value: 'sprint_short' },
                        { emoji: '🎯', text: '中等時段（45-60分鐘）', value: 'sprint_medium' },
                        { emoji: '🏃', text: '長跑模式（90分鐘以上）', value: 'sprint_long' },
                        { emoji: '🌊', text: '彈性調整，依任務而定', value: 'flexible' }
                    ]
                },
                // 問題 3：溝通偏好
                {
                    category: '💬 工作方式',
                    question: '遇到問題時，你偏好哪種溝通方式？',
                    options: [
                        { emoji: '💬', text: '即時訊息快速討論', value: 'chat' },
                        { emoji: '📞', text: '直接通話面對面溝通', value: 'call' },
                        { emoji: '✉️', text: '郵件詳細說明', value: 'email' },
                        { emoji: '📝', text: '文件共享非同步協作', value: 'document' }
                    ]
                },
                // 問題 4：協作風格
                {
                    category: '💬 工作方式',
                    question: '在團隊專案中，你通常扮演什麼角色？',
                    options: [
                        { emoji: '🎨', text: '創意發想者', value: 'creator' },
                        { emoji: '📋', text: '計劃組織者', value: 'organizer' },
                        { emoji: '🔧', text: '實際執行者', value: 'executor' },
                        { emoji: '🔍', text: '品質把關者', value: 'reviewer' }
                    ]
                },
                // 問題 5：回饋方式
                {
                    category: '💡 個人偏好',
                    question: '你偏好接收什麼樣的回饋？',
                    options: [
                        { emoji: '🎯', text: '直接明確的建議', value: 'direct' },
                        { emoji: '💭', text: '引導式的提問', value: 'guided' },
                        { emoji: '📊', text: '數據導向的分析', value: 'data' },
                        { emoji: '🤝', text: '私下一對一討論', value: 'private' }
                    ]
                },
                // 問題 6：決策風格
                {
                    category: '💡 個人偏好',
                    question: '做決策時，你通常？',
                    options: [
                        { emoji: '🚀', text: '快速果斷，邊做邊調整', value: 'fast' },
                        { emoji: '🤔', text: '深思熟慮，蒐集足夠資訊', value: 'thoughtful' },
                        { emoji: '👥', text: '尋求團隊共識', value: 'consensus' },
                        { emoji: '📚', text: '依據過往經驗和數據', value: 'experience' }
                    ]
                },
                // 問題 7：我的承諾
                {
                    category: '🤝 我的承諾',
                    question: '你希望同事知道你的承諾是？',
                    options: [
                        { emoji: '⏰', text: '準時回應，24小時內回覆', value: 'responsive' },
                        { emoji: '🎯', text: '保證品質，絕不草率交件', value: 'quality' },
                        { emoji: '🤝', text: '團隊優先，互相支援', value: 'teamwork' },
                        { emoji: '📢', text: '透明溝通，有問題立即說', value: 'transparent' }
                    ]
                },
                // 問題 8：工作地雷
                {
                    category: '⚠️ 工作地雷',
                    question: '什麼情況會讓你工作起來特別困擾？',
                    options: [
                        { emoji: '🚨', text: '最後一刻的緊急任務', value: 'urgent' },
                        { emoji: '🔄', text: '頻繁變更的需求', value: 'changes' },
                        { emoji: '📱', text: '工作時間的突然打斷', value: 'interruption' },
                        { emoji: '🤷', text: '目標不明確的專案', value: 'unclear' }
                    ]
                }
            ]
        };
    },
    computed: {
        progressPercentage() {
            return ((this.currentQuestion + 1) / this.questions.length) * 100;
        },
        resultSections() {
            // 遍歷所有問題，確保每個問題都有對應的答案
            return this.questions
                .map((question, index) => {
                    const answer = this.answers[index];
                    // 只返回有答案的問題
                    if (answer && answer.answer) {
                        return {
                            title: `${answer.category}`,
                            question: answer.question,
                            answer: {
                                emoji: answer.answer.emoji,
                                text: answer.answer.text
                            }
                        };
                    }
                    return null;
                })
                .filter(section => section !== null); // 過濾掉沒有答案的問題
        }
    },
    methods: {
        startQuiz() {
            this.quizStarted = true;
            this.currentQuestion = 0;
            this.answers = [];
        },
        selectAnswer(option) {
            // 記錄答案
            this.answers[this.currentQuestion] = {
                category: this.questions[this.currentQuestion].category,
                question: this.questions[this.currentQuestion].question,
                answer: option
            };

            // 前進到下一題或顯示結果
            if (this.currentQuestion < this.questions.length - 1) {
                this.currentQuestion++;
            } else {
                this.showResult = true;
            }
        },
        previousQuestion() {
            if (this.currentQuestion > 0) {
                this.currentQuestion--;
            }
        },
        generateSummary() {
            const summaries = [
                '你是一個注重效率與品質平衡的工作者！',
                '你擅長與團隊協作，創造美好的工作氛圍！',
                '你有自己獨特的工作節奏，並且善於溝通！',
                '你重視清晰的目標與良好的工作流程！',
                '你是值得信賴的團隊成員，做事有始有終！'
            ];
            return summaries[Math.floor(Math.random() * summaries.length)];
        },

        downloadReport() {
            // 產生報告文字
            let reportText = '========================================\n';
            reportText += '      你的工作使用說明書\n';
            reportText += '========================================\n\n';
            reportText += `摘要：${this.generateSummary()}\n\n`;

            const sections = this.resultSections;
            sections.forEach((section, index) => {
                reportText += `${index + 1}. ${section.title}\n`;
                reportText += `問題：${section.question}\n`;
                reportText += `答案：${section.answer.emoji} ${section.answer.text}\n\n`;
            });

            reportText += '========================================\n';
            reportText += '生成時間：' + new Date().toLocaleString('zh-TW') + '\n';
            reportText += '========================================\n';

            // 建立下載連結
            const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '我的工作使用說明書.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },
        restartQuiz() {
            this.quizStarted = false;
            this.showResult = false;
            this.currentQuestion = 0;
            this.answers = [];
        }
    }
}).mount('#app');
