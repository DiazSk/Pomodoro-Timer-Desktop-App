class PomodoroTimer {
    constructor() {
        this.workTime = 25;
        this.breakTime = 5;
        this.timeLeft = this.workTime * 60;
        this.isRunning = false;
        this.isWorkSession = true;
        this.timer = null;
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.pomodorosCompleted = 0;
        this.focusTime = 0;
        this.dailyStreak = parseInt(localStorage.getItem('dailyStreak')) || 0;
        this.lastActiveDate = localStorage.getItem('lastActiveDate');
        this.breakActivities = [
            "Stand up and stretch",
            "Take a short walk",
            "Do some quick exercises",
            "Drink water and rest your eyes",
            "Practice deep breathing",
            "Meditate for a few minutes"
        ];
        this.selectedTask = null;
        this.filters = {
            status: 'all',
            priority: 'all',
            category: 'all'
        };
        
        this.analytics = {
            weeklyData: JSON.parse(localStorage.getItem('weeklyData')) || this.initializeWeeklyData(),
            productivityHours: JSON.parse(localStorage.getItem('productivityHours')) || Array(24).fill(0),
            taskDistribution: JSON.parse(localStorage.getItem('taskDistribution')) || {
                work: 0, study: 0, personal: 0, health: 0
            }
        };
        
        this.charts = {};
        this.initializeElements();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.checkDailyStreak();
        this.requestNotificationPermission();
        this.renderTodos();
        this.initializeCharts();
        this.updateAnalytics();
        
        this.achievements = {
            streaks: [],
            badges: [],
            level: 1,
            experience: 0,
            nextLevelExp: 100
        };
        
        this.loadAchievements();
        this.setupDataManagement();
    }

    initializeElements() {
        this.minutesDisplay = document.getElementById('minutes');
        this.secondsDisplay = document.getElementById('seconds');
        this.startButton = document.getElementById('start');
        this.stopButton = document.getElementById('stop');
        this.resetButton = document.getElementById('reset');
        this.sessionType = document.getElementById('session-type');
        this.progress = document.getElementById('progress');
        this.workTimeInput = document.getElementById('work-time');
        this.breakTimeInput = document.getElementById('break-time');
        this.todoInput = document.getElementById('todo-input');
        this.addTodoButton = document.getElementById('add-todo');
        this.todoList = document.getElementById('todo-list');
        this.timerSound = document.getElementById('timer-sound');
        this.taskCategory = document.getElementById('task-category');
        this.taskPriority = document.getElementById('task-priority');
        this.tasksCompletedElement = document.getElementById('tasks-completed');
        this.totalTasksElement = document.getElementById('total-tasks');
        this.focusTimeElement = document.getElementById('focus-time');
        this.pomodorosCompletedElement = document.getElementById('pomodoros-completed');
        this.dailyStreakElement = document.getElementById('daily-streak');
        this.productiveTimeElement = document.getElementById('productive-time');
        this.focusScoreElement = document.getElementById('focus-score');
        this.breakSuggestionsElement = document.getElementById('break-suggestions');
        this.breakActivityElement = document.getElementById('break-activity');
        this.enableNotifications = document.getElementById('enable-notifications');
        this.currentTaskDisplay = document.getElementById('current-task-name');
        this.currentTaskCategory = document.getElementById('current-task-category');
        this.currentTaskPriority = document.getElementById('current-task-priority');
        this.statusFilter = document.getElementById('status-filter');
        this.priorityFilter = document.getElementById('priority-filter');
        this.categoryFilter = document.getElementById('category-filter');
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startTimer());
        this.stopButton.addEventListener('click', () => this.stopTimer());
        this.resetButton.addEventListener('click', () => this.resetTimer());
        this.workTimeInput.addEventListener('change', () => this.updateWorkTime());
        this.breakTimeInput.addEventListener('change', () => this.updateBreakTime());
        this.addTodoButton.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        this.statusFilter.addEventListener('change', () => this.updateFilters());
        this.priorityFilter.addEventListener('change', () => this.updateFilters());
        this.categoryFilter.addEventListener('change', () => this.updateFilters());
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.isRunning ? this.stopTimer() : this.startTimer();
            }
            if (e.code === 'KeyR' && !e.target.matches('input, textarea')) {
                this.resetTimer();
            }
            if (e.ctrlKey && e.code === 'KeyN') {
                e.preventDefault();
                this.todoInput.focus();
            }
        });
    }

    checkDailyStreak() {
        const today = new Date().toLocaleDateString();
        if (this.lastActiveDate) {
            const lastDate = new Date(this.lastActiveDate);
            const daysDiff = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 1) {
                this.dailyStreak = 0;
            }
        }
        if (this.lastActiveDate !== today) {
            this.focusTime = 0;
            this.pomodorosCompleted = 0;
        }
        this.lastActiveDate = today;
        localStorage.setItem('lastActiveDate', today);
        this.updateStats();
        if (this.dailyStreak > 0) {
            this.unlockAchievement('streak', this.dailyStreak);
        }
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = seconds.toString().padStart(2, '0');
        
        const totalTime = this.isWorkSession ? this.workTime * 60 : this.breakTime * 60;
        const progress = ((totalTime - this.timeLeft) / totalTime) * 100;
        this.progress.style.width = `${progress}%`;
    }

    startTimer() {
        if (!this.isRunning) {
            if (!this.selectedTask && !confirm('No task selected. Start timer anyway?')) {
                return;
            }

            this.isRunning = true;
            this.timer = setInterval(() => {
                this.timeLeft--;
                if (this.isWorkSession && this.selectedTask) {
                    this.selectedTask.timeSpent = (this.selectedTask.timeSpent || 0) + 1;
                    this.saveTodos();
                }
                this.updateDisplay();

                if (this.timeLeft <= 0) {
                    this.timerSound.play();
                    this.switchSession();
                }
            }, 1000);
            this.startButton.disabled = true;
            
            if (this.enableNotifications.checked) {
                this.showNotification(
                    'Timer Started',
                    `${this.isWorkSession ? 'Work' : 'Break'} session started${this.selectedTask ? ` for "${this.selectedTask.text}"` : ''}`
                );
            }
        }
        this.updateAnalytics();
    }

    stopTimer() {
        if (this.isRunning) {
            clearInterval(this.timer);
            this.isRunning = false;
            this.startButton.disabled = false;
        }
    }

    resetTimer() {
        this.stopTimer();
        this.isWorkSession = true;
        this.timeLeft = this.workTime * 60;
        this.sessionType.textContent = 'Work';
        this.updateDisplay();
    }

    switchSession() {
        this.isWorkSession = !this.isWorkSession;
        this.timeLeft = (this.isWorkSession ? this.workTime : this.breakTime) * 60;
        this.sessionType.textContent = this.isWorkSession ? 'Work' : 'Break';
        this.updateDisplay();
        if (!this.isWorkSession) {
            this.pomodorosCompleted++;
            this.showBreakSuggestion();
        }
        if (this.isWorkSession) {
            if (this.selectedTask) {
                this.selectedTask.pomodorosCompleted = (this.selectedTask.pomodorosCompleted || 0) + 1;
                this.saveTodos();
                this.renderTodos();
            }
        }
        this.updateStats();
        if (this.enableNotifications.checked) {
            this.showNotification(
                `${this.isWorkSession ? 'Work' : 'Break'} Time!`,
                `Time for a ${this.isWorkSession ? 'work' : 'break'} session`
            );
        }
        this.updateAnalytics();
        if (!this.isWorkSession) {
            this.addExperience(10); // XP for completing a pomodoro
            this.unlockAchievement('pomodoro', this.pomodorosCompleted);
        }
    }

    showBreakSuggestion() {
        const activity = this.breakActivities[Math.floor(Math.random() * this.breakActivities.length)];
        this.breakActivityElement.textContent = activity;
        this.breakSuggestionsElement.style.display = 'block';
        setTimeout(() => {
            this.breakSuggestionsElement.style.display = 'none';
        }, 5000);
    }

    updateWorkTime() {
        this.workTime = parseInt(this.workTimeInput.value);
        if (this.isWorkSession) {
            this.timeLeft = this.workTime * 60;
            this.updateDisplay();
        }
    }

    updateBreakTime() {
        this.breakTime = parseInt(this.breakTimeInput.value);
        if (!this.isWorkSession) {
            this.timeLeft = this.breakTime * 60;
            this.updateDisplay();
        }
    }

    addTodo() {
        const todoText = this.todoInput.value.trim();
        if (todoText) {
            const todo = {
                id: Date.now(),
                text: todoText,
                category: this.taskCategory.value,
                priority: this.taskPriority.value,
                completed: false,
                createdAt: new Date().toISOString(),
                timeSpent: 0,
                pomodorosCompleted: 0
            };
            this.todos.push(todo);
            this.saveTodos();
            this.renderTodos();
            this.todoInput.value = '';
            this.updateStats();
        }
        this.updateAnalytics();
    }

    toggleTodo(id) {
        this.todos = this.todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        this.saveTodos();
        this.renderTodos();
        this.updateAnalytics();
        const todo = this.todos.find(t => t.id === id);
        if (todo && !todo.completed) {
            this.addExperience(5); // XP for completing a task
        }
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    selectTaskForPomodoro(task) {
        console.log('Selecting task:', task); // Add logging
        
        // Clear previous selection
        const previousSelected = document.querySelector('.selected-task');
        if (previousSelected) {
            previousSelected.classList.remove('selected-task');
        }
        
        if (this.selectedTask?.id !== task.id) {
            this.stopTimer();
            this.resetTimer();
        }
        
        this.selectedTask = task;
        
        // Update task display elements
        this.currentTaskDisplay.textContent = task.text || 'No task selected';
        this.currentTaskCategory.textContent = task.category || '';
        this.currentTaskPriority.textContent = task.priority || '';
        
        // Add visual feedback for selected task
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
        if (taskElement) {
            taskElement.classList.add('selected-task');
        }
        
        // Add color classes for category and priority
        this.currentTaskCategory.className = `category-label category-${task.category}`;
        this.currentTaskPriority.className = `priority-label priority-${task.priority}`;
        
        this.renderTodos();
        
        if (!this.isRunning) {
            this.startTimer();
        }
    }

    renderTodos() {
        this.todoList.innerHTML = '';
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        
        // Filter and sort todos
        let filteredTodos = this.todos.filter(todo => {
            const statusMatch = this.filters.status === 'all' || 
                (this.filters.status === 'completed' ? todo.completed : !todo.completed);
            const priorityMatch = this.filters.priority === 'all' || 
                todo.priority === this.filters.priority;
            const categoryMatch = this.filters.category === 'all' || 
                todo.category === this.filters.category;
            
            return statusMatch && priorityMatch && categoryMatch;
        });

        filteredTodos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item priority-${todo.priority} ${this.selectedTask?.id === todo.id ? 'selected-task' : ''}`;
            li.setAttribute('data-task-id', todo.id);
            
            li.innerHTML = `
                <div class="${todo.completed ? 'completed' : ''}">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                    <span class="todo-text">${todo.text}</span>
                    <span class="category-badge category-${todo.category}">${todo.category}</span>
                    ${todo.timeSpent ? `<span class="time-spent">Time: ${Math.round(todo.timeSpent / 60)}m</span>` : ''}
                </div>
                <div class="todo-actions">
                    <button class="start-pomodoro" title="Start Pomodoro for this task">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button class="delete-todo" title="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Add click handler to the entire task item
            li.addEventListener('click', (e) => {
                // Don't select if clicking checkbox or delete button
                if (!e.target.matches('input[type="checkbox"], .delete-todo, .delete-todo *')) {
                    this.selectTaskForPomodoro(todo);
                }
            });
            
            const checkbox = li.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent task selection when checking/unchecking
                this.toggleTodo(todo.id);
            });
            
            const deleteButton = li.querySelector('.delete-todo');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent task selection when deleting
                this.deleteTodo(todo.id);
            });
            
            const startPomodoroButton = li.querySelector('.start-pomodoro');
            startPomodoroButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectTaskForPomodoro(todo);
            });
            
            this.todoList.appendChild(li);
        });

        this.updateStats(filteredTodos);
    }

    updateFilters() {
        this.filters = {
            status: this.statusFilter.value,
            priority: this.priorityFilter.value,
            category: this.categoryFilter.value
        };
        this.renderTodos();
    }

    updateStats(filteredTodos) {
        const completedTasks = filteredTodos.filter(todo => todo.completed).length;
        const totalTasks = filteredTodos.length;
        
        this.tasksCompletedElement.textContent = completedTasks;
        this.totalTasksElement.textContent = totalTasks;
        this.focusTimeElement.textContent = this.focusTime;
        this.pomodorosCompletedElement.textContent = this.pomodorosCompleted;
        this.dailyStreakElement.textContent = this.dailyStreak;
        
        const now = new Date();
        const hour = now.getHours();
        if (this.isWorkSession && this.isRunning) {
            this.productiveTimeElement.textContent = `${hour}:00 - ${hour + 1}:00`;
        }
        
        const focusScore = Math.min(100, Math.round(
            (completedTasks / Math.max(1, totalTasks) * 40) +
            (this.pomodorosCompleted * 10) +
            (this.focusTime / 30)
        ));
        this.focusScoreElement.textContent = focusScore;
        
        if (this.selectedTask) {
            const taskFocusTime = Math.round(this.selectedTask.timeSpent / 60);
            this.focusTimeElement.textContent = `${this.focusTime} (Task: ${taskFocusTime})`;
        }
        
        localStorage.setItem('dailyStreak', this.dailyStreak.toString());
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.enableNotifications.checked = permission === 'granted';
        }
    }

    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    initializeWeeklyData() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days.map(day => ({
            day,
            focusTime: 0,
            tasksCompleted: 0,
            pomodoros: 0
        }));
    }

    initializeCharts() {
        // Weekly Progress Chart
        this.charts.weeklyProgress = new Chart(
            document.getElementById('weeklyProgressChart'),
            {
                type: 'bar',
                data: {
                    labels: this.analytics.weeklyData.map(d => d.day),
                    datasets: [{
                        label: 'Focus Time (min)',
                        data: this.analytics.weeklyData.map(d => d.focusTime),
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: 'rgba(255, 255, 255, 0.7)' }
                        }
                    }
                }
            }
        );

        // Task Distribution Chart
        this.charts.taskDistribution = new Chart(
            document.getElementById('taskDistributionChart'),
            {
                type: 'doughnut',
                data: {
                    labels: Object.keys(this.analytics.taskDistribution),
                    datasets: [{
                        data: Object.values(this.analytics.taskDistribution),
                        backgroundColor: [
                            'rgba(52, 152, 219, 0.6)',
                            'rgba(155, 89, 182, 0.6)',
                            'rgba(230, 126, 34, 0.6)',
                            'rgba(46, 204, 113, 0.6)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: 'rgba(255, 255, 255, 0.7)' }
                        }
                    }
                }
            }
        );

        // Productivity Hours Chart
        this.charts.productivityHours = new Chart(
            document.getElementById('productivityHoursChart'),
            {
                type: 'line',
                data: {
                    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                    datasets: [{
                        label: 'Productivity',
                        data: this.analytics.productivityHours,
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: 'rgba(255, 255, 255, 0.7)' }
                        }
                    }
                }
            }
        );
    }

    updateAnalytics() {
        const today = new Date();
        const dayIndex = today.getDay();
        const hour = today.getHours();

        // Update weekly data
        if (this.isWorkSession && this.isRunning) {
            this.analytics.weeklyData[dayIndex].focusTime++;
            if (this.selectedTask) {
                this.analytics.taskDistribution[this.selectedTask.category]++;
            }
            this.analytics.productivityHours[hour]++;
        }

        // Update charts
        this.charts.weeklyProgress.data.datasets[0].data = 
            this.analytics.weeklyData.map(d => d.focusTime);
        this.charts.weeklyProgress.update();

        this.charts.taskDistribution.data.datasets[0].data = 
            Object.values(this.analytics.taskDistribution);
        this.charts.taskDistribution.update();

        this.charts.productivityHours.data.datasets[0].data = 
            this.analytics.productivityHours;
        this.charts.productivityHours.update();

        // Update analytics stats
        const mostProductiveDay = this.analytics.weeklyData
            .reduce((a, b) => a.focusTime > b.focusTime ? a : b);
        document.getElementById('mostProductiveDay').textContent = 
            `${mostProductiveDay.day} (${mostProductiveDay.focusTime}min)`;

        const totalFocusTime = this.analytics.weeklyData
            .reduce((sum, day) => sum + day.focusTime, 0);
        const avgFocusTime = Math.round(totalFocusTime / 7);
        document.getElementById('avgFocusTime').textContent = `${avgFocusTime}min`;

        const completedTasks = this.todos.filter(todo => todo.completed).length;
        const taskCompletionRate = Math.round((completedTasks / Math.max(1, this.todos.length)) * 100);
        document.getElementById('taskCompletionRate').textContent = `${taskCompletionRate}%`;

        // Save analytics data
        this.saveAnalytics();
    }

    saveAnalytics() {
        localStorage.setItem('weeklyData', JSON.stringify(this.analytics.weeklyData));
        localStorage.setItem('productivityHours', JSON.stringify(this.analytics.productivityHours));
        localStorage.setItem('taskDistribution', JSON.stringify(this.analytics.taskDistribution));
    }

    setupDataManagement() {
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importData').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('resetData').addEventListener('click', () => this.resetData());
        document.getElementById('importFile').addEventListener('change', (e) => this.importData(e));
    }

    exportData() {
        const data = {
            todos: this.todos,
            analytics: this.analytics,
            achievements: this.achievements,
            settings: {
                workTime: this.workTime,
                breakTime: this.breakTime
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pomodoro-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importData(event) {
        try {
            const file = event.target.files[0];
            const text = await file.text();
            const data = JSON.parse(text);

            this.todos = data.todos || [];
            this.analytics = data.analytics || this.initializeAnalytics();
            this.achievements = data.achievements || this.initializeAchievements();
            
            if (data.settings) {
                this.workTime = data.settings.workTime;
                this.breakTime = data.settings.breakTime;
                this.workTimeInput.value = this.workTime;
                this.breakTimeInput.value = this.breakTime;
            }

            this.saveTodos();
            this.saveAnalytics();
            this.saveAchievements();
            this.renderTodos();
            this.updateAnalytics();
            this.updateAchievements();
            
            this.showNotification('Import Successful', 'Your data has been imported successfully!');
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import Failed', 'There was an error importing your data.');
        }
        event.target.value = ''; // Reset file input
    }

    resetData() {
        if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
            localStorage.clear();
            this.todos = [];
            this.analytics = this.initializeAnalytics();
            this.achievements = this.initializeAchievements();
            this.renderTodos();
            this.updateAnalytics();
            this.updateAchievements();
            location.reload();
        }
    }

    // Gamification System
    initializeAchievements() {
        return {
            streaks: [],
            badges: [],
            level: 1,
            experience: 0,
            nextLevelExp: 100,
            unlockedAchievements: new Set()
        };
    }

    loadAchievements() {
        const saved = localStorage.getItem('achievements');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.achievements = {
                ...parsed,
                unlockedAchievements: new Set(parsed.unlockedAchievements)
            };
        }
    }

    saveAchievements() {
        const toSave = {
            ...this.achievements,
            unlockedAchievements: Array.from(this.achievements.unlockedAchievements)
        };
        localStorage.setItem('achievements', JSON.stringify(toSave));
    }

    addExperience(amount) {
        this.achievements.experience += amount;
        while (this.achievements.experience >= this.achievements.nextLevelExp) {
            this.levelUp();
        }
        this.saveAchievements();
        this.updateAchievements();
    }

    levelUp() {
        this.achievements.level++;
        this.achievements.experience -= this.achievements.nextLevelExp;
        this.achievements.nextLevelExp = Math.floor(this.achievements.nextLevelExp * 1.5);
        this.showNotification('Level Up!', `You've reached level ${this.achievements.level}!`);
        this.unlockAchievement('level', this.achievements.level);
    }

    unlockAchievement(type, value) {
        const achievements = {
            'level': [
                { id: 'level_5', name: 'Getting Started', level: 5 },
                { id: 'level_10', name: 'Focus Apprentice', level: 10 },
                { id: 'level_25', name: 'Focus Master', level: 25 }
            ],
            'streak': [
                { id: 'streak_3', name: 'Consistent', days: 3 },
                { id: 'streak_7', name: 'Week Warrior', days: 7 },
                { id: 'streak_30', name: 'Monthly Master', days: 30 }
            ],
            'pomodoro': [
                { id: 'pomodoro_10', name: 'Time Boxer', count: 10 },
                { id: 'pomodoro_50', name: 'Focus Fighter', count: 50 },
                { id: 'pomodoro_100', name: 'Pomodoro Pro', count: 100 }
            ]
        };

        const eligibleAchievements = achievements[type].filter(a => {
            switch(type) {
                case 'level': return value >= a.level;
                case 'streak': return value >= a.days;
                case 'pomodoro': return value >= a.count;
                default: return false;
            }
        });

        for (const achievement of eligibleAchievements) {
            if (!this.achievements.unlockedAchievements.has(achievement.id)) {
                this.achievements.unlockedAchievements.add(achievement.id);
                this.showNotification('Achievement Unlocked!', achievement.name);
                this.addExperience(50); // Bonus XP for achievement
            }
        }
    }

    updateAchievements() {
        // Update achievement display if it exists
        const achievementsContainer = document.querySelector('.achievements-container');
        if (!achievementsContainer) {
            this.createAchievementsDisplay();
        } else {
            this.updateAchievementsDisplay();
        }
    }

    createAchievementsDisplay() {
        const achievementsGrid = document.querySelector('.achievements-grid');
        const allAchievements = this.getAllAchievements();
        
        achievementsGrid.innerHTML = '';
        
        allAchievements.forEach(category => {
            category.achievements.forEach(achievement => {
                const isUnlocked = this.achievements.unlockedAchievements.has(achievement.id);
                const card = document.createElement('div');
                card.className = `achievement-card ${isUnlocked ? '' : 'locked'} achievement-${category.type}`;
                
                card.innerHTML = `
                    <div class="achievement-icon">
                        <i class="${this.getAchievementIcon(category.type)}"></i>
                    </div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${this.getAchievementDescription(achievement, category.type)}</div>
                    </div>
                `;
                
                achievementsGrid.appendChild(card);
            });
        });

        // Update level and experience display
        document.querySelector('.level-number').textContent = this.achievements.level;
        const expProgress = (this.achievements.experience / this.achievements.nextLevelExp) * 100;
        document.querySelector('.experience-progress').style.width = `${expProgress}%`;
        document.querySelector('.experience-text').textContent = 
            `${this.achievements.experience}/${this.achievements.nextLevelExp} XP`;
    }

    getAllAchievements() {
        return [
            {
                type: 'streak',
                achievements: [
                    { id: 'streak_3', name: 'Consistent', days: 3 },
                    { id: 'streak_7', name: 'Week Warrior', days: 7 },
                    { id: 'streak_30', name: 'Monthly Master', days: 30 }
                ]
            },
            {
                type: 'pomodoro',
                achievements: [
                    { id: 'pomodoro_10', name: 'Time Boxer', count: 10 },
                    { id: 'pomodoro_50', name: 'Focus Fighter', count: 50 },
                    { id: 'pomodoro_100', name: 'Pomodoro Pro', count: 100 }
                ]
            },
            {
                type: 'level',
                achievements: [
                    { id: 'level_5', name: 'Getting Started', level: 5 },
                    { id: 'level_10', name: 'Focus Apprentice', level: 10 },
                    { id: 'level_25', name: 'Focus Master', level: 25 }
                ]
            }
        ];
    }

    getAchievementIcon(type) {
        const icons = {
            streak: 'fas fa-fire',
            pomodoro: 'fas fa-clock',
            level: 'fas fa-star'
        };
        return icons[type] || 'fas fa-award';
    }

    getAchievementDescription(achievement, type) {
        switch(type) {
            case 'streak':
                return `Maintain a ${achievement.days}-day streak`;
            case 'pomodoro':
                return `Complete ${achievement.count} Pomodoro sessions`;
            case 'level':
                return `Reach level ${achievement.level}`;
            default:
                return '';
        }
    }

    updateAchievementsDisplay() {
        const levelNumber = document.querySelector('.level-number');
        const expProgress = document.querySelector('.experience-progress');
        const expText = document.querySelector('.experience-text');
        
        // Update level and experience
        levelNumber.textContent = this.achievements.level;
        const progress = (this.achievements.experience / this.achievements.nextLevelExp) * 100;
        expProgress.style.width = `${progress}%`;
        expText.textContent = `${this.achievements.experience}/${this.achievements.nextLevelExp} XP`;
        
        // Recreate achievements display to reflect any newly unlocked achievements
        this.createAchievementsDisplay();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});