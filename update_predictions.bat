@echo off
echo Running daily soil moisture predictions update...
set PYTHONIOENCODING=utf-8
python dump_predictions.py
echo.
echo Predictions updated successfully in web/public/predictions.json
echo You can use Windows Task Scheduler to run this script daily.
pause
