@echo off
echo Starting Live Stock Scanner...
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting Flask server...
python app.py
pause


