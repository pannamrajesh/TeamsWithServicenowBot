from flask import Flask, render_template, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import threading
import time
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# Store scanner data
intraday_data = {}
btst_data = {}
stock_list = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
    'ICICIBANK.NS', 'BHARTIARTL.NS', 'SBIN.NS', 'BAJFINANCE.NS', 'LICI.NS',
    'ITC.NS', 'HCLTECH.NS', 'LT.NS', 'AXISBANK.NS', 'MARUTI.NS',
    'SUNPHARMA.NS', 'ONGC.NS', 'NTPC.NS', 'TITAN.NS', 'WIPRO.NS'
]

IST = ZoneInfo("Asia/Kolkata")


def get_indian_time():
    """Get current Indian Standard Time"""
    return datetime.now(IST)

def is_market_hours():
    """Check if market is open (9:15 AM - 3:30 PM IST)"""
    now = get_indian_time()
    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_open <= now <= market_close

def is_first_5min():
    """Check if current time is within first 5 minutes (9:15-9:20)"""
    now = get_indian_time()
    start = now.replace(hour=9, minute=15, second=0, microsecond=0)
    end = now.replace(hour=9, minute=20, second=0, microsecond=0)
    return start <= now <= end

def is_btst_window():
    """Check if current time is within BTST window (3:00 PM - 3:30 PM)"""
    now = get_indian_time()
    start = now.replace(hour=15, minute=0, second=0, microsecond=0)
    end = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return start <= now <= end

def get_stock_data(symbol):
    """Fetch live stock data"""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period='1d', interval='5m')
        
        if data.empty:
            return None
        
        current_price = ticker.history(period='1d', interval='1m')
        if not current_price.empty:
            latest_price = current_price['Close'].iloc[-1]
        else:
            latest_price = data['Close'].iloc[-1]
        
        return {
            'symbol': symbol,
            'name': symbol.replace('.NS', ''),
            'current_price': float(latest_price),
            'high': float(data['High'].max()),
            'low': float(data['Low'].min()),
            'volume': int(data['Volume'].sum()),
            'data': data
        }
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

def calculate_resistance_support(data, periods=20):
    """Calculate resistance and support levels"""
    if data is None or len(data) < periods:
        return None, None
    
    highs = data['High'].tail(periods)
    lows = data['Low'].tail(periods)
    
    resistance = float(highs.max())
    support = float(lows.min())
    
    return resistance, support

def is_near_breakout(current_price, resistance, support):
    """Check if price is within 0.5-1% of resistance or support"""
    if resistance is None or support is None:
        return None, None
    
    # Check near resistance (bullish breakout)
    diff_to_resistance = ((resistance - current_price) / current_price) * 100
    if 0.5 <= diff_to_resistance <= 1.0:
        return 'bullish', diff_to_resistance
    
    # Check near support (bearish breakout)
    diff_to_support = ((current_price - support) / current_price) * 100
    if 0.5 <= diff_to_support <= 1.0:
        return 'bearish', diff_to_support
    
    return None, None

def update_intraday_scanner():
    """Update intraday scanner data"""
    global intraday_data
    now = get_indian_time()
    
    if not is_market_hours():
        intraday_data = {}
        return
    
    for symbol in stock_list:
        try:
            ticker = yf.Ticker(symbol)
            
            # Get 5-minute data
            data_5m = ticker.history(period='1d', interval='5m')
            
            if data_5m.empty:
                continue
            
            # Get first 5-minute candle (9:15-9:20)
            first_candle = None
            for idx, row in data_5m.iterrows():
                candle_time = idx
                if hasattr(candle_time, "tzinfo"):
                    if candle_time.tzinfo is not None:
                        candle_time = candle_time.tz_convert(IST)
                    else:
                        candle_time = candle_time.tz_localize(IST)
                candle_time = candle_time.to_pydatetime() if hasattr(candle_time, 'to_pydatetime') else candle_time
                if isinstance(candle_time, datetime):
                    if candle_time.hour == 9 and 15 <= candle_time.minute < 20:
                        first_candle = row
                        break
            
            if first_candle is None:
                continue
            
            first_high = float(first_candle['High'])
            first_low = float(first_candle['Low'])
            
            # Get current price
            current_data = ticker.history(period='1d', interval='1m')
            if current_data.empty:
                current_price = float(data_5m['Close'].iloc[-1])
            else:
                current_price = float(current_data['Close'].iloc[-1])
            
            # Check for breakout
            breakout_direction = None
            breakout_time = None
            
            if current_price > first_high:
                breakout_direction = 'bullish'
                if symbol not in intraday_data or intraday_data[symbol].get('breakout_time') is None:
                    breakout_time = now.strftime('%H:%M:%S')
            elif current_price < first_low:
                breakout_direction = 'bearish'
                if symbol not in intraday_data or intraday_data[symbol].get('breakout_time') is None:
                    breakout_time = now.strftime('%H:%M:%S')
            
            intraday_data[symbol] = {
                'name': symbol.replace('.NS', ''),
                'first_high': first_high,
                'first_low': first_low,
                'current_price': current_price,
                'breakout_direction': breakout_direction,
                'breakout_time': breakout_time or intraday_data.get(symbol, {}).get('breakout_time'),
                'updated_at': now.strftime('%H:%M:%S')
            }
            
        except Exception as e:
            print(f"Error in intraday scanner for {symbol}: {e}")
            continue

def update_btst_scanner():
    """Update BTST scanner data"""
    global btst_data
    now = get_indian_time()
    
    if not is_btst_window():
        btst_data = {}
        return
    
    for symbol in stock_list:
        try:
            ticker = yf.Ticker(symbol)
            
            # Get daily data for volume comparison
            daily_data = ticker.history(period='10d', interval='1d')
            if daily_data.empty or len(daily_data) < 2:
                continue
            
            # Get 5-minute data for last 30 minutes
            data_5m = ticker.history(period='1d', interval='5m')
            if data_5m.empty:
                continue
            
            # Filter last 30 minutes (3:00 PM - 3:30 PM)
            last_30min_data = []
            for idx, row in data_5m.iterrows():
                candle_time = idx
                if hasattr(candle_time, "tzinfo"):
                    if candle_time.tzinfo is not None:
                        candle_time = candle_time.tz_convert(IST)
                    else:
                        candle_time = candle_time.tz_localize(IST)
                candle_time = candle_time.to_pydatetime() if hasattr(candle_time, 'to_pydatetime') else candle_time
                if isinstance(candle_time, datetime):
                    if candle_time.hour == 15 and 0 <= candle_time.minute < 30:
                        last_30min_data.append(row)
            
            if not last_30min_data:
                continue
            
            last_30min_volume = sum([float(row['Volume']) for row in last_30min_data])
            
            # Calculate average daily volume (last 10 days)
            avg_daily_volume = float(daily_data['Volume'].mean())
            
            # Volume surge check (at least 1.5x average)
            volume_surge = last_30min_volume >= (avg_daily_volume * 0.15)  # 15% of daily avg in 30 min = surge
            
            # Get current price
            current_data = ticker.history(period='1d', interval='1m')
            if current_data.empty:
                current_price = float(data_5m['Close'].iloc[-1])
            else:
                current_price = float(current_data['Close'].iloc[-1])
            
            # Calculate resistance and support
            resistance, support = calculate_resistance_support(daily_data)
            
            # Check near breakout
            near_breakout_direction, breakout_percentage = is_near_breakout(
                current_price, resistance, support
            )
            
            if volume_surge and near_breakout_direction:
                btst_data[symbol] = {
                    'name': symbol.replace('.NS', ''),
                    'current_price': current_price,
                    'last_30min_volume': int(last_30min_volume),
                    'avg_daily_volume': int(avg_daily_volume),
                    'volume_ratio': round((last_30min_volume / avg_daily_volume) * 100, 2),
                    'resistance': resistance,
                    'support': support,
                    'near_breakout_direction': near_breakout_direction,
                    'breakout_percentage': round(breakout_percentage, 2) if breakout_percentage else None,
                    'updated_at': now.strftime('%H:%M:%S')
                }
            
        except Exception as e:
            print(f"Error in BTST scanner for {symbol}: {e}")
            continue

def scanner_worker():
    """Background worker to update scanner data"""
    while True:
        try:
            if is_market_hours():
                update_intraday_scanner()
            
            if is_btst_window():
                update_btst_scanner()
            else:
                btst_data.clear()
            
            time.sleep(30)  # Update every 30 seconds
        except Exception as e:
            print(f"Error in scanner worker: {e}")
            time.sleep(60)

# Start background worker
scanner_thread = threading.Thread(target=scanner_worker, daemon=True)
scanner_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/intraday')
def get_intraday():
    return jsonify(intraday_data)

@app.route('/api/btst')
def get_btst():
    return jsonify(btst_data)

@app.route('/api/market-status')
def market_status():
    now = get_indian_time()
    return jsonify({
        'is_market_hours': is_market_hours(),
        'is_first_5min': is_first_5min(),
        'is_btst_window': is_btst_window(),
        'current_time': now.strftime('%H:%M:%S'),
        'current_date': now.strftime('%Y-%m-%d')
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)

