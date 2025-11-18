// Update data every 5 seconds
const UPDATE_INTERVAL = 5000;

// Format number with commas
function formatNumber(num) {
    return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Format currency
function formatCurrency(num) {
    return '₹' + formatNumber(num);
}

// Update market status
async function updateMarketStatus() {
    try {
        const response = await fetch('/api/market-status');
        const status = await response.json();
        
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const currentTime = document.getElementById('currentTime');
        
        if (status.is_market_hours) {
            indicator.className = 'status-indicator active';
            statusText.textContent = 'Market Open';
        } else {
            indicator.className = 'status-indicator inactive';
            statusText.textContent = 'Market Closed';
        }
        
        currentTime.textContent = `${status.current_time} IST | ${status.current_date}`;
    } catch (error) {
        console.error('Error updating market status:', error);
    }
}

// Update intraday scanner
async function updateIntradayScanner() {
    try {
        const response = await fetch('/api/intraday');
        const data = await response.json();
        
        const tbody = document.getElementById('intradayBody');
        
        if (Object.keys(data).length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No intraday data available. Market may be closed or outside trading hours.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        // Sort by breakout status (breakouts first)
        const sortedStocks = Object.entries(data).sort((a, b) => {
            const aBreakout = a[1].breakout_direction ? 1 : 0;
            const bBreakout = b[1].breakout_direction ? 1 : 0;
            return bBreakout - aBreakout;
        });
        
        sortedStocks.forEach(([symbol, stock]) => {
            const row = document.createElement('tr');
            
            const breakoutClass = stock.breakout_direction === 'bullish' ? 'breakout-bullish' : 
                                 stock.breakout_direction === 'bearish' ? 'breakout-bearish' : '';
            
            const signalBadge = stock.breakout_direction ? 
                `<span class="signal-badge signal-${stock.breakout_direction}">${stock.breakout_direction}</span>` :
                '<span class="signal-badge signal-neutral">No Breakout</span>';
            
            row.innerHTML = `
                <td class="stock-name">${stock.name}</td>
                <td class="price">${formatCurrency(stock.first_high)}</td>
                <td class="price">${formatCurrency(stock.first_low)}</td>
                <td class="price">${formatCurrency(stock.current_price)}</td>
                <td class="${breakoutClass}">${stock.breakout_direction ? stock.breakout_direction.toUpperCase() : '-'}</td>
                <td>${stock.breakout_time || '-'}</td>
                <td>${signalBadge}</td>
            `;
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating intraday scanner:', error);
        document.getElementById('intradayBody').innerHTML = 
            '<tr><td colspan="7" class="empty-state">Error loading data. Please refresh.</td></tr>';
    }
}

// Update BTST scanner
async function updateBTSTScanner() {
    try {
        const response = await fetch('/api/btst');
        const data = await response.json();
        
        const tbody = document.getElementById('btstBody');
        
        if (Object.keys(data).length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No BTST candidates found. Data is collected between 3:00 PM - 3:30 PM IST.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        // Sort by volume ratio (highest first)
        const sortedStocks = Object.entries(data).sort((a, b) => {
            return b[1].volume_ratio - a[1].volume_ratio;
        });
        
        sortedStocks.forEach(([symbol, stock]) => {
            const row = document.createElement('tr');
            
            const signalBadge = stock.near_breakout_direction ? 
                `<span class="signal-badge signal-${stock.near_breakout_direction}">${stock.near_breakout_direction}</span>` :
                '<span class="signal-badge signal-neutral">-</span>';
            
            row.innerHTML = `
                <td class="stock-name">${stock.name}</td>
                <td class="price">${formatCurrency(stock.current_price)}</td>
                <td class="price">${formatNumber(stock.last_30min_volume)}</td>
                <td class="price">${formatNumber(stock.avg_daily_volume)}</td>
                <td class="volume-ratio">${stock.volume_ratio}%</td>
                <td class="price">${stock.resistance ? formatCurrency(stock.resistance) : '-'}</td>
                <td class="price">${stock.support ? formatCurrency(stock.support) : '-'}</td>
                <td class="breakout-percentage">${stock.breakout_percentage ? stock.breakout_percentage + '%' : '-'}</td>
                <td>${signalBadge}</td>
            `;
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating BTST scanner:', error);
        document.getElementById('btstBody').innerHTML = 
            '<tr><td colspan="9" class="empty-state">Error loading data. Please refresh.</td></tr>';
    }
}

// Initialize and start updates
function init() {
    updateMarketStatus();
    updateIntradayScanner();
    updateBTSTScanner();
    
    // Update market status every minute
    setInterval(updateMarketStatus, 60000);
    
    // Update scanners every 5 seconds
    setInterval(() => {
        updateIntradayScanner();
        updateBTSTScanner();
    }, UPDATE_INTERVAL);
}

// Start when page loads
document.addEventListener('DOMContentLoaded', init);


