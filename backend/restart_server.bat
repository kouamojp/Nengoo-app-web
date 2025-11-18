@echo off
echo ====================================
echo   Redemarrage du serveur backend
echo ====================================
echo.

echo 1. Arret des processus Python sur le port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do (
    echo    - Arret du processus %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo 2. Attente de 2 secondes...
timeout /t 2 /nobreak >nul

echo.
echo 3. Verification que le port est libre...
netstat -ano | findstr :8001 | findstr LISTENING
if %errorlevel%==0 (
    echo    ATTENTION: Le port 8001 est toujours utilise!
    echo    Veuillez arreter manuellement les processus ou redemarrer l'ordinateur.
    pause
    exit /b 1
) else (
    echo    OK - Le port 8001 est libre
)

echo.
echo 4. Demarrage du nouveau serveur...
start "Backend Server" /MIN python server.py

echo.
echo ====================================
echo   Serveur redemarre avec succes!
echo ====================================
echo.
echo Le serveur tourne en arriere-plan.
echo Pour voir les logs, regardez la fenetre minimisee.
echo.
pause
