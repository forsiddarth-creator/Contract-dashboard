class ContractDashboard {
    constructor() {
        this.data = [];
        this.processedData = [];
        this.chart = null;
        this.currentDate = new Date();
        this.activeFilter = null;
        
        this.init();
    }

    init() {
        // Wait for libraries to load before initializing
        if (typeof XLSX === 'undefined' || typeof Chart === 'undefined') {
            console.log('Waiting for libraries to load...');
            setTimeout(() => this.init(), 500);
            return;
        }
        
        this.setupEventListeners();
        this.displayCurrentDate();
        console.log('Dashboard initialized successfully!');
    }

    setupEventListeners() {
        try {
            const fileInput = document.getElementById('fileInput');
            const fileUploadArea = document.getElementById('fileUploadArea');
            const processDataBtn = document.getElementById('processDataBtn');

            if (!fileInput || !fileUploadArea || !processDataBtn) {
                console.error('Required elements not found');
                return;
            }

            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e).catch(err => this.showError('File selection error: ' + err.message));
            });
            
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });
            
            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
            });
            
            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.processFile(files[0]).catch(err => this.showError('File processing error: ' + err.message));
                }
            });

            processDataBtn.addEventListener('click', () => {
                this.processContractData().catch(err => this.showError('Data processing error: ' + err.message));
            });

        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showError('Failed to initialize dashboard: ' + error.message);
        }
    }

    displayCurrentDate() {
        try {
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const dateElement = document.getElementById('currentDate');
            if (dateElement) {
                dateElement.textContent = this.currentDate.toLocaleDateString('en-US', options);
            }
        } catch (error) {
            console.error('Error displaying date:', error);
        }
    }

    async handleFileSelect(event) {
        try {
            const file = event.target.files[0];
            if (file) {
                await this.processFile(file);
            }
        } catch (error) {
            console.error('Error handling file selection:', error);
            throw error;
        }
    }

    async processFile(file) {
        return new Promise((resolve, reject) => {
            try {
                if (!file.name.match(/\.(xlsx|xls)$/)) {
                    reject(new Error('Please upload a valid Excel file (.xlsx or .xls)'));
                    return;
                }

                if (typeof XLSX === 'undefined') {
                    reject(new Error('XLSX library not loaded. Please refresh the page.'));
                    return;
                }

                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const workbook = XLSX.read(e.target.result, { type: 'binary' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        const data = XLSX.utils.sheet_to_json(worksheet);
                        
                        if (!data || data.length === 0) {
                            reject(new Error('Excel file is empty or has no data'));
                            return;
                        }
                        
                        this.data = data;
                        this.showFileInfo(file, data.length);
                        this.populateColumnSelect(data);
                        this.hideError();
                        resolve(data);
                        
                    } catch (error) {
                        console.error('Error parsing Excel file:', error);
                        reject(new Error('Error reading Excel file: ' + error.message));
                    }
                };

                reader.onerror = () => {
                    reject(new Error('Error reading file'));
                };

                reader.readAsBinaryString(file);
                
            } catch (error) {
                console.error('Error in processFile:', error);
                reject(error);
            }
        });
    }

    showFileInfo(file, rowCount) {
        try {
            const fileInfo = document.getElementById('fileInfo');
            if (fileInfo) {
                fileInfo.innerHTML = `
                    <strong>File loaded:</strong> ${file.name}<br>
                    <strong>Rows:</strong> ${rowCount}
                `;
                fileInfo.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error showing file info:', error);
        }
    }

    populateColumnSelect(data) {
        try {
            if (data.length === 0) return;
            
            const select = document.getElementById('dateColumnSelect');
            if (!select) return;
            
            const columns = Object.keys(data[0]);
            
            select.innerHTML = '<option value="">Choose a column...</option>';
            
            columns.forEach(column => {
                const option = document.createElement('option');
                option.value = column;
                option.textContent = column;
                select.appendChild(option);
            });
            
            select.addEventListener('change', () => {
                const processBtn = document.getElementById('processDataBtn');
                if (processBtn) {
                    processBtn.disabled = !select.value;
                }
            });
            
            const columnSection = document.getElementById('columnSection');
            if (columnSection) {
                columnSection.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error populating column select:', error);
            this.showError('Error setting up column selection: ' + error.message);
        }
    }

    parseDate(dateStr) {
        try {
            if (!dateStr) return null;
            
            if (typeof dateStr === 'number') {
                return new Date((dateStr - 25569) * 86400 * 1000);
            }
            
            dateStr = String(dateStr).trim();
            let date = null;
            
            if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/)) {
                const parts = dateStr.split(/[-\/]/);
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
                    date = new Date(year, month - 1, day);
                }
            }
            else if (dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
                date = new Date(dateStr);
            }
            else if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                date = new Date(dateStr);
            }
            else {
                date = new Date(dateStr);
            }
            
            if (date && !isNaN(date.getTime())) {
                return date;
            }
            
            return null;
        } catch (error) {
            console.error('Error parsing date:', dateStr, error);
            return null;
        }
    }

    async processContractData() {
        return new Promise((resolve, reject) => {
            try {
                const selectedColumn = document.getElementById('dateColumnSelect');
                if (!selectedColumn || !selectedColumn.value) {
                    reject(new Error('Please select a date column'));
                    return;
                }

                const columnValue = selectedColumn.value;
                this.processedData = [];
                
                for (let i = 0; i < this.data.length; i++) {
                    const row = this.data[i];
                    const expiryDateStr = row[columnValue];
                    const expiryDate = this.parseDate(expiryDateStr);
                    
                    if (!expiryDate) {
                        reject(new Error(`Invalid date in row ${i + 1}: ${expiryDateStr}. Please use DD-MM-YYYY, DD/MM/YYYY, or YYYY-MM-DD format.`));
                        return;
                    }
                    
                    const daysLeft = Math.ceil((expiryDate - this.currentDate) / (1000 * 60 * 60 * 24));
                    const bucket = this.categorizeContract(daysLeft);
                    
                    this.processedData.push({
                        ...row,
                        expiry_date: expiryDate.toLocaleDateString(),
                        days_left: daysLeft,
                        bucket: bucket,
                        priority: this.getPriority(bucket)
                    });
                }
                
                this.activeFilter = null;
                this.updateDashboard();
                this.hideError();
                resolve(this.processedData);
                
            } catch (error) {
                console.error('Error processing contract data:', error);
                reject(error);
            }
        });
    }

    categorizeContract(daysLeft) {
        if (daysLeft < 0) return 'Expired';
        if (daysLeft <= 90) return '0-90 days';
        if (daysLeft <= 180) return '91-180 days';
        return '>180 days';
    }

    getPriority(bucket) {
        const priorities = {
            'Expired': 'expired',
            '0-90 days': 'urgent',
            '91-180 days': 'medium',
            '>180 days': 'low'
        };
        return priorities[bucket];
    }

    updateDashboard() {
        try {
            this.updateSummaryCards();
            this.updateChart();
            this.updateTable();
            
            const dashboardSection = document.getElementById('dashboardSection');
            if (dashboardSection) {
                dashboardSection.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showError('Error updating dashboard: ' + error.message);
        }
    }

    updateSummaryCards() {
        try {
            const counts = {
                expired: 0,
                urgent: 0,
                medium: 0,
                low: 0
            };
            
            this.processedData.forEach(row => {
                if (counts.hasOwnProperty(row.priority)) {
                    counts[row.priority]++;
                }
            });
            
            const elements = {
                expiredCount: counts.expired,
                urgentCount: counts.urgent,
                mediumCount: counts.medium,
                lowCount: counts.low
            };
            
            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = elements[id];
                }
            });
        } catch (error) {
            console.error('Error updating summary cards:', error);
        }
    }

    updateChart() {
        try {
            if (typeof Chart === 'undefined') {
                console.error('Chart.js library not loaded');
                return;
            }

            const canvas = document.getElementById('contractChart');
            if (!canvas) {
                console.error('Chart canvas not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            
            const bucketCounts = {};
            this.processedData.forEach(row => {
                bucketCounts[row.bucket] = (bucketCounts[row.bucket] || 0) + 1;
            });
            
            if (Object.keys(bucketCounts).length === 0) {
                console.log('No data to display in chart');
                return;
            }
            
            const colors = {
                'Expired': '#dc2626',
                '0-90 days': '#f59e0b',
                '91-180 days': '#d97706',
                '>180 days': '#059669'
            };
            
            const self = this;
            
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(bucketCounts),
                    datasets: [{
                        label: 'Number of Contracts',
                        data: Object.values(bucketCounts),
                        backgroundColor: Object.keys(bucketCounts).map(bucket => colors[bucket] || '#666666')
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    onClick: function(event, elements) {
                        try {
                            if (elements && elements.length > 0) {
                                const elementIndex = elements[0].index;
                                const clickedCategory = self.chart.data.labels[elementIndex];
                                
                                // Toggle filter
                                if (self.activeFilter === clickedCategory) {
                                    self.clearFilter();
                                } else {
                                    self.filterTableByCategory(clickedCategory);
                                }
                            }
                        } catch (error) {
                            console.error('Error handling chart click:', error);
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Error creating chart:', error);
            this.showError('Error creating chart: ' + error.message);
        }
    }

    filterTableByCategory(category) {
        try {
            this.activeFilter = category;
            this.updateTable();
            console.log('Filtered by:', category);
        } catch (error) {
            console.error('Error filtering table:', error);
        }
    }

    clearFilter() {
        try {
            this.activeFilter = null;
            this.updateTable();
            console.log('Filter cleared');
        } catch (error) {
            console.error('Error clearing filter:', error);
        }
    }

    updateTable() {
        try {
            const tbody = document.getElementById('tableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            const dataToShow = this.activeFilter 
                ? this.processedData.filter(row => row.bucket === this.activeFilter)
                : this.processedData;
            
            dataToShow.forEach(row => {
                const tr = document.createElement('tr');
                
                const firstColumn = Object.keys(row).find(key => 
                    key !== 'expiry_date' && key !== 'days_left' && key !== 'bucket' && key !== 'priority'
                );
                
                tr.innerHTML = `
                    <td>${row[firstColumn] || 'N/A'}</td>
                    <td>${row.expiry_date}</td>
                    <td>${row.days_left}</td>
                    <td><span class="priority-badge priority-${row.priority}">${row.bucket}</span></td>
                `;
                tbody.appendChild(tr);
            });

            // Update header
            const tableHeader = document.querySelector('.table-section h3');
            if (tableHeader) {
                if (this.activeFilter) {
                    tableHeader.textContent = `${this.activeFilter} Contracts (${dataToShow.length} items) - Click chart bars to filter`;
                } else {
                    tableHeader.textContent = `All Contracts (${this.processedData.length} items) - Click chart bars to filter`;
                }
            }
        } catch (error) {
            console.error('Error updating table:', error);
        }
    }

    showError(message) {
        try {
            console.error('Dashboard Error:', message);
            const errorMessage = document.getElementById('errorMessage');
            const errorSection = document.getElementById('errorSection');
            
            if (errorMessage && errorSection) {
                errorMessage.textContent = message;
                errorSection.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error showing error message:', error);
        }
    }

    hideError() {
        try {
            const errorSection = document.getElementById('errorSection');
            if (errorSection) {
                errorSection.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error hiding error message:', error);
        }
    }
}

// Initialize the dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Contract Dashboard...');
        new ContractDashboard();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; left: 20px; right: 20px; background: #fee2e2; color: #dc2626; padding: 16px; border-radius: 8px; z-index: 1000; font-family: Arial, sans-serif;';
        errorDiv.innerHTML = `<strong>Dashboard Error:</strong> ${error.message}<br><small>Please refresh the page and try again.</small>`;
        document.body.appendChild(errorDiv);
    }
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent the default browser error handling
});
