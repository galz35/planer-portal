Stop-Process -Name backendrust -Force -ErrorAction SilentlyContinue
Start-Process -FilePath ".\target\debug\backendrust.exe" -RedirectStandardOutput "logs.txt" -RedirectStandardError "logs.txt" -WindowStyle Hidden
Start-Sleep -Seconds 3
node -e "fetch('http://localhost:3200/api/auth/login', {method: 'POST', body: JSON.stringify({correo: 'juan.ortuno@claro.com.ni', password: 'password123'}), headers: {'Content-Type': 'application/json'}}).then(r => r.json()).then(console.log)"
