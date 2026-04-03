'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Brain, Activity, Zap, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface MLModel {
  id: string;
  name: string;
  type: 'fraud_detection' | 'risk_scoring' | 'payout_prediction';
  status: 'active' | 'training' | 'inactive';
  accuracy: number;
  version: string;
  lastTrained: string;
  requestsPerDay: number;
}

const mockModels: MLModel[] = [
  {
    id: 'fraud-v3',
    name: 'Fraud Detection v3.2',
    type: 'fraud_detection',
    status: 'active',
    accuracy: 94.7,
    version: '3.2.1',
    lastTrained: '2024-03-20',
    requestsPerDay: 15420
  },
  {
    id: 'risk-v2',
    name: 'Risk Scoring v2.8',
    type: 'risk_scoring', 
    status: 'active',
    accuracy: 91.3,
    version: '2.8.5',
    lastTrained: '2024-03-18',
    requestsPerDay: 8932
  },
  {
    id: 'payout-v1',
    name: 'Payout Predictor v1.5',
    type: 'payout_prediction',
    status: 'training',
    accuracy: 87.2,
    version: '1.5.0-beta',
    lastTrained: '2024-03-15',
    requestsPerDay: 3450
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'training': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'fraud_detection': return <AlertTriangle className="w-5 h-5" />;
    case 'risk_scoring': return <TrendingUp className="w-5 h-5" />;
    case 'payout_prediction': return <Brain className="w-5 h-5" />;
    default: return <Activity className="w-5 h-5" />;
  }
};

export default function MLModelsPage() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">ML Models</h1>
            <p className="text-gray-400">Monitor and manage machine learning models</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Brain className="w-4 h-4 mr-2" />
            Deploy New Model
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-800 border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Active Models</p>
                <p className="text-2xl font-bold text-white">2</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>
          
          <Card className="p-4 bg-slate-800 border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Accuracy</p>
                <p className="text-2xl font-bold text-white">93.0%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Daily Requests</p>
                <p className="text-2xl font-bold text-white">27.8K</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-800 border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Models Training</p>
                <p className="text-2xl font-bold text-white">1</p>
              </div>
              <Zap className="w-8 h-8 text-amber-400" />
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Models Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {mockModels.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`p-6 bg-slate-800 border-slate-600 hover:border-blue-500 transition-colors cursor-pointer ${
                selectedModel === model.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-700">
                      {getTypeIcon(model.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{model.name}</h3>
                      <p className="text-sm text-gray-400">v{model.version}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(model.status)}>
                    {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Accuracy:</span>
                    <span className="text-white font-medium">{model.accuracy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Last Trained:</span>
                    <span className="text-white">{model.lastTrained}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Daily Requests:</span>
                    <span className="text-white">{model.requestsPerDay.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    Retrain
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state if no models */}
      {mockModels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Brain className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No ML Models</h3>
          <p className="text-slate-400 text-center max-w-md">
            No machine learning models are currently deployed. Deploy your first model to get started.
          </p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
            <Brain className="w-4 h-4 mr-2" />
            Deploy First Model
          </Button>
        </div>
      )}
    </div>
  );
}