@echo off
echo 🚀 FIXING ML MODELS 404 ERROR
echo.

echo 📁 Creating ml-models directory...
mkdir "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web\src\app\ml-models"

echo 📄 Creating page.tsx file...
(
echo 'use client';
echo.
echo import { useState } from 'react';
echo import { motion } from 'framer-motion';
echo import { Card } from '@/components/ui/Card';
echo import { Badge } from '@/components/ui/Badge';
echo import { Button } from '@/components/ui/Button';
echo import { Brain, Activity, Zap, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
echo.
echo const mockModels = [
echo   {
echo     id: 'fraud-v3',
echo     name: 'Fraud Detection v3.2',
echo     type: 'fraud_detection',
echo     status: 'active',
echo     accuracy: 94.7,
echo     version: '3.2.1',
echo     lastTrained: '2024-03-20',
echo     requestsPerDay: 15420
echo   },
echo   {
echo     id: 'risk-v2',
echo     name: 'Risk Scoring v2.8',
echo     type: 'risk_scoring',
echo     status: 'active',
echo     accuracy: 91.3,
echo     version: '2.8.5',
echo     lastTrained: '2024-03-18',
echo     requestsPerDay: 8932
echo   }
echo ];
echo.
echo export default function MLModelsPage() {
echo   const [selectedModel, setSelectedModel] = useState(null^);
echo.
echo   return (
echo     ^<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6"^>
echo       ^<div className="flex items-center justify-between mb-6"^>
echo         ^<div^>
echo           ^<h1 className="text-3xl font-bold text-white mb-2"^>ML Models^</h1^>
echo           ^<p className="text-gray-400"^>Monitor and manage machine learning models^</p^>
echo         ^</div^>
echo       ^</div^>
echo.
echo       ^<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"^>
echo         ^<Card className="p-4 bg-slate-800 border-slate-600"^>
echo           ^<div className="flex items-center justify-between"^>
echo             ^<div^>
echo               ^<p className="text-sm font-medium text-gray-400"^>Active Models^</p^>
echo               ^<p className="text-2xl font-bold text-white"^>2^</p^>
echo             ^</div^>
echo             ^<CheckCircle className="w-8 h-8 text-green-400" /^>
echo           ^</div^>
echo         ^</Card^>
echo         ^<Card className="p-4 bg-slate-800 border-slate-600"^>
echo           ^<div className="flex items-center justify-between"^>
echo             ^<div^>
echo               ^<p className="text-sm font-medium text-gray-400"^>Avg Accuracy^</p^>
echo               ^<p className="text-2xl font-bold text-white"^>93.0%%^</p^>
echo             ^</div^>
echo             ^<TrendingUp className="w-8 h-8 text-blue-400" /^>
echo           ^</div^>
echo         ^</Card^>
echo         ^<Card className="p-4 bg-slate-800 border-slate-600"^>
echo           ^<div className="flex items-center justify-between"^>
echo             ^<div^>
echo               ^<p className="text-sm font-medium text-gray-400"^>Daily Requests^</p^>
echo               ^<p className="text-2xl font-bold text-white"^>27.8K^</p^>
echo             ^</div^>
echo             ^<Activity className="w-8 h-8 text-purple-400" /^>
echo           ^</div^>
echo         ^</Card^>
echo         ^<Card className="p-4 bg-slate-800 border-slate-600"^>
echo           ^<div className="flex items-center justify-between"^>
echo             ^<div^>
echo               ^<p className="text-sm font-medium text-gray-400"^>Models Training^</p^>
echo               ^<p className="text-2xl font-bold text-white"^>1^</p^>
echo             ^</div^>
echo             ^<Zap className="w-8 h-8 text-amber-400" /^>
echo           ^</div^>
echo         ^</Card^>
echo       ^</div^>
echo.
echo       ^<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"^>
echo         {mockModels.map((model, index^) =^> (
echo           ^<Card
echo             key={model.id}
echo             className="p-6 bg-slate-800 border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
echo           ^>
echo             ^<div className="space-y-4"^>
echo               ^<div className="flex items-start justify-between"^>
echo                 ^<div^>
echo                   ^<h3 className="font-semibold text-white"^>{model.name}^</h3^>
echo                   ^<p className="text-sm text-gray-400"^>v{model.version}^</p^>
echo                 ^</div^>
echo                 ^<Badge className="bg-green-100 text-green-800"^>
echo                   {model.status}
echo                 ^</Badge^>
echo               ^</div^>
echo               ^<div className="space-y-2"^>
echo                 ^<div className="flex justify-between"^>
echo                   ^<span className="text-gray-400"^>Accuracy:^</span^>
echo                   ^<span className="text-white"^>{model.accuracy}%%^</span^>
echo                 ^</div^>
echo                 ^<div className="flex justify-between"^>
echo                   ^<span className="text-gray-400"^>Daily Requests:^</span^>
echo                   ^<span className="text-white"^>{model.requestsPerDay.toLocaleString(^)}^</span^>
echo                 ^</div^>
echo               ^</div^>
echo             ^</div^>
echo           ^</Card^>
echo         ^^)}
echo       ^</div^>
echo     ^</div^>
echo   ^^);
echo }
) > "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web\src\app\ml-models\page.tsx"

echo.
echo ✅ ML MODELS PAGE CREATED SUCCESSFULLY!
echo 📍 Location: apps\admin-web\src\app\ml-models\page.tsx
echo 🔄 Refresh your browser to see the ML Models page
echo.
pause