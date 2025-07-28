import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, Layers, AlertCircle, Trash2, Edit, Upload, Save, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getModels, addModel, deleteModel, getUsers, updateUser, deleteUser } from '@/api/admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'Peneliti';
}

interface AIModel {
  id: string;
  name: string;
  huggingfaceUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [models, setModels] = useState<AIModel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newModelUrl, setNewModelUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '' as 'ADMIN' | 'Peneliti' });

  useEffect(() => {
    if (user?.token) {
      loadModels();
      loadUsers();
    }
  }, [user?.token]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadModels = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (!user?.token) throw new Error('No authentication token found');

      const response = await getModels(user.token);
      if (response.status === 'success') {
        setModels(response.models);
      } else {
        throw new Error(response.error || 'Failed to load models');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      if (!user?.token) return;
      const response = await getUsers(user.token);
      if (response.status === 'success') {
        setUsers(response.users);
      }
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const handleAddModel = async () => {
    if (!newModelUrl.trim() || !user?.token) return;
    
    try {
      setIsLoading(true);
      
      // CORRECT FORMAT: addModel(modelName, token) - matches your API
      const response = await addModel(newModelUrl, user.token);
      
      setNewModelUrl('');
      await loadModels();
      showNotification('success', 'Model added successfully!');
    } catch (err: any) {
      showNotification('error', `Failed to add model: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModel = async (modelUrl: string) => {
    if (!user?.token || !confirm('Are you sure you want to delete this model?')) return;
    
    try {
      setIsLoading(true);
      await deleteModel(modelUrl, user.token);
      await loadModels();
      showNotification('success', 'Model deleted successfully!');
    } catch (err: any) {
      showNotification('error', `Failed to delete model: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setEditForm({ name: userToEdit.name, role: userToEdit.role });
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !user?.token) return;
    
    try {
      setIsLoading(true);
      await updateUser(editingUser.id, editForm, user.token);
      setEditingUser(null);
      await loadUsers();
      showNotification('success', 'User updated successfully!');
    } catch (err: any) {
      showNotification('error', `Failed to update user: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!user?.token || !confirm('Are you sure you want to delete this user?')) return;
    
    try {
      setIsLoading(true);
      await deleteUser(userId, user.token);
      await loadUsers();
      showNotification('success', 'User deleted successfully!');
    } catch (err: any) {
      showNotification('error', `Failed to delete user: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', role: 'Peneliti' });
  };

  if (isLoading && models.length === 0 && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Notification Popup */}
      {notification && (
        <div className="fixed top-4 right-4 z-[200]" style={{ animation: 'slide-in 0.3s ease-out' }}>
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
              <button onClick={() => setNotification(null)} className="ml-4 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome back, {user?.name} ({user?.role})
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="models" className="flex items-center space-x-2">
            <Layers className="w-4 h-4" />
            <span>Model Management</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>User Management</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>AI Model Management</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add or remove models for classification
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Add New Model</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="model-url">Hugging Face Model URL</Label>
                      <Input
                        id="model-url"
                        placeholder="e.g., username/model-name"
                        value={newModelUrl}
                        onChange={(e) => setNewModelUrl(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter model path like: mrizkywidodo/bert-base-rizkywidodo
                      </p>
                    </div>
                    <Button 
                      onClick={handleAddModel}
                      disabled={!newModelUrl.trim() || isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Adding...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Add Model
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Models ({models.length})</h3>
                  {models.length === 0 ? (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No models available
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {models.map((model) => (
                        <div key={model.huggingfaceUrl} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Layers className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-sm">{model.huggingfaceUrl}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              By {model.uploadedBy} • {new Date(model.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteModel(model.huggingfaceUrl)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>User Management</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage user accounts and permissions ({users.length} users)
              </p>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No users found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userData) => (
                        <TableRow key={userData.id}>
                          <TableCell>
                            {editingUser?.id === userData.id ? (
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full"
                                placeholder="Enter name"
                              />
                            ) : (
                              <span className="font-medium">{userData.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-gray-600 dark:text-gray-400">{userData.email}</span>
                          </TableCell>
                          <TableCell>
                            {editingUser?.id === userData.id ? (
                              <Select
                                value={editForm.role}
                                onValueChange={(value: 'ADMIN' | 'Peneliti') => 
                                  setEditForm(prev => ({ ...prev, role: value }))
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                  <SelectItem value="Peneliti">Peneliti</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                userData.role === 'ADMIN' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {userData.role}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {editingUser?.id === userData.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleUpdateUser}
                                    disabled={isLoading || !editForm.name.trim()}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelEdit}
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUser(userData)}
                                    disabled={isLoading}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(userData.id)}
                                    disabled={isLoading || userData.id === user?.id}
                                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                    title={userData.id === user?.id ? "Cannot delete yourself" : "Delete user"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CSS for animation */}
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
      `}</style>
    </div>
  );
};