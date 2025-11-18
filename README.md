# 📈 Live Stock Scanner - Intraday & BTST

A real-time stock scanning website with two powerful scanners for Indian stock markets (NSE).

## 🎯 Features

### 1. Intraday First 5-Minute Candle Breakout Scanner
- Captures the first 5-minute candle (9:15 AM - 9:20 AM IST)
- Monitors live price for breakout above/below first candle
- **Bullish Breakout**: Price > First 5-min High (Green signal)
- **Bearish Breakout**: Price < First 5-min Low (Red signal)
- Displays breakout time and direction

### 2. BTST Volume + Near Breakout Scanner
- Collects data during 3:00 PM - 3:30 PM IST
- Identifies stocks with volume surge (last 30 minutes vs average daily volume)
- Detects stocks near breakout zones (0.5% - 1% from resistance/support)
- Marks bullish candidates (near resistance) and bearish candidates (near support)

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Open your browser**
   Navigate to: `http://localhost:5000`

## 📋 How It Works

### Intraday Scanner
- Runs during market hours (9:15 AM - 3:30 PM IST)
- Captures first 5-minute candle high/low at market open
- Continuously monitors price and alerts on breakout
- Updates every 30 seconds

### BTST Scanner
- Active only during 3:00 PM - 3:30 PM IST
- Compares last 30-minute volume with 10-day average
- Calculates resistance/support levels
- Identifies stocks within 0.5-1% of breakout zones
- Updates every 30 seconds

## 🎨 Features

- **Real-time Updates**: Data refreshes every 5 seconds on frontend
- **Beautiful UI**: Modern, responsive design with gradient backgrounds
- **Color-coded Signals**: Green for bullish, Red for bearish
- **Market Status Indicator**: Shows if market is open/closed
- **Mobile Responsive**: Works on all devices

## 📊 Stock List

The scanner monitors top 20 NSE stocks by default:
- RELIANCE, TCS, HDFCBANK, INFY, HINDUNILVR
- ICICIBANK, BHARTIARTL, SBIN, BAJFINANCE, LICI
- ITC, HCLTECH, LT, AXISBANK, MARUTI
- SUNPHARMA, ONGC, NTPC, TITAN, WIPRO

You can modify the `stock_list` in `app.py` to add/remove stocks.

## ⚙️ Configuration

### Modify Stock List
Edit `stock_list` in `app.py`:
```python
stock_list = ['RELIANCE.NS', 'TCS.NS', ...]
```

### Adjust Update Frequency
Change `UPDATE_INTERVAL` in `static/js/app.js` (default: 5000ms)

### Change Volume Surge Threshold
Modify the volume surge condition in `update_btst_scanner()` function in `app.py`

## 🔧 Troubleshooting

**Issue**: No data showing
- Check if market is open (9:15 AM - 3:30 PM IST)
- Verify internet connection
- Check browser console for errors

**Issue**: BTST scanner empty
- BTST scanner only works between 3:00 PM - 3:30 PM IST
- Wait for the collection window

**Issue**: Import errors
- Make sure all dependencies are installed: `pip install -r requirements.txt`

## 📝 Notes

- Data is fetched from Yahoo Finance (yfinance library)
- All times are in IST (Indian Standard Time)
- Market hours: 9:15 AM - 3:30 PM IST
- First 5-minute candle: 9:15 AM - 9:20 AM IST
- BTST window: 3:00 PM - 3:30 PM IST

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. Stock trading involves risk. Always do your own research and consult with financial advisors before making investment decisions.

## 📄 License

This project is open source and available for personal use.

---

**Happy Trading! 📈**


