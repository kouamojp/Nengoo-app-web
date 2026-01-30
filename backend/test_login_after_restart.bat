@echo off
echo ========================================
echo   TEST DE CONNEXION APRES REDEMARRAGE
echo ========================================
echo.

echo Test 1: Sans espace (+237690703689)
curl -X POST http://localhost:8001/api/sellers/login -H "Content-Type: application/json" -d "{\"whatsapp\":\"+237690703689\",\"password\":\"Kouamo@1992\"}"
echo.
echo.

echo Test 2: Avec espace (+237 690703689)
curl -X POST http://localhost:8001/api/sellers/login -H "Content-Type: application/json" -d "{\"whatsapp\":\"+237 690703689\",\"password\":\"Kouamo@1992\"}"
echo.
echo.

echo ========================================
echo   TESTS TERMINES
echo ========================================
echo.
echo Si vous voyez vos donnees (id, name, businessName), c'est reussi !
echo Si vous voyez "detail": "Numero WhatsApp ou mot de passe incorrect", le backend n'est pas a jour.
echo.

pause
