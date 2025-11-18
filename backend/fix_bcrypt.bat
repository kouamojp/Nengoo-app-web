@echo off
echo ========================================
echo   Correction bcrypt
echo ========================================
echo.
echo Installation de bcrypt...
pip uninstall bcrypt -y
pip install bcrypt==4.1.2
echo.
echo ========================================
echo   Termine!
echo ========================================
pause
