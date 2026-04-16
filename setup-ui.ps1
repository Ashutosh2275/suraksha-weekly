Set-Location "c:\Users\ASUS\Desktop\suraksha-weekly"

Write-Host "Step 1: Creating directory structure..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "shared/ui/src/components" -Force -ErrorAction SilentlyContinue | Out-Null
Write-Host "✓ Directory structure created: shared/ui/src/components" -ForegroundColor Green

Write-Host "`nStep 2: Copying UI component files..." -ForegroundColor Cyan
$sourceDir = "apps\worker\src\components\ui"
$targetDir = "shared\ui\src\components"

$filesToCopy = @(
    "AmountDisplay.tsx",
    "Badge.tsx",
    "Button.tsx",
    "Card.tsx",
    "Input.tsx",
    "Modal.tsx",
    "OTPInput.tsx",
    "Select.tsx",
    "Skeleton.tsx",
    "StatusBar.tsx",
    "Toast.tsx",
    "index.ts"
)

$copiedCount = 0
foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $sourceDir $file
    $targetPath = Join-Path $targetDir $file
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $targetPath -Force
        Write-Host "  ✓ Copied: $file" -ForegroundColor Green
        $copiedCount++
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Yellow
    }
}
Write-Host "`n✓ Successfully copied $copiedCount files" -ForegroundColor Green

Write-Host "`nStep 3: Creating package.json..." -ForegroundColor Cyan
$packageJson = @"
{
  "name": "@suraksha/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/components/index.ts",
  "types": "./src/components/index.ts",
  "exports": {
    ".": "./src/components/index.ts"
  },
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
"@

$packageJsonPath = "shared\ui\package.json"
Set-Content -Path $packageJsonPath -Value $packageJson -Encoding UTF8
Write-Host "✓ Created: shared\ui\package.json" -ForegroundColor Green

Write-Host "`nStep 4: Creating tsconfig.json..." -ForegroundColor Cyan
$tsconfig = @"
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
"@

$tsconfigPath = "shared\ui\tsconfig.json"
Set-Content -Path $tsconfigPath -Value $tsconfig -Encoding UTF8
Write-Host "✓ Created: shared\ui\tsconfig.json" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✓ All steps completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nCreated structure:" -ForegroundColor White
Write-Host "shared/ui/" -ForegroundColor Yellow
Write-Host "  ├── package.json" -ForegroundColor Gray
Write-Host "  ├── tsconfig.json" -ForegroundColor Gray
Write-Host "  └── src/" -ForegroundColor Yellow
Write-Host "      └── components/" -ForegroundColor Yellow
Get-ChildItem -Path "shared\ui\src\components" -File | ForEach-Object { Write-Host "          ├── $($_.Name)" -ForegroundColor Gray }
