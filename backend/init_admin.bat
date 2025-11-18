@echo off
echo ========================================
echo   Initialisation Admin Nengoo
echo ========================================
echo.
echo Creation de l'administrateur par defaut...
echo.

curl -X POST http://localhost:8001/api/admin/init-default -H "Content-Type: application/json"

echo.
echo.
echo ========================================
echo   Admin cree avec succes!
echo ========================================
echo.
echo Identifiants:
echo   Username: admin
echo   Password: admin123
echo.
echo Acces: http://localhost:3000/admin/login
echo.
echo ATTENTION: Changez ce mot de passe apres la premiere connexion!
echo.
pause
