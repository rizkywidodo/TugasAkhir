//frontend/src/components/PredictPage.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { CheckCircle, Layers, AlertCircle, Github, Bot, Upload, Download, Eye, X, Edit3, Save, MessageSquare } from 'lucide-react';
import { classifyIssue, fetchModels, saveClassificationHistory } from "@/api/ai";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = 'https://obscure-memory-w47jq5jx6p92g95x-5000.app.github.dev/api';

export const PredictPage: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<any[] | null>(null);
  const [issueNumber, setIssueNumber] = useState<string>("");
  const [issueTitle, setIssueTitle] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("system");

  // EXACT COPY FROM HISTORYPAGE - Editing states
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set());
  const [editedPredictions, setEditedPredictions] = useState<{[key: string]: string}>({});
  const [currentHistoryId, setCurrentHistoryId] = useState<number | null>(null);

  const { user } = useAuth();
  const token = user?.token || "";

  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        setError("");
        const modelList = await fetchModels();
        setModels(Array.isArray(modelList) ? modelList : []);
      } catch (error: any) {
        setError(`Failed to fetch models: ${error.message}`);
        setModels([]);
      }
    };
    fetchAvailableModels();
  }, []);

  // EXACT COPY FROM HISTORYPAGE - Show notification popup
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // EXACT COPY FROM HISTORYPAGE - Get token
  const getToken = () => {
    let token = localStorage.getItem('token');
    if (!token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try { token = JSON.parse(savedUser).token; } catch (e) {}
      }
    }
    return token;
  };

  // EXACT COPY FROM HISTORYPAGE - API call
  const apiCall = async (url: string, options: any = {}) => {
    const token = getToken();
    if (!token) {
      setError('No authentication token found. Please login again.');
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}${url}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  // EXACT COPY FROM HISTORYPAGE - Get prediction color
  const getPredictionColor = (prediction: string) => {
    if (prediction === 'NFR' || prediction.includes('New Feature Request')) return 'bg-green-100 text-green-800 border-green-200';
    if (prediction === 'FIR' || prediction.includes('Feature Improvement Request')) return 'bg-red-100 text-red-800 border-red-200';
    if (prediction === 'Comment' || prediction === 'Komen' || prediction.includes('Comment')) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    // Fallback for old format
    if (prediction.includes('Feature') || prediction.includes('FIR')) return 'bg-red-100 text-red-800 border-red-200';
    if (prediction.includes('Bug') || prediction.includes('BR')) return 'bg-red-100 text-red-800 border-red-200';
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // EXACT COPY FROM HISTORYPAGE - Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600 font-bold';
    if (confidence >= 80) return 'text-yellow-600 font-semibold';
    return 'text-red-600';
  };

  // ADAPTED FROM HISTORYPAGE - Save changes to database with popup
  const saveChanges = async () => {
    if (!predictions || !currentHistoryId) return;
    
    try {
      const updatedPredictions = predictions.map((pred: any) => ({
        ...pred, 
        prediction: editedPredictions[pred.id] || pred.prediction,
        top_prediction: editedPredictions[pred.id] || pred.prediction
      }));
      
      // Update database
      await apiCall(`/history/${currentHistoryId}/update`, {
        method: 'PUT',
        body: JSON.stringify({ predictions: updatedPredictions })
      });
      
      // Update local state
      setPredictions(updatedPredictions);
      
      setEditingRows(new Set());
      setEditedPredictions({});
      
      showNotification('success', 'Predictions updated successfully!');
      
    } catch (error: any) {
      showNotification('error', `Failed to save changes: ${error.message}`);
    }
  };

  const handleCustomModelSubmit = async () => {
    if (!customModel || !githubUrl) {
      setError("Mohon isi model dan URL GitHub terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await fetch("https://obscure-memory-w47jq5jx6p92g95x-5000.app.github.dev/api/ml/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: customModel,
          github_url: githubUrl,
          is_custom_model: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const formattedPredictions = Array.isArray(data.result) ? data.result.map((pred: any, index: number) => ({
          ...pred,
          id: pred.id || `comment_${index}`
        })) : [];
        setPredictions(formattedPredictions);
        setIssueNumber(formattedPredictions[0]?.issue_number || "unknown");
        setIssueTitle(data.issue_title || "");

        if (user && formattedPredictions.length > 0) {
          try {
            const saveResponse = await saveClassificationHistory({
              model_name: customModel,
              issue_url: githubUrl,
              issue_title: data.issue_title || "",
              issue_number: formattedPredictions[0]?.issue_number || "",
              source_type: "custom",
              result_json: formattedPredictions,
            }, token);
            setCurrentHistoryId(saveResponse?.history_id);
          } catch (historyError) {
            console.warn("⚠️ Failed to save history:", historyError);
          }
        }
      } else {
        setError(data.error || "Terjadi kesalahan saat klasifikasi.");
      }
    } catch (err) {
      setError("Terjadi error saat menghubungi server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClassification = async () => {
    if (!selectedModel || !githubUrl) {
      setError("Please select a model and enter a GitHub URL");
      return;
    }
    
    setIsProcessing(true);
    setError("");

    try {
      const predictionResult = await classifyIssue({
        modelName: selectedModel,
        issueUrl: githubUrl,
      });

      const resultArray = Array.isArray(predictionResult?.result) ? predictionResult.result.map((pred: any, index: number) => ({
        ...pred,
        id: pred.id || `comment_${index}`
      })) : [];
      setPredictions(resultArray);
      setIssueNumber(resultArray[0]?.issue_number || "unknown");
      setIssueTitle(predictionResult.issue_title || "");

      if (user && resultArray.length > 0) {
        try {
          const saveResponse = await saveClassificationHistory({
            model_name: selectedModel,
            issue_url: githubUrl,
            issue_title: predictionResult.issue_title || "",
            issue_number: resultArray[0]?.issue_number || "",
            source_type: "huggingface",
            result_json: resultArray,
          }, token);
          setCurrentHistoryId(saveResponse?.history_id);
        } catch (historyError) {
          console.warn("⚠️ Failed to save history:", historyError);
        }
      }

    } catch (err: any) {
      setError(`Classification failed: ${err.message}`);
      setPredictions([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!predictions || !Array.isArray(predictions)) return;
    
    const headers = ["Issue Number", "Author", "Comment", "Prediction", "Confidence"];
    const csvContent = [
      headers.join(","),
      ...predictions.map(p => `"${p.issue_number || ''}","${p.author || ''}","${(p.comment || '').replace(/"/g, '""').replace(/\n/g, ' ')}","${editedPredictions[p.id] || p.prediction || ''}","${((p.confidence || 0) * 100).toFixed(2)}%"`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `klasifikasi_issue_${issueNumber || 'result'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCommentClick = (prediction: any) => {
    setSelectedComment(prediction);
    setShowCommentModal(true);
  };

  const hasPredictions = predictions && Array.isArray(predictions) && predictions.length > 0;

  return (
    <div className="space-y-6">
      {/* EXACT COPY FROM HISTORYPAGE - Notification Popup */}
      {notification && (
        <div className="fixed top-4 right-4 z-[200] animate-slide-in">
          <div className={`px-6 py-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            <div className="flex items-center space-x-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">{notification.message}</span>
              <button 
                onClick={() => setNotification(null)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Klasifikasi Feedback</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Ekstrak dan klasifikasi feedback dari GitHub Issues menggunakan AI
          </p>
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-200">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs 
        defaultValue="system" 
        className="w-full"
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" />
            <span>Model Sistem</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Model Kustom</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6 mt-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Gunakan Model Sistem
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Model yang telah dilatih dan dioptimalkan untuk klasifikasi feedback
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Pilih Model AI
                    </label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Pilih model untuk klasifikasi" />
                      </SelectTrigger>
                      <SelectContent>
                        {models
                          .filter((model) => model && model.trim() !== "")
                          .map((model) => (
                            <SelectItem key={model} value={model}>
                              <div className="flex flex-col">
                                <span className="font-medium">{model.split('/').pop()}</span>
                                <span className="text-xs text-gray-500">{model}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      URL GitHub Issue
                    </label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/issues/123"
                        className="h-12 pl-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Kategori Klasifikasi</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">NFR</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">New Feature Request</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">FIR</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Feature Improvement Request</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Comment</span>
                        <p className="text-xs text-gray-600 dark:text-gray-400">General Comment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleClassification}
                disabled={!selectedModel || !githubUrl || isProcessing}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Memproses Klasifikasi...</span>
                  </div>
                ) : (
                  <>
                    <Layers className="w-5 h-5 mr-2" />
                    Mulai Klasifikasi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6 mt-6">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gunakan Model Kustom</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gunakan model dari Hugging Face Hub</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Hugging Face Model ID
                </label>
                <Input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="username/model-name"
                  className="h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  URL GitHub Issue
                </label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo/issues/123"
                    className="h-12 pl-11"
                  />
                </div>
              </div>

              <Button 
                onClick={handleCustomModelSubmit}
                disabled={!customModel || !githubUrl || isProcessing}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Memproses Klasifikasi...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Mulai Klasifikasi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Table with Editing (ADAPTED FROM HISTORYPAGE) */}
      {hasPredictions && (
        <Card className="mt-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Hasil Klasifikasi untuk Issue #{issueNumber} — {issueTitle}
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                (Model: {activeTab === "system" ? selectedModel : customModel})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {Object.keys(editedPredictions).length > 0 && (
                <Button onClick={saveChanges} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />Save
                </Button>
              )}
              <Button onClick={handleDownloadCSV} className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Unduh CSV</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-auto">
            <div className="min-w-full">
              <table className="w-full text-sm border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-left">
                  <tr>
                    <th className="border border-gray-200 p-4 text-left font-semibold">Issue #</th>
                    <th className="border border-gray-200 p-4 text-left font-semibold">Author</th>
                    <th className="border border-gray-200 p-4 text-left font-semibold">Komentar</th>
                    <th className="border border-gray-200 p-4 text-left font-semibold">Prediksi</th>
                    <th className="border border-gray-200 p-4 text-left font-semibold">Confidence</th>
                    <th className="border border-gray-200 p-4 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {predictions.map((p, i) => (
                    <tr key={p.id || i} className="hover:bg-blue-50 transition-colors">
                      <td className="border border-gray-200 p-4 text-gray-600 dark:text-gray-400">{p.issue_number || ''}</td>
                      <td className="border border-gray-200 p-4 font-medium text-gray-800 dark:text-gray-200">{p.author || ''}</td>
                      <td className="border border-gray-200 p-4 max-w-md">
                        <button
                          onClick={() => handleCommentClick(p)}
                          className="text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors group w-full"
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate text-gray-700 dark:text-gray-300">
                              {(p.comment || '').length > 60 ? `${p.comment.substring(0, 60)}...` : p.comment || ''}
                            </span>
                            <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-500 ml-2 flex-shrink-0" />
                          </div>
                        </button>
                      </td>
                      <td className="border border-gray-200 p-4">
                        {editingRows.has(p.id || `${i}`) ? (
                          <select 
                            value={editedPredictions[p.id || `${i}`] || p.prediction} 
                            onChange={(e) => setEditedPredictions(prev => ({ ...prev, [p.id || `${i}`]: e.target.value }))} 
                            className="px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="NFR">NFR - New Feature Request</option>
                            <option value="FIR">FIR - Feature Improvement Request</option>
                            <option value="Comment">Comment - General Comment</option>
                          </select>
                        ) : (
                          <Badge className={`text-xs px-3 py-1 ${getPredictionColor(editedPredictions[p.id || `${i}`] || p.prediction)}`}>
                            {editedPredictions[p.id || `${i}`] || p.prediction}
                          </Badge>
                        )}
                      </td>
                      <td className="border border-gray-200 p-4">
                        <span className={`font-bold ${getConfidenceColor((p.confidence || 0) * 100)}`}>
                          {((p.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="border border-gray-200 p-4">
                        <Button variant="ghost" size="sm" onClick={() => {
                          const rowId = p.id || `${i}`;
                          const newEditingRows = new Set(editingRows);
                          if (newEditingRows.has(rowId)) { 
                            newEditingRows.delete(rowId); 
                          } else { 
                            newEditingRows.add(rowId); 
                          }
                          setEditingRows(newEditingRows);
                        }} className="flex items-center gap-1 hover:bg-blue-100">
                          <Edit3 className="w-3 h-3" />
                          {editingRows.has(p.id || `${i}`) ? 'Done' : 'Edit'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* EXACT COPY FROM HISTORYPAGE - Comment Modal */}
      {showCommentModal && selectedComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Komentar dari {selectedComment.author}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Issue #{selectedComment.issue_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
             <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
               <div className="flex items-center justify-between mb-3">
                 <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold
                   ${selectedComment.prediction === "NFR" ? "bg-green-500" :
                     selectedComment.prediction === "FIR" ? "bg-red-500" : "bg-gray-500"}`}>
                   {selectedComment.prediction}
                 </span>
                 <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor((selectedComment.confidence || 0) * 100)}`}>
                   {((selectedComment.confidence || 0) * 100).toFixed(1)}% confidence
                 </span>
               </div>
             </div>
             
             <div className="prose dark:prose-invert max-w-none">
               <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                 {selectedComment.comment || 'No comment available'}
               </div>
             </div>
           </div>
           
           <div className="flex justify-end p-6 border-t dark:border-gray-700">
             <Button 
               onClick={() => setShowCommentModal(false)}
               className="bg-gray-600 hover:bg-gray-700 text-white"
             >
               Tutup
             </Button>
           </div>
         </div>
       </div>
     )}

     {isProcessing && (
       <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
         <CardContent className="pt-6">
           <div className="flex items-center space-x-4">
             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
             <div>
               <span className="text-blue-800 dark:text-blue-200 font-medium text-lg">
                 Mengekstrak dan mengklasifikasi feedback...
               </span>
               <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                 Proses ini mungkin membutuhkan beberapa menit tergantung jumlah komentar
               </p>
             </div>
           </div>
         </CardContent>
       </Card>
     )}

     {/* EXACT COPY FROM HISTORYPAGE - CSS for slide-in animation */}
     <style>{`
       @keyframes slide-in {
         from {
           transform: translateX(100%);
           opacity: 0;
         }
         to {
           transform: translateX(0);
           opacity: 1;
         }
       }
       .animate-slide-in {
         animation: slide-in 0.3s ease-out;
       }
     `}</style>
   </div>
 );
};