# Create API directories
New-Item -ItemType Directory -Force -Path "apps\worker\src\lib\api" | Out-Null
New-Item -ItemType Directory -Force -Path "apps\admin\src\lib\api" | Out-Null

# Move file
if (Test-Path "apps\worker\src\lib\api-mock-handlers.ts") {
    Move-Item -Force "apps\worker\src\lib\api-mock-handlers.ts" "apps\worker\src\lib\api\mock-handlers.ts"
}

Write-Host "Done!"
