@echo off
setlocal

set "ROOT=%~dp0"

echo ===============================================
echo  Catechesis SaaS - Ambiente local de teste
echo ===============================================
echo.
echo Iniciando API em http://localhost:4000/api
start "Catechesis SaaS API" cmd /k "cd /d %ROOT% && npm run dev:api"

timeout /t 2 /nobreak >nul

if exist "%ROOT%apps\web\.next-dev" (
  echo Limpando cache local do frontend...
  rmdir /s /q "%ROOT%apps\web\.next-dev"
)

echo Iniciando Web em http://localhost:3000
start "Catechesis SaaS Web" cmd /k "cd /d %ROOT% && npm run dev:web"

echo.
echo Links de teste:
echo   http://localhost:3000
echo   http://localhost:3000/local-test
echo   http://localhost:3000/tenant/emmaus
echo   http://localhost:3000/tenant/emmaus/teacher
echo   http://localhost:3000/tenant/emmaus/admin
echo   http://localhost:4000/api/health
echo.
echo Feche as janelas abertas para parar o ambiente local.
echo.

endlocal
