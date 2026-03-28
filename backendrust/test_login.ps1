$body = @{
    correo = "juan.ortuno@claro.com.ni"
    password = "password123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3200/api/auth/login" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    $response | ConvertTo-Json -Depth 10
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $reader.ReadToEnd()
    } else {
        $_.Exception.Message
    }
}
