@echo off
setlocal

echo ===============================================
echo  Catechesis SaaS - Encerrar ambiente local
echo ===============================================
echo.

for %%P in (3000 4000) do (
  echo Verificando porta %%P...
  powershell -NoProfile -Command "$pids = Get-NetTCPConnection -LocalPort %%P -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($pids) { Stop-Process -Id $pids -Force; Write-Output ('Porta %%P encerrada.'); } else { Write-Output ('Nenhum processo na porta %%P.'); }"
)

echo.
echo Ambiente local finalizado.
echo.

endlocal
