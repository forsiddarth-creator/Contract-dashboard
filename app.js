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

        // Define fixed bucket order
        const bucketOrder = ['Expired', '0-90 days', '91-180 days', '>180 days'];

        // Count contracts per bucket
        const bucketCounts = { 'Expired': 0, '0-90 days': 0, '91-180 days': 0, '>180 days': 0 };
        this.processedData.forEach(row => {
            if (bucketCounts.hasOwnProperty(row.bucket)) {
                bucketCounts[row.bucket]++;
            }
        });

        // Build data arrays in the fixed order
        const labels = bucketOrder;
        const data = bucketOrder.map(key => bucketCounts[key]);

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
                labels: labels,
                datasets: [{
                    label: 'Number of Contracts',
                    data: data,
                    backgroundColor: labels.map(label => colors[label])
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                onClick: function(event, elements) {
                    try {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const category = labels[index];
                            if (self.activeFilter === category) {
                                self.clearFilter();
                            } else {
                                self.filterTableByCategory(category);
                            }
                        }
                    } catch (err) {
                        console.error('Error handling chart click:', err);
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        this.showError('Error creating chart: ' + error.message);
    }
}
