@echo off
echo =====================================================
echo   Instalando Subsistema do Windows para Linux (WSL 2)
echo   Necessario para a engine do Docker Desktop
echo =====================================================
echo.
echo 1. Instalando componentes do WSL...
wsl --install --no-distribution
echo.
echo 2. Atualizando kernel do WSL...
wsl --update
echo.
echo =====================================================
echo Concluido! 
echo Se o Windows solicitar reinicializacao, reinicie o PC.
echo Em seguida, abra o Docker Desktop.
echo =====================================================
pause
